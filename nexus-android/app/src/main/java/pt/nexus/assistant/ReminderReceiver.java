package pt.nexus.assistant;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.os.Build;

public final class ReminderReceiver extends BroadcastReceiver {
 private static final String CHANNEL="nexus_local_reminders_v1";
 @Override public void onReceive(Context context,Intent intent){
  String action=intent==null?"":intent.getAction();
  if(!"pt.nexus.assistant.REMINDER".equals(action)){
   ReminderManager.scheduleAll(context);return;
  }
  int id=intent.getIntExtra("id",0);
  String title=intent.getStringExtra("title");
  if(title==null||title.trim().isEmpty())title="Compromisso";
  ReminderManager.complete(context,id);
  NotificationManager nm=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
  if(nm==null)return;
  NotificationChannel channel=new NotificationChannel(CHANNEL,"Lembretes do NEXUS",NotificationManager.IMPORTANCE_DEFAULT);
  channel.setDescription("Lembretes criados pelo utilizador; respeitam o modo de som e não incomodam em silêncio");
  channel.enableVibration(true);
  channel.setSound(null,null);
  nm.createNotificationChannel(channel);
  PendingIntent open=PendingIntent.getActivity(context,id,new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification note=new Notification.Builder(context,CHANNEL)
   .setSmallIcon(android.R.drawable.ic_popup_reminder)
   .setContentTitle("NEXUS · Lembrete")
   .setContentText(title)
   .setStyle(new Notification.BigTextStyle().bigText("André, tens um lembrete: "+title))
   .setContentIntent(open).setAutoCancel(true).setWhen(System.currentTimeMillis()).build();
  boolean permission=Build.VERSION.SDK_INT<33||context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
  if(permission)nm.notify(id,note);
  AudioManager audio=(AudioManager)context.getSystemService(Context.AUDIO_SERVICE);
  boolean soundOn=audio!=null&&audio.getRingerMode()==AudioManager.RINGER_MODE_NORMAL&&audio.getStreamVolume(AudioManager.STREAM_NOTIFICATION)>0;
  boolean dnd=nm.getCurrentInterruptionFilter()!=NotificationManager.INTERRUPTION_FILTER_ALL;
  if(soundOn&&!dnd&&!context.getSharedPreferences("privacy",0).getBoolean("exited",false)){
   try{
    Intent talk=new Intent(context,ReminderSpeechService.class).putExtra("title",title).putExtra("id",id);
    if(Build.VERSION.SDK_INT>=26)context.startForegroundService(talk);else context.startService(talk);
   }catch(Exception ignored){ /* Notification remains; service start may be restricted. */ }
  }
 }
}