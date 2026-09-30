package com.cricketmanager.app;

import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Minimal JSON client for the Game Day Worker routes. Call from a background thread. */
final class BccbApi {
    private static final String TAG = "BccbApi";
    private static final int TIMEOUT_MS = 15000;

    static final class Result {
        final int status;
        final JSONObject body;
        final IOException error;

        Result(int status, JSONObject body, IOException error) {
            this.status = status;
            this.body = body;
            this.error = error;
        }

        boolean ok() {
            return error == null && status >= 200 && status < 300;
        }

        String message(String fallback) {
            if (body != null && body.has("error")) {
                return body.optString("error", fallback);
            }
            return error != null ? "No connection. Check your internet." : fallback;
        }
    }

    private BccbApi() {
    }

    /** Sends a request to /groups/{groupId}{path} with the device's bearer token. */
    static Result groupRequest(SessionStore.Session session, String method, String path, JSONObject body) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(session.apiBase + "/groups/" + session.groupId + path);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setRequestProperty("Authorization", "Bearer " + session.deviceToken);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "CricketManagerApp/" + BuildConfig.VERSION_NAME + " (Android)");
            if (body != null) {
                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setFixedLengthStreamingMode(payload.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            return new Result(status, parse(stream), null);
        } catch (IOException exception) {
            Log.w(TAG, method + " " + path + " failed", exception);
            return new Result(0, null, exception);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private static JSONObject parse(InputStream stream) throws IOException {
        if (stream == null) {
            return new JSONObject();
        }
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            String text = output.toString(StandardCharsets.UTF_8.name());
            return text.isEmpty() ? new JSONObject() : new JSONObject(text);
        } catch (JSONException exception) {
            return new JSONObject();
        }
    }
}
