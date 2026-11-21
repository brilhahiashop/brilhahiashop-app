package pt.nexus.jarvis;

import android.app.*;
import android.content.*;
import android.os.Build;

public final class NexusReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL="nexus-jarvis-reminders-v1";
    @Override public void onReceive(Context context,Intent intent){
        if(intent==null)return;
        if(!NexusReminders.ACTION.equals(intent.getAction())){
            NexusReminders.restore(context);return;
        }
        int id=intent.getIntExtra("id",0);
        String title=intent.getStringExtra("title");
        if(title==null||title.trim().isEmpty())title="Lembrete";
        NexusReminders.complete(context,id);
        if(!NexusReminders.canNotify(context))return;
        NotificationManager mgr=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if(mgr==null)return;
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(CHANNEL,"Lembretes NEXUS",NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Lembretes solicitados por voz ou texto");
            mgr.createNotificationChannel(ch);
        }
        PendingIntent open=PendingIntent.getActivity(context,id,
            new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,CHANNEL):new Notification.Builder(context);
        mgr.notify(id,b.setContentTitle("NEXUS · Lembrete").setContentText(title)
            .setStyle(new Notification.BigTextStyle().bigText(title))
            .setSmallIcon(android.R.drawable.ic_popup_reminder).setAutoCancel(true)
            .setContentIntent(open).build());
    }
}
