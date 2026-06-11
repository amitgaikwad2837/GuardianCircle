package com.guardiancircle.modules

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * Opens Android system contact picker and returns the selected contact's name and phone numbers.
 * The app never receives or stores the full contacts list.
 * Only the user-selected contact is returned.
 *
 * Permission required: android.permission.READ_CONTACTS
 */
@ReactModule(name = ContactPickerModule.NAME)
class ContactPickerModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        const val NAME = "ContactPickerModule"
        private const val REQUEST_CODE = 2001
    }

    private var pendingPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName() = NAME

    @ReactMethod
    fun pickContact(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity available")
            return
        }
        pendingPromise = promise
        val intent = Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI).apply {
            type = ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE
        }
        activity.startActivityForResult(intent, REQUEST_CODE)
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CODE) return
        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            promise.resolve(null)
            return
        }

        try {
            promise.resolve(resolveContact(data.data!!))
        } catch (e: Exception) {
            promise.reject("CONTACT_READ_FAILED", e.message, e)
        }
    }

    private fun resolveContact(uri: Uri): WritableMap {
        val result = Arguments.createMap()
        val phoneNumbers = Arguments.createArray()

        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.TYPE,
        )

        reactContext.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            val nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            val typeIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.TYPE)

            if (cursor.moveToFirst()) {
                result.putString("displayName", cursor.getString(nameIdx) ?: "")
                do {
                    val entry = Arguments.createMap()
                    entry.putString("number", cursor.getString(numberIdx) ?: "")
                    entry.putString(
                        "label",
                        ContactsContract.CommonDataKinds.Phone.getTypeLabel(
                            reactContext.resources,
                            cursor.getInt(typeIdx),
                            "Phone"
                        ).toString()
                    )
                    phoneNumbers.pushMap(entry)
                } while (cursor.moveToNext())
            }
        }

        result.putArray("phoneNumbers", phoneNumbers)
        return result
    }

    override fun onNewIntent(intent: Intent?) {}
}
