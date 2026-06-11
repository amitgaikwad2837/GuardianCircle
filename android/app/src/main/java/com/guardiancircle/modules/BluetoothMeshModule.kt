package com.guardiancircle.modules

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.os.Build
import android.os.ParcelUuid
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

/**
 * BLE mesh beaconing for offline emergency communication.
 * Advertises SOS beacons that nearby GuardianCircle devices can relay.
 * Uses rotating pseudonymous IDs — not linked to device identity.
 *
 * Requires: BLUETOOTH_ADVERTISE, BLUETOOTH_SCAN (Android 12+)
 * Optional feature — off by default.
 */
@ReactModule(name = BluetoothMeshModule.NAME)
class BluetoothMeshModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "BluetoothMeshModule"
        private val GC_SERVICE_UUID = UUID.fromString("0000fc47-0000-1000-8000-00805f9b34fb")
        const val BEACON_RECEIVED_EVENT = "GC_MESH_BEACON_RECEIVED"
    }

    private val bluetoothManager: BluetoothManager =
        reactContext.getSystemService(BluetoothManager::class.java)
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private var advertiser: BluetoothLeAdvertiser? = null
    private var scanner: BluetoothLeScanner? = null
    private var scanCallback: ScanCallback? = null

    override fun getName() = NAME

    @ReactMethod
    fun startBeacon(messageTypeCode: Int, rotatingId: String, messageId: String, promise: Promise) {
        if (bluetoothAdapter?.isEnabled != true) {
            promise.reject("BT_DISABLED", "Bluetooth is not enabled")
            return
        }

        try {
            advertiser = bluetoothAdapter.bluetoothLeAdvertiser

            // Build 28-byte payload: magic(2) + rotatingId(16) + type(1) + timestamp(4) + msgId(4) + hop(1)
            val payload = buildPayload(messageTypeCode, rotatingId, messageId, hopCount = 0)

            val data = AdvertiseData.Builder()
                .addServiceUuid(ParcelUuid(GC_SERVICE_UUID))
                .addServiceData(ParcelUuid(GC_SERVICE_UUID), payload)
                .setIncludeDeviceName(false) // privacy — no device name
                .build()

            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(0) // continuous
                .build()

            advertiser?.startAdvertising(settings, data, advertiseCallback)
            promise.resolve("started")
        } catch (e: Exception) {
            promise.reject("ADVERTISE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopBeacon(promise: Promise) {
        advertiser?.stopAdvertising(advertiseCallback)
        advertiser = null
        promise.resolve("stopped")
    }

    @ReactMethod
    fun startScanning(promise: Promise) {
        if (bluetoothAdapter?.isEnabled != true) {
            promise.reject("BT_DISABLED", "Bluetooth is not enabled")
            return
        }
        scanner = bluetoothAdapter.bluetoothLeScanner

        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(GC_SERVICE_UUID))
            .build()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_POWER)
            .build()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val serviceData = result.scanRecord?.getServiceData(ParcelUuid(GC_SERVICE_UUID))
                    ?: return
                val beacon = parsePayload(serviceData) ?: return
                emitBeaconReceived(beacon)
            }
        }

        scanCallback = callback
        scanner?.startScan(listOf(filter), settings, callback)
        promise.resolve("scanning")
    }

    @ReactMethod
    fun stopScanning(promise: Promise) {
        scanCallback?.let { scanner?.stopScan(it) }
        scanCallback = null
        promise.resolve("stopped")
    }

    private fun buildPayload(type: Int, rotatingId: String, messageId: String, hopCount: Int): ByteArray {
        val bytes = ByteArray(28)
        // Magic: 0x4743 ("GC")
        bytes[0] = 0x47; bytes[1] = 0x43
        // Rotating ID: 16 bytes hex → 8 bytes
        val idBytes = rotatingId.chunked(2).map { it.toInt(16).toByte() }.take(16).toByteArray()
        idBytes.copyInto(bytes, 2)
        // Type
        bytes[18] = type.toByte()
        // Timestamp (4 bytes, Unix seconds)
        val ts = (System.currentTimeMillis() / 1000).toInt()
        bytes[19] = (ts shr 24).toByte(); bytes[20] = (ts shr 16).toByte()
        bytes[21] = (ts shr 8).toByte(); bytes[22] = ts.toByte()
        // Message ID (4 bytes)
        val idInt = messageId.toLongOrNull(16)?.toInt() ?: 0
        bytes[23] = (idInt shr 24).toByte(); bytes[24] = (idInt shr 16).toByte()
        bytes[25] = (idInt shr 8).toByte(); bytes[26] = idInt.toByte()
        // Hop count
        bytes[27] = hopCount.toByte()
        return bytes
    }

    private fun parsePayload(bytes: ByteArray): WritableMap? {
        if (bytes.size < 28) return null
        if (bytes[0] != 0x47.toByte() || bytes[1] != 0x43.toByte()) return null // not GC magic

        val map = Arguments.createMap()
        map.putInt("messageType", bytes[18].toInt() and 0xFF)
        map.putInt("hopCount", bytes[27].toInt() and 0xFF)
        return map
    }

    private fun emitBeaconReceived(beacon: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(BEACON_RECEIVED_EVENT, beacon)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartFailure(errorCode: Int) {
            // Log but don't crash — BLE mesh is optional
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
