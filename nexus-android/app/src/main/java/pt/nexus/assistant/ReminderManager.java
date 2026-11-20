package pt.nexus.assistant;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.CalendarContract;
import android.provider.Settings;
import android.net.Uri;
import android.widget.EditText;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Reminders are stored locally; none of this data is sent to the NEXUS server. */
public final class ReminderManager {
 private static final String PREF="nexus_local_reminders";
 private static final String KEY="items";
 private ReminderManager(){}
 static String plain(String s){return Normalizer.normalize(s.toLowerCase(new Locale("pt","PT")),Normalizer.Form.NFD).replaceAll("\\p{M}+","");}
 public static boolean maybeHandle(Activity a,String spoken,Consumer<String> say){
  String phrase=spoken==null?"":spoken.trim();
  String q=plain(phrase).replaceFirst("^(ola\\s+)?(nexus|nexos)[,!: ]*","");
  if(q.matches(".*(lista|mostra|quais sao|diz).*(lembrete|compromisso).*")){
   String summary=list(a);
   new AlertDialog.Builder(a).setTitle("NEXUS · Lembretes").setMessage(summary).setPositiveButton("OK",null).show();
   say.accept(summary);return true;
  }
  if(!q.matches(".*(lembra.m[e]?|lembrete|avisa.m[e]?|recorda.m[e]?|agend[ae]|agenda|compromisso|marca.*reuniao).*"))return false;
  boolean calendar=q.contains("calendario");
  Parsed result=parse(phrase);
  askPermissions(a);
  if(result.hasDate&&result.hasTime&&result.time>System.currentTimeMillis()+60000&&result.title.length()>2){
   scheduleAndConfirm(a,result.title,result.time,calendar,say);
  }else{
   EditText title=new EditText(a);title.setSingleLine(false);title.setText(result.title);title.setHint("Assunto do lembrete");
   new AlertDialog.Builder(a).setTitle("NEXUS · Novo lembrete").setMessage("Confirma o assunto. A seguir escolhes o dia e a hora para evitar avisos errados.").setView(title)
    .setPositiveButton("Escolher data",(dialog,which)->chooseDate(a,title.getText().toString().trim(),result,calendar,say))
    .setNegativeButton("Cancelar",null).show();
  }
  return true;
 }
 private static class Parsed{String title;long time;boolean hasTime,hasDate;}
 private static Parsed parse(String spoken){
  String q=plain(spoken);Calendar c=Calendar.getInstance();Parsed p=new Parsed();
  if(q.contains("depois de amanha")){c.add(Calendar.DAY_OF_MONTH,2);p.hasDate=true;}
  else if(q.contains("amanha")){c.add(Calendar.DAY_OF_MONTH,1);p.hasDate=true;}
  else if(q.contains("hoje"))p.hasDate=true;
  Matcher date=Pattern.compile("\\bdia\\s+(\\d{1,2})(?:\\s+de\\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?").matcher(q);
  if(date.find()){int day=Integer.parseInt(date.group(1));int month=c.get(Calendar.MONTH);if(date.group(2)!=null){String[] months={"janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"};for(int k=0;k<12;k++)if(months[k].equals(date.group(2)))month=k;}
   Calendar t=Calendar.getInstance();t.set(Calendar.MONTH,month);t.set(Calendar.DAY_OF_MONTH,Math.min(day,t.getActualMaximum(Calendar.DAY_OF_MONTH)));if(t.before(Calendar.getInstance()))t.add(Calendar.YEAR,date.group(2)!=null?1:0);if(date.group(2)==null&&t.before(Calendar.getInstance()))t.add(Calendar.MONTH,1);
   c.set(Calendar.YEAR,t.get(Calendar.YEAR));c.set(Calendar.MONTH,t.get(Calendar.MONTH));c.set(Calendar.DAY_OF_MONTH,t.get(Calendar.DAY_OF_MONTH));p.hasDate=true;
  }
  Matcher tm=Pattern.compile("\\b(?:as|a|pelas|para as)\\s+(\\d{1,2})(?:\\s*(?::|h|horas?)\\s*(\\d{1,2})?)?\\b").matcher(q);
  if(tm.find()){int h=Integer.parseInt(tm.group(1)),m=tm.group(2)==null?0:Integer.parseInt(tm.group(2));if(q.contains("da tarde")&&h<12)h+=12;if(q.contains("da noite")&&h<12)h+=12;if(h<=23&&m<60){c.set(Calendar.HOUR_OF_DAY,h);c.set(Calendar.MINUTE,m);c.set(Calendar.SECOND,0);p.hasTime=true;}}
  String t=spoken.replaceFirst("(?iu)^(ol[aá] +)?(nexus|nexos)[,!: ]*","").replaceFirst("(?iu)^(lembra-me|lembra me|avisa-me|avisa me|recorda-me|recorda me|agenda|agendar|marca|marcar|cria um lembrete|criar lembrete)\\s*","").trim();
  t=t.replaceAll("(?iu)\\b(depois de amanh[aã]|amanh[aã]|hoje|dia\\s+\\d{1,2}(?:\\s+de\\s+\\p{L}+)?)\\b","")
      .replaceAll("(?iu)\\b([àa]s|pelas|para as)\\s+\\d{1,2}(?:\\s*(?::|h|horas?)\\s*\\d{0,2})?(?:\\s+da\\s+(manh[aã]|tarde|noite))?\\b","")
      .replaceFirst("(?iu)^(para|de|que|sobre|no|na)\\s+","").replaceAll("\\s+"," ").trim();
  p.title=t.isEmpty()? "Compromisso":t;p.time=c.getTimeInMillis();return p;
 }
 private static void chooseDate(Activity a,String title,Parsed parsed,boolean calendar,Consumer<String> say){
  if(title.length()<2){say.accept("Preciso de um assunto para o lembrete.");return;}
  Calendar c=Calendar.getInstance();if(parsed.hasDate)c.setTimeInMillis(parsed.time);
  DatePickerDialog picker=new DatePickerDialog(a,(view,year,month,day)->{
   c.set(year,month,day);
   TimePickerDialog time=new TimePickerDialog(a,(v,h,m)->{
    c.set(Calendar.HOUR_OF_DAY,h);c.set(Calendar.MINUTE,m);c.set(Calendar.SECOND,0);
    scheduleAndConfirm(a,title,c.getTimeInMillis(),calendar,say);
   },parsed.hasTime?c.get(Calendar.HOUR_OF_DAY):9,parsed.hasTime?c.get(Calendar.MINUTE):0,true);
   time.show();
  },c.get(Calendar.YEAR),c.get(Calendar.MONTH),c.get(Calendar.DAY_OF_MONTH));picker.getDatePicker().setMinDate(System.currentTimeMillis()-60000);picker.show();
 }
 private static void scheduleAndConfirm(Activity a,String title,long when,boolean calendar,Consumer<String> say){
  if(when<=System.currentTimeMillis()+30000){say.accept("A hora indicada já passou. Escolhe uma hora futura.");Parsed p=new Parsed();p.title=title;chooseDate(a,title,p,calendar,say);return;}
  try{
   int id=(int)(System.currentTimeMillis()&0x7fffffff);
   JSONArray all=items(a);JSONObject item=new JSONObject();item.put("id",id);item.put("title",title);item.put("when",when);all.put(item);
   a.getSharedPreferences(PREF,0).edit().putString(KEY,all.toString()).apply();
   schedule(a,item);
   String whenText=new SimpleDateFormat("dd/MM 'às' HH:mm",new Locale("pt","PT")).format(new Date(when));
   String response="André, lembrete guardado para "+whenText+": "+title+".";
   AlarmManager alarm=(AlarmManager)a.getSystemService(Context.ALARM_SERVICE);
   if(Build.VERSION.SDK_INT>=31&&!alarm.canScheduleExactAlarms()){
    response+=" Para garantir pontualidade, ativa alarmes exatos.";
    new AlertDialog.Builder(a).setTitle("Avisos pontuais").setMessage("O Android exige a permissão Alarmes e lembretes para avisar exatamente à hora marcada. Sem ela, o aviso pode atrasar.").setPositiveButton("Autorizar",(d,w)->{try{a.startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+a.getPackageName())));}catch(Exception ignored){}}).setNegativeButton("Mais tarde",null).show();
   }
   say.accept(response);
   if(calendar)openCalendarEditor(a,title,when);
  }catch(Exception e){say.accept("Não consegui guardar o lembrete. Tenta novamente.");}
 }
 private static void openCalendarEditor(Activity a,String title,long when){
  try{
   Intent i=new Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI);
   i.putExtra(CalendarContract.Events.TITLE,title);i.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME,when);i.putExtra(CalendarContract.EXTRA_EVENT_END_TIME,when+30*60000L);
   a.startActivity(i);
  }catch(Exception e){android.widget.Toast.makeText(a,"Lembrete local guardado. Calendário não disponível.",android.widget.Toast.LENGTH_LONG).show();}
 }
 private static JSONArray items(Context context){
  try{return new JSONArray(context.getSharedPreferences(PREF,0).getString(KEY,"[]"));}catch(Exception e){return new JSONArray();}
 }
 public static String list(Context c){
  JSONArray arr=items(c);StringBuilder sb=new StringBuilder("Tens os seguintes lembretes: ");
  int count=0;for(int i=0;i<arr.length();i++){JSONObject r=arr.optJSONObject(i);if(r==null||r.optLong("when")<System.currentTimeMillis())continue;count++;sb.append("\n").append(r.optString("title")).append(" — ").append(new SimpleDateFormat("dd/MM HH:mm",new Locale("pt","PT")).format(new Date(r.optLong("when"))));}
  return count==0?"Não tens lembretes futuros guardados.":sb.toString();
 }
 public static void scheduleAll(Context c){JSONArray all=items(c);for(int i=0;i<all.length();i++){JSONObject o=all.optJSONObject(i);if(o!=null&&o.optLong("when")>System.currentTimeMillis())schedule(c,o);}}
 static void complete(Context c,int id){JSONArray a=items(c),b=new JSONArray();for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i);if(x!=null&&x.optInt("id")!=id)b.put(x);}c.getSharedPreferences(PREF,0).edit().putString(KEY,b.toString()).apply();}
 private static void schedule(Context c,JSONObject item){
  int id=item.optInt("id");long when=item.optLong("when");
  Intent i=new Intent(c,ReminderReceiver.class).setAction("pt.nexus.assistant.REMINDER");
  i.putExtra("id",id);i.putExtra("title",item.optString("title"));
  PendingIntent pi=PendingIntent.getBroadcast(c,id,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
  if(a==null)return;
  if(Build.VERSION.SDK_INT<31||a.canScheduleExactAlarms())a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
  else a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
 }
 public static void askPermissions(Activity a){
  if(Build.VERSION.SDK_INT>=33&&a.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
   a.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},802);
 }
}