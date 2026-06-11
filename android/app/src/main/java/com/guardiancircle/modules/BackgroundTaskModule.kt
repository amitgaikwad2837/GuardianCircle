package com.guardiancircle.modules

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * Manages Android ForegroundService for background distress detection and journey monitoring.
 * ForegroundService prevents Android from killing the app during active monitoring.
 */
@ReactModule(name = BackgroundTaskModule.NAME)
class BackgroundTaskModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "BackgroundTaskModule"
        const val SERVICE_CHANNEL_ID = "gc_monitoring"
        const val SOS_CHANNEL_ID = "gc_sos_active"
    }

    override fun getName() = NAME

    @ReactMethod
    fun startMonitoringService(title: String, body: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, MonitoringForegroundService::class.java).apply {
                putExtra("title", title)
                putExtra("body", body)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve("started")
        } catch (e: Exception) {
            promise.reject("SERVICE_START_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopMonitoringService(promise: Promise) {
        val intent = Intent(reactContext, MonitoringForegroundService::class.java)
        reactContext.stopService(intent)
        promise.resolve("stopped")
    }

    @ReactMethod
    fun acquireWakeLock(promise: Promise) {
        try {
            val pm = reactContext.getSystemService(PowerManager::class.java)
            val wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GuardianCircle::SOSWakeLock")
            wl.acquire(10 * 60 * 1000L) // max 10 minutes
            promise.resolve("acquired")
        } catch (e: Exception) {
            promise.reject("WAKELOCK_FAILED", e.message, e)
        }
    }
}

/**
 * Long-running foreground service for distress detection and journey monitoring.
 * Runs in the same process as the React Native app.
 */
class MonitoringForegroundService : Service() {

    companion object {
        private const val NOTIFICATION_ID = 1001
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra("title") ?: "GuardianCircle Active"
        val body = intent?.getStringExtra("body") ?: "Monitoring for your safety"

        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification(title, body))

        return START_STICKY // restart if killed
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                BackgroundTaskModule.SERVICE_CHANNEL_ID,
                "Safety Monitoring",
                NotificationManager.IMPORTANCE_LOW // silent — does not make sound
            ).apply { description = "Active when journey or distress monitoring is on" }

            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, body: String): Notification {
        return NotificationCompat.Builder(this, BackgroundTaskModule.SERVICE_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_alert) // replace with app icon
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true) // not dismissable
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
