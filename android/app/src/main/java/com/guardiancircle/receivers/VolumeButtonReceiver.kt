package com.guardiancircle.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.SystemClock
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Detects a Vol-Down + Vol-Up chord held for TRIGGER_HOLD_MS as a hardware SOS trigger.
 *
 * Strategy: listen for ACTION_MEDIA_BUTTON / KeyEvent via an audio focus trick is unreliable
 * post-Android 10. Instead we register a ContentObserver on the volume stream and detect
 * rapid successive changes (down then up within CHORD_WINDOW_MS), sustained for TRIGGER_HOLD_MS.
 *
 * Usage: register via VolumeButtonReceiver.register(reactContext) in MainApplication or
 * a foreground service; unregister in onDestroy.
 *
 * The receiver emits a React Native event "GC_VOLUME_SOS_TRIGGER" so JS can call
 * TriggerSOSUseCase without any native SOS logic living here.
 */
class VolumeButtonReceiver(
    private val reactContext: ReactApplicationContext,
) : BroadcastReceiver() {

    companion object {
        private const val TAG = "GC.VolumeSOS"

        // Both volume keys must be pressed within this window to count as a chord
        private const val CHORD_WINDOW_MS = 1_500L
        // The chord must be sustained for this long before SOS fires
        private const val TRIGGER_HOLD_MS = 3_000L
        // Minimum gap between successive triggers (avoid accidental double-fire)
        private const val COOLDOWN_MS = 15_000L

        const val EVENT_NAME = "GC_VOLUME_SOS_TRIGGER"
        const val INTENT_ACTION = "com.guardiancircle.VOLUME_KEY_EVENT"
        const val EXTRA_KEY = "key" // "down" | "up"

        fun intentFilter() = IntentFilter(INTENT_ACTION)
    }

    private var volDownAt = 0L
    private var volUpAt   = 0L
    private var chordStart = 0L
    private var triggerScheduled = false
    private var lastTriggerAt = 0L
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())

    private val triggerRunnable = Runnable {
        val now = SystemClock.elapsedRealtime()
        if (now - lastTriggerAt < COOLDOWN_MS) return@Runnable
        lastTriggerAt = now
        triggerScheduled = false
        Log.w(TAG, "Volume SOS triggered")
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_NAME, null)
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != INTENT_ACTION) return
        val key = intent.getStringExtra(EXTRA_KEY) ?: return
        val now = SystemClock.elapsedRealtime()

        when (key) {
            "down" -> volDownAt = now
            "up"   -> volUpAt   = now
        }

        val bothDown = (now - volDownAt < CHORD_WINDOW_MS) && (now - volUpAt < CHORD_WINDOW_MS)
        if (bothDown) {
            if (chordStart == 0L) chordStart = now
            if (!triggerScheduled) {
                triggerScheduled = true
                handler.postDelayed(triggerRunnable, TRIGGER_HOLD_MS)
                Log.d(TAG, "Volume chord started — will trigger in ${TRIGGER_HOLD_MS}ms")
            }
        } else {
            if (triggerScheduled) {
                handler.removeCallbacks(triggerRunnable)
                triggerScheduled = false
                Log.d(TAG, "Volume chord released before trigger threshold")
            }
            chordStart = 0L
        }
    }

    fun register() {
        reactContext.registerReceiver(this, intentFilter())
        Log.i(TAG, "VolumeButtonReceiver registered")
    }

    fun unregister() {
        try { reactContext.unregisterReceiver(this) } catch (_: Exception) {}
        handler.removeCallbacks(triggerRunnable)
        Log.i(TAG, "VolumeButtonReceiver unregistered")
    }
}
