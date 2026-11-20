package pt.nexus.assistant;
import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.provider.Settings;
import android.speech.tts.*;
import android.webkit.*;
import android.widget.*;
import java.util.Locale;
import java.util.concurrent.*;
import java.io.*;
import javax.net.ssl.HttpsURLConnection;
import org.json.*;

/** Only bundled trusted documents can access the native bridge. No remote pages in this WebView. */
public class MainActivity extends Activity {
 private static final String ORIGIN="https://appassets.androidplatform.net";
 private WebView web; private TextToSpeech tts; private boolean ready=false,foreground=false,closed=false,loaded=false,greeted=false;
 private String pendingQuestion; private int generation=0; private volatile HttpsURLConnection connection;
 private ExecutorService worker=Executors.newSingleThreadExecutor();
 private LinearLayout root; private SpeechCapture capture;
 @Override public void onCreate(Bundle state){super.onCreate(state);
  root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xff061221);root.setFitsSystemWindows(true);
  web=new WebView(this);web.setBackgroundColor(0xff061221);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.addJavascriptInterface(new Bridge(),"NexusNative");
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){
    Uri u=req.getUrl();String path=u.getPath();
    if(!ORIGIN.equals(u.getScheme()+"://"+u.getAuthority())||path==null||!path.matches("/[a-zA-Z0-9._-]+"))return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",null,new ByteArrayInputStream(new byte[0]));
    try{String mime=path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".webp")?"image/webp":path.endsWith(".png")?"image/png":"text/html";
     return new WebResourceResponse(mime,"UTF-8",getAssets().open("nexus"+path));
    }catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));}
   }
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){Uri u=req.getUrl();if("https".equals(u.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}
   @Override public void onPageFinished(WebView v,String url){if(!url.equals(ORIGIN+"/index.html"))return;loaded=true;greet();if(pendingQuestion!=null){String q=pendingQuestion;pendingQuestion=null;js("nexusReceiveQuestion("+JSONObject.quote(q)+")");}}
   @Override public void onReceivedError(WebView v,WebResourceRequest req,WebResourceError error){if(req.isForMainFrame())runOnUiThread(()->new AlertDialog.Builder(MainActivity.this).setTitle("Recuperar interface").setMessage("Não foi possível carregar os ficheiros locais.").setPositiveButton("Recarregar",(d,w)->web.loadUrl(ORIGIN+"/index.html")).setNegativeButton("Sair",(d,w)->exit()).show());}
   @Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){root.removeView(v);v.destroy();web=null;recreate();return true;}
  });
  web.setWebChromeClient(new WebChromeClient(){@Override public void onPermissionRequest(PermissionRequest p){p.deny();}});
  root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
  LinearLayout bar=new LinearLayout(this);for(String label:new String[]{"VOZ","FLUTUANTE","MENU","SAIR"}){Button b=new Button(this);b.setText(label);b.setTextSize(10);b.setTextColor(Color.WHITE);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff154366));bar.addView(b,new LinearLayout.LayoutParams(0,(int)(56*getResources().getDisplayMetrics().density),1));b.setOnClickListener(v->{switch(label){case "VOZ":listen();break;case "FLUTUANTE":bubble();break;case "MENU":menu();break;default:exit();}});}root.addView(bar);setContentView(root);
  if(getIntent().hasExtra("question"))pendingQuestion=getIntent().getStringExtra("question");
  tts=new TextToSpeech(this,status->{ready=status==TextToSpeech.SUCCESS;if(ready){int language=tts.setLanguage(new Locale("pt","PT"));if(language<0)language=tts.setLanguage(new Locale("pt"));if(language<0)language=tts.setLanguage(Locale.getDefault());if(language<0){ready=false;toast("Não foi possível iniciar a voz. Abre MENU → Testar voz.");}else{tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){runOnUiThread(()->js("nexusVoiceState('speaking')"));}public void onDone(String id){runOnUiThread(()->js("nexusVoiceState('idle')"));}public void onError(String id){runOnUiThread(()->{js("nexusVoiceState('idle')");toast("A voz Android não conseguiu falar.");});}});greet();}}});
  web.loadUrl(ORIGIN+"/index.html");
 }
 private void js(String code){if(web!=null&&!closed)web.evaluateJavascript(code,null);}
 private void toast(String text){Toast.makeText(this,text,Toast.LENGTH_LONG).show();}
 private void greet(){
  if(!loaded||!foreground||greeted||pendingQuestion!=null)return;
  js("nexusGreeting("+JSONObject.quote("Olá André! Sou o NEXUS. Estou aqui para te ajudar no trabalho, no lazer ou no que precisares.")+")");
  if(ready){greeted=true;speak("Olá André, como estás? Sou o NEXUS. Em que posso ajudar?");}
 }
 private void speak(String text){if(!foreground||closed)return;if(ready)tts.speak(text.substring(0,Math.min(text.length(),TextToSpeech.getMaxSpeechInputLength())),TextToSpeech.QUEUE_FLUSH,null,"nexus");else toast("Voz indisponível. Verifica a síntese de voz do Android.");}
 private void listen(){
  if(tts!=null)tts.stop();
  if(android.os.Build.VERSION.SDK_INT>=23&&checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED){
   requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO},701);return;
  }
  if(capture!=null){capture.close();capture=null;}
  capture=SpeechCapture.start(this,new SpeechCapture.Callback(){
   @Override public void onStatus(String s){js("nexusVoiceState("+JSONObject.quote(s)+")");}
   @Override public void onText(String spoken){js("nexusHeard("+JSONObject.quote(spoken)+")");onSpokenCommand(spoken);}
   @Override public void onError(String message){js("nexusVoiceState('idle')");js("nexusFeedback("+JSONObject.quote(message)+")");toast(message);}
  });
 }
 private void onSpokenCommand(String spoken){
  if(!foreground||closed)return;
  if(ReminderManager.maybeHandle(this,spoken,msg->{if(foreground)speak(msg);})){js("nexusVoiceState('idle')");return;}
  String q=CommandRouter.plain(spoken).replaceFirst("^(ola\\s+)?(nexus|nexos)[,!: ]*","");
  if(q.matches("^(apresenta.te|apresenta te|quem es|quem es tu|fala.me de ti|diz.me quem es|apresenta o nexus)[?!. ]*$")){
   String reply="Olá André! Sou o NEXUS, a tua assistente pessoal. Posso conversar sobre vários assuntos, ajudar-te com a BRILHAH, criar lembretes e abrir aplicações autorizadas no teu Android. O que vamos fazer?";
   js("nexusLocalAnswer("+JSONObject.quote("NEXUS · Apresentação")+","+JSONObject.quote(reply)+")");
   speak(reply);return;
  }
  if(q.matches("^(abre|abrir|inicia|iniciar|lanca|mostra|executa|entra no|entra na|fecha|fechar|sair|volta|regressa|minimiza)\\s+.*")
       ||q.contains("ecra inicial")||q.matches("^(pesquisa|pesquisar|procura)\\s+.*")){
   String result=CommandRouter.dispatch(this,spoken);
   js("nexusVoiceState('idle')");js("nexusFeedback("+JSONObject.quote(result)+")");
   if(foreground)speak(result);
  }else{
   js("nexusReceiveQuestion("+JSONObject.quote(spoken)+")");
  }
 }
 @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){
  super.onRequestPermissionsResult(requestCode,permissions,grantResults);
  if(requestCode==701){if(grantResults.length>0&&grantResults[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)listen();else toast("É necessário autorizar o microfone para falar.");}
 }
 private void bubble(){if(BubbleService.active){stopService(new Intent(this,BubbleService.class));return;}if(!Settings.canDrawOverlays(this)){new AlertDialog.Builder(this).setTitle("Botão flutuante").setMessage("Autoriza Mostrar sobre outras apps. Depois volta e toca em FLUTUANTE. Ao minimizar, voz e pedidos param; só o botão e o sensor opcional permanecem ativos.").setPositiveButton("Autorizar",(d,w)->startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())))).setNegativeButton("Cancelar",null).show();return;}try{startForegroundService(new Intent(this,BubbleService.class));}catch(Exception e){toast("O Android não permitiu iniciar o botão flutuante.");}}
 private void menu(){new AlertDialog.Builder(this).setTitle("NEXUS · 0.5.1").setItems(new String[]{"Código de acesso ao servidor","Lembretes programados","Testar voz e saudação","Diagnóstico e limitações","Recarregar interface","Apagar contexto desta sessão"},(d,w)->{if(w==0)access();else if(w==1)new AlertDialog.Builder(this).setTitle("Os meus lembretes").setMessage(ReminderManager.list(this)).setPositiveButton("OK",null).show();else if(w==2){if(ready)speak("Olá André, sou o NEXUS. A minha voz está a funcionar.");else toast("A voz Android está indisponível. Verifica a síntese de voz e o volume multimédia.");}else if(w==3)new AlertDialog.Builder(this).setTitle("Diagnóstico").setMessage("Interface: "+(loaded?"carregada localmente":"a carregar")+"\nVoz Android: "+(ready?"pronta":"indisponível")+"\nAcesso guardado: "+(!SecretStore.read(this).isEmpty()?"sim":"não")+"\n\nAvatar: imagem animada, sem face 3D nem lip-sync real. Gestos: apenas sensor de proximidade no painel flutuante; sem câmara. Sem escuta permanente. Ao minimizar param a voz e pedidos. Sair encerra também o botão e sensor. Contas do negócio não estão integradas nesta versão.").setPositiveButton("OK",null).show();else if(w==4){stopMedia();loaded=false;web.reload();}else js("nexusClearHistory()");}).show();}
 private void access(){EditText input=new EditText(this);input.setInputType(129);input.setHint("Código privado existente do NEXUS");new AlertDialog.Builder(this).setTitle("Ligar ao servidor").setMessage("Introduz o código privado da aplicação. Não é uma chave OpenAI. Fica cifrado neste telemóvel.").setView(input).setPositiveButton("Guardar",(d,w)->{try{SecretStore.save(this,input.getText().toString().trim());toast("Código guardado. Envia uma pergunta para verificar a ligação.");}catch(Exception e){toast("Não foi possível guardar o código.");}}).setNegativeButton("Cancelar",null).show();}
 private void request(String payload){String token=SecretStore.read(this);if(token.isEmpty()){js("nexusFailure('Introduz o código em MENU → Código de acesso.')");access();return;}final int turn=++generation;
  worker.submit(()->{HttpsURLConnection c=null;try{c=(HttpsURLConnection)new java.net.URL("https://nexus-assistente-seguro.vercel.app/api/chat").openConnection();connection=c;c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(65000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Authorization","Bearer "+token);try(OutputStream out=c.getOutputStream()){out.write(payload.getBytes("UTF-8"));}int code=c.getResponseCode();if(code==401)throw new IOException("Código de acesso inválido. Corrige-o no MENU.");if(code!=200)throw new IOException("Servidor indisponível (HTTP "+code+"). Tenta novamente.");ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>1000000)throw new IOException("Resposta demasiado grande.");}}JSONObject data=new JSONObject(out.toString("UTF-8"));runOnUiThread(()->{if(turn==generation&&foreground)js("nexusAnswer("+data.toString()+")");});}catch(Exception e){String message=e instanceof java.net.SocketTimeoutException?"O servidor demorou demasiado. Tenta novamente.":e.getMessage();if(message==null||message.contains("Unable to resolve"))message="Sem ligação ao servidor. A interface continua disponível offline.";final String error=message;runOnUiThread(()->{if(turn==generation&&foreground)js("nexusFailure("+JSONObject.quote(error)+")");});}finally{if(c!=null)c.disconnect();if(connection==c)connection=null;}});
 }
 private class Bridge {
  @JavascriptInterface public void ask(String payload){if(payload.length()>40000)return;runOnUiThread(()->{if(foreground)request(payload);});}
  @JavascriptInterface public void speak(String text){runOnUiThread(()->MainActivity.this.speak(text));}
  @JavascriptInterface public void listen(){runOnUiThread(()->{if(foreground)MainActivity.this.listen();});}
  @JavascriptInterface public void command(String text){if(text==null||text.length()>1400)return;runOnUiThread(()->{if(foreground)onSpokenCommand(text);});}
  @JavascriptInterface public void menu(){runOnUiThread(()->MainActivity.this.menu());}
  @JavascriptInterface public void stop(){runOnUiThread(()->{if(tts!=null)tts.stop();});}
 }
 private void stopMedia(){if(capture!=null){capture.close();capture=null;}generation++;if(tts!=null)tts.stop();if(connection!=null)connection.disconnect();js("window.nexusStopAll&&nexusStopAll()");}
 private void exit(){stopMedia();closed=true;stopService(new Intent(this,BubbleService.class));if(web!=null)web.stopLoading();finishAndRemoveTask();}
 @Override protected void onPause(){foreground=false;stopMedia();if(web!=null)web.onPause();super.onPause();}
 @Override protected void onResume(){super.onResume();foreground=true;ReminderManager.scheduleAll(this);if(web!=null)web.onResume();greet();if(loaded&&pendingQuestion!=null){String q=pendingQuestion;pendingQuestion=null;js("nexusReceiveQuestion("+JSONObject.quote(q)+")");}}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);String q=intent.getStringExtra("question");if(q!=null){pendingQuestion=q;}}
 @Override public void onBackPressed(){exit();}
 @Override protected void onDestroy(){stopMedia();closed=true;if(tts!=null)tts.shutdown();worker.shutdownNow();if(web!=null){root.removeView(web);web.removeJavascriptInterface("NexusNative");web.destroy();web=null;}super.onDestroy();}
}
