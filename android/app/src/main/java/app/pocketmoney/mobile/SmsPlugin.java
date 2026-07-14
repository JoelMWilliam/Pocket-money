package app.pocketmoney.mobile;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
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

    private static final String TAG = "SmsPlugin";
    private static final int SMS_LIMIT = 200;

    @PluginMethod
    public void getMessages(PluginCall call) {
        Log.d(TAG, "getMessages called");
        if (!hasRequiredPermissions()) {
            Log.d(TAG, "permission not granted, requesting");
            requestPermissionForAlias("readSms", call, "readSmsAfterPermissionCallback");
            return;
        }
        readMessages(call);
    }

    @PermissionCallback
    private void readSmsAfterPermissionCallback(PluginCall call) {
        Log.d(TAG, "permission callback result: " + hasRequiredPermissions());
        if (hasRequiredPermissions()) {
            readMessages(call);
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = hasRequiredPermissions();
        Log.d(TAG, "checkPermission: " + granted);
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (hasRequiredPermissions()) {
            Log.d(TAG, "requestPermission: already granted");
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        Log.d(TAG, "requestPermission: requesting");
        requestPermissionForAlias("readSms", call, "readSmsPermissionCallback");
    }

    @PermissionCallback
    private void readSmsPermissionCallback(PluginCall call) {
        boolean granted = hasRequiredPermissions();
        Log.d(TAG, "requestPermission callback: " + granted);
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    public boolean hasRequiredPermissions() {
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
            Log.e(TAG, "readMessages error", e);
            call.reject("Failed to read SMS: " + e.getMessage());
            return;
        } finally {
            if (cursor != null) cursor.close();
        }

        Log.d(TAG, "readMessages count: " + messages.length());
        JSObject ret = new JSObject();
        ret.put("messages", messages);
        call.resolve(ret);
    }
}
