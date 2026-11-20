package io.github.widyatamapro.openformul;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    private int insetTopPx = 0;
    private int insetRightPx = 0;
    private int insetBottomPx = 0;
    private int insetLeftPx = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        final View decorView = window.getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            float density = getResources().getDisplayMetrics().density;
            if (density <= 0f) density = 1f;
            insetTopPx = Math.round(bars.top / density);
            insetRightPx = Math.round(bars.right / density);
            insetBottomPx = Math.round(bars.bottom / density);
            insetLeftPx = Math.round(bars.left / density);
            pushInsetsToWebView();
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(decorView);

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new SystemBarsBridge(), "OpenFormulSystemBars");
        }
    }

    private void pushInsetsToWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final WebView webView = getBridge().getWebView();
        final String js = String.format(
            Locale.US,
            "(function(){var s=document.documentElement.style;"
                + "s.setProperty('--android-inset-top','%dpx');"
                + "s.setProperty('--android-inset-right','%dpx');"
                + "s.setProperty('--android-inset-bottom','%dpx');"
                + "s.setProperty('--android-inset-left','%dpx');})();",
            insetTopPx,
            insetRightPx,
            insetBottomPx,
            insetLeftPx
        );
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private final class SystemBarsBridge {

        @JavascriptInterface
        public void setSystemBars(String statusHex, String navHex, boolean isDarkBackground) {
            runOnUiThread(() -> {
                Window window = getWindow();
                View decorView = window.getDecorView();
                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, decorView);
                if (controller != null) {
                    controller.setAppearanceLightStatusBars(!isDarkBackground);
                    controller.setAppearanceLightNavigationBars(!isDarkBackground);
                }

                try {
                    int parsedStatus = Color.parseColor(statusHex);
                    decorView.setBackgroundColor(parsedStatus);
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().setBackgroundColor(parsedStatus);
                    }
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                        window.setStatusBarColor(parsedStatus);
                        window.setNavigationBarColor(Color.parseColor(navHex));
                    }
                } catch (IllegalArgumentException ignored) {
                    // Ignore malformed hex string
                }
                pushInsetsToWebView();
            });
        }

        @JavascriptInterface
        public String getSystemInsetsCss() {
            return String.format(
                Locale.US,
                "{\"top\":%d,\"right\":%d,\"bottom\":%d,\"left\":%d}",
                insetTopPx,
                insetRightPx,
                insetBottomPx,
                insetLeftPx
            );
        }
    }
}
