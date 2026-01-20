# Keep Dio and Retrofit classes
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keep class com.google.gson.** { *; }

# Keep model classes
-keep class com.example.verlyx_hub.** { *; }

# Keep Flutter classes
-keep class io.flutter.** { *; }
-keep class io.flutter.embedding.** { *; }

# Ignore missing Play Core classes since we don't use dynamic features
-dontwarn com.google.android.play.core.**
-ignorewarnings