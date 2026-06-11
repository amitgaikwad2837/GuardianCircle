package com.guardiancircle

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.guardiancircle.modules.*

/**
 * Registers all GuardianCircle native modules with React Native.
 */
class GuardianCirclePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(
            SmsModule(reactContext),
            CryptoModule(reactContext),
            SensorModule(reactContext),
            ContactPickerModule(reactContext),
            BackgroundTaskModule(reactContext),
            BluetoothMeshModule(reactContext),
        )

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
