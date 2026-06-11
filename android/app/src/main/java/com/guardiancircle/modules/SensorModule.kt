package com.guardiancircle.modules

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * High-frequency accelerometer and gyroscope data bridge.
 * Runs in native code to avoid JS bridge overhead at high sample rates.
 * Used by fall detection and distress detection algorithms.
 */
@ReactModule(name = SensorModule.NAME)
class SensorModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        const val NAME = "SensorModule"
        const val ACCEL_EVENT = "GC_ACCELEROMETER_DATA"
        const val GYRO_EVENT = "GC_GYROSCOPE_DATA"
    }

    private val sensorManager: SensorManager =
        reactContext.getSystemService(SensorManager::class.java)

    private var isListening = false

    override fun getName() = NAME

    @ReactMethod
    fun startListening(samplingRateHz: Int, promise: Promise) {
        if (isListening) { promise.resolve("already_running"); return }

        val delayUs = when {
            samplingRateHz >= 50 -> SensorManager.SENSOR_DELAY_FASTEST
            samplingRateHz >= 20 -> SensorManager.SENSOR_DELAY_GAME
            else -> SensorManager.SENSOR_DELAY_NORMAL
        }

        val accel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        val gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

        if (accel != null) sensorManager.registerListener(this, accel, delayUs)
        if (gyro != null) sensorManager.registerListener(this, gyro, delayUs)

        isListening = true
        promise.resolve("started")
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        sensorManager.unregisterListener(this)
        isListening = false
        promise.resolve("stopped")
    }

    override fun onSensorChanged(event: SensorEvent) {
        val data = Arguments.createMap()
        data.putDouble("x", event.values[0].toDouble())
        data.putDouble("y", event.values[1].toDouble())
        data.putDouble("z", event.values[2].toDouble())
        data.putDouble("timestamp", (event.timestamp / 1_000_000).toDouble()) // ns → ms

        val eventName = when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> ACCEL_EVENT
            Sensor.TYPE_GYROSCOPE -> GYRO_EVENT
            else -> return
        }

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    @ReactMethod
    fun addListener(eventName: String) { /* required by RN event emitter */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* required by RN event emitter */ }
}
