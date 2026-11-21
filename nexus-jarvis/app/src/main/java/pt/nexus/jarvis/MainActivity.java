package pt.nexus.jarvis;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.hardware.camera2.CameraManager;
import android.location.Location;
import android.location.LocationManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.AlarmClock;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.TreeSet;
import java.util.Locale;

public class MainActivity extends Activity {

    private WebView web;
    private SpeechRecognizer sr;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean torchOn = false;
    private NexusContacts personal;
    private volatile boolean webReady = false;
    private volatile boolean greeted = false;
    private long lastRmsAt = 0;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        personal = new NexusContacts(this);
        getWindow().setStatusBarColor(0xFF070B14);
        getWindow().setNavigationBarColor(0xFF070B14);

        web = new WebView(this);
        web.setBackgroundColor(0xFF070B14);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String u = r.getUrl().toString();
                if (u.startsWith("file:///android_asset/")) return false;
                if (!u.startsWith("https://") && !u.startsWith("http://")) return true;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u)));
                } catch (Exception e) { /* ignorar */ }
                return true;
            }
            @Override public void onPageFinished(WebView v, String url) {
                super.onPageFinished(v, url);
                if (url.startsWith("file:///android_asset/")) {
                    webReady = true;
                    maybeGreet();
                }
            }
        });
        web.loadUrl("file:///android_asset/index.html");

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(new Locale("pt", "PT"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(new Locale("pt"));
                }
                configureVoice();
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { js("window.nx.ttsDone()"); }
                    @Override public void onError(String id) { js("window.nx.ttsDone()"); }
                    @Override public void onRangeStart(String id, int start, int end, int frame) {
                        js("window.nxHUD&&window.nxHUD.spoken(" + start + "," + end + ")");
                    }
                });
                ttsReady = true;
                maybeGreet();
            }
        });

        requestPermissions(new String[]{
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.ACCESS_COARSE_LOCATION}, 1);
    }

    private void configureVoice() {
        try {
            tts.setSpeechRate(.94f);
            tts.setPitch(.98f);
            String preferred=getSharedPreferences("voice",0).getString("preferred","");
            Voice chosen=null;
            for (Voice v:tts.getVoices()) {
                if(!"pt".equals(v.getLocale().getLanguage()))continue;
                if(!preferred.isEmpty()&&preferred.equals(v.getName())){chosen=v;break;}
                if(chosen==null||(v.getLocale().toLanguageTag().equalsIgnoreCase("pt-PT")
                    &&!chosen.getLocale().toLanguageTag().equalsIgnoreCase("pt-PT")))chosen=v;
                else if(v.getLocale().toLanguageTag().equalsIgnoreCase("pt-PT")&&
                    chosen.getLocale().toLanguageTag().equalsIgnoreCase("pt-PT")&&
                    v.getQuality()>chosen.getQuality())chosen=v;
            }
            if(chosen!=null)tts.setVoice(chosen);
        }catch(Exception ignored){}
    }

    private void status(String message) {
        js("window.nxActionStatus&&window.nxActionStatus("+JSONObject.quote(message)+")");
    }
    @Override @SuppressWarnings("deprecation")
    protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==NexusContacts.PICK_CONTACT&&personal!=null)personal.onPicked(result,data);
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants) {
        super.onRequestPermissionsResult(request,permissions,grants);
        if(request==NexusContacts.REQUEST_CALL&&personal!=null)personal.onCallPermissionResult(grants);
    }

    private void maybeGreet() {
        runOnUiThread(() -> {
            if (webReady && ttsReady && !greeted) {
                greeted = true;
                web.evaluateJavascript("window.nxHUD&&window.nxHUD.greet()", null);
            }
        });
    }

    private void js(final String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private static String norm(String s) {
        String n = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT).trim();
    }

    /* ---------- reconhecimento de voz ---------- */
    private void startListening() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 1);
            js("window.nx.stt('error','permission')");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            js("window.nx.stt('error','nsr')");
            return;
        }
        if (sr == null) {
            sr = SpeechRecognizer.createSpeechRecognizer(this);
            sr.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle p) { js("window.nx.stt('ready','')"); }
                @Override public void onBeginningOfSpeech() { }
                @Override public void onRmsChanged(float v) {
                    long now = android.os.SystemClock.uptimeMillis();
                    if (now - lastRmsAt > 120 && !Float.isNaN(v) && !Float.isInfinite(v)) {
                        lastRmsAt = now;
                        js("window.nxHUD&&window.nxHUD.energy(" + v + ")");
                    }
                }
                @Override public void onBufferReceived(byte[] bf) { }
                @Override public void onEndOfSpeech() { }
                @Override public void onEvent(int t, Bundle p) { }
                @Override public void onPartialResults(Bundle p) { send("partial", p); }
                @Override public void onResults(Bundle p) { send("final", p); }
                @Override public void onError(int code) {
                    if (code == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) {
                        try { sr.destroy(); } catch (Exception e) { }
                        sr = null;
                    }
                    js("window.nx.stt('error','" + code + "')");
                }
                private void send(String type, Bundle p) {
                    ArrayList<String> r = p.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    String t = (r != null && !r.isEmpty()) ? r.get(0) : "";
                    js("window.nx.stt('" + type + "'," + JSONObject.quote(t) + ")");
                }
            });
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-PT");
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
        try {
            sr.startListening(i);
        } catch (Exception e) {
            js("window.nx.stt('error','x')");
        }
    }

    /* ---------- ponte JS <-> Android ---------- */
    private class Bridge {
        @JavascriptInterface public String loadSecret(String slot) {
            return SecretStore.read(MainActivity.this, slot);
        }
        @JavascriptInterface public boolean storeSecret(String slot, String value) {
            return SecretStore.save(MainActivity.this, slot, value);
        }
        @JavascriptInterface public String availableVoices() {
            JSONArray voices=new JSONArray();
            try {
                if(tts!=null&&ttsReady)for(Voice v:tts.getVoices()) {
                    if(!"pt".equals(v.getLocale().getLanguage()))continue;
                    voices.put(new JSONObject().put("name",v.getName())
                        .put("language",v.getLocale().toLanguageTag()).put("quality",v.getQuality())
                        .put("network",v.isNetworkConnectionRequired()));
                }
            }catch(Exception ignored){}
            return voices.toString();
        }
        @JavascriptInterface public void chooseVoice(String name) {
            runOnUiThread(()->{
                try {
                    for(Voice voice:tts.getVoices())if(voice.getName().equals(name)
                            &&voice.getLocale().getLanguage().equals("pt")) {
                        tts.setVoice(voice);
                        getSharedPreferences("voice",0).edit().putString("preferred",name).apply();
                        status("Voz portuguesa selecionada.");
                        return;
                    }
                }catch(Exception ignored){}
                status("Esta voz não está disponível no telemóvel.");
            });
        }
        @JavascriptInterface public void contactAction(String kind,String alias,String body) {
            runOnUiThread(()->{
                if(personal==null){status("Contactos indisponíveis.");return;}
                if("call".equals(kind))personal.call(alias,MainActivity.this::status);
                else if("whatsapp".equals(kind)||"sms".equals(kind))
                    personal.compose(alias,body,"whatsapp".equals(kind),MainActivity.this::status);
            });
        }
        @JavascriptInterface public String createReminder(String title,long timestamp) {
            String reply=NexusReminders.add(MainActivity.this,title,timestamp);
            if(android.os.Build.VERSION.SDK_INT>=33&&!NexusReminders.canNotify(MainActivity.this)) {
                runOnUiThread(()->requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},872));
                return reply+" Autoriza as notificações para receber o aviso.";
            }
            return reply;
        }
        @JavascriptInterface public String listReminders() {
            return NexusReminders.list(MainActivity.this);
        }
        @JavascriptInterface public void research(String id,String query) {
            new Thread(()->{
                try {
                    NexusResearch.Result result=NexusResearch.search(query);
                    JSONObject data=new JSONObject().put("query",query).put("sources",result.sources)
                        .put("checkedAt",result.checkedAt);
                    js("window.nxResearch&&window.nxResearch("+JSONObject.quote(id)+","+JSONObject.quote(data.toString())+")");
                }catch(Exception e){
                    js("window.nxResearch&&window.nxResearch("+JSONObject.quote(id)+",\"{}\")");
                }
            }).start();
        }
        @JavascriptInterface public String listApps() {
            try {
                PackageManager pm = getPackageManager();
                Intent q = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
                TreeSet<String> labels = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
                for (ResolveInfo a : pm.queryIntentActivities(q, 0)) {
                    String label = String.valueOf(a.loadLabel(pm)).trim();
                    if (!label.isEmpty()) labels.add(label);
                }
                JSONArray out = new JSONArray();
                int count = 0;
                for (String label : labels) {
                    out.put(label);
                    if (++count >= 180) break;
                }
                return out.toString();
            } catch (Exception e) { return "[]"; }
        }

        @JavascriptInterface
        public void listen() { runOnUiThread(() -> startListening()); }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(() -> { if (sr != null) sr.stopListening(); });
        }

        @JavascriptInterface
        public void speak(final String text) {
            runOnUiThread(() -> {
                if (!ttsReady) { js("window.nx.ttsDone()"); return; }
                String t = text.length() > 3900 ? text.substring(0, 3900) : text;
                tts.speak(t, TextToSpeech.QUEUE_FLUSH, null, "nx");
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(() -> { if (tts != null) tts.stop(); });
        }

        @JavascriptInterface
        public String location() {
            try {
                if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED)
                    return "";
                LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
                Location l = null;
                for (String p : lm.getProviders(true)) {
                    Location x = lm.getLastKnownLocation(p);
                    if (x != null && (l == null || x.getTime() > l.getTime())) l = x;
                }
                return l == null ? "" : l.getLatitude() + "," + l.getLongitude();
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void http(final String id, final String url, final String method,
                         final String headers, final String body) {
            new Thread(() -> {
                int status;
                String out;
                try {
                    URL endpoint = new URL(url);
                    if (!"https".equalsIgnoreCase(endpoint.getProtocol()))
                        throw new SecurityException("Ligação não HTTPS bloqueada");
                    HttpURLConnection c = (HttpURLConnection) endpoint.openConnection();
                    c.setRequestMethod(method);
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(60000);
                    JSONObject h = new JSONObject(headers);
                    Iterator<String> it = h.keys();
                    while (it.hasNext()) {
                        String k = it.next();
                        c.setRequestProperty(k, h.getString(k));
                    }
                    if (body != null && body.length() > 0) {
                        c.setDoOutput(true);
                        OutputStream os = c.getOutputStream();
                        os.write(body.getBytes("UTF-8"));
                        os.close();
                    }
                    status = c.getResponseCode();
                    InputStream is = status >= 400 ? c.getErrorStream() : c.getInputStream();
                    ByteArrayOutputStream bo = new ByteArrayOutputStream();
                    if (is != null) {
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
                    }
                    out = Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
                } catch (Exception e) {
                    status = -1;
                    out = Base64.encodeToString(String.valueOf(e.getMessage()).getBytes(), Base64.NO_WRAP);
                }
                js("window.nx.net(" + JSONObject.quote(id) + "," + status + "," + JSONObject.quote(out) + ")");
            }).start();
        }

        /* ----- comandos do telemóvel ----- */

        @JavascriptInterface
        public String openApp(String name) {
            try {
                PackageManager pm = getPackageManager();
                Intent q = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> apps = pm.queryIntentActivities(q, 0);
                String want = norm(name);
                String pkg = null;
                for (ResolveInfo r : apps) {
                    if (norm(r.loadLabel(pm).toString()).equals(want)) { pkg = r.activityInfo.packageName; break; }
                }
                if (pkg == null) {
                    for (ResolveInfo r : apps) {
                        String l = norm(r.loadLabel(pm).toString());
                        if (l.contains(want) || want.contains(l)) { pkg = r.activityInfo.packageName; break; }
                    }
                }
                if (pkg == null) return "nao";
                Intent li = pm.getLaunchIntentForPackage(pkg);
                if (li == null) return "nao";
                startActivity(li);
                return "ok";
            } catch (Exception e) {
                return "nao";
            }
        }

        @JavascriptInterface
        public void torch(boolean on) {
            try {
                CameraManager cm = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
                cm.setTorchMode(cm.getCameraIdList()[0], on);
                torchOn = on;
            } catch (Exception e) { /* sem lanterna */ }
        }

        @JavascriptInterface
        public void alarm(int h, int m, String label) {
            try {
                Intent i = new Intent(AlarmClock.ACTION_SET_ALARM)
                        .putExtra(AlarmClock.EXTRA_HOUR, h)
                        .putExtra(AlarmClock.EXTRA_MINUTES, m)
                        .putExtra(AlarmClock.EXTRA_MESSAGE, label)
                        .putExtra(AlarmClock.EXTRA_SKIP_UI, true);
                startActivity(i);
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void timer(int seconds, String label) {
            try {
                Intent i = new Intent(AlarmClock.ACTION_SET_TIMER)
                        .putExtra(AlarmClock.EXTRA_LENGTH, seconds)
                        .putExtra(AlarmClock.EXTRA_MESSAGE, label)
                        .putExtra(AlarmClock.EXTRA_SKIP_UI, true);
                startActivity(i);
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public String findContact(String name) {
            try {
                if (checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                    runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, 2));
                    return "perm";
                }
                String want = norm(name);
                String exact = null, part = null;
                Cursor c = getContentResolver().query(
                        ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                        new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                                ContactsContract.CommonDataKinds.Phone.NUMBER},
                        null, null, null);
                if (c == null) return "";
                try {
                    while (c.moveToNext()) {
                        String n = c.getString(0);
                        String num = c.getString(1);
                        if (n == null || num == null) continue;
                        String nn = norm(n);
                        if (nn.equals(want)) { exact = n + "|" + num; break; }
                        if (part == null && nn.contains(want)) part = n + "|" + num;
                    }
                } finally {
                    c.close();
                }
                return exact != null ? exact : (part != null ? part : "");
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void dial(String number) {
            try {
                startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number))));
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void navigate(String place) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(place))));
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void openUrl(String url) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void settings(String which) {
            try {
                String a = Settings.ACTION_SETTINGS;
                if ("wifi".equals(which)) a = Settings.ACTION_WIFI_SETTINGS;
                else if ("bluetooth".equals(which)) a = Settings.ACTION_BLUETOOTH_SETTINGS;
                startActivity(new Intent(a));
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void volume(String dir) {
            try {
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                am.adjustStreamVolume(AudioManager.STREAM_MUSIC,
                        "up".equals(dir) ? AudioManager.ADJUST_RAISE : AudioManager.ADJUST_LOWER,
                        AudioManager.FLAG_SHOW_UI);
            } catch (Exception e) { }
        }
    }

    @Override
    protected void onDestroy() {
        if (sr != null) { sr.destroy(); sr = null; }
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
        super.onDestroy();
    }
}