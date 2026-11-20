package pt.nexus.assistant;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.Locale;

/** Visible, tap-initiated speech. No hidden microphone recording or permanent listening. */
public class VoiceCommandActivity extends Activity {
    private static final int VOICE=114;
    @Override public void onCreate(Bundle b){super.onCreate(b);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
        WindowManager.LayoutParams lp=getWindow().getAttributes();lp.dimAmount=.19f;getWindow().setAttributes(lp);
        TextView t=new TextView(this);t.setText("✦  NEXUS\n\nDiz o teu comando…");t.setTextColor(0xffd6f4ff);t.setTextSize(22);t.setGravity(Gravity.CENTER);t.setPadding(26,42,26,42);t.setBackgroundColor(0xee071c32);setContentView(t);
        try{
            Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"pt-PT");
            i.putExtra(RecognizerIntent.EXTRA_PROMPT,"NEXUS — fala agora");
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
            startActivityForResult(i,VOICE);
        }catch(ActivityNotFoundException e){Toast.makeText(this,"Reconhecimento de voz indisponível no telemóvel.",Toast.LENGTH_LONG).show();finish();}
    }
    @Override protected void onActivityResult(int code,int result,Intent data){super.onActivityResult(code,result,data);
        if(code==VOICE&&result==RESULT_OK&&data!=null){
            ArrayList<String> results=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if(results!=null&&!results.isEmpty()){
                String answer=CommandRouter.dispatch(this,results.get(0));
                Toast.makeText(this,answer,Toast.LENGTH_SHORT).show();
            }
        }
        finish();
    }
}
