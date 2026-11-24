package pt.nexus.jarvis;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONObject;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Counts active social notifications; NEVER reads, stores, transmits or exposes their text.
 * This is a device-notification count, NOT the number of unread social messages.
 */
public final class NexusSocialListener extends NotificationListenerService {
    private static volatile NexusSocialListener active;
    @Override public void onListenerConnected(){super.onListenerConnected();active=this;}
    @Override public void onListenerDisconnected(){
        active=null;super.onListenerDisconnected();
    }
    private static String category(String pkg){
        if(pkg==null)return null;
        switch(pkg) {
            case "com.facebook.katana":return "Facebook";
            case "com.facebook.orca":return "Messenger";
            case "com.instagram.android":return "Instagram";
            case "com.whatsapp":return "WhatsApp";
            case "com.whatsapp.w4b":return "WhatsApp Business";
            case "com.zhiliaoapp.musically":return "TikTok";
            case "com.twitter.android":return "X";
            case "com.linkedin.android":return "LinkedIn";
            case "org.telegram.messenger":return "Telegram";
            case "com.google.android.youtube":return "YouTube";
            case "com.snapchat.android":return "Snapchat";
            case "com.pinterest":return "Pinterest";
            default:return null;
        }
    }
    static JSONObject status(Context ctx){
        JSONObject result=new JSONObject(),groups=new JSONObject();
        try{
            NotificationManager manager=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            boolean enabled=manager!=null&&Build.VERSION.SDK_INT>=27
                &&manager.isNotificationListenerAccessGranted(new ComponentName(ctx,NexusSocialListener.class));
            result.put("enabled",enabled);
            if(!enabled){result.put("message","Autoriza o acesso às notificações nas definições do Android.");return result;}
            NexusSocialListener service=active;
            if(service==null){result.put("message","Serviço ainda a iniciar. Abre novamente as notificações.");return result;}
            Map<String,Integer> counts=new LinkedHashMap<>();
            StatusBarNotification[] notifications=service.getActiveNotifications();
            if(notifications!=null)for(StatusBarNotification sbn:notifications){
                String key=category(sbn.getPackageName());
                if(key==null)continue;
                Notification n=sbn.getNotification();
                if(n==null)continue;
                if((n.flags & Notification.FLAG_ONGOING_EVENT)!=0)continue;
                if((n.flags & Notification.FLAG_GROUP_SUMMARY)!=0)continue;
                counts.put(key,counts.containsKey(key)?counts.get(key)+1:1);
            }
            int total=0;
            for(Map.Entry<String,Integer> e:counts.entrySet()){
                groups.put(e.getKey(),e.getValue());total+=e.getValue();
            }
            result.put("total",total).put("groups",groups).put("enabled",true);
            result.put("message","Notificações Android ativas; não equivale ao total de mensagens não lidas.");
        }catch(Exception e){
            try{result.put("message","Não foi possível consultar as notificações do Android.");}catch(Exception ignored){}
        }
        return result;
    }
}
