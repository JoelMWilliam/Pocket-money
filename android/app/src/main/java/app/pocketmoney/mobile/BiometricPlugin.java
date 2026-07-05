package app.pocketmoney.mobile;

import android.app.Activity;
import android.content.Context;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        BiometricManager biometricManager = BiometricManager.from(getContext());
        int canAuth = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
        JSObject ret = new JSObject();
        ret.put("available", canAuth == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(ret);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        Activity activity = getActivity();
        if (!(activity instanceof FragmentActivity)) {
            call.reject("Host activity must be a FragmentActivity");
            return;
        }

        FragmentActivity fragmentActivity = (FragmentActivity) activity;
        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt biometricPrompt = new BiometricPrompt(fragmentActivity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                call.reject(errString.toString(), String.valueOf(errorCode));
            }

            @Override
            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                JSObject ret = new JSObject();
                ret.put("verified", true);
                call.resolve(ret);
            }

            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                call.reject("Authentication failed");
            }
        });

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(call.getString("title", "Authenticate"))
            .setSubtitle(call.getString("subtitle", "Use your biometric credential"))
            .setNegativeButtonText(call.getString("cancel", "Cancel"))
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL)
            .build();

        biometricPrompt.authenticate(promptInfo);
    }
}
