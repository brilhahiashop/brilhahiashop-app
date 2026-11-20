package pt.nexus.assistant;

import android.app.*;
import android.content.*;
import android.provider.AlarmClock;
import android.widget.TimePicker;
import java.util.Locale;
import java.util.function.Consumer;

/** Android clock integration with explicit acknowledgement from the clock app. */
final class NexusAlarm {
 private NexusAlarm(){}
 static void start(MainActivity a,NexusIntent intent,Consumer<String> say){
  if(intent.kind==NexusIntent.Kind.TIMER){timer(a,intent.original,say);return;}
  int[] parsed=NexusIntent.clockTime(intent.original);
  if(parsed==null){
   new TimePickerDialog(a,(view,hour,minute)->create(a,hour,minute,intent.original,say),
      7,0,true).show();
   say.accept("Escolhe a hora do despertador para eu não adivinhar.");
  }else create(a,parsed[0],parsed[1],intent.original,say);
 }
 private static void create(MainActivity a,int h,int min,String original,Consumer<String> say){
  String label="NEXUS — "+original.trim();
  try{
   Intent alarm=new Intent(AlarmClock.ACTION_SET_ALARM);
   alarm.putExtra(AlarmClock.EXTRA_HOUR,h);
   alarm.putExtra(AlarmClock.EXTRA_MINUTES,min);
   alarm.putExtra(AlarmClock.EXTRA_MESSAGE,label.substring(0,Math.min(label.length(),85)));
   // Always show alarm app: silent creation is not reliable across vendors.
   alarm.putExtra(AlarmClock.EXTRA_SKIP_UI,false);
   a.startActivity(alarm);
   say.accept("Abri o despertador para as "+String.format(Locale.forLanguageTag("pt-PT"),"%02d:%02d",h,min)+". Confirma na aplicação Relógio.");
  }catch(Exception e){say.accept("Não consegui abrir o despertador. Verifica se tens uma aplicação Relógio instalada.");}
 }
 private static void timer(MainActivity a,String phrase,Consumer<String> say){
  int minutes=NexusIntent.durationMinutes(phrase);
  if(minutes<1||minutes>1440){say.accept("Diz quanto tempo queres, por exemplo: NEXUS, põe um temporizador de 20 minutos.");return;}
  try{
   Intent timer=new Intent(AlarmClock.ACTION_SET_TIMER);
   timer.putExtra(AlarmClock.EXTRA_LENGTH,minutes*60);
   timer.putExtra(AlarmClock.EXTRA_MESSAGE,"NEXUS — Temporizador");
   timer.putExtra(AlarmClock.EXTRA_SKIP_UI,false);
   a.startActivity(timer);
   say.accept("Abri o temporizador de "+minutes+" minutos. Confirma no Relógio.");
  }catch(Exception e){say.accept("O Android não encontrou uma aplicação para definir o temporizador.");}
 }
}
