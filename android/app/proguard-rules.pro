# Keep Capacitor and WebView classes
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-dontwarn com.getcapacitor.**
-keepattributes *Annotation*
-keepattributes JavascriptInterface
