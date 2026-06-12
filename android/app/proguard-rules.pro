# React Native — keep all RN classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# GuardianCircle native modules — must survive obfuscation for RN bridge
-keep class com.guardiancircle.** { *; }
-keepclassmembers class com.guardiancircle.** {
    @com.facebook.react.bridge.ReactMethod *;
}

# Android Keystore — do not rename security classes
-keep class android.security.keystore.** { *; }
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }

# Firebase Messaging
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# WorkManager
-keep class androidx.work.** { *; }
-keepclassmembers class * extends androidx.work.Worker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# Kotlin coroutines / serialization
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature

# Preserve stack traces for crash analysis (local only — no remote reporting)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# op-sqlite / SQLCipher
-keep class com.opsqlite.** { *; }
-keep class net.sqlcipher.** { *; }

# react-native-keychain
-keep class com.oblador.keychain.** { *; }

# react-native-permissions
-keep class com.zoontek.rnpermissions.** { *; }

# Remove logging in release — Log.d / Log.v
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
}
