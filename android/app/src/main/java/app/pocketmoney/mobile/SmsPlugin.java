package app.pocketmoney.mobile;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(strings = {Manifest.permission.READ_SMS}, alias = "readSms"),
        @Permission(strings = {Manifest.permission.RECEIVE_SMS}, alias = "receiveSms")
    }
)
public class SmsPlugin extends Plugin {

    private static final int SMS_LIMIT = 100;

    @PluginMethod
    public void getMessages(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("readSms", call, "readSmsPermissionCallback");
            return;
        }
        readMessages(call);
    }

    @PermissionCallback
    private void readSmsPermissionCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            readMessages(call);
        } else {
            call.reject("SMS permission denied");
        }
    }

    private boolean hasRequiredPermissions() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private void readMessages(PluginCall call) {
        JSArray messages = new JSArray();
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(
                Uri.parse("content://sms/inbox"),
                new String[]{"_id", "address", "body", "date"},
                null,
                null,
                "date DESC LIMIT " + SMS_LIMIT
            );
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    JSObject msg = new JSObject();
                    msg.put("id", cursor.getString(cursor.getColumnIndexOrThrow("_id")));
                    msg.put("address", cursor.getString(cursor.getColumnIndexOrThrow("address")));
                    msg.put("body", cursor.getString(cursor.getColumnIndexOrThrow("body")));
                    msg.put("date", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
                    messages.put(msg);
                }
            }
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage());
            return;
        } finally {
            if (cursor != null) cursor.close();
        }

        JSObject ret = new JSObject();
        ret.put("messages", messages);
        call.resolve(ret);
    }
}
