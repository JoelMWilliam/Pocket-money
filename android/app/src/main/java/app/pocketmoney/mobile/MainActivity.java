package app.pocketmoney.mobile;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate(), because BridgeActivity
        // creates the Bridge inside super.onCreate(). Plugins registered after
        // that are silently ignored.
        registerPlugin(SmsPlugin.class);
        registerPlugin(SocialLoginPlugin.class);
        registerPlugin(NotificationListenerPlugin.class);
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Marker interface required by @capgo/capacitor-social-login for Google scopes.
    }
}
