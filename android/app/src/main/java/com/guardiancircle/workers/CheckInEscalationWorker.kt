package com.guardiancircle.workers

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit

/**
 * WorkManager worker that escalates a missed check-in after the configured delay.
 *
 * WorkManager survives app backgrounding, Doze mode, and process death — unlike
 * JS setTimeout which is suspended when the bridge is not running.
 *
 * The actual escalation logic (marking status=escalated, emitting EventBus) cannot run
 * in a WorkManager worker because the React Native bridge is not guaranteed to be alive.
 * Instead, the worker fires a broadcast intent that the app handles when it next foregrounded.
 * For immediate escalation while foregrounded, the JS-side MissedCheckInUseCase still
 * attempts a short setTimeout as a best-effort path.
 */
class CheckInEscalationWorker(
    private val context: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val KEY_CHECKIN_ID = "checkin_id"
        const val ACTION_ESCALATE = "com.guardiancircle.ACTION_CHECKIN_ESCALATE"

        fun schedule(context: Context, checkinId: String, delayMinutes: Int) {
            val data = workDataOf(KEY_CHECKIN_ID to checkinId)
            val request = OneTimeWorkRequestBuilder<CheckInEscalationWorker>()
                .setInputData(data)
                .setInitialDelay(delayMinutes.toLong(), TimeUnit.MINUTES)
                .addTag("checkin_escalation_$checkinId")
                .build()
            WorkManager.getInstance(context).enqueue(request)
        }

        fun cancel(context: Context, checkinId: String) {
            WorkManager.getInstance(context).cancelAllWorkByTag("checkin_escalation_$checkinId")
        }
    }

    override suspend fun doWork(): Result {
        val checkinId = inputData.getString(KEY_CHECKIN_ID) ?: return Result.failure()

        // Broadcast a local intent — the BootReceiver / app process picks this up
        val intent = android.content.Intent(ACTION_ESCALATE).apply {
            setPackage(context.packageName)
            putExtra(KEY_CHECKIN_ID, checkinId)
        }
        context.sendBroadcast(intent)

        return Result.success()
    }
}
