package com.guardiancircle.modules

import android.content.Context
import android.security.keystore.KeyProperties
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyStore
import kotlin.system.exitProcess

/**
 * Native data wipe module.
 *
 * Handles operations that JavaScript cannot perform:
 *  - Deleting the SQLCipher database file from the filesystem
 *  - Clearing the gc_db_key_v1 SharedPreferences entry (encrypted passphrase blob)
 *  - Deleting all GuardianCircle keys from Android Keystore
 *  - Force-exiting the process so the app restarts clean
 *
 * JavaScript clears MMKV and react-native-keychain entries before calling this module.
 */
class WipeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WipeModule"

    private val keystoreAliases = listOf(
        "db_encryption_key",
        "identity_private_key",
        "fcm_encryption_key",
    )

    @ReactMethod
    fun wipeAll(promise: Promise) {
        val errors = mutableListOf<String>()

        // 1. Delete the SQLCipher database file
        try {
            val dbFile = reactApplicationContext.getDatabasePath("guardiancircle.db")
            if (dbFile.exists()) {
                val deleted = dbFile.delete()
                if (!deleted) errors.add("DB file delete returned false")
            }
            // Also remove SQLCipher journal / WAL files if present
            listOf("-shm", "-wal", "-journal").forEach { suffix ->
                reactApplicationContext.getDatabasePath("guardiancircle.db$suffix").delete()
            }
        } catch (e: Exception) {
            errors.add("dbFile: ${e.message}")
        }

        // 2. Clear SharedPreferences that holds the encrypted passphrase blob
        try {
            reactApplicationContext
                .getSharedPreferences("gc_db_key_v1", Context.MODE_PRIVATE)
                .edit()
                .clear()
                .apply()
        } catch (e: Exception) {
            errors.add("prefs: ${e.message}")
        }

        // 3. Delete all GuardianCircle keys from Android Keystore
        try {
            val ks = KeyStore.getInstance("AndroidKeyStore").also { it.load(null) }
            for (alias in keystoreAliases) {
                if (ks.containsAlias(alias)) {
                    ks.deleteEntry(alias)
                }
            }
        } catch (e: Exception) {
            errors.add("keystore: ${e.message}")
        }

        if (errors.isNotEmpty()) {
            // Partial failure — still attempt to exit so the app is in a clean state on next launch
            promise.reject("WIPE_PARTIAL", "Wipe completed with errors: ${errors.joinToString("; ")}")
        } else {
            promise.resolve(null)
        }

        // 4. Force-exit the process — on next launch the app initialises from scratch
        // Delay briefly so the promise can resolve before the process dies
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            exitProcess(0)
        }, 500)
    }
}
