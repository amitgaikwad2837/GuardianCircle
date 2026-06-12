package com.guardiancircle

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript.
     * Must match AppRegistry.registerComponent in index.js.
     */
    override fun getMainComponentName(): String = "GuardianCircle"

    /**
     * Returns the instance of ReactActivityDelegate.
     * Using DefaultReactActivityDelegate which handles both old and new architecture.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        // SplashScreen.show(this) — uncomment after adding androidx.core:core-splashscreen
        super.onCreate(savedInstanceState)
    }
}
