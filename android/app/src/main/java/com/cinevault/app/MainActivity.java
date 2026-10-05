package com.cinevault.app;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import android.content.Context;
import android.os.Environment;
import java.io.BufferedReader;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends BridgeActivity {
    private static Context appContext;
    private long lastBackPressTime = 0;
    private boolean isImmersiveLandscape = false;

    private static String cachedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjc0MDk3NDg3NjU0NTg3MTg4NDgsImF0cCI6MywiZXh0IjoiMTc5MDY5MTgwOCIsImV4cCI6MTc5ODQ2NzgwOCwiaWF0IjoxNzkwNjkxNTA4fQ.wYD3dZn6Luu6rVpEbGJ6GyFctbFvjrfp9m25BUcODao";
    private static String cachedXUser = "{\"token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjc0MDk3NDg3NjU0NTg3MTg4NDgsImF0cCI6MywiZXh0IjoiMTc5MDY5MTgwOCIsImV4cCI6MTc5ODQ2NzgwOCwiaWF0IjoxNzkwNjkxNTA4fQ.wYD3dZn6Luu6rVpEbGJ6GyFctbFvjrfp9m25BUcODao\",\"userId\":\"7409748765458718848\",\"userType\":0,\"appType\":3}";
    private static long tokenExpiresAt = System.currentTimeMillis() + 86400000L * 30;
    private static final Map<String, String> REDIRECT_CACHE = new java.util.concurrent.ConcurrentHashMap<>();
    private static final Map<String, String> STREAM_CACHE = new java.util.concurrent.ConcurrentHashMap<>();
    private static final Map<String, Long> STREAM_CACHE_TS = new java.util.concurrent.ConcurrentHashMap<>();

    static {
        try {
            System.setProperty("http.keepAlive", "true");
            System.setProperty("http.maxConnections", "30");
        } catch (Exception ignored) {}
    }

    // ========================================================
    // HIGH-SPEED LOCAL HTTP STREAMING PROXY (127.0.0.1)
    // Enables native, hardware-accelerated HTTP Range seeking
    // for HTML5 Video without WebView shouldInterceptRequest deadlocks.
    // ==========================================
    private static int localProxyPort = 0;
    private static ServerSocket localProxyServer = null;
    // Bound proxy thread pool to 4 workers to prevent socket thread explosion during rapid scrubbing
    private static final ExecutorService PROXY_EXECUTOR = Executors.newFixedThreadPool(4);

    public static synchronized void ensureLocalProxyServer() {
        if (localProxyServer != null && !localProxyServer.isClosed() && localProxyPort > 0) {
            return;
        }
        try {
            try {
                localProxyServer = new ServerSocket(8888, 100, InetAddress.getByName("127.0.0.1"));
            } catch (Exception ignored) {
                localProxyServer = new ServerSocket(0, 100, InetAddress.getByName("127.0.0.1"));
            }
            localProxyPort = localProxyServer.getLocalPort();
            Thread listenerThread = new Thread(() -> {
                while (localProxyServer != null && !localProxyServer.isClosed()) {
                    try {
                        final Socket client = localProxyServer.accept();
                        client.setTcpNoDelay(true);
                        client.setSoTimeout(30000);
                        PROXY_EXECUTOR.execute(() -> handleProxyClient(client));
                    } catch (Exception e) {
                        if (localProxyServer == null || localProxyServer.isClosed()) break;
                    }
                }
            }, "CineVault-ProxyListener");
            listenerThread.setDaemon(true);
            listenerThread.start();
        } catch (Exception ignored) {}
    }

    public static String getProxyVideoUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isEmpty()) return "";
        if (rawUrl.contains("https://localhost/local_media") || rawUrl.contains("127.0.0.1/local_media")) return rawUrl;
        try {
            if (rawUrl.startsWith("file://") || rawUrl.startsWith("/") || rawUrl.contains("local_media") || rawUrl.startsWith("content://")) {
                String path = rawUrl;
                if (rawUrl.contains("path=")) {
                    Uri u = Uri.parse(rawUrl);
                    String p = u.getQueryParameter("path");
                    if (p != null) path = p;
                } else if (rawUrl.startsWith("file://")) {
                    path = rawUrl.substring(7);
                }
                return "https://localhost/local_media?path=" + URLEncoder.encode(path, "UTF-8");
            }
            if (rawUrl.contains("127.0.0.1") || rawUrl.contains("localhost")) return rawUrl;
            ensureLocalProxyServer();
            if (localProxyPort <= 0) return rawUrl;
            return "http://127.0.0.1:" + localProxyPort + "/stream?url=" + URLEncoder.encode(rawUrl, "UTF-8");
        } catch (Exception e) {
            return rawUrl;
        }
    }

    private static void handleProxyClient(Socket client) {
        HttpURLConnection cdnConn = null;
        RandomAccessFile raf = null;
        try {
            InputStream in = client.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, "UTF-8"));
            String reqLine = reader.readLine();
            if (reqLine == null || reqLine.trim().isEmpty()) {
                client.close();
                return;
            }

            String[] parts = reqLine.split(" ");
            if (parts.length < 2) {
                client.close();
                return;
            }

            String method = parts[0].toUpperCase();
            String path = parts[1];

            // Read request headers
            String rangeHeader = null;
            String line;
            while ((line = reader.readLine()) != null && !line.trim().isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String k = line.substring(0, colon).trim();
                    String v = line.substring(colon + 1).trim();
                    if (k.equalsIgnoreCase("Range")) {
                        rangeHeader = v;
                    }
                }
            }

            OutputStream out = client.getOutputStream();

            // Handle CORS OPTIONS preflight
            if ("OPTIONS".equals(method)) {
                String cors = "HTTP/1.1 200 OK\r\n" +
                              "Access-Control-Allow-Origin: *\r\n" +
                              "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                              "Access-Control-Allow-Headers: *\r\n" +
                              "Access-Control-Max-Age: 86400\r\n" +
                              "Content-Length: 0\r\n" +
                              "Connection: close\r\n\r\n";
                out.write(cors.getBytes("UTF-8"));
                out.flush();
                return;
            }

            // Route 1: Local downloaded media playback
            if (path.startsWith("/local_media")) {
                Uri parsedUri = Uri.parse("http://127.0.0.1" + path);
                String filePath = parsedUri.getQueryParameter("path");
                if (filePath == null || filePath.isEmpty()) {
                    writeProxy404(out);
                    return;
                }
                try {
                    filePath = URLDecoder.decode(filePath, "UTF-8");
                } catch (Exception ignored) {}

                File localFile = new File(filePath);
                if (!localFile.exists() || !localFile.canRead()) {
                    String fileName = new File(filePath).getName();
                    File f1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "CineVault/" + fileName);
                    File f2 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fileName);
                    File f3 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "CineVault/" + fileName);
                    File f4 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), fileName);
                    if (f1.exists() && f1.canRead()) {
                        localFile = f1;
                    } else if (f2.exists() && f2.canRead()) {
                        localFile = f2;
                    } else if (f3.exists() && f3.canRead()) {
                        localFile = f3;
                    } else if (f4.exists() && f4.canRead()) {
                        localFile = f4;
                    } else if (appContext != null) {
                        File extM = new File(appContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES), fileName);
                        File extD = new File(appContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName);
                        if (extM.exists() && extM.canRead()) localFile = extM;
                        else if (extD.exists() && extD.canRead()) localFile = extD;
                    }
                }

                if (!localFile.exists() || !localFile.canRead()) {
                    writeProxy404(out);
                    return;
                }

                long fileLen = localFile.length();
                long start = 0;
                long end = fileLen - 1;
                boolean isPartial = false;

                if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                    String rangeVal = rangeHeader.substring(6).trim();
                    int dash = rangeVal.indexOf('-');
                    if (dash != -1) {
                        String startStr = rangeVal.substring(0, dash).trim();
                        String endStr = rangeVal.substring(dash + 1).trim();
                        try {
                            if (!startStr.isEmpty()) {
                                start = Long.parseLong(startStr);
                            }
                            if (!endStr.isEmpty()) {
                                end = Long.parseLong(endStr);
                            } else {
                                end = fileLen - 1;
                            }
                            if (end >= fileLen) end = fileLen - 1;
                            if (start < 0) start = 0;
                            isPartial = true;
                        } catch (Exception ignored) {}
                    }
                } else {
                    // Standard full file response: no artificial chunking
                    start = 0;
                    end = fileLen - 1;
                    isPartial = false;
                }

                long contentLen = Math.max(0, end - start + 1);
                raf = new RandomAccessFile(localFile, "r");
                raf.seek(start);

                try {
                    client.setSendBufferSize(512 * 1024);
                    client.setReceiveBufferSize(512 * 1024);
                    client.setTcpNoDelay(true);
                } catch (Exception ignored) {}

                BufferedOutputStream bOut = new BufferedOutputStream(out, 131072);

                StringBuilder resp = new StringBuilder();
                resp.append(isPartial ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
                resp.append("Content-Type: video/mp4\r\n");
                resp.append("Accept-Ranges: bytes\r\n");
                resp.append("Content-Length: ").append(contentLen).append("\r\n");
                if (isPartial) {
                    resp.append("Content-Range: bytes ").append(start).append("-").append(end).append("/").append(fileLen).append("\r\n");
                }
                resp.append("Access-Control-Allow-Origin: *\r\n");
                resp.append("Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n");
                resp.append("Access-Control-Allow-Headers: *\r\n");
                resp.append("Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n");
                resp.append("Cache-Control: public, max-age=86400, no-transform\r\n");
                resp.append("Connection: keep-alive\r\n\r\n");
                bOut.write(resp.toString().getBytes("UTF-8"));
                bOut.flush();

                if (!"HEAD".equals(method)) {
                    byte[] buf = new byte[65536];
                    long remaining = contentLen;
                    while (remaining > 0) {
                        int toRead = (int) Math.min(buf.length, remaining);
                        int r = raf.read(buf, 0, toRead);
                        if (r == -1) break;
                        try {
                            bOut.write(buf, 0, r);
                            bOut.flush();
                        } catch (IOException e) {
                            // Client closed or seeked away cleanly
                            break;
                        }
                        remaining -= r;
                    }
                    try { bOut.flush(); } catch (Exception ignored) {}
                }
                return;
            }

            // Route 2: Remote CDN video stream (Optimized for instant start, zero buffer lag, and 128KB chunk piping)
            if (path.startsWith("/stream")) {
                Uri parsedUri = Uri.parse("http://127.0.0.1" + path);
                String targetUrl = parsedUri.getQueryParameter("url");
                if (targetUrl == null || targetUrl.isEmpty()) {
                    writeProxy404(out);
                    return;
                }

                // High-performance TCP socket tuning
                try {
                    client.setTcpNoDelay(true);
                    client.setSendBufferSize(256 * 1024);
                    client.setReceiveBufferSize(256 * 1024);
                } catch (Exception ignored) {}

                String effectiveUrl = targetUrl;
                if (REDIRECT_CACHE.containsKey(targetUrl)) {
                    String cached = REDIRECT_CACHE.get(targetUrl);
                    if (cached != null && !cached.isEmpty()) {
                        effectiveUrl = cached;
                    }
                }

                URL url = new URL(effectiveUrl);
                cdnConn = (HttpURLConnection) url.openConnection();
                cdnConn.setRequestMethod(method);
                cdnConn.setConnectTimeout(5000);
                cdnConn.setReadTimeout(15000);
                cdnConn.setInstanceFollowRedirects(false);

                cdnConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                String lowerEffective = effectiveUrl.toLowerCase();
                if (lowerEffective.contains("aoneroom.com")) {
                    cdnConn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                    cdnConn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                } else {
                    cdnConn.setRequestProperty("Referer", "https://mzfi.me/");
                    cdnConn.setRequestProperty("Origin", "https://mzfi.me");
                }
                cdnConn.setRequestProperty("Accept", "*/*");
                cdnConn.setRequestProperty("Accept-Encoding", "identity");

                if (rangeHeader != null) {
                    cdnConn.setRequestProperty("Range", rangeHeader);
                }

                int cdnCode = cdnConn.getResponseCode();

                // If cached edge redirect failed, evict cache and reconnect directly to original targetUrl
                if (cdnCode >= 400 && !effectiveUrl.equals(targetUrl)) {
                    REDIRECT_CACHE.remove(targetUrl);
                    effectiveUrl = targetUrl;
                    try { cdnConn.disconnect(); } catch (Exception ignored) {}
                    url = new URL(effectiveUrl);
                    cdnConn = (HttpURLConnection) url.openConnection();
                    cdnConn.setRequestMethod(method);
                    cdnConn.setConnectTimeout(5000);
                    cdnConn.setReadTimeout(15000);
                    cdnConn.setInstanceFollowRedirects(false);
                    cdnConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    lowerEffective = effectiveUrl.toLowerCase();
                    if (lowerEffective.contains("aoneroom.com")) {
                        cdnConn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                        cdnConn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                    } else {
                        cdnConn.setRequestProperty("Referer", "https://mzfi.me/");
                        cdnConn.setRequestProperty("Origin", "https://mzfi.me");
                    }
                    cdnConn.setRequestProperty("Accept", "*/*");
                    cdnConn.setRequestProperty("Accept-Encoding", "identity");
                    if (rangeHeader != null) {
                        cdnConn.setRequestProperty("Range", rangeHeader);
                    }
                    cdnCode = cdnConn.getResponseCode();
                }

                // Follow redirects manually while preserving Range & Referer headers, and cache the target edge URL
                int redirects = 0;
                while (cdnCode >= 300 && cdnCode < 400 && redirects < 5) {
                    String loc = cdnConn.getHeaderField("Location");
                    cdnConn.disconnect();
                    if (loc == null || loc.isEmpty()) break;
                    URL nextUrl = new URL(url, loc);
                    effectiveUrl = nextUrl.toString();
                    REDIRECT_CACHE.put(targetUrl, effectiveUrl);
                    url = nextUrl;
                    cdnConn = (HttpURLConnection) nextUrl.openConnection();
                    cdnConn.setRequestMethod(method);
                    cdnConn.setConnectTimeout(5000);
                    cdnConn.setReadTimeout(15000);
                    cdnConn.setInstanceFollowRedirects(false);
                    cdnConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    lowerEffective = effectiveUrl.toLowerCase();
                    if (lowerEffective.contains("aoneroom.com")) {
                        cdnConn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                        cdnConn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                    } else {
                        cdnConn.setRequestProperty("Referer", "https://mzfi.me/");
                        cdnConn.setRequestProperty("Origin", "https://mzfi.me");
                    }
                    cdnConn.setRequestProperty("Accept", "*/*");
                    cdnConn.setRequestProperty("Accept-Encoding", "identity");
                    if (rangeHeader != null) {
                        cdnConn.setRequestProperty("Range", rangeHeader);
                    }
                    cdnCode = cdnConn.getResponseCode();
                    redirects++;
                }

                String contentRange = cdnConn.getHeaderField("Content-Range");
                String contentLength = cdnConn.getHeaderField("Content-Length");
                String contentType = cdnConn.getHeaderField("Content-Type");
                if (contentType == null || contentType.isEmpty() || contentType.contains("octet-stream")) {
                    contentType = "video/mp4";
                }

                BufferedOutputStream bOut = new BufferedOutputStream(out, 131072);
                StringBuilder resp = new StringBuilder();
                if (cdnCode == 206) {
                    resp.append("HTTP/1.1 206 Partial Content\r\n");
                } else if (cdnCode == 200) {
                    resp.append("HTTP/1.1 200 OK\r\n");
                } else if (cdnCode == 416) {
                    resp.append("HTTP/1.1 416 Range Not Satisfiable\r\n");
                } else {
                    resp.append("HTTP/1.1 ").append(cdnCode).append(" OK\r\n");
                }

                resp.append("Content-Type: ").append(contentType).append("\r\n");
                resp.append("Accept-Ranges: bytes\r\n");
                if (contentRange != null && !contentRange.isEmpty()) {
                    resp.append("Content-Range: ").append(contentRange).append("\r\n");
                }
                if (contentLength != null && !contentLength.isEmpty()) {
                    resp.append("Content-Length: ").append(contentLength).append("\r\n");
                }
                resp.append("Access-Control-Allow-Origin: *\r\n");
                resp.append("Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n");
                resp.append("Access-Control-Allow-Headers: *\r\n");
                resp.append("Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n");
                resp.append("Cache-Control: public, max-age=7200\r\n");
                resp.append("Connection: keep-alive\r\n\r\n");
                bOut.write(resp.toString().getBytes("UTF-8"));
                bOut.flush();

                if (!"HEAD".equals(method) && cdnCode < 400) {
                    InputStream rawIn = cdnConn.getInputStream();
                    BufferedInputStream bIn = new BufferedInputStream(rawIn, 131072);
                    byte[] buf = new byte[131072];
                    int r;
                    boolean isFirstChunk = true;
                    while ((r = bIn.read(buf)) != -1) {
                        try {
                            bOut.write(buf, 0, r);
                            if (isFirstChunk) {
                                bOut.flush();
                                isFirstChunk = false;
                            }
                        } catch (IOException e) {
                            // Client closed or seeked away; cleanly exit immediately
                            break;
                        }
                    }
                    try { bOut.flush(); } catch (Exception ignored) {}
                    try { bIn.close(); } catch (Exception ignored) {}
                }
                return;
            }

            writeProxy404(out);
        } catch (Exception ignored) {
        } finally {
            if (raf != null) {
                try { raf.close(); } catch (Exception ignored) {}
            }
            if (cdnConn != null) {
                try { cdnConn.disconnect(); } catch (Exception ignored) {}
            }
            try { client.close(); } catch (Exception ignored) {}
        }
    }

    private static void writeProxy404(OutputStream out) {
        try {
            out.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".getBytes("UTF-8"));
            out.flush();
        } catch (Exception ignored) {}
    }


    public static synchronized void ensureMovieBoxToken() {
        ensureMovieBoxToken(false);
    }

    public static synchronized void ensureMovieBoxToken(boolean forceRefresh) {
        if (!forceRefresh && !cachedToken.isEmpty() && System.currentTimeMillis() < tokenExpiresAt) {
            return;
        }
        String[] authUrls = new String[] {
            "https://mzfi.me/wefeed-h5api-bff/subject/trending?page=1&perPage=1",
            "https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/trending?page=1&perPage=1"
        };
        for (String authUrl : authUrls) {
            try {
                URL url = new URL(authUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(2000);
                conn.setReadTimeout(2000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                conn.setRequestProperty("Origin", "https://mzfi.me");
                conn.setRequestProperty("Referer", "https://mzfi.me/");

                int code = conn.getResponseCode();
                if (code == 200) {
                    String xUser = conn.getHeaderField("x-user");
                    String token = conn.getHeaderField("token");
                    String setCookie = conn.getHeaderField("Set-Cookie");

                    if (xUser != null && !xUser.isEmpty()) {
                        cachedXUser = xUser;
                        try {
                            org.json.JSONObject u = new org.json.JSONObject(xUser);
                            if (u.has("token")) {
                                token = u.getString("token");
                            }
                        } catch (Exception ignored) {}
                    }

                    if ((token == null || token.isEmpty()) && setCookie != null) {
                        java.util.regex.Matcher m = java.util.regex.Pattern.compile("token=([^;]+)").matcher(setCookie);
                        if (m.find()) {
                            token = m.group(1);
                        }
                    }

                    if (token != null && !token.isEmpty()) {
                        cachedToken = token;
                        tokenExpiresAt = System.currentTimeMillis() + 86400000L * 30;
                        break;
                    }
                }
            } catch (Exception ignored) {}
        }
    }

    // Comprehensive list of ad, tracker, popunder, and betting network domains to intercept & block
    private static final String[] BLOCKED_AD_DOMAINS = new String[] {
        "adsterra", "popads", "popcash", "propellerads", "monetag", "clickadu",
        "exoclick", "admaven", "histats", "doubleclick", "googlesyndication",
        "googleadservices", "adnxs", "trafficjunky", "ad-delivery", "bet365",
        "1xbet", "parimatch", "mostbet", "casino", "onclickmega", "alwingulla",
        "doodstream", "outbrain", "taboola", "mgid", "zergnet", "adform",
        "smartadserver", "criteo", "rubiconproject", "pubmatic", "revcontent",
        "adroll", "trafficstars", "juicyads", "ero-advertising", "adxpose",
        "popunder", "directrev", "adtrue", "inpagepush", "pushwoosh",
        "onesignal", "syndication", "servehalfdelivery", "cloudtag", "adpush",
        "hilltopads", "richpush", "vidoomy", "adsupply", "trafficfactory",
        "adsteroid", "yllix", "bidgear", "adcash", "bidvertiser", "clickaine",
        "betting", "betway", "stake.com", "vlitag", "adskeeper", "galadrewards",
        "coinhive", "coin-have", "cryptoloot", "cryptobrowser"
    };

    /**
     * VIP Ad-Shield WebViewClient
     * Intercepts and drops ad/tracker network requests, blocks rogue redirects,
     * and prevents external ad scripts from hijacking the top-level window.
     */
    public static class AdShieldWebViewClient extends BridgeWebViewClient {
        public AdShieldWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (request != null && request.getUrl() != null) {
                String urlStr = request.getUrl().toString();
                String host = request.getUrl().getHost();
                if (host != null) {
                    String hostLower = host.toLowerCase();
                    String urlLower = urlStr.toLowerCase();

                    // Block rogue ad / tracker domains immediately
                    for (String domain : BLOCKED_AD_DOMAINS) {
                        if (hostLower.contains(domain) || urlLower.contains(domain)) {
                            // Silently drop ad request by returning an empty byte stream response
                            return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
                        }
                    }

                    // Local downloaded media playback handler
                    if (urlLower.contains("local_media") || urlLower.contains("localhost/local_media")) {
                        WebResourceResponse localResp = handleLocalMediaRequest(request);
                        if (localResp != null) {
                            return localResp;
                        }
                    }

                    // 1. Let Capacitor Bridge handle all app bundle assets on https://localhost/
                    if (hostLower.contains("localhost")) {
                        return super.shouldInterceptRequest(view, request);
                    }

                    // 2. Local loopback streaming proxy (127.0.0.1) - let Chromium talk directly to the TCP socket
                    if (hostLower.equals("127.0.0.1") || hostLower.contains("127.0.0.1")) {
                        return null;
                    }

                    // 3. Image requests delegate directly to Chromium's native HTTP disk cache
                    // avoiding JNI binder context switching, disk-stat stalls, and main thread MD5 hashing overhead.

                    // Native MovieBox Stream & API Proxy
                    // MovieBox CDN (hakunaymatata.com, bcdn.biz, bytefuntimes) returns 429/403 unless Referer: https://mzfi.me/
                    // MovieBox API (aoneroom.com) requires Origin/Referer: aoneroom.com
                    boolean hasRange = request.getRequestHeaders() != null &&
                        request.getRequestHeaders().keySet().stream().anyMatch(k -> k != null && k.equalsIgnoreCase("Range"));

                    boolean isMovieBoxDomain = hostLower.contains("hakunaymatata.com") ||
                                               hostLower.contains("bcdn.biz") ||
                                               hostLower.contains("bytefuntimes") ||
                                               hostLower.contains("funtimes") ||
                                               hostLower.contains("wixx.me") ||
                                               hostLower.contains("aoneroom.com") ||
                                               hostLower.contains("mzfi.me") ||
                                               urlLower.contains("proxy_video");

                    if (isMovieBoxDomain) {
                        WebResourceResponse proxied = proxyMovieBoxRequest(request);
                        if (proxied != null) {
                            return proxied;
                        }
                    }

                    // Native Live TV Stream & HLS Proxy
                    // Intercepts Live TV playlists (.m3u8), keys (serve.key), and transport stream segments (.ts/.m4s)
                    // Solves CORS restrictions and missing Access-Control-Allow-Origin headers across Sony LIV, Akamai, CloudFront
                    boolean isLiveTvReq = urlLower.contains(".m3u8") ||
                                          urlLower.contains(".ts") ||
                                          urlLower.contains(".m4s") ||
                                          urlLower.contains("slivcdn.com") ||
                                          urlLower.contains("cloudplay-sonyliv") ||
                                          urlLower.contains("serve.key") ||
                                          urlLower.contains("tangotv.in") ||
                                          urlLower.contains("smartplaytv.in") ||
                                          urlLower.contains("wiseplayout.com") ||
                                          urlLower.contains("akamaized.net");

                    if (isLiveTvReq) {
                        WebResourceResponse liveProxied = proxyLiveTvRequest(request);
                        if (liveProxied != null) {
                            return liveProxied;
                        }
                    }
                }
            }
            return super.shouldInterceptRequest(view, request);
        }



        private static WebResourceResponse handleLocalMediaRequest(WebResourceRequest request) {
            try {
                Uri uri = request.getUrl();
                if (uri == null) return null;
                String path = uri.getQueryParameter("path");
                if (path == null || path.isEmpty()) return null;

                File file = null;
                long totalLength = 0;
                android.os.ParcelFileDescriptor pfd = null;

                if (path.startsWith("content://") && appContext != null) {
                    try {
                        pfd = appContext.getContentResolver().openFileDescriptor(Uri.parse(path), "r");
                        if (pfd != null) {
                            totalLength = pfd.getStatSize();
                        }
                    } catch (Exception ignored) {}
                }

                if (pfd == null) {
                    file = new File(path);
                    if (!file.exists() || !file.canRead()) {
                        String fileName = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
                        if (appContext != null) {
                            File extDl = appContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                            if (extDl != null) {
                                File alt1 = new File(extDl, fileName);
                                if (alt1.exists() && alt1.canRead()) file = alt1;
                            }
                            if (!file.exists() || !file.canRead()) {
                                File extMovies = appContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES);
                                if (extMovies != null) {
                                    File alt2 = new File(extMovies, fileName);
                                    if (alt2.exists() && alt2.canRead()) file = alt2;
                                }
                            }
                        }
                        if (!file.exists() || !file.canRead()) {
                            File f1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "CineVault/" + fileName);
                            File f2 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fileName);
                            File f3 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "CineVault/" + fileName);
                            if (f1.exists() && f1.canRead()) file = f1;
                            else if (f2.exists() && f2.canRead()) file = f2;
                            else if (f3.exists() && f3.canRead()) file = f3;
                        }
                    }
                    if (file == null || !file.exists() || !file.canRead()) return null;
                    totalLength = file.length();
                }

                long start = 0;
                long end = totalLength - 1;

                String rangeHeader = null;
                if (request.getRequestHeaders() != null) {
                    for (Map.Entry<String, String> e : request.getRequestHeaders().entrySet()) {
                        if (e.getKey() != null && e.getKey().equalsIgnoreCase("Range")) {
                            rangeHeader = e.getValue();
                            break;
                        }
                    }
                }

                int statusCode = 200;
                String statusMsg = "OK";
                if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                    String[] parts = rangeHeader.substring(6).split("-");
                    try {
                        if (parts.length > 0 && !parts[0].isEmpty()) {
                            start = Long.parseLong(parts[0]);
                        }
                        if (parts.length > 1 && !parts[1].isEmpty()) {
                            end = Long.parseLong(parts[1]);
                        }
                        statusCode = 206;
                        statusMsg = "Partial Content";
                    } catch (Exception ignored) {}
                }

                long contentLength = end - start + 1;
                final long bytesToRead = contentLength;
                InputStream stream;

                if (file != null) {
                    final RandomAccessFile raf = new RandomAccessFile(file, "r");
                    raf.seek(start);
                    stream = new InputStream() {
                        private long readCount = 0;
                        @Override
                        public int read() throws IOException {
                            if (readCount >= bytesToRead) return -1;
                            int b = raf.read();
                            if (b != -1) readCount++;
                            return b;
                        }
                        @Override
                        public int read(byte[] b, int off, int len) throws IOException {
                            if (readCount >= bytesToRead) return -1;
                            int max = (int) Math.min(len, bytesToRead - readCount);
                            int r = raf.read(b, off, max);
                            if (r > 0) readCount += r;
                            return r;
                        }
                        @Override
                        public void close() throws IOException {
                            try { raf.close(); } catch (Exception ignored) {}
                        }
                    };
                } else {
                    final android.os.ParcelFileDescriptor finalPfd = pfd;
                    final FileInputStream fis = new FileInputStream(finalPfd.getFileDescriptor());
                    fis.getChannel().position(start);
                    stream = new InputStream() {
                        private long readCount = 0;
                        @Override
                        public int read() throws IOException {
                            if (readCount >= bytesToRead) return -1;
                            int b = fis.read();
                            if (b != -1) readCount++;
                            return b;
                        }
                        @Override
                        public int read(byte[] b, int off, int len) throws IOException {
                            if (readCount >= bytesToRead) return -1;
                            int max = (int) Math.min(len, bytesToRead - readCount);
                            int r = fis.read(b, off, max);
                            if (r > 0) readCount += r;
                            return r;
                        }
                        @Override
                        public void close() throws IOException {
                            try { fis.close(); } catch (Exception ignored) {}
                            try { finalPfd.close(); } catch (Exception ignored) {}
                        }
                    };
                }

                Map<String, String> headers = new HashMap<>();
                headers.put("Content-Type", "video/mp4");
                headers.put("Accept-Ranges", "bytes");
                headers.put("Content-Length", String.valueOf(contentLength));
                headers.put("Cache-Control", "public, max-age=86400");
                if (statusCode == 206) {
                    headers.put("Content-Range", "bytes " + start + "-" + end + "/" + totalLength);
                }
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
                headers.put("Access-Control-Allow-Headers", "*");

                return new WebResourceResponse("video/mp4", null, statusCode, statusMsg, headers, stream);
            } catch (Exception e) {
                return null;
            }
        }

        private static WebResourceResponse proxyMovieBoxRequest(WebResourceRequest request) {
            try {
                Uri uri = request.getUrl();
                if (uri == null) return null;
                String urlStr = uri.toString();

                if (urlStr.contains("proxy_video")) {
                    String extracted = uri.getQueryParameter("url");
                    if (extracted != null && !extracted.isEmpty()) {
                        urlStr = extracted;
                        uri = Uri.parse(urlStr);
                    }
                }

                String originalRequestedUrl = urlStr;
                boolean hasRangeHeader = request.getRequestHeaders() != null && 
                    request.getRequestHeaders().keySet().stream().anyMatch(k -> k != null && k.equalsIgnoreCase("Range"));

                String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";

                boolean isVideo = hasRangeHeader || urlStr.contains(".mp4") || urlStr.contains("tran-audio") ||
                                  (urlStr.contains("sign=") && (host.contains("cdn") || host.contains("hakunaymatata") || host.contains("bcdn"))) ||
                                  host.contains("hakunaymatata.com") || host.contains("bcdn") || host.contains("bytefuntimes") ||
                                  host.contains("funtimes") || host.contains("wixx.me");

                // Video and Range requests must NEVER use cached redirect edge URLs because edge tokens expire quickly
                // and cause seeking to freeze or fail with 403/410/timeout.
                if (!isVideo && !hasRangeHeader && REDIRECT_CACHE.containsKey(originalRequestedUrl)) {
                    urlStr = REDIRECT_CACHE.get(originalRequestedUrl);
                    uri = Uri.parse(urlStr);
                    host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
                }

                boolean isMovieBoxCdn = host.contains("hakunaymatata.com") || host.contains("bcdn") || isVideo;
                boolean isMovieBoxApi = host.contains("aoneroom.com");
                boolean isMzfi = host.contains("mzfi.me");

                if (!isMovieBoxCdn && !isMovieBoxApi && !isMzfi && !urlStr.contains("proxy_video")) {
                    return null;
                }

                String method = request.getMethod() != null ? request.getMethod().toUpperCase() : "GET";

                // Immediately respond to CORS OPTIONS preflight
                if ("OPTIONS".equals(method)) {
                    Map<String, String> corsHeaders = new HashMap<>();
                    corsHeaders.put("Access-Control-Allow-Origin", "*");
                    corsHeaders.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
                    corsHeaders.put("Access-Control-Allow-Headers", "*");
                    corsHeaders.put("Access-Control-Max-Age", "86400");
                    return new WebResourceResponse("text/plain", "UTF-8", 200, "OK", corsHeaders, new ByteArrayInputStream(new byte[0]));
                }

                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                // Video connections allow ample connection time (10s) and 20s read timeout so stalled sockets time out cleanly without blocking thread pool
                conn.setConnectTimeout(isVideo ? 10000 : 6000);
                conn.setReadTimeout(isVideo ? 20000 : 12000);
                conn.setInstanceFollowRedirects(false);

                // Forward original headers (such as "Range" for video byte streaming)
                Map<String, String> forwardedHeaders = new HashMap<>();
                if (isVideo) {
                    // For video streaming, ONLY forward the Range header.
                    // DO NOT forward conditional headers like If-Range, If-Modified-Since, If-None-Match.
                    // CDNs return 200 OK (starting at byte 0) or 412 if the validator fails against different edge clusters,
                    // which destroys seek position and crashes Chromium's media decoder!
                    if (request.getRequestHeaders() != null) {
                        for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
                            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("Range")) {
                                conn.setRequestProperty("Range", entry.getValue());
                                forwardedHeaders.put("Range", entry.getValue());
                                break;
                            }
                        }
                    }
                } else {
                    if (request.getRequestHeaders() != null) {
                        for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
                            String k = entry.getKey();
                            if (k != null && !k.equalsIgnoreCase("Referer") && !k.equalsIgnoreCase("Origin") && !k.equalsIgnoreCase("Host")) {
                                conn.setRequestProperty(k, entry.getValue());
                                forwardedHeaders.put(k, entry.getValue());
                            }
                        }
                    }
                }

                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                if (urlStr != null && urlStr.contains("subject/play")) {
                    Uri pUri = Uri.parse(urlStr);
                    String pSubId = pUri.getQueryParameter("subjectId");
                    String pPath = pUri.getQueryParameter("detailPath");
                    String pSe = pUri.getQueryParameter("se");
                    String pEp = pUri.getQueryParameter("ep");
                    String ref = "https://mzfi.me/spa/videoPlayPage/movies/" + (pPath != null ? pPath : pSubId) + "?id=" + (pSubId != null ? pSubId : "") + "&type=/movie/detail&detailSe=" + (pSe != null ? pSe : "0") + "&detailEp=" + (pEp != null ? pEp : "0") + "&lang=en";
                    conn.setRequestProperty("Referer", ref);
                    conn.setRequestProperty("Origin", "https://mzfi.me");
                    if (cachedToken != null && !cachedToken.isEmpty()) {
                        conn.setRequestProperty("token", cachedToken);
                        conn.setRequestProperty("Cookie", "token=" + cachedToken);
                    }
                } else if (isMovieBoxCdn || isMzfi) {
                    conn.setRequestProperty("Referer", "https://mzfi.me/");
                    conn.setRequestProperty("Origin", "https://mzfi.me");
                } else if (isMovieBoxApi) {
                    conn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                    conn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                }
                conn.setRequestProperty("Accept-Encoding", "identity");
                conn.setRequestProperty("Accept", "*/*");
                
                String connectionHeader = "keep-alive";
                conn.setRequestProperty("Connection", connectionHeader);
                forwardedHeaders.put("Accept-Encoding", "identity");
                forwardedHeaders.put("Accept", "*/*");
                forwardedHeaders.put("Connection", connectionHeader);

                int responseCode = conn.getResponseCode();

                // If cached API redirect failed, evict cache and reconnect directly to original URL
                if (responseCode >= 400 && !isVideo && !hasRangeHeader && REDIRECT_CACHE.containsKey(originalRequestedUrl)) {
                    REDIRECT_CACHE.remove(originalRequestedUrl);
                    try { conn.disconnect(); } catch (Exception ignored) {}
                    urlStr = originalRequestedUrl;
                    url = new URL(urlStr);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod(method);
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(12000);
                    conn.setInstanceFollowRedirects(false);
                    for (Map.Entry<String, String> fEntry : forwardedHeaders.entrySet()) {
                        conn.setRequestProperty(fEntry.getKey(), fEntry.getValue());
                    }
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    if (urlStr != null && urlStr.contains("subject/play")) {
                        Uri pUri = Uri.parse(urlStr);
                        String pSubId = pUri.getQueryParameter("subjectId");
                        String pPath = pUri.getQueryParameter("detailPath");
                        String pSe = pUri.getQueryParameter("se");
                        String pEp = pUri.getQueryParameter("ep");
                        String ref = "https://mzfi.me/spa/videoPlayPage/movies/" + (pPath != null ? pPath : pSubId) + "?id=" + (pSubId != null ? pSubId : "") + "&type=/movie/detail&detailSe=" + (pSe != null ? pSe : "0") + "&detailEp=" + (pEp != null ? pEp : "0") + "&lang=en";
                        conn.setRequestProperty("Referer", ref);
                        conn.setRequestProperty("Origin", "https://mzfi.me");
                        if (cachedToken != null && !cachedToken.isEmpty()) {
                            conn.setRequestProperty("token", cachedToken);
                            conn.setRequestProperty("Cookie", "token=" + cachedToken);
                        }
                    } else if (isMovieBoxCdn || isMzfi) {
                        conn.setRequestProperty("Referer", "https://mzfi.me/");
                        conn.setRequestProperty("Origin", "https://mzfi.me");
                    } else if (isMovieBoxApi) {
                        conn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                        conn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                    }
                    conn.setRequestProperty("Accept-Encoding", "identity");
                    conn.setRequestProperty("Accept", "*/*");
                    conn.setRequestProperty("Connection", connectionHeader);
                    responseCode = conn.getResponseCode();
                }

                // Follow up to 5 redirects while strictly preserving Range header and closing prior sockets
                int redirects = 0;
                while (responseCode >= 300 && responseCode < 400 && redirects < 5) {
                    String loc = conn.getHeaderField("Location");
                    HttpURLConnection previousConn = conn;
                    try { previousConn.disconnect(); } catch (Exception ignored) {}

                    if (loc == null || loc.isEmpty()) break;
                    url = new URL(url, loc);
                    if (!isVideo && !hasRangeHeader) {
                        REDIRECT_CACHE.put(originalRequestedUrl, url.toString());
                    }
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestMethod(method);
                    conn.setConnectTimeout(isVideo ? 10000 : 6000);
                    conn.setReadTimeout(isVideo ? 20000 : 12000);
                    for (Map.Entry<String, String> fEntry : forwardedHeaders.entrySet()) {
                        conn.setRequestProperty(fEntry.getKey(), fEntry.getValue());
                    }
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    if (url != null && url.toString().contains("subject/play")) {
                        Uri pUri = Uri.parse(urlStr);
                        String pSubId = pUri.getQueryParameter("subjectId");
                        String pPath = pUri.getQueryParameter("detailPath");
                        String pSe = pUri.getQueryParameter("se");
                        String pEp = pUri.getQueryParameter("ep");
                        String ref = "https://mzfi.me/spa/videoPlayPage/movies/" + (pPath != null ? pPath : pSubId) + "?id=" + (pSubId != null ? pSubId : "") + "&type=/movie/detail&detailSe=" + (pSe != null ? pSe : "0") + "&detailEp=" + (pEp != null ? pEp : "0") + "&lang=en";
                        conn.setRequestProperty("Referer", ref);
                        conn.setRequestProperty("Origin", "https://mzfi.me");
                        if (cachedToken != null && !cachedToken.isEmpty()) {
                            conn.setRequestProperty("token", cachedToken);
                            conn.setRequestProperty("Cookie", "token=" + cachedToken);
                        }
                    } else if (isMovieBoxCdn || isMzfi) {
                        conn.setRequestProperty("Referer", "https://mzfi.me/");
                        conn.setRequestProperty("Origin", "https://mzfi.me");
                    } else if (isMovieBoxApi) {
                        conn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                        conn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                    }
                    conn.setRequestProperty("Accept-Encoding", "identity");
                    conn.setRequestProperty("Accept", "*/*");
                    conn.setRequestProperty("Connection", connectionHeader);
                    responseCode = conn.getResponseCode();
                    redirects++;
                }

                String contentType = conn.getContentType();
                if (contentType == null || contentType.isEmpty() || contentType.equalsIgnoreCase("application/octet-stream")) {
                    contentType = isVideo ? "video/mp4" : (isMovieBoxCdn ? "video/mp4" : "application/json");
                }

                // Android WebResourceResponse REQUIRES null encoding for binary media (MP4 videos)
                String encoding = isVideo ? null : conn.getContentEncoding();

                Map<String, String> responseHeaders = new HashMap<>();
                String contentRange = null;
                String contentLength = null;
                String acceptRanges = "bytes";
                String etag = null;
                String lastModified = null;

                for (Map.Entry<String, List<String>> header : conn.getHeaderFields().entrySet()) {
                    String hKey = header.getKey();
                    if (hKey == null || header.getValue() == null || header.getValue().isEmpty()) continue;
                    String hVal = header.getValue().get(0);
                    if (hKey.equalsIgnoreCase("Content-Range")) {
                        contentRange = hVal;
                    } else if (hKey.equalsIgnoreCase("Content-Length")) {
                        contentLength = hVal;
                    } else if (hKey.equalsIgnoreCase("Accept-Ranges")) {
                        acceptRanges = hVal;
                    } else if (hKey.equalsIgnoreCase("ETag")) {
                        etag = hVal;
                    } else if (hKey.equalsIgnoreCase("Last-Modified")) {
                        lastModified = hVal;
                    } else if (!isVideo) {
                        String lowerKey = hKey.toLowerCase();
                        if (!lowerKey.equals("connection") && !lowerKey.equals("content-disposition") && 
                            !lowerKey.equals("transfer-encoding") && !lowerKey.startsWith("x-oss-")) {
                            responseHeaders.put(hKey, hVal);
                        }
                    }
                }

                // Strictly enforce clean streaming headers for HTML5 Video
                if (contentRange != null && !contentRange.isEmpty()) {
                    responseHeaders.put("Content-Range", contentRange);
                }
                if (contentLength != null && !contentLength.isEmpty()) {
                    responseHeaders.put("Content-Length", contentLength);
                }
                responseHeaders.put("Accept-Ranges", acceptRanges != null ? acceptRanges : "bytes");
                responseHeaders.put("Content-Type", isVideo ? "video/mp4" : contentType);
                
                String serverConnection = conn.getHeaderField("Connection");
                if (serverConnection != null && !serverConnection.isEmpty()) {
                    responseHeaders.put("Connection", serverConnection);
                } else {
                    responseHeaders.put("Connection", isVideo ? "close" : "keep-alive");
                }

                // NEVER cache partial video chunks on disk (prevents Chromium sparse cache lockups/seeking stalls)
                if (isVideo) {
                    responseHeaders.put("Cache-Control", "no-cache, no-store, must-revalidate");
                    responseHeaders.put("Pragma", "no-cache");
                } else {
                    responseHeaders.put("Cache-Control", "public, max-age=86400");
                }

                responseHeaders.put("Access-Control-Allow-Origin", "*");
                responseHeaders.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
                responseHeaders.put("Access-Control-Allow-Headers", "*");
                responseHeaders.put("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, ETag, Last-Modified");
                if (etag != null) responseHeaders.put("ETag", etag);
                if (lastModified != null) responseHeaders.put("Last-Modified", lastModified);

                if ("HEAD".equals(method)) {
                    return new WebResourceResponse(
                        contentType.split(";")[0].trim(),
                        encoding,
                        responseCode,
                        "OK",
                        responseHeaders,
                        new ByteArrayInputStream(new byte[0])
                    );
                }

                final HttpURLConnection finalConn = conn;
                final int finalResponseCode = responseCode;
                InputStream rawStream = (responseCode >= 200 && responseCode < 400) 
                    ? conn.getInputStream() 
                    : conn.getErrorStream();

                if (rawStream == null) {
                    rawStream = new ByteArrayInputStream(new byte[0]);
                }

                // Direct FilterInputStream wrapping rawStream without memory buffer delay.
                // When Chromium cancels or finishes a range request, close() explicitly disconnects finalConn
                // to free the socket immediately and prevent HTTP connection pool starvation.
                InputStream stream = new java.io.FilterInputStream(rawStream) {
                    private boolean isClosed = false;
                    @Override
                    public void close() throws java.io.IOException {
                        if (!isClosed) {
                            isClosed = true;
                            try {
                                super.close();
                            } catch (Exception ignored) {}
                            try {
                                finalConn.disconnect();
                            } catch (Exception ignored) {}
                        }
                    }
                };

                String reasonPhrase;
                if (responseCode == 206) {
                    reasonPhrase = "Partial Content";
                } else if (responseCode == 200) {
                    reasonPhrase = "OK";
                } else if (responseCode == 416) {
                    reasonPhrase = "Range Not Satisfiable";
                } else {
                    reasonPhrase = "HTTP " + responseCode;
                }

                return new WebResourceResponse(
                    contentType.split(";")[0].trim(),
                    encoding,
                    responseCode,
                    reasonPhrase,
                    responseHeaders,
                    stream
                );
            } catch (Exception e) {
                return null;
            }
        }

        private static WebResourceResponse proxyLiveTvRequest(WebResourceRequest request) {
            try {
                Uri uri = request.getUrl();
                if (uri == null) return null;
                String urlStr = uri.toString();
                String urlLower = urlStr.toLowerCase();
                String method = request.getMethod() != null ? request.getMethod().toUpperCase() : "GET";

                // Fast response to CORS preflight OPTIONS
                if ("OPTIONS".equals(method)) {
                    Map<String, String> corsHeaders = new HashMap<>();
                    corsHeaders.put("Access-Control-Allow-Origin", "*");
                    corsHeaders.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
                    corsHeaders.put("Access-Control-Allow-Headers", "*");
                    corsHeaders.put("Access-Control-Max-Age", "86400");
                    return new WebResourceResponse("text/plain", "UTF-8", 200, "OK", corsHeaders, new ByteArrayInputStream(new byte[0]));
                }

                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(15000);
                conn.setInstanceFollowRedirects(true);

                // Set modern standard User-Agent
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                conn.setRequestProperty("Accept", "*/*");

                // Forward client headers, preserving Range, but omitting conflicting origins
                if (request.getRequestHeaders() != null) {
                    for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
                        String k = entry.getKey();
                        if (k != null && !k.equalsIgnoreCase("Referer") && !k.equalsIgnoreCase("Origin") && !k.equalsIgnoreCase("Host")) {
                            conn.setRequestProperty(k, entry.getValue());
                        }
                    }
                }

                int responseCode = conn.getResponseCode();
                int redirects = 0;
                while ((responseCode == 301 || responseCode == 302 || responseCode == 303 || responseCode == 307 || responseCode == 308) && redirects < 5) {
                    String location = conn.getHeaderField("Location");
                    if (location == null || location.isEmpty()) break;
                    URL nextUrl = new URL(url, location);
                    url = nextUrl;
                    urlStr = url.toString();
                    urlLower = urlStr.toLowerCase();
                    try { conn.disconnect(); } catch (Exception ignored) {}

                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod(method);
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(15000);
                    conn.setInstanceFollowRedirects(true);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    conn.setRequestProperty("Accept", "*/*");
                    if (request.getRequestHeaders() != null) {
                        for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
                            String k = entry.getKey();
                            if (k != null && !k.equalsIgnoreCase("Referer") && !k.equalsIgnoreCase("Origin") && !k.equalsIgnoreCase("Host")) {
                                conn.setRequestProperty(k, entry.getValue());
                            }
                        }
                    }
                    responseCode = conn.getResponseCode();
                    redirects++;
                }

                // Determine precise media MIME type for Chromium's video pipeline
                String mimeType;
                if (urlLower.contains(".m3u8")) {
                    mimeType = "application/vnd.apple.mpegurl";
                } else if (urlLower.contains(".ts")) {
                    mimeType = "video/mp2t";
                } else if (urlLower.contains(".m4s") || urlLower.contains(".mp4")) {
                    mimeType = "video/mp4";
                } else if (urlLower.contains(".aac")) {
                    mimeType = "audio/aac";
                } else if (urlLower.contains("serve.key") || urlLower.contains(".key")) {
                    mimeType = "application/octet-stream";
                } else {
                    String rawCt = conn.getContentType();
                    if (rawCt != null && !rawCt.isEmpty()) {
                        mimeType = rawCt.split(";")[0].trim();
                    } else {
                        mimeType = "application/octet-stream";
                    }
                }

                Map<String, String> responseHeaders = new HashMap<>();
                responseHeaders.put("Access-Control-Allow-Origin", "*");
                responseHeaders.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
                responseHeaders.put("Access-Control-Allow-Headers", "*");
                responseHeaders.put("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
                responseHeaders.put("Content-Type", mimeType);

                long cl = conn.getContentLengthLong();
                if (cl > 0) {
                    responseHeaders.put("Content-Length", String.valueOf(cl));
                }

                String cr = conn.getHeaderField("Content-Range");
                if (cr != null && !cr.isEmpty()) {
                    responseHeaders.put("Content-Range", cr);
                }

                String ar = conn.getHeaderField("Accept-Ranges");
                if (ar != null && !ar.isEmpty()) {
                    responseHeaders.put("Accept-Ranges", ar);
                }

                InputStream rawStream = (responseCode >= 200 && responseCode < 400) 
                    ? conn.getInputStream() 
                    : conn.getErrorStream();

                if (rawStream == null) {
                    rawStream = new ByteArrayInputStream(new byte[0]);
                }

                final HttpURLConnection finalConn = conn;
                InputStream stream = new java.io.FilterInputStream(rawStream) {
                    private boolean isClosed = false;
                    @Override
                    public void close() throws java.io.IOException {
                        if (!isClosed) {
                            isClosed = true;
                            try {
                                super.close();
                            } catch (Exception ignored) {}
                            try {
                                finalConn.disconnect();
                            } catch (Exception ignored) {}
                        }
                    }
                };

                String reasonPhrase;
                if (responseCode == 200) {
                    reasonPhrase = "OK";
                } else if (responseCode == 206) {
                    reasonPhrase = "Partial Content";
                } else {
                    reasonPhrase = conn.getResponseMessage() != null ? conn.getResponseMessage() : ("HTTP " + responseCode);
                }

                return new WebResourceResponse(
                    mimeType,
                    urlLower.contains(".m3u8") ? "UTF-8" : null,
                    responseCode,
                    reasonPhrase,
                    responseHeaders,
                    stream
                );
            } catch (Exception e) {
                return null;
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (request == null || request.getUrl() == null) {
                return false;
            }
            Uri uri = request.getUrl();
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";
            String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
            String urlStr = uri.toString().toLowerCase();

            // 1. Allow official Telegram links and tg:// scheme to launch Telegram app / browser directly
            if (urlStr.contains("t.me") || urlStr.contains("telegram.me") || scheme.equals("tg")) {
                launchTelegram(view.getContext(), uri.toString());
                return true;
            }

            // 1.1 Block other rogue external schemes triggered by ad scripts
            if (!scheme.equals("http") && !scheme.equals("https") && !scheme.equals("capacitor") && !scheme.equals("file")) {
                return true; // Suppress external app launch
            }

            // 2. Block known ad domains from navigating
            for (String domain : BLOCKED_AD_DOMAINS) {
                if (host.contains(domain) || urlStr.contains(domain)) {
                    return true; // Block ad navigation
                }
            }

            // 2.5 Allow official app updates and APK downloads to open directly in the system web browser
            if (urlStr.contains("cinevaultapk.online") || urlStr.endsWith(".apk") || urlStr.contains("/downloads/") || urlStr.contains("cinevault-web.pages.dev")) {
                try {
                    android.content.Intent browserIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, uri);
                    browserIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                    view.getContext().startActivity(browserIntent);
                } catch (Exception ignored) {}
                return true; // Handled by launching external browser
            }

            // 3. Block top-level / main frame redirects away from the CineVault app
            // If an ad script inside the player attempts to navigate window.top.location away from localhost,
            // intercept and block it immediately so the user stays on their movie screen.
            if (request.isForMainFrame()) {
                if (!host.contains("localhost") && !host.contains("127.0.0.1") && !scheme.equals("capacitor")) {
                    return true; // Keep user on video screen inside CineVault!
                }
            }

            return super.shouldOverrideUrlLoading(view, request);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        appContext = getApplicationContext();
        ensureLocalProxyServer();
        PROXY_EXECUTOR.execute(() -> ensureMovieBoxToken());
        configureWebView();
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebView();
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(
                    "if (window.checkCineVaultUpdate) { window.checkCineVaultUpdate(); }",
                    null
                );
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onBackPressed() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                String currentUrl = webView.getUrl();
                // If webView was hijacked or redirected to an external ad URL, instantly restore the app
                if (currentUrl != null && !currentUrl.contains("localhost")) {
                    webView.loadUrl("https://localhost");
                    return;
                }

                // Check if web app handles the back press (e.g. closing video player to return to movie seen page)
                webView.evaluateJavascript("typeof window.handleAndroidBack === 'function' ? window.handleAndroidBack() : false", value -> {
                    if ("true".equals(value)) {
                        // Handled inside web app (e.g., returned from video player to movie details screen)
                        return;
                    }

                    // Root screen: Require double-tap back within 2 seconds to exit app
                    runOnUiThread(() -> {
                        long currentTime = System.currentTimeMillis();
                        if (currentTime - lastBackPressTime < 2000) {
                            try {
                                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER);
                            } catch (Exception ignored) {}
                            finish();
                        } else {
                            lastBackPressTime = currentTime;
                            Toast.makeText(this, "Press back again to exit CineVault", Toast.LENGTH_SHORT).show();
                        }
                    });
                });
                return;
            }
        } catch (Exception ignored) {}
        super.onBackPressed();
    }

    private void configureWebView() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.setBackgroundColor(0xFF0B0D10);
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

                // Security Hardening: Disable WebView remote debugging to prevent USB DevTools inspection of API calls & network packets
                WebView.setWebContentsDebuggingEnabled(false);

                WebSettings settings = webView.getSettings();

                // Enable essential capabilities for media & stream playback
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

                // High Performance & Disk Caching: Conserve mobile data, maximize rendering speed
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    settings.setSafeBrowsingEnabled(false);
                }

                // Attach VIP Ad-Shield WebViewClient to kill ads and prevent top-level redirects
                if (!(getBridge().getWebViewClient() instanceof AdShieldWebViewClient)) {
                    getBridge().setWebViewClient(new AdShieldWebViewClient(getBridge()));
                }

                // Suppress popup windows
                settings.setSupportMultipleWindows(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(false);

                // Block popup window creation from iframes/ad scripts
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                        return false; // Deny all popup ad requests
                    }

                    @Override
                    public boolean onJsAlert(WebView view, String url, String message, android.webkit.JsResult result) {
                        result.cancel();
                        return true; // Suppress intrusive ad alert popups
                    }

                    @Override
                    public boolean onJsConfirm(WebView view, String url, String message, android.webkit.JsResult result) {
                        result.cancel();
                        return true; // Suppress intrusive ad confirm popups
                    }

                    @Override
                    public android.graphics.Bitmap getDefaultVideoPoster() {
                        // Completely eliminates Android's default grey stretched oval placeholder on HTML5 video
                        return android.graphics.Bitmap.createBitmap(1, 1, android.graphics.Bitmap.Config.ARGB_8888);
                    }
                });

                // Disguise as standard Chrome Mobile to bypass Cloudflare & embed server WebView blocks
                String currentUa = settings.getUserAgentString();
                if (currentUa != null) {
                    String cleanUa = currentUa.replace("; wv", "")
                                               .replaceAll("Version\\/\\d+\\.\\d+\\s*", "");
                    settings.setUserAgentString(cleanUa);
                }

                // Enable third-party cookies so streaming iframes can authenticate & stream
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                // Native Android orientation & immersive fullscreen bridge
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void setOrientation(String mode) {
                        runOnUiThread(() -> {
                            try {
                                if ("landscape".equalsIgnoreCase(mode)) {
                                    isImmersiveLandscape = true;
                                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                                    applyImmersiveFullscreen();
                                } else if ("portrait".equalsIgnoreCase(mode)) {
                                    isImmersiveLandscape = false;
                                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                                    exitImmersiveFullscreen();
                                } else {
                                    isImmersiveLandscape = false;
                                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER);
                                    exitImmersiveFullscreen();
                                }
                            } catch (Exception ignored) {}
                        });
                    }

                    @JavascriptInterface
                    public void setFullscreen(boolean fullscreen) {
                        runOnUiThread(() -> {
                            if (fullscreen) {
                                applyImmersiveFullscreen();
                            } else {
                                if (!isImmersiveLandscape) {
                                    exitImmersiveFullscreen();
                                }
                            }
                        });
                    }

                    @JavascriptInterface
                    public String getProxyVideoUrl(String rawUrl) {
                        return MainActivity.getProxyVideoUrl(rawUrl);
                    }

                    @JavascriptInterface
                    public int getLocalProxyPort() {
                        ensureLocalProxyServer();
                        return localProxyPort;
                    }

                    @JavascriptInterface
                    public void clearStreamCache(String subjectId) {
                        try {
                            if (subjectId != null && !subjectId.isEmpty()) {
                                for (String k : new java.util.HashSet<>(STREAM_CACHE.keySet())) {
                                    if (k.contains(subjectId)) {
                                        STREAM_CACHE.remove(k);
                                        STREAM_CACHE_TS.remove(k);
                                    }
                                }
                            } else {
                                STREAM_CACHE.clear();
                                STREAM_CACHE_TS.clear();
                            }
                        } catch (Exception ignored) {}
                    }

                    @JavascriptInterface
                    public String fetchMovieBox(String urlStr, String postBody) {
                        return fetchMovieBoxWithHeaders(urlStr, postBody, null);
                    }

                    @JavascriptInterface
                    public String fetchMovieBoxWithHeaders(String urlStr, String postBody, String headersJson) {
                        try {
                            URL url = new URL(urlStr);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            boolean isPost = postBody != null && !postBody.isEmpty();
                            conn.setRequestMethod(isPost ? "POST" : "GET");
                            conn.setConnectTimeout(3500);
                            conn.setReadTimeout(5000);
                            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
                            conn.setRequestProperty("Content-Type", "application/json");

                            ensureMovieBoxToken();
                            boolean isPlayReq = urlStr != null && urlStr.contains("subject/play");
                            boolean isMzfi = urlStr != null && urlStr.contains("mzfi.me");
                            if (isPlayReq) {
                                Uri playUri = Uri.parse(urlStr);
                                String pSubId = playUri.getQueryParameter("subjectId");
                                String pPath = playUri.getQueryParameter("detailPath");
                                String pSe = playUri.getQueryParameter("se");
                                String pEp = playUri.getQueryParameter("ep");
                                String ref = "https://mzfi.me/spa/videoPlayPage/movies/" + (pPath != null ? pPath : pSubId) + "?id=" + (pSubId != null ? pSubId : "") + "&type=/movie/detail&detailSe=" + (pSe != null ? pSe : "0") + "&detailEp=" + (pEp != null ? pEp : "0") + "&lang=en";
                                conn.setRequestProperty("Origin", "https://mzfi.me");
                                conn.setRequestProperty("Referer", ref);
                            } else if (isMzfi) {
                                conn.setRequestProperty("Origin", "https://mzfi.me");
                                conn.setRequestProperty("Referer", "https://mzfi.me/");
                            } else {
                                conn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                                conn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                            }

                            if (cachedToken != null && !cachedToken.isEmpty()) {
                                conn.setRequestProperty("token", cachedToken);
                                conn.setRequestProperty("Cookie", "token=" + cachedToken);
                            }
                            if (cachedXUser != null && !cachedXUser.isEmpty()) {
                                conn.setRequestProperty("x-user", cachedXUser);
                            }

                            if (headersJson != null && !headersJson.trim().isEmpty()) {
                                try {
                                    org.json.JSONObject customHeaders = new org.json.JSONObject(headersJson);
                                    java.util.Iterator<String> keys = customHeaders.keys();
                                    while (keys.hasNext()) {
                                        String key = keys.next();
                                        conn.setRequestProperty(key, customHeaders.getString(key));
                                    }
                                } catch (Exception ignored) {}
                            }

                            if (isPost) {
                                conn.setDoOutput(true);
                                try (OutputStream os = conn.getOutputStream()) {
                                    byte[] input = postBody.getBytes("utf-8");
                                    os.write(input, 0, input.length);
                                }
                            }

                            InputStream is = conn.getResponseCode() < 400 ? conn.getInputStream() : conn.getErrorStream();
                            String fetchEnc = conn.getHeaderField("Content-Encoding");
                            if (fetchEnc != null && fetchEnc.toLowerCase().contains("gzip")) {
                                is = new java.util.zip.GZIPInputStream(is);
                            }
                            BufferedReader reader = new BufferedReader(new InputStreamReader(is, "utf-8"));
                            StringBuilder response = new StringBuilder();
                            String line;
                            while ((line = reader.readLine()) != null) {
                                response.append(line);
                            }
                            reader.close();

                            String body = response.toString();
                            String xUserHeader = conn.getHeaderField("x-user");
                            String tokenHeader = conn.getHeaderField("token");

                            // If auth headers are returned, inject them so JavaScript can extract the JWT token immediately
                            if (xUserHeader != null || tokenHeader != null) {
                                try {
                                    org.json.JSONObject json = new org.json.JSONObject(body);
                                    if (xUserHeader != null) json.put("__x_user__", xUserHeader);
                                    if (tokenHeader != null) json.put("__token__", tokenHeader);
                                    return json.toString();
                                } catch (Exception ignored) {
                                    org.json.JSONObject wrapper = new org.json.JSONObject();
                                    wrapper.put("data", body);
                                    if (xUserHeader != null) wrapper.put("__x_user__", xUserHeader);
                                    if (tokenHeader != null) wrapper.put("__token__", tokenHeader);
                                    return wrapper.toString();
                                }
                            }

                            return body;
                        } catch (Exception e) {
                            return "{\"error\":\"" + e.getMessage() + "\"}";
                        }
                    }

                    @JavascriptInterface
                    public String getMovieBoxStreams(String subjectId, String detailPath, String mediaType, int season, int episode) {
                        return getMovieBoxStreamsWithTitle(subjectId, detailPath, mediaType, season, episode, "");
                    }

                    @JavascriptInterface
                    public String getMovieBoxStreams(String subjectId, String detailPath, String mediaType, int season, int episode, String title) {
                        return getMovieBoxStreamsWithTitle(subjectId, detailPath, mediaType, season, episode, title);
                    }

                    @JavascriptInterface
                    public void getMovieBoxStreamsAsync(String subjectId, String detailPath, String mediaType, int season, int episode, String title, String callbackId) {
                        new Thread(() -> {
                            String result = getMovieBoxStreamsWithTitle(subjectId, detailPath, mediaType, season, episode, title);
                            runOnUiThread(() -> {
                                try {
                                    String safeJson = (result != null && !result.isEmpty()) ? result : "{\"success\":false,\"error\":\"No streams\"}";
                                    String js = "if (window.resolveCineVaultStream) { window.resolveCineVaultStream(" + org.json.JSONObject.quote(callbackId) + ", " + org.json.JSONObject.quote(safeJson) + "); }";
                                    webView.evaluateJavascript(js, null);
                                } catch (Exception ignored) {}
                            });
                        }).start();
                    }

                    private String getMovieBoxStreamsWithTitle(String subjectId, String detailPath, String mediaType, int season, int episode, String title) {
                        try {
                            // In-memory stream result cache (30-minute TTL) — instant replay, no network
                            boolean isTvCheck = "tv".equalsIgnoreCase(mediaType) || "series".equalsIgnoreCase(mediaType);
                            String cacheKey = "streams_" + subjectId + "_" + (isTvCheck ? "tv" : "movie") + "_" + season + "_" + episode;
                            String cached = STREAM_CACHE.get(cacheKey);
                            if (cached != null) {
                                Long ts = STREAM_CACHE_TS.get(cacheKey);
                                if (ts != null && System.currentTimeMillis() - ts < 300000) {
                                    return cached;
                                } else {
                                    STREAM_CACHE.remove(cacheKey);
                                    STREAM_CACHE_TS.remove(cacheKey);
                                }
                            }

                            ensureMovieBoxToken();

                            boolean isTv = isTvCheck;
                            int reqSe = isTv ? Math.max(1, season) : 0;
                            int reqEp = isTv ? Math.max(1, episode) : 0;

                            String resolvedPath = (detailPath != null && !detailPath.trim().isEmpty()) ? detailPath.trim() : subjectId;

                            // Fast resolve slug from both mzfi.me and h5-api.aoneroom.com if numeric
                            if (resolvedPath != null && resolvedPath.matches("\\d+")) {
                                String[] dDomains = new String[] { "https://mzfi.me", "https://h5-api.aoneroom.com" };
                                for (String dDom : dDomains) {
                                    try {
                                        URL dUrl = new URL(dDom + "/wefeed-h5api-bff/detail?subjectId=" + subjectId);
                                        HttpURLConnection dConn = (HttpURLConnection) dUrl.openConnection();
                                        dConn.setRequestMethod("GET");
                                        dConn.setConnectTimeout(2500);
                                        dConn.setReadTimeout(2500);
                                        dConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                                        dConn.setRequestProperty("Origin", "https://mzfi.me");
                                        dConn.setRequestProperty("Referer", "https://mzfi.me/");
                                        if (cachedToken != null && !cachedToken.isEmpty()) {
                                            dConn.setRequestProperty("token", cachedToken);
                                            dConn.setRequestProperty("Cookie", "token=" + cachedToken);
                                        }
                                        if (cachedXUser != null && !cachedXUser.isEmpty()) {
                                            dConn.setRequestProperty("x-user", cachedXUser);
                                        }
                                        if (dConn.getResponseCode() == 200) {
                                            InputStream dIn = dConn.getInputStream();
                                            String dEnc = dConn.getHeaderField("Content-Encoding");
                                            if (dEnc != null && dEnc.toLowerCase().contains("gzip")) {
                                                dIn = new java.util.zip.GZIPInputStream(dIn);
                                            }
                                            BufferedReader dReader = new BufferedReader(new InputStreamReader(dIn, "utf-8"));
                                            StringBuilder dSb = new StringBuilder();
                                            String dLine;
                                            while ((dLine = dReader.readLine()) != null) dSb.append(dLine);
                                            dReader.close();
                                            org.json.JSONObject dRes = new org.json.JSONObject(dSb.toString());
                                            if (dRes.has("data") && dRes.getJSONObject("data").has("subject")) {
                                                String slug = dRes.getJSONObject("data").getJSONObject("subject").optString("detailPath", "");
                                                if (slug != null && !slug.isEmpty() && !slug.matches("\\d+")) {
                                                    resolvedPath = slug;
                                                    break;
                                                }
                                            }
                                        }
                                    } catch (Exception ignored) {}
                                }
                            }

                            // Secondary slug resolution via search API if still numeric and title is present
                            if (resolvedPath != null && resolvedPath.matches("\\d+") && title != null && !title.trim().isEmpty()) {
                                try {
                                    String cleanTitle = title.replaceAll("\\[.*?\\]|\\(.*?\\)", "").trim();
                                    if (!cleanTitle.isEmpty()) {
                                        URL sUrl = new URL("https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search");
                                        HttpURLConnection sConn = (HttpURLConnection) sUrl.openConnection();
                                        sConn.setRequestMethod("POST");
                                        sConn.setConnectTimeout(2500);
                                        sConn.setReadTimeout(2500);
                                        sConn.setRequestProperty("Content-Type", "application/json");
                                        sConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                                        sConn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                                        sConn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                                        sConn.setDoOutput(true);
                                        org.json.JSONObject payload = new org.json.JSONObject();
                                        payload.put("keyword", cleanTitle);
                                        payload.put("page", 1);
                                        payload.put("perPage", 4);
                                        payload.put("subjectType", isTv ? 2 : 1);
                                        try (OutputStream os = sConn.getOutputStream()) {
                                            os.write(payload.toString().getBytes("utf-8"));
                                        }
                                        if (sConn.getResponseCode() == 200) {
                                            InputStream sis = sConn.getInputStream();
                                            String senc = sConn.getHeaderField("Content-Encoding");
                                            if (senc != null && senc.toLowerCase().contains("gzip")) {
                                                sis = new java.util.zip.GZIPInputStream(sis);
                                            }
                                            BufferedReader sreader = new BufferedReader(new InputStreamReader(sis, "utf-8"));
                                            StringBuilder ssb = new StringBuilder();
                                            String sline;
                                            while ((sline = sreader.readLine()) != null) ssb.append(sline);
                                            sreader.close();
                                            org.json.JSONObject sres = new org.json.JSONObject(ssb.toString());
                                            org.json.JSONArray sitems = sres.optJSONObject("data") != null ? sres.getJSONObject("data").optJSONArray("items") : null;
                                            if (sitems != null && sitems.length() > 0) {
                                                for (int k = 0; k < sitems.length(); k++) {
                                                    org.json.JSONObject itm = sitems.getJSONObject(k);
                                                    String itmId = itm.optString("subjectId", itm.optString("id", ""));
                                                    String itmPath = itm.optString("detailPath", "");
                                                    if (itmId.equals(subjectId) && !itmPath.isEmpty() && !itmPath.matches("\\d+")) {
                                                        resolvedPath = itmPath;
                                                        break;
                                                    }
                                                }
                                                if (resolvedPath.matches("\\d+")) {
                                                    String firstSlug = sitems.getJSONObject(0).optString("detailPath", "");
                                                    if (!firstSlug.isEmpty() && !firstSlug.matches("\\d+")) {
                                                        resolvedPath = firstSlug;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } catch (Exception ignored) {}
                            }

                            String bestWebUrl = "https://mzfi.me/spa/videoPlayPage/movies/" + resolvedPath + "?id=" + subjectId + "&type=/movie/detail&detailSe=" + reqSe + "&detailEp=" + reqEp + "&lang=en";

                            // Priority 1: Exact season/episode for series, with fallbacks to (1,1) and (0,0)
                            int[][] attempts = isTv
                                ? (reqSe > 1 || reqEp > 1 ? new int[][] { { reqSe, reqEp }, { 1, 1 }, { 0, 0 } } : new int[][] { { 1, 1 }, { 0, 0 } })
                                : new int[][] { { 0, 0 }, { 1, 1 } };

                            String[] pathCandidates;
                            if (!resolvedPath.matches("\\d+") && !resolvedPath.equals(subjectId)) {
                                pathCandidates = new String[] { resolvedPath, subjectId.trim() };
                            } else {
                                pathCandidates = new String[] { resolvedPath };
                            }

                            String[] playDomains = new String[] { "https://mzfi.me", "https://h5-api.aoneroom.com" };

                            for (int retryRound = 0; retryRound < 2; retryRound++) {
                                for (String currentPath : pathCandidates) {
                                    for (int[] att : attempts) {
                                        int se = att[0];
                                        int ep = att[1];
                                        String currentWebUrl = "https://mzfi.me/spa/videoPlayPage/movies/" + currentPath + "?id=" + subjectId + "&type=/movie/detail&detailSe=" + se + "&detailEp=" + ep + "&lang=en";

                                        for (String playDomain : playDomains) {
                                            try {
                                                String playUrl = playDomain + "/wefeed-h5api-bff/subject/play?subjectId=" + subjectId + "&se=" + se + "&ep=" + ep + "&detailPath=" + currentPath + "&streamSignType=0";

                                                URL url = new URL(playUrl);
                                                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                                                conn.setRequestMethod("GET");
                                                conn.setConnectTimeout(3500);
                                                conn.setReadTimeout(5000);
                                                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                                                conn.setRequestProperty("Accept", "application/json, text/plain, */*");
                                                conn.setRequestProperty("Origin", "https://mzfi.me");
                                                conn.setRequestProperty("Referer", currentWebUrl);
                                                if (cachedToken != null && !cachedToken.isEmpty()) {
                                                    conn.setRequestProperty("token", cachedToken);
                                                    conn.setRequestProperty("Cookie", "token=" + cachedToken);
                                                }
                                                if (cachedXUser != null && !cachedXUser.isEmpty()) {
                                                    conn.setRequestProperty("x-user", cachedXUser);
                                                }

                                                if (conn.getResponseCode() == 200) {
                                                    InputStream inStream = conn.getInputStream();
                                                    String enc = conn.getHeaderField("Content-Encoding");
                                                    if (enc != null && enc.toLowerCase().contains("gzip")) {
                                                        inStream = new java.util.zip.GZIPInputStream(inStream);
                                                    }
                                                    BufferedReader reader = new BufferedReader(new InputStreamReader(inStream, "utf-8"));
                                                    StringBuilder sb = new StringBuilder();
                                                    String line;
                                                    while ((line = reader.readLine()) != null) {
                                                        sb.append(line);
                                                    }
                                                    reader.close();

                                                    org.json.JSONObject resObj = new org.json.JSONObject(sb.toString());
                                                    if (resObj.optInt("code", -1) == 0 && resObj.has("data")) {
                                                        org.json.JSONObject dataObj = resObj.getJSONObject("data");
                                                        org.json.JSONArray streamsArr = dataObj.optJSONArray("streams");
                                                        if (streamsArr != null && streamsArr.length() > 0) {
                                                            org.json.JSONObject result = new org.json.JSONObject();
                                                            result.put("success", true);
                                                            result.put("isDirect", true);
                                                            result.put("webPlayerUrl", currentWebUrl);
                                                            org.json.JSONArray outStreams = new org.json.JSONArray();
                                                            for (int i = 0; i < streamsArr.length(); i++) {
                                                                org.json.JSONObject s = streamsArr.getJSONObject(i);
                                                                int rNum = s.optInt("resolutions", 720);
                                                                long sizeBytes = s.optLong("size", 0);
                                                                double sizeMb = sizeBytes > 0 ? Math.round((sizeBytes / (1024.0 * 1024.0)) * 10.0) / 10.0 : 0;
                                                                String streamUrl = s.optString("url", "");
                                                                if (!streamUrl.isEmpty()) {
                                                                    org.json.JSONObject item = new org.json.JSONObject();
                                                                    item.put("quality", rNum + "p");
                                                                    item.put("resolution", rNum + "p");
                                                                    item.put("url", getProxyVideoUrl(streamUrl));
                                                                    item.put("raw_url", streamUrl);
                                                                    item.put("size_mb", sizeMb);
                                                                    item.put("format", s.optString("format", "MP4"));
                                                                    outStreams.put(item);
                                                                }
                                                            }
                                                            result.put("streams", outStreams);
                                                            String resultStr = result.toString();
                                                            STREAM_CACHE.put(cacheKey, resultStr);
                                                            STREAM_CACHE_TS.put(cacheKey, System.currentTimeMillis());
                                                            return resultStr;
                                                        }
                                                    }
                                                }
                                            } catch (Exception ignored) {}
                                        }
                                    }
                                }
                                // If first round yielded 0 streams, force refresh token once and retry
                                if (retryRound == 0) {
                                    ensureMovieBoxToken(true);
                                }
                            }

                        // Sibling auto-discovery fallback if original subject had 0 streams:
                        String searchQuery = (title != null && !title.trim().isEmpty()) ? title : resolvedPath.replaceAll("-\\w+$", "").replace("-", " ");
                        String cleanQ = searchQuery.replaceAll("\\[.*?\\]|\\(.*?\\)", "").trim();
                        if (!cleanQ.isEmpty()) {
                            try {
                                URL sUrl = new URL("https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search");
                                HttpURLConnection sConn = (HttpURLConnection) sUrl.openConnection();
                                sConn.setRequestMethod("POST");
                                sConn.setConnectTimeout(2000);
                                sConn.setReadTimeout(2500);
                                sConn.setRequestProperty("Content-Type", "application/json");
                                sConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                                sConn.setRequestProperty("Origin", "https://h5.aoneroom.com");
                                sConn.setRequestProperty("Referer", "https://h5.aoneroom.com/");
                                sConn.setDoOutput(true);

                                org.json.JSONObject payload = new org.json.JSONObject();
                                payload.put("keyword", cleanQ);
                                payload.put("page", 1);
                                payload.put("perPage", 4);
                                payload.put("subjectType", isTv ? 2 : 1);
                                try (OutputStream os = sConn.getOutputStream()) {
                                    os.write(payload.toString().getBytes("utf-8"));
                                }

                                if (sConn.getResponseCode() == 200) {
                                    InputStream sis = sConn.getInputStream();
                                    String senc = sConn.getHeaderField("Content-Encoding");
                                    if (senc != null && senc.toLowerCase().contains("gzip")) {
                                        sis = new java.util.zip.GZIPInputStream(sis);
                                    }
                                    BufferedReader sreader = new BufferedReader(new InputStreamReader(sis, "utf-8"));
                                    StringBuilder ssb = new StringBuilder();
                                    String sline;
                                    while ((sline = sreader.readLine()) != null) ssb.append(sline);
                                    sreader.close();

                                    org.json.JSONObject sres = new org.json.JSONObject(ssb.toString());
                                    org.json.JSONArray sitems = sres.optJSONObject("data") != null ? sres.getJSONObject("data").optJSONArray("items") : null;
                                    if (sitems != null) {
                                        for (int k = 0; k < sitems.length(); k++) {
                                            org.json.JSONObject itemObj = sitems.getJSONObject(k);
                                            String candTitle = itemObj.optString("title", "");
                                            String candTitleLower = candTitle.toLowerCase();
                                            // STRICT REAL CONTENT CHECK: Reject trailers, teasers, promos, featurettes
                                            if (candTitleLower.contains("trailer") || candTitleLower.contains("teaser") ||
                                                candTitleLower.contains("preview") || candTitleLower.contains("clip") ||
                                                candTitleLower.contains("featurette") || candTitleLower.contains("behind the scenes") ||
                                                candTitleLower.contains("promo") || candTitleLower.contains("interview")) {
                                                continue;
                                            }

                                            // STRICT TITLE VALIDATION: Normalized candidate title must be related to cleanQ
                                            String normCand = candTitleLower.replaceAll("[^a-z0-9]", "");
                                            String normTarget = cleanQ.toLowerCase().replaceAll("[^a-z0-9]", "");
                                            if (!normTarget.isEmpty() && !normCand.contains(normTarget) && !normTarget.contains(normCand)) {
                                                continue;
                                            }

                                            String candId = itemObj.optString("subjectId", itemObj.optString("id", ""));
                                            String candPath = itemObj.optString("detailPath", candId);
                                            if (!candId.isEmpty() && !candId.equals(subjectId)) {
                                                String candResult = getMovieBoxStreamsWithTitle(candId, candPath, mediaType, season, episode, cleanQ);
                                                if (candResult != null && candResult.contains("\"streams\":[") && !candResult.contains("\"streams\":[]")) {
                                                    return candResult;
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (Exception ignored) {}
                        }

                            // If no direct unencrypted CDN streams returned, provide clean webPlayerUrl fallback
                            org.json.JSONObject fallback = new org.json.JSONObject();
                            fallback.put("success", true);
                            fallback.put("isDirect", false);
                            fallback.put("streams", new org.json.JSONArray());
                            fallback.put("webPlayerUrl", bestWebUrl);
                            return fallback.toString();
                        } catch (Exception e) {
                            return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
                        }
                    }

                    @JavascriptInterface
                    public String startDownload(String urlStr, String title, String poster, String quality, String movieId, String detailPath, int season, int episode) {
                        try {
                            android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                            if (dm == null) return null;

                            // If urlStr is a proxy URL (http://127.0.0.1:port/stream?url=...), extract original CDN URL
                            if (urlStr != null && urlStr.contains("/stream?url=")) {
                                Uri u = Uri.parse(urlStr);
                                String extracted = u.getQueryParameter("url");
                                if (extracted != null && !extracted.isEmpty()) {
                                    urlStr = extracted;
                                }
                            }

                            Uri downloadUri = Uri.parse(urlStr);
                            android.app.DownloadManager.Request req = new android.app.DownloadManager.Request(downloadUri);
                            req.setTitle(title != null ? title : "CineVault Movie");
                            req.setDescription("Downloading " + (quality != null ? quality : "HD"));
                            req.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                            req.setAllowedOverMetered(true);
                            req.setAllowedOverRoaming(true);

                            req.addRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                            req.addRequestHeader("Referer", "https://mzfi.me/");
                            req.addRequestHeader("Origin", "https://mzfi.me");

                            String safeName = (title != null ? title : "video")
                                .replaceAll("[^a-zA-Z0-9._-]", "_") + "_" + System.currentTimeMillis() + ".mp4";

                            // Prioritize app-specific external storage for 100% permission-free, buffer-free playback across Android 9-15
                            File appDl = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                            if (appDl != null && !appDl.exists()) {
                                try { appDl.mkdirs(); } catch (Exception ignored) {}
                            }
                            File destFile = new File(appDl != null ? appDl : Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), safeName);
                            try {
                                if (appDl != null) {
                                    req.setDestinationInExternalFilesDir(MainActivity.this, Environment.DIRECTORY_DOWNLOADS, safeName);
                                } else {
                                    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "CineVault/" + safeName);
                                }
                            } catch (Exception ex) {
                                try {
                                    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeName);
                                } catch (Exception ex2) {
                                    req.setDestinationUri(Uri.fromFile(destFile));
                                }
                            }

                            long id = dm.enqueue(req);

                            android.content.SharedPreferences sp = getSharedPreferences("cinevault_native_downloads", Context.MODE_PRIVATE);
                            org.json.JSONObject meta = new org.json.JSONObject();
                            meta.put("nativeId", id);
                            meta.put("title", title);
                            meta.put("poster", poster);
                            meta.put("quality", quality);
                            meta.put("movieId", movieId);
                            meta.put("detailPath", detailPath);
                            meta.put("season", season);
                            meta.put("episode", episode);
                            meta.put("localPath", destFile.getAbsolutePath());
                            meta.put("streamUrl", urlStr);
                            meta.put("createdAt", System.currentTimeMillis());
                            sp.edit().putString(String.valueOf(id), meta.toString()).apply();

                            return String.valueOf(id);
                        } catch (Exception e) {
                            return null;
                        }
                    }

                    @JavascriptInterface
                    public String getDownloadTasks() {
                        try {
                            android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                            android.content.SharedPreferences sp = getSharedPreferences("cinevault_native_downloads", Context.MODE_PRIVATE);
                            Map<String, ?> all = sp.getAll();
                            org.json.JSONArray res = new org.json.JSONArray();

                            for (Map.Entry<String, ?> entry : all.entrySet()) {
                                String jsonStr = (String) entry.getValue();
                                org.json.JSONObject obj = new org.json.JSONObject(jsonStr);
                                long nativeId = obj.optLong("nativeId");

                                if (dm != null && nativeId > 0) {
                                    android.app.DownloadManager.Query q = new android.app.DownloadManager.Query().setFilterById(nativeId);
                                    android.database.Cursor cursor = dm.query(q);
                                    if (cursor != null) {
                                        if (cursor.moveToFirst()) {
                                            int statusCol = cursor.getColumnIndex(android.app.DownloadManager.COLUMN_STATUS);
                                            int totalCol = cursor.getColumnIndex(android.app.DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                                            int currentBytesCol = cursor.getColumnIndex(android.app.DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                                            int localUriCol = cursor.getColumnIndex(android.app.DownloadManager.COLUMN_LOCAL_URI);

                                            int status = cursor.getInt(statusCol);
                                            long total = cursor.getLong(totalCol);
                                            long current = cursor.getLong(currentBytesCol);

                                            if (total > 0) {
                                                obj.put("progress", (int) ((current * 100) / total));
                                            }
                                            obj.put("downloadedBytes", current);
                                            obj.put("totalBytes", total);

                                            if (status == android.app.DownloadManager.STATUS_SUCCESSFUL) {
                                                obj.put("status", "completed");
                                                obj.put("progress", 100);
                                                String resolvedPath = null;
                                                String lUri = null;
                                                if (localUriCol != -1) {
                                                    lUri = cursor.getString(localUriCol);
                                                    if (lUri != null && lUri.startsWith("file://")) {
                                                        resolvedPath = lUri.substring(7);
                                                    }
                                                }
                                                String existingPath = obj.optString("localPath");
                                                if (resolvedPath != null && !resolvedPath.isEmpty() && new File(resolvedPath).exists()) {
                                                    existingPath = resolvedPath;
                                                }
                                                if (existingPath != null && !existingPath.isEmpty()) {
                                                    File lf = new File(existingPath);
                                                    if (!lf.exists() || !lf.canRead()) {
                                                        String fName = lf.getName();
                                                        if (appContext != null) {
                                                            File extDl = new File(appContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fName);
                                                            if (extDl.exists() && extDl.canRead()) lf = extDl;
                                                            if (!lf.exists() || !lf.canRead()) {
                                                                File extM = new File(appContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES), fName);
                                                                if (extM.exists() && extM.canRead()) lf = extM;
                                                            }
                                                        }
                                                        if (!lf.exists() || !lf.canRead()) {
                                                            File f1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "CineVault/" + fName);
                                                            File f2 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fName);
                                                            File f3 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "CineVault/" + fName);
                                                            if (f1.exists() && f1.canRead()) lf = f1;
                                                            else if (f2.exists() && f2.canRead()) lf = f2;
                                                            else if (f3.exists() && f3.canRead()) lf = f3;
                                                        }
                                                    }
                                                    if (lf.exists() && lf.canRead()) {
                                                        obj.put("localPath", lf.getAbsolutePath());
                                                        obj.put("downloadedBytes", lf.length());
                                                        obj.put("totalBytes", lf.length());
                                                        // Register with Android MediaStore scanner
                                                        try {
                                                            android.media.MediaScannerConnection.scanFile(
                                                                MainActivity.this,
                                                                new String[]{lf.getAbsolutePath()},
                                                                new String[]{"video/mp4"},
                                                                null
                                                            );
                                                        } catch (Exception ignored) {}
                                                    } else if (lUri != null && lUri.startsWith("content://")) {
                                                        obj.put("localPath", lUri);
                                                    }
                                                } else if (lUri != null && lUri.startsWith("content://")) {
                                                    obj.put("localPath", lUri);
                                                }
                                            } else if (status == android.app.DownloadManager.STATUS_RUNNING) {
                                                obj.put("status", "downloading");
                                            } else if (status == android.app.DownloadManager.STATUS_PAUSED) {
                                                obj.put("status", "paused");
                                            } else if (status == android.app.DownloadManager.STATUS_FAILED) {
                                                obj.put("status", "failed");
                                            } else {
                                                obj.put("status", "pending");
                                            }
                                        }
                                        cursor.close();
                                    }
                                }
                                res.put(obj);
                            }
                            return res.toString();
                        } catch (Exception e) {
                            return "[]";
                        }
                    }

                    @JavascriptInterface
                    public boolean cancelDownload(long downloadId) {
                        try {
                            android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                            if (dm != null) {
                                dm.remove(downloadId);
                            }
                            android.content.SharedPreferences sp = getSharedPreferences("cinevault_native_downloads", Context.MODE_PRIVATE);
                            sp.edit().remove(String.valueOf(downloadId)).apply();
                            return true;
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    @JavascriptInterface
                    public long getCacheSize() {
                        try {
                            File cacheDir = getCacheDir();
                            return getFolderSize(cacheDir);
                        } catch (Exception e) {
                            return 0;
                        }
                    }

                    @JavascriptInterface
                    public boolean clearStreamCache() {
                        try {
                            clearStreamCache((String) null);
                            File cacheDir = new File(getCacheDir(), "stream_cache");
                            if (cacheDir.exists()) {
                                deleteDir(cacheDir);
                            }
                            File posterDir = new File(getCacheDir(), "poster_cache");
                            if (posterDir.exists()) {
                                deleteDir(posterDir);
                            }
                            return true;
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    @JavascriptInterface
                    public boolean openTelegram(String urlStr) {
                        try {
                            runOnUiThread(() -> launchTelegramUrl(urlStr));
                            return true;
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    @JavascriptInterface
                    public boolean openExternalUrl(String urlStr) {
                        try {
                            if (urlStr == null || urlStr.trim().isEmpty()) return false;
                            String trimmed = urlStr.trim();
                            if (trimmed.contains("t.me") || trimmed.contains("telegram.me") || trimmed.startsWith("tg://")) {
                                return openTelegram(trimmed);
                            }
                            Uri u = Uri.parse(trimmed);
                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, u);
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            return true;
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    @JavascriptInterface
                    public boolean openExternalBrowser(String urlStr) {
                        return openExternalUrl(urlStr);
                    }

                    @JavascriptInterface
                    public void downloadAndInstallApk(String urlStr) {
                        try {
                            openExternalUrl("https://cinevaultapk.online/");
                        } catch (Exception ignored) {
                        }
                    }

                    @JavascriptInterface
                    public boolean enterPipMode() {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                runOnUiThread(() -> {
                                    try {
                                        android.app.PictureInPictureParams.Builder pipBuilder =
                                            new android.app.PictureInPictureParams.Builder();
                                        android.util.Rational aspectRatio = new android.util.Rational(16, 9);
                                        pipBuilder.setAspectRatio(aspectRatio);
                                        enterPictureInPictureMode(pipBuilder.build());
                                    } catch (Exception e) {
                                        try {
                                            enterPictureInPictureMode();
                                        } catch (Exception ignored) {}
                                    }
                                });
                                return true;
                            }
                            return false;
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    @JavascriptInterface
                    public boolean isPipSupported() {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                return getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE);
                            }
                        } catch (Exception ignored) {}
                        return false;
                    }
                }, "AndroidDevice");
            }
        } catch (Exception e) {
        }
    }

    public static void launchTelegram(android.content.Context context, String urlStr) {
        if (context == null) return;
        String target = (urlStr != null && !urlStr.trim().isEmpty())
            ? urlStr.trim()
            : "https://t.me/+0nZRFagm4wU1MDll";
        try {
            Uri uri = Uri.parse(target);
            // 1. Try launching with official Telegram app
            try {
                android.content.Intent tgIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, uri);
                tgIntent.setPackage("org.telegram.messenger");
                tgIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(tgIntent);
                return;
            } catch (Exception e1) {
                // 2. Try launching with Telegram X app
                try {
                    android.content.Intent tgXIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, uri);
                    tgXIntent.setPackage("org.thunderdog.challegram");
                    tgXIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(tgXIntent);
                    return;
                } catch (Exception e2) {
                    // 3. Try with tg:// scheme for any Telegram client (Plus, Nekogram, etc.)
                    try {
                        String tgSchemeUrl = target;
                        if (target.contains("t.me/+")) {
                            String invite = target.substring(target.indexOf("+") + 1);
                            tgSchemeUrl = "tg://join?invite=" + invite;
                        } else if (target.contains("t.me/")) {
                            String username = target.substring(target.indexOf("t.me/") + 5);
                            tgSchemeUrl = "tg://resolve?domain=" + username;
                        }
                        android.content.Intent tgSchemeIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(tgSchemeUrl));
                        tgSchemeIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(tgSchemeIntent);
                        return;
                    } catch (Exception e3) {
                        // 4. Fallback to default browser / system handler
                        android.content.Intent fallbackIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, uri);
                        fallbackIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(fallbackIntent);
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    public void launchTelegramUrl(String urlStr) {
        launchTelegram(this, urlStr);
    }

    private static long getFolderSize(File f) {
        if (f == null || !f.exists()) return 0;
        if (!f.isDirectory()) return f.length();
        long size = 0;
        File[] children = f.listFiles();
        if (children != null) {
            for (File c : children) {
                size += getFolderSize(c);
            }
        }
        return size;
    }

    private static boolean deleteDir(File dir) {
        if (dir != null && dir.isDirectory()) {
            String[] children = dir.list();
            if (children != null) {
                for (String c : children) {
                    boolean success = deleteDir(new File(dir, c));
                    if (!success) return false;
                }
            }
            return dir.delete();
        } else if (dir != null && dir.isFile()) {
            return dir.delete();
        }
        return false;
    }

    public void applyImmersiveFullscreen() {
        runOnUiThread(() -> {
            try {
                Window window = getWindow();
                if (window == null) return;

                // 1. Extend into notch and camera cutout area (Android 9+ / API 28+)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    WindowManager.LayoutParams lp = window.getAttributes();
                    lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                    window.setAttributes(lp);
                }

                // 2. Keep screen awake and set fullscreen flag
                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

                // 3. Android 11+ (API 30+) WindowInsetsController: hide status & navigation bars
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    WindowInsetsController insetsController = window.getInsetsController();
                    if (insetsController != null) {
                        insetsController.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                        insetsController.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    }
                }

                // 4. Backwards-compatible System UI flags (Android 5.0 to 10)
                View decorView = window.getDecorView();
                if (decorView != null) {
                    int uiOptions = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN;
                    decorView.setSystemUiVisibility(uiOptions);
                }
            } catch (Exception ignored) {}
        });
    }

    public void exitImmersiveFullscreen() {
        runOnUiThread(() -> {
            try {
                Window window = getWindow();
                if (window == null) return;

                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    WindowInsetsController insetsController = window.getInsetsController();
                    if (insetsController != null) {
                        insetsController.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    }
                }

                View decorView = window.getDecorView();
                if (decorView != null) {
                    decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
                }
            } catch (Exception ignored) {}
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && isImmersiveLandscape) {
            applyImmersiveFullscreen();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            applyImmersiveFullscreen();
        } else if (newConfig.orientation == Configuration.ORIENTATION_PORTRAIT && !isImmersiveLandscape) {
            exitImmersiveFullscreen();
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('pipmodechange', { detail: { inPip: " + isInPictureInPictureMode + " } }));",
                    null
                );
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                    "if (window.__cinevaultCanAutoPip && window.__cinevaultCanAutoPip()) { window.__cinevaultTriggerPip && window.__cinevaultTriggerPip(); }",
                    null
                );
            }
        } catch (Exception ignored) {}
    }
}

