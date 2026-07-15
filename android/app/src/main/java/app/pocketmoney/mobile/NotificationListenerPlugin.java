package app.pocketmoney.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "NotificationListener")
public class NotificationListenerPlugin extends Plugin {

    private static final String TAG = "NotifListener";
    private static final Set<String> PAYMENT_PACKAGES = new HashSet<>();
    private static final List<JSObject> pendingNotifications = new ArrayList<>();

    static {
        PAYMENT_PACKAGES.add("com.google.android.apps.nbu.paisa.user"); // Google Pay
        PAYMENT_PACKAGES.add("com.phonepe.app"); // PhonePe
        PAYMENT_PACKAGES.add("net.one97.paytm"); // Paytm
        PAYMENT_PACKAGES.add("in.org.npci.upiapp"); // BHIM UPI
        PAYMENT_PACKAGES.add("com.amazon.mShop.android.shopping"); // Amazon Pay
        PAYMENT_PACKAGES.add("sg.codexxa.upi"); // Cheq UPI
        PAYMENT_PACKAGES.add("com.dlg.inbank.upi"); // Dialog Bank
        PAYMENT_PACKAGES.add("com.yourbank.upi"); // Generic bank
    }

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "NotificationListenerPlugin loaded");
    }

    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        String enabled = android.provider.Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        boolean hasPermission = enabled != null && enabled.contains(getContext().getPackageName());
        JSObject ret = new JSObject();
        ret.put("granted", hasPermission);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        try {
            Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(new JSObject().put("opened", true));
        } catch (Exception e) {
            call.reject("Failed to open notification settings", e);
        }
    }

    @PluginMethod
    public void getPendingNotifications(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("notifications", pendingNotifications);
        call.resolve(ret);
        pendingNotifications.clear();
    }

    @PluginMethod
    public void clearNotifications(PluginCall call) {
        pendingNotifications.clear();
        call.resolve();
    }

    public static void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        String packageName = sbn.getPackageName();
        if (!isPaymentPackage(packageName)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        String title = "";
        String text = "";
        try {
            if (notification.extras != null) {
                CharSequence titleSeq = notification.extras.getCharSequence("android.title");
                CharSequence textSeq = notification.extras.getCharSequence("android.text");
                title = titleSeq != null ? titleSeq.toString() : "";
                text = textSeq != null ? textSeq.toString() : "";
            }
        } catch (Exception e) {
            Log.e(TAG, "Error reading notification extras", e);
        }

        if (text == null || text.isEmpty()) return;

        JSObject notif = new JSObject();
        notif.put("package", packageName);
        notif.put("title", title);
        notif.put("text", text);
        notif.put("time", System.currentTimeMillis());

        pendingNotifications.add(notif);

        if (pendingNotifications.size() > 100) {
            pendingNotifications.remove(0);
        }
    }

    private static boolean isPaymentPackage(String pkg) {
        if (pkg == null) return false;
        if (PAYMENT_PACKAGES.contains(pkg)) return true;
        return pkg.contains(".upi") || pkg.contains("pay") || pkg.contains("bank") || pkg.contains("wallet");
    }
}
