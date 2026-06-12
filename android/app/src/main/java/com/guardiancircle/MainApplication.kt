package com.guardiancircle

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.guardiancircle.app.BuildConfig
import com.guardiancircle.modules.*

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    add(GuardianCirclePackage())
                }

            override fun getJSMainModuleName(): String = "index"
            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) load()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)

        // Emergency alerts — bypass DND
        NotificationChannel(
            "guardian_alerts",
            "Emergency Guardian Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Received when your guardians need help"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
            setBypassDnd(true)
            manager.createNotificationChannel(this)
        }

        // Status updates
        NotificationChannel(
            "guardian_updates",
            "Guardian Updates",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Check-in and journey status updates"
            manager.createNotificationChannel(this)
        }

        // Monitoring service (persistent, low priority, silent)
        NotificationChannel(
            "gc_monitoring",
            "Safety Monitoring",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Active when journey or distress monitoring is on"
            manager.createNotificationChannel(this)
        }
    }
}
