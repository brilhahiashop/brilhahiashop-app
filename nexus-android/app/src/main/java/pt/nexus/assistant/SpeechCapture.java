package pt.nexus.assistant;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import java.util.ArrayList;
import java.util.Locale;

/** Tap-initiated recognition inside NEXUS, without launching Google speech UI. */
public final class SpeechCapture implements RecognitionListener {
 public interface Callback { void onStatus(String status); void onText(String text); void onError(String message); }
 private final SpeechRecognizer recognizer;
 private final Callback callback;
 private boolean finished;
 private SpeechCapture(SpeechRecognizer r, Callback c){recognizer=r;callback=c;}
 public static SpeechCapture start(Activity a, Callback cb) {
  if(!SpeechRecognizer.isRecognitionAvailable(a)){cb.onError("O serviço de voz não está disponível neste telemóvel.");return null;}
  try {
   SpeechRecognizer r;
   r=SpeechRecognizer.createSpeechRecognizer(a);
   SpeechCapture c=new SpeechCapture(r,cb);
   r.setRecognitionListener(c);
   Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
   intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
   intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"pt-PT");
   intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,"pt-PT");
   intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
   intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,true);
   cb.onStatus("listening");r.startListening(intent);
   return c;
  }catch(Exception e){cb.onError("O reconhecimento de voz não iniciou. Verifica a permissão do microfone.");return null;}
 }
 public void close(){if(finished)return;finished=true;try{recognizer.cancel();}catch(Exception ignored){}try{recognizer.destroy();}catch(Exception ignored){}}
 @Override public void onReadyForSpeech(Bundle p){callback.onStatus("listening");}
 @Override public void onBeginningOfSpeech(){}
 @Override public void onRmsChanged(float rms){}
 @Override public void onBufferReceived(byte[] b){}
 @Override public void onEndOfSpeech(){callback.onStatus("thinking");}
 @Override public void onError(int code){
  if(finished)return;
  String msg=code==SpeechRecognizer.ERROR_NO_MATCH||code==SpeechRecognizer.ERROR_SPEECH_TIMEOUT?"Não ouvi uma frase completa. Toca novamente para falar.":"Não consegui reconhecer a voz. Confirma as permissões e tenta novamente.";
  callback.onError(msg);close();
 }
 @Override public void onResults(Bundle results){
  if(finished)return;ArrayList<String> texts=results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
  String text=texts==null||texts.isEmpty()?"":texts.get(0).trim();
  if(text.isEmpty())callback.onError("Não consegui perceber o comando.");else callback.onText(text);
  close();
 }
 @Override public void onPartialResults(Bundle partial){}
 @Override public void onEvent(int eventType,Bundle params){}
}