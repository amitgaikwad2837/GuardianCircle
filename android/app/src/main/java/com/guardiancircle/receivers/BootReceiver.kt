package com.guardiancircle.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.guardiancircle.workers.RestoreMonitoringWorker

/**
 * Receives BOOT_COMPLETED and MY_PACKAGE_REPLACED broadcasts.
 *
 * Re-schedules monitoring if the user had an active journey at the time
 * of reboot. Uses WorkManager so the work survives if the app is not
 * immediately available post-boot.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return

        Log.i(TAG, "Boot or package replace received — scheduling monitoring restore")

        val request = OneTimeWorkRequestBuilder<RestoreMonitoringWorker>().build()
        WorkManager.getInstance(context).enqueue(request)
    }

    companion object {
        private const val TAG = "GC.BootReceiver"
    }
}
