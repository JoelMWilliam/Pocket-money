package app.pocketmoney.mobile;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class PaymentNotificationListener extends NotificationListenerService {

    private static final String TAG = "PaymentNotifListener";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            NotificationListenerPlugin.onNotificationPosted(sbn);
        } catch (Exception e) {
            Log.e(TAG, "Error processing notification", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Not needed
    }
}
