package pt.nexus.assistant;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.speech.*;
import android.speech.tts.*;
import java.util.*;
import java.util.regex.*;

/**
 * Explicit, limited-duration user-initiated voice session.
 * Start ONLY while MainActivity is visible, with RECORD_AUDIO and visible overlay permission.
 * No automatic boot, covert listening, or silent background recording.
 * Recognition service is restarted between phrases only within a 15 minute user session;
 * platform recognition may terminate earlier and can consume battery/mobile data.
 */
public final class HandsFreeService extends Service {
 public static volatile boolean active=false;
 private static final String CHANNEL="nexus_hands_free_v1";
 private static final String ACTION_STOP="pt.nexus.assistant.HANDS_FREE_STOP";
 private static final long MAX_MILLIS=15*60*1000L;
 private static final int NOTIFY_ID=7142;
 private final Handler ui=new Handler(Looper.getMainLooper());
 private SpeechRecognizer recognizer;private TextToSpeech tts;
 private boolean running=false,appVisible=false,speaking=false,listening=false;
 private long endsAt=0;
 private int errors=0;
 private String lastStatus="A iniciar…";
 private final Runnable restart=this::listen;
 private final Runnable timeout=()->{if(running){update("Sessão terminada após 15 minutos.");stopSelf();}};
 @Override public IBinder onBind(Intent intent){return null;}
 public static void setAppVisible(boolean visible){
  nexusVisible=visible;
  HandsFreeService service=current;
  if(service==null||!service.running)return;
  service.ui.post(()->service.setVisible(visible));
 }
 private static volatile HandsFreeService current;
 private static volatile boolean nexusVisible=true;
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  if(intent!=null&&ACTION_STOP.equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
  if(running)return START_NOT_STICKY;
  if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED
     || !Settings.canDrawOverlays(this)){stopSelf();return START_NOT_STICKY;}
  try{
    NotificationManager manager=getSystemService(NotificationManager.class);
    NotificationChannel ch=new NotificationChannel(CHANNEL,"NEXUS · Mãos livres",NotificationManager.IMPORTANCE_LOW);
    ch.setDescription("Microfone ativado pelo utilizador; pára automaticamente ou ao escolher Parar.");
    manager.createNotificationChannel(ch);
    if(Build.VERSION.SDK_INT>=29)
      startForeground(NOTIFY_ID,notification("Microfone ativo — diz NEXUS e o comando"),ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
    else startForeground(NOTIFY_ID,notification("Microfone ativo — diz NEXUS e o comando"));
  }catch(Exception e){stopSelf();return START_NOT_STICKY;}
  running=true;active=true;current=this;appVisible=nexusVisible;endsAt=SystemClock.elapsedRealtime()+MAX_MILLIS;
  ui.postDelayed(timeout,MAX_MILLIS);
  tts=new TextToSpeech(this,status->{
    if(!running||tts==null)return;
    if(status==TextToSpeech.SUCCESS){
       int lang=tts.setLanguage(new Locale("pt","PT"));
       if(lang<0)tts.setLanguage(new Locale("pt"));
       tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
         @Override public void onStart(String id){ui.post(()->{speaking=true;releaseRecognizer();});}
         @Override public void onDone(String id){ui.post(()->{speaking=false;listenLater(800);});}
         @Override public void onError(String id){ui.post(()->{speaking=false;listenLater(800);});}
       });
    }
  });
  listenLater(650);
  return START_NOT_STICKY;
 }
 private Notification notification(String status){
  Intent open=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  PendingIntent main=PendingIntent.getActivity(this,340,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Intent stopIntent=new Intent(this,HandsFreeService.class).setAction(ACTION_STOP);
  PendingIntent stop=PendingIntent.getService(this,341,stopIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  return new Notification.Builder(this,CHANNEL)
    .setSmallIcon(R.drawable.nexus_icon)
    .setContentTitle("NEXUS · MÃOS LIVRES ATIVO")
    .setContentText(status)
    .setContentIntent(main)
    .setOngoing(true)
    .addAction(new Notification.Action.Builder(R.drawable.nexus_icon,"Parar microfone",stop).build())
    .build();
 }
 private void update(String msg){
   lastStatus=msg;
   try{NotificationManager manager=getSystemService(NotificationManager.class);if(manager!=null)manager.notify(NOTIFY_ID,notification(msg));}catch(Exception ignored){}
 }
 private void setVisible(boolean visible){
  appVisible=visible;
  if(visible){ui.removeCallbacks(restart);if(tts!=null)tts.stop();speaking=false;releaseRecognizer();update("Em pausa enquanto o NEXUS está aberto.");}
  else if(running)listenLater(700);
 }
 private void listenLater(long delay){
  ui.removeCallbacks(restart);
  if(running&&!appVisible&&!speaking&&SystemClock.elapsedRealtime()<endsAt)ui.postDelayed(restart,delay);
 }
 private void releaseRecognizer(){
  listening=false;
  if(recognizer!=null){SpeechRecognizer r=recognizer;recognizer=null;try{r.cancel();}catch(Exception ignored){}try{r.destroy();}catch(Exception ignored){}}
 }
 private void listen(){
  if(!running||appVisible||speaking||recognizer!=null)return;
  if(SystemClock.elapsedRealtime()>=endsAt){stopSelf();return;}
  if(!SpeechRecognizer.isRecognitionAvailable(this)){update("Reconhecimento indisponível. Pára e configura os serviços de voz.");stopSelf();return;}
  try{
   SpeechRecognizer r=SpeechRecognizer.createSpeechRecognizer(this);
   recognizer=r;
   r.setRecognitionListener(new RecognitionListener(){
     public void onReadyForSpeech(Bundle p){listening=true;update("A ouvir «NEXUS» · pára na notificação");}
     public void onBeginningOfSpeech(){}
     public void onRmsChanged(float rms){}
     public void onBufferReceived(byte[] b){}
     public void onEndOfSpeech(){listening=false;}
     public void onError(int err){
       if(r!=recognizer||!running)return;
       releaseRecognizer();
       // Harmless no-match and timeout errors are normal after silence.
       if(err==SpeechRecognizer.ERROR_NO_MATCH||err==SpeechRecognizer.ERROR_SPEECH_TIMEOUT){errors=0;listenLater(650);return;}
       errors++;
       if(errors>=5){update("Voz interrompida pelo Android. Reativa o modo no NEXUS.");stopSelf();return;}
       listenLater(Math.min(5500,800L*errors));
     }
     public void onResults(Bundle results){
       if(r!=recognizer||!running)return;
       ArrayList<String> phrases=results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
       String spoken=(phrases==null||phrases.isEmpty())?"":phrases.get(0).trim();
       errors=0;releaseRecognizer();
       process(spoken);
     }
     public void onPartialResults(Bundle p){}
     public void onEvent(int e,Bundle p){}
   });
   Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
   i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
   i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"pt-PT");
   i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);
   i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
   r.startListening(i);
  }catch(Exception e){releaseRecognizer();errors++;if(errors>=5)stopSelf();else listenLater(1000L*errors);}
 }
 static String commandAfterWakeWord(String speech){
  String q=CommandRouter.plain(speech==null?"":speech).replaceAll("[?!.,:;]"," ").replaceAll("\\s+"," ").trim();
  // Prevent TV/music/conversations from triggering unintended actions.
  Matcher m=Pattern.compile("^(?:(?:ola|hey|ei)\\s+)?(?:nexus|nexos|nexus assistente)\\b\\s*(.*)$").matcher(q);
  return m.matches()?m.group(1).trim():null;
 }
 private void process(String speech){
  String q=commandAfterWakeWord(speech);
  if(q==null||q.isEmpty()){listenLater(600);return;}
  if(q.matches(".*\\b(para de ouvir|desliga o microfone|desativa maos livres|desliga maos livres|fica em silencio|para a escuta)\\b.*")){
    tell("Modo mãos-livres desligado.",true);return;
  }
  if(q.matches(".*\\b(sair do nexus|fecha o nexus|desliga o nexus)\\b.*")){
    getSharedPreferences("privacy",0).edit().putBoolean("exited",true).apply();stopService(new Intent(this,BubbleService.class));stopService(new Intent(this,ReminderSpeechService.class));tell("NEXUS encerrado.",true);return;
  }
  if(q.matches("^(volta|regressa|mostra|abre|muda para|ir para|vai para)\\s+(ao?\\s+|para\\s+)?(nexus|assistente|nexos)$")){
    boolean ok=openNexus(null);if(ok)tell("Voltei ao NEXUS.",false);else tell("Não consegui abrir o NEXUS. Usa o botão flutuante.",false);
    return;
  }
  if(q.contains("ecra inicial")||q.matches("^(vai|volta|regressa)\\s+ao?\\s+inicio$")){
    boolean ok=startActivitySafe(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME));
    tell(ok?"Voltei ao ecrã inicial.":"O Android não permitiu voltar ao ecrã inicial.",false);return;
  }
  String target=requestedApp(q);
  if(target!=null){
    boolean ok=launchApp(target);
    tell(ok?"A abrir "+target+".":"Não consegui abrir "+target+". Podes usar o botão flutuante.",false);
    return;
  }
  if(q.matches("^(pesquisa|pesquisar|procura|procura por|pesquisa por)\\s+.+")){
    String query=q.replaceFirst("^(pesquisa|pesquisar|procura)\\s+(?:por\\s+)?","");
    boolean ok=startActivitySafe(new Intent(Intent.ACTION_VIEW,Uri.parse("https://www.google.com/search?q="+Uri.encode(query))));
    tell(ok?"A pesquisar "+query+".":"Não consegui iniciar a pesquisa.",false);return;
  }
  // Everything else is handed to the visible native NEXUS app for AI/reminders/teaching.
  if(openNexus(speech)){update("A continuar conversa no NEXUS.");}
  else tell("Não consegui voltar ao NEXUS. Toca na esfera flutuante.",false);
 }
 static String requestedApp(String q){return CommandText.requestedApp(q);}
 private boolean startActivitySafe(Intent i){
  i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
  try{startActivity(i);return true;}catch(Exception ignored){return false;}
 }
 private boolean launchApp(String target){
  String name=CommandRouter.appName(target);
  if(name.equals("definicoes")||name.equals("configuracoes"))return startActivitySafe(new Intent(Settings.ACTION_SETTINGS));
  if(name.equals("camara")||name.equals("camera"))return startActivitySafe(new Intent("android.media.action.IMAGE_CAPTURE"));
  PackageManager pm=getPackageManager();
  for(String pkg:CommandRouter.knownPackages(name))if(launchPackage(pm,pkg))return true;
  Intent query=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
  List<ResolveInfo> apps=pm.queryIntentActivities(query,0);
  ResolveInfo found=null;int score=0;
  for(ResolveInfo r:apps){
    if(r.activityInfo==null||r.activityInfo.packageName.equals(getPackageName()))continue;
    String title=CommandRouter.plain(String.valueOf(r.loadLabel(pm)));
    int s=title.equals(name)?100:title.startsWith(name)?80:title.contains(name)?65:0;
    if(s>score){score=s;found=r;}
  }
  if(found==null)return false;
  if(launchPackage(pm,found.activityInfo.packageName))return true;
  Intent i=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
  i.setClassName(found.activityInfo.packageName,found.activityInfo.name);
  return startActivitySafe(i);
 }
 private boolean launchPackage(PackageManager pm,String pkg){
  if(Build.VERSION.SDK_INT>=33){
   try{
     IntentSender sender=pm.getLaunchIntentSenderForPackage(pkg);
     sender.sendIntent(this,0,null,null,null);return true;
   }catch(Exception ignored){}
  }
  Intent i=pm.getLaunchIntentForPackage(pkg);
  return i!=null&&startActivitySafe(i);
 }
 private boolean openNexus(String spoken){
  Intent i=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
  if(spoken!=null)i.putExtra("hands_free_utterance",spoken);
  return startActivitySafe(i);
 }
 private void tell(String s,boolean end){
  if(!running)return;
  update(s);
  if(tts==null){if(end)stopSelf();else listenLater(650);return;}
  if(end){
   ui.removeCallbacks(restart);releaseRecognizer();
   try{
    tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
      @Override public void onStart(String id){}
      @Override public void onDone(String id){ui.post(()->stopSelf());}
      @Override public void onError(String id){ui.post(()->stopSelf());}
    });
    tts.speak(s,TextToSpeech.QUEUE_FLUSH,null,"nexus-end");
    ui.postDelayed(()->stopSelf(),4500);
   }catch(Exception e){stopSelf();}
  }else{
   try{speaking=true;int result=tts.speak(s,TextToSpeech.QUEUE_FLUSH,null,"nexus-feedback");if(result==TextToSpeech.ERROR){speaking=false;listenLater(900);}}
   catch(Exception e){speaking=false;listenLater(900);}
  }
 }
 @Override public void onTaskRemoved(Intent rootIntent){
  // User explicitly removes the NEXUS task -> release the microphone and overlay.
  stopService(new Intent(this,BubbleService.class));
  stopSelf();
  super.onTaskRemoved(rootIntent);
 }
 @Override public void onDestroy(){
  running=false;active=false;current=null;
  ui.removeCallbacksAndMessages(null);
  releaseRecognizer();
  if(tts!=null){tts.stop();tts.shutdown();tts=null;}
  stopForeground(STOP_FOREGROUND_REMOVE);
  super.onDestroy();
 }
}