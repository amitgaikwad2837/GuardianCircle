package com.guardiancircle.modules

import android.telephony.SmsManager
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * Sends SMS messages directly via Android SmsManager — no system UI, no confirmation dialog.
 * Required for silent emergency alerts.
 *
 * Permission required: android.permission.SEND_SMS
 */
@ReactModule(name = SmsModule.NAME)
class SmsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SmsModule"
        private const val MAX_SMS_CHARS = 320 // 2 SMS segments
    }

    override fun getName() = NAME

    @ReactMethod
    fun send(phoneNumber: String, message: String, promise: Promise) {
        try {
            val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                reactApplicationContext.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            val body = message.take(MAX_SMS_CHARS)

            // Use multipart if message exceeds single SMS limit
            if (body.length > 160) {
                val parts = smsManager.divideMessage(body)
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, body, null, null)
            }

            promise.resolve("sent")
        } catch (e: Exception) {
            promise.reject("SMS_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun sendBatch(phoneNumbers: ReadableArray, message: String, promise: Promise) {
        val results = Arguments.createArray()
        var failCount = 0

        for (i in 0 until phoneNumbers.size()) {
            val phone = phoneNumbers.getString(i) ?: continue
            try {
                send(phone, message, object : Promise {
                    override fun resolve(value: Any?) { results.pushString("sent") }
                    override fun reject(code: String?) { results.pushString("failed"); failCount++ }
                    override fun reject(code: String?, message: String?) { results.pushString("failed"); failCount++ }
                    override fun reject(code: String?, throwable: Throwable?) { results.pushString("failed"); failCount++ }
                    override fun reject(code: String?, message: String?, throwable: Throwable?) { results.pushString("failed"); failCount++ }
                    override fun reject(throwable: Throwable?) { results.pushString("failed"); failCount++ }
                    override fun reject(throwable: Throwable?, userInfo: WritableMap?) {}
                    override fun reject(code: String?, userInfo: WritableMap) {}
                    override fun reject(code: String?, message: String?, userInfo: WritableMap) {}
                    override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap) {}
                    override fun reject(code: String?, throwable: Throwable?, userInfo: WritableMap) {}
                })
            } catch (_: Exception) {
                results.pushString("failed")
                failCount++
            }
        }

        promise.resolve(results)
    }
}
