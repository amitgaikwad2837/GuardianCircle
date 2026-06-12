package com.guardiancircle.modules

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes app icon alias switching to JS.
 *
 * Safety: we ENABLE the new alias BEFORE disabling the others. This prevents the
 * race-condition window where no launcher entry point is active, which would make
 * the app unlaunchable until reinstalled.
 */
class AppIconModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppIconModule"

    private val packageName: String get() = reactApplicationContext.packageName

    private val allComponents = listOf(
        "$packageName.MainActivity",
        "$packageName.alias.Calculator",
        "$packageName.alias.WeatherApp",
        "$packageName.alias.Notes",
    )

    @ReactMethod
    fun setActiveAlias(alias: String, promise: Promise) {
        if (alias !in allComponents) {
            promise.reject("INVALID_ALIAS", "Unknown alias: $alias")
            return
        }

        val pm = reactApplicationContext.packageManager

        // Determine the currently enabled component so we can restore it on failure
        val previousAlias = allComponents.firstOrNull { component ->
            pm.getComponentEnabledSetting(ComponentName(packageName, component)) ==
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } ?: "$packageName.MainActivity"

        try {
            // Step 1: Enable the new alias FIRST so there is always an active launcher entry
            pm.setComponentEnabledSetting(
                ComponentName(packageName, alias),
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP,
            )

            // Step 2: Disable all other components
            for (component in allComponents) {
                if (component == alias) continue
                pm.setComponentEnabledSetting(
                    ComponentName(packageName, component),
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP,
                )
            }

            promise.resolve(null)
        } catch (e: Exception) {
            // Attempt to restore the previous alias to avoid leaving the app unlaunchable
            try {
                pm.setComponentEnabledSetting(
                    ComponentName(packageName, previousAlias),
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP,
                )
            } catch (_: Exception) { /* best-effort restore */ }
            promise.reject("ICON_SWITCH_FAILED", e.message, e)
        }
    }
}
