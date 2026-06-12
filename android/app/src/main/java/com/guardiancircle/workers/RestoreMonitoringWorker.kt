package com.guardiancircle.workers

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.guardiancircle.modules.MonitoringForegroundService

/**
 * WorkManager worker that restores active monitoring after device reboot.
 *
 * Reads the persisted monitoring state from SharedPreferences (written by
 * BackgroundTaskModule when monitoring starts). If monitoring was active,
 * re-launches the foreground service.
 *
 * This runs in the background without the React Native bridge, so it uses
 * Android SharedPreferences directly rather than MMKV.
 */
class RestoreMonitoringWorker(
    context: Context,
    params: WorkerParameters,
) : Worker(context, params) {

    override fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val wasMonitoring = prefs.getBoolean(KEY_MONITORING_ACTIVE, false)

        if (!wasMonitoring) {
            Log.d(TAG, "Monitoring was not active before reboot — nothing to restore")
            return Result.success()
        }

        Log.i(TAG, "Restoring monitoring service after reboot")

        try {
            val serviceIntent = Intent(
                applicationContext,
                MonitoringForegroundService::class.java
            )
            applicationContext.startForegroundService(serviceIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restore monitoring service", e)
            return Result.failure()
        }

        return Result.success()
    }

    companion object {
        private const val TAG = "GC.RestoreMonitoring"
        const val PREFS_NAME = "gc_monitoring_state"
        const val KEY_MONITORING_ACTIVE = "monitoring_active"
    }
}
