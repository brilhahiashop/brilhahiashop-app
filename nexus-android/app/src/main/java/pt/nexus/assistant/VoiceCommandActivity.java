package pt.nexus.assistant;
import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

/** A transparent, tap-initiated NEXUS listener. Never launches the Google dialog. */
public final class VoiceCommandActivity extends Activity {
 private SpeechCapture capture;
 private boolean done=false;
 @Override public void onCreate(Bundle b){super.onCreate(b);
  getWindow().setBackgroundDrawableResource(android.R.color.transparent);
  TextView status=new TextView(this);status.setTag("nexus");
  status.setText("◉  NEXUS · ESTOU A OUVIR");status.setTextColor(0xffa6eaff);status.setTextSize(15);
  status.setGravity(Gravity.CENTER);status.setPadding(14,16,14,16);
  status.setBackgroundColor(0x990b2039);setContentView(status);
  getWindow().setLayout(WindowManager.LayoutParams.MATCH_PARENT,WindowManager.LayoutParams.WRAP_CONTENT);
  getWindow().setGravity(Gravity.BOTTOM);
  if(android.os.Build.VERSION.SDK_INT>=23&&checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED)
    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},710);
  else startListening(status);
 }
 private void startListening(TextView status){
  capture=SpeechCapture.start(this,new SpeechCapture.Callback(){
   @Override public void onStatus(String s){status.setText("◉ NEXUS · "+("thinking".equals(s)?"A PROCESSAR":"ESTOU A OUVIR"));}
   @Override public void onText(String raw){if(done)return;done=true;
    if(!ReminderManager.maybeHandle(VoiceCommandActivity.this,raw,msg->{
     Toast.makeText(VoiceCommandActivity.this,msg,Toast.LENGTH_LONG).show();
    })){
     String result=CommandRouter.dispatch(VoiceCommandActivity.this,raw);
     Toast.makeText(VoiceCommandActivity.this,result,Toast.LENGTH_SHORT).show();
     finish();
    }else { /* May be showing native date/time confirmation; keep this activity alive. */ }
   }
   @Override public void onError(String msg){if(!done){done=true;Toast.makeText(VoiceCommandActivity.this,msg,Toast.LENGTH_SHORT).show();finish();}}
  });
 }
 @Override public void onRequestPermissionsResult(int code,String[] perms,int[] results){
  super.onRequestPermissionsResult(code,perms,results);
  if(code==710){if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)startListening((TextView)((android.view.ViewGroup)findViewById(android.R.id.content)).getChildAt(0));else{Toast.makeText(this,"Permite o microfone para falar com o NEXUS.",Toast.LENGTH_LONG).show();finish();}}
 }
 @Override protected void onDestroy(){if(capture!=null)capture.close();super.onDestroy();}
}