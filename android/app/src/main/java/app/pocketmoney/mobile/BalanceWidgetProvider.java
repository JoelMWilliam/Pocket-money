package app.pocketmoney.mobile;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class BalanceWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_balance);

        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorDefaultPreferences", Context.MODE_PRIVATE);
            String storageJson = prefs.getString("pm-pocket-money-storage", null);

            if (storageJson != null) {
                views.setTextViewText(R.id.widget_balance_amount, "LKR " + extractValue(storageJson, "balance"));
                String spent = extractValue(storageJson, "expense");
                if (spent != null && !spent.isEmpty()) {
                    views.setTextViewText(R.id.widget_spent_label, "Spent: LKR " + spent);
                }
            } else {
                views.setTextViewText(R.id.widget_balance_amount, "LKR 0.00");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_balance_amount, "LKR 0.00");
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private String extractValue(String json, String key) {
        String searchKey = "\"" + key + "\":";
        int idx = json.indexOf(searchKey);
        if (idx == -1) return "0.00";
        int start = idx + searchKey.length();
        int end = start;
        while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}' && json.charAt(end) != ']') {
            end++;
        }
        String val = json.substring(start, end).trim();
        try {
            double d = Double.parseDouble(val);
            return String.format("%,.2f", d);
        } catch (NumberFormatException e) {
            return val;
        }
    }
}