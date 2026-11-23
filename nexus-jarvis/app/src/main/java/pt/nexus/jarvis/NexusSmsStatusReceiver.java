package pt.nexus.jarvis;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/** Outcome of device/SIM SMS submission. Carrier delivery is NOT guaranteed. */
public final class NexusSmsStatusReceiver extends BroadcastReceiver {
    static final String ACTION="pt.nexus.jarvis.SMS_SENT";
    @Override public void onReceive(Context context,Intent intent){
        if(intent==null||!ACTION.equals(intent.getAction()))return;
        final int ref=intent.getIntExtra("ref",0), part=intent.getIntExtra("part",-1), total=intent.getIntExtra("total",0);
        if(ref==0||part<0||total<1||total>12||part>=total)return;
        final String prefix="sms."+ref+".";
        synchronized(NexusSmsStatusReceiver.class){
            SharedPreferences prefs=context.getSharedPreferences("nexus_sms_status",Context.MODE_PRIVATE);
            if(prefs.getBoolean(prefix+"part."+part,false))return;
            int count=prefs.getInt(prefix+"count",0)+1;
            boolean failed=prefs.getBoolean(prefix+"failed",false)||getResultCode()!=Activity.RESULT_OK;
            prefs.edit().putBoolean(prefix+"part."+part,true).putInt(prefix+"count",count).putBoolean(prefix+"failed",failed).apply();
            if(count<total)return;
            String status=failed
                ?"O Android indicou uma falha no envio do SMS. Verifica a conversa na aplicação Mensagens."
                :"O Android confirmou o envio do SMS pela rede móvel. A entrega ao destinatário ainda não está confirmada.";
            prefs.edit().putString("last",status).apply();
            MainActivity.reportSmsResult(status);
        }
    }
}
