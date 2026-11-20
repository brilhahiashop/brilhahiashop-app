package pt.nexus.assistant;
import android.app.*;
import android.content.*;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.os.*;
import android.speech.tts.*;
import java.util.Locale;

/** Announces user-created reminders only in normal sound mode. Never records audio. */
public final class ReminderSpeechService extends Service {
 private TextToSpeech speaker;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private static final String CHANNEL="nexus_reminder_speech_v1";
 @Override public IBinder onBind(Intent i){return null;}
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  String title=intent==null?"Compromisso":intent.getStringExtra("title");
  if(title==null||title.trim().isEmpty())title="Compromisso";
  int id=intent==null?0:intent.getIntExtra("id",0);
  NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
  if(nm!=null){
   NotificationChannel ch=new NotificationChannel(CHANNEL,"NEXUS a anunciar lembrete",NotificationManager.IMPORTANCE_LOW);
   ch.setSound(null,null);nm.createNotificationChannel(ch);
  }
  Notification n=new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_popup_reminder)
    .setContentTitle("NEXUS · Aviso por voz").setContentText(title).setOngoing(true).build();
  try{
   if(Build.VERSION.SDK_INT>=29)startForeground(850000+Math.abs(id%10000),n,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
   else startForeground(850000+Math.abs(id%10000),n);
  }catch(Exception e){stopSelf();return START_NOT_STICKY;}
  AudioManager audio=(AudioManager)getSystemService(AUDIO_SERVICE);
  NotificationManager m=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
  if(audio==null||audio.getRingerMode()!=AudioManager.RINGER_MODE_NORMAL||audio.getStreamVolume(AudioManager.STREAM_NOTIFICATION)==0||(m!=null&&m.getCurrentInterruptionFilter()!=NotificationManager.INTERRUPTION_FILTER_ALL)){
   stopSelf();return START_NOT_STICKY;
  }
  final String message="André, tens um compromisso agora: "+title;
  speaker=new TextToSpeech(this,status->{
   if(status!=TextToSpeech.SUCCESS){stopSelf();return;}
   speaker.setLanguage(new Locale("pt","PT"));
   speaker.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
   speaker.setOnUtteranceProgressListener(new UtteranceProgressListener(){
    @Override public void onStart(String utteranceId){}
    @Override public void onDone(String utteranceId){handler.post(()->stopSelf());}
    @Override public void onError(String utteranceId){handler.post(()->stopSelf());}
   });
   speaker.speak(message,TextToSpeech.QUEUE_FLUSH,null,"nexus-reminder-"+id);
  });
  handler.postDelayed(()->stopSelf(),28000);
  return START_NOT_STICKY;
 }
 @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);if(speaker!=null){speaker.stop();speaker.shutdown();speaker=null;}super.onDestroy();}
}