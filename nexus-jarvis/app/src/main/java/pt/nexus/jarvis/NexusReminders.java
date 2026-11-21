package pt.nexus.jarvis;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/** Local reminders never leave the device; delivery can be delayed by battery restrictions. */
final class NexusReminders {
    static final String ACTION = "pt.nexus.jarvis.REMINDER";
    private static final String PREF = "jarvis-reminders-v1";
    private NexusReminders() {}
    static synchronized String add(Context ctx, String title, long when) {
        if (title==null||title.trim().length()<2) return "Preciso que me digas o assunto do lembrete.";
        if (when<=System.currentTimeMillis()+1000) return "A hora do lembrete tem de ser no futuro.";
        try {
            JSONArray a=load(ctx);
            int id=(int)(System.currentTimeMillis()%1700000000L);
            JSONObject item=new JSONObject().put("id",id).put("title",title.trim()).put("when",when);
            a.put(item);
            ctx.getSharedPreferences(PREF,0).edit().putString("items",a.toString()).apply();
            schedule(ctx,item);
            return "Lembrete guardado para "+new java.text.SimpleDateFormat("d 'de' MMMM 'às' HH:mm",java.util.Locale.forLanguageTag("pt-PT")).format(new java.util.Date(when))+": "+title.trim()+".";
        }catch(Exception e){return "Não consegui guardar o lembrete neste telemóvel.";}
    }
    private static JSONArray load(Context c){
        try{return new JSONArray(c.getSharedPreferences(PREF,0).getString("items","[]"));}
        catch(Exception e){return new JSONArray();}
    }
    static synchronized String list(Context c){
        JSONArray a=load(c);
        if(a.length()==0)return "Não tens lembretes pendentes.";
        StringBuilder sb=new StringBuilder();
        java.text.SimpleDateFormat fmt=new java.text.SimpleDateFormat("dd/MM HH:mm",java.util.Locale.forLanguageTag("pt-PT"));
        for(int i=0;i<a.length()&&i<15;i++){
            JSONObject x=a.optJSONObject(i);if(x==null)continue;
            if(sb.length()>0)sb.append("\n");
            sb.append(fmt.format(new java.util.Date(x.optLong("when")))).append(" — ").append(x.optString("title"));
        }
        return sb.toString();
    }
    static synchronized void complete(Context c,int id){
        JSONArray orig=load(c),next=new JSONArray();
        for(int i=0;i<orig.length();i++){
            JSONObject x=orig.optJSONObject(i);
            if(x!=null&&x.optInt("id")!=id)next.put(x);
        }
        c.getSharedPreferences(PREF,0).edit().putString("items",next.toString()).apply();
    }
    private static void schedule(Context c,JSONObject x){
        int id=x.optInt("id");long at=x.optLong("when");
        Intent intent=new Intent(c,NexusReminderReceiver.class).setAction(ACTION)
          .putExtra("id",id).putExtra("title",x.optString("title"));
        PendingIntent p=PendingIntent.getBroadcast(c,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if(alarms==null)return;
        if(Build.VERSION.SDK_INT>=31&&alarms.canScheduleExactAlarms())
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);
        else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);
    }
    static synchronized void restore(Context c){
        JSONArray all=load(c);
        for(int i=0;i<all.length();i++){
            JSONObject x=all.optJSONObject(i);
            if(x!=null&&x.optLong("when")>System.currentTimeMillis()+1000)schedule(c,x);
        }
    }
    static boolean canNotify(Context c){
        return Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
    }
}
