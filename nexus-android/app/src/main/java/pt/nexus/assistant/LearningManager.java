package pt.nexus.assistant;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Consumer;

/**
 * Local opt-in procedural memory. A lesson stores user-authored steps, not screen recordings,
 * account credentials or access to other applications. Only a small, explicit whitelist of
 * Android intents can be replayed. Every run requires confirmation; only one action runs
 * at a time and the user has to request each following step.
 */
public final class LearningManager {
 private LearningManager(){}
 private static final String PREF="nexus_learning_v1",ITEMS="routines",DRAFT="draft",RUN="run";
 private static SharedPreferences sp(Activity a){return a.getSharedPreferences(PREF,0);}
 private static String norm(String s){return Normalizer.normalize((s==null?"":s).toLowerCase(new Locale("pt","PT")),Normalizer.Form.NFD).replaceAll("\\p{M}+","").trim();}
 private static String clean(String s){return norm(s).replaceFirst("^(ola\\s+)?(nexus|nexos)[,:! ]*","").trim();}
 private static JSONArray saved(Activity a){try{return new JSONArray(sp(a).getString(ITEMS,"[]"));}catch(Exception e){return new JSONArray();}}
 private static JSONObject draft(Activity a){try{return new JSONObject(sp(a).getString(DRAFT,""));}catch(Exception e){return null;}}
 private static JSONObject running(Activity a){try{return new JSONObject(sp(a).getString(RUN,""));}catch(Exception e){return null;}}
 private static void saveDraft(Activity a,JSONObject d){sp(a).edit().putString(DRAFT,d.toString()).apply();}
 private static void clearDraft(Activity a){sp(a).edit().remove(DRAFT).apply();}
 private static void clearRun(Activity a){sp(a).edit().remove(RUN).apply();}
 private static void reply(Consumer<String> out,String s){out.accept(s);}
 private static String nameAfter(String q,String marker){
  int p=q.indexOf(marker);
  if(p<0)return "";
  String s=q.substring(p+marker.length()).replaceFirst("^(o|a|uma|um|de|do|da)\\s+","").trim();
  return s.length()>65?s.substring(0,65).trim():s;
 }
 public static boolean handle(Activity a,String spoken,Consumer<String> out){
  String raw=spoken==null?"":spoken.trim(),q=clean(raw);
  if(q.isEmpty())return false;
  JSONObject d=draft(a),run=running(a);
  if(q.matches(".*\\b(mostra|lista|quais|consultar|ver)\\b.*\\b(rotinas|procedimentos|aprendeste|aprendeu|memoria|aprendizagens)\\b.*")
     ||q.matches("^(o que aprendeste|o que sabes fazer|mostra o que aprendeste)[?!. ]*$")){
   String result=summary(a);new AlertDialog.Builder(a).setTitle("NEXUS · O que aprendi").setMessage(result).setPositiveButton("Fechar",null).show();
   reply(out,result);return true;
  }
  if(q.matches("^(cancela|cancelar|esquece|para|parar|termina|terminar)\\s+(a\\s+)?(aprendizagem|ensinamento|gravacao|ensino).*")){
   clearDraft(a);reply(out,"Cancelei o ensino em curso. Não guardei os passos.");return true;
  }
  if(q.matches("^(cancela|cancelar|para|parar)\\s+(a\\s+)?(rotina|execucao).*")){
   clearRun(a);reply(out,"A execução da rotina foi interrompida.");return true;
  }
  if(q.matches("^(proximo passo|proximo|seguinte passo|passo seguinte|continua a rotina|continua|avanca|avanca passo).*")
      &&run!=null){performNext(a,out);return true;}
  if(q.matches("^(vou ensinar.te|vou te ensinar|quero ensinar.te|quero te ensinar|quero ensinar|vou ensinar|vamos ensinar|modo aprendizagem|aprende esta rotina|aprende isto|vou mostrar como).*")){
   String title=nameAfter(q,"chamada ");if(title.isEmpty())title=nameAfter(q,"com o nome ");
   if(title.isEmpty())title=nameAfter(q,"como ");if(title.isEmpty())title=nameAfter(q,"a rotina ");
   if(title.isEmpty())title="Rotina "+(saved(a).length()+1);
   start(a,title,out);return true;
  }
  if(d!=null){
   if(q.matches("^(guarda|guardar|grava|gravar|memoriza|memorizar|termina e guarda|aprendeste|ja esta).*")){
    String change=nameAfter(q,"como ");if(!change.isEmpty()){try{d.put("name",change);}catch(Exception ignored){}}
    saveLesson(a,d,out);return true;
   }
   String step=raw.replaceFirst("(?iu)^(ol[aá]\\s+)?(nexus|nexos)[,!: ]*","")
    .replaceFirst("(?iu)^(primeiro|segundo|terceiro|quarto|quinto|sexto|depois|a seguir|o pr[oó]ximo passo [eé]|passo\\s+(?:\\d+|um|dois|tr[eê]s)\\s*(?:[eé]|:|\\-|,)?|agora)\\s*","").trim();
   if(step.length()<3){reply(out,"Não percebi o passo. Diz o que devo fazer ou diz guarda a rotina.");return true;}
   if(step.length()>240){reply(out,"Esse passo é muito longo. Divide-o em duas instruções.");return true;}
   JSONArray steps=d.optJSONArray("steps");if(steps==null)steps=new JSONArray();
   if(steps.length()>=12){reply(out,"Chegámos ao limite de doze passos. Diz guarda a rotina para terminar.");return true;}
   steps.put(step);
   try{d.put("steps",steps);}catch(Exception ignored){}
   saveDraft(a,d);
   reply(out,"Aprendi o passo "+steps.length()+": "+step+". Diz o próximo passo ou pede para guardar.");
   return true;
  }
  if(q.matches("^(apaga|apagar|esquece|esquecer|elimina|eliminar)\\s+(a\\s+)?(rotina|procedimento)\\b.*")){
   String key=q.replaceFirst("^(apaga|apagar|esquece|esquecer|elimina|eliminar)\\s+(a\\s+)?(rotina|procedimento)\\s*","").trim();
   delete(a,key,out);return true;
  }
  if(q.matches("^(executa|executar|faz|fazer|repete|repetir|corre|inicia)\\s+(a\\s+)?(rotina|procedimento|o que te ensinei)\\b.*")){
   String name=q.replaceFirst("^(executa|executar|faz|fazer|repete|repetir|corre|inicia)\\s+(a\\s+)?(rotina|procedimento|o que te ensinei)\\s*","").trim();
   askRun(a,name,out);return true;
  }
  return false;
 }
 private static void start(Activity a,String title,Consumer<String> out){
  try{JSONObject d=new JSONObject();d.put("name",title);d.put("steps",new JSONArray());saveDraft(a,d);
   reply(out,"Modo Aprendizagem ativo. Estou a aprender a rotina "+title+". Diz-me o primeiro passo. Não vou executá-lo enquanto me ensinas.");
  }catch(Exception e){reply(out,"Não consegui iniciar a aprendizagem.");}
 }
 private static void saveLesson(Activity a,JSONObject d,Consumer<String> out){
  JSONArray steps=d.optJSONArray("steps");if(steps==null||steps.length()==0){reply(out,"Ainda não me ensinaste passos. Diz o primeiro passo.");return;}
  String title=d.optString("name","Rotina").trim();
  JSONArray all=saved(a);
  int existing=-1;for(int i=0;i<all.length();i++){JSONObject item=all.optJSONObject(i);if(item!=null&&norm(item.optString("name")).equals(norm(title)))existing=i;}
  if(existing>=0){
   new AlertDialog.Builder(a).setTitle("Substituir rotina?")
     .setMessage("Já tenho uma rotina chamada "+title+". Queres substituí-la pelos "+steps.length()+" passos novos?")
     .setPositiveButton("Substituir",(x,y)->persist(a,d,out)).setNegativeButton("Cancelar",null).show();
   return;
  }
  persist(a,d,out);
 }
 private static void persist(Activity a,JSONObject d,Consumer<String> out){
  JSONArray old=saved(a),fresh=new JSONArray();String name=d.optString("name","Rotina");
  for(int i=0;i<old.length();i++){JSONObject entry=old.optJSONObject(i);if(entry!=null&&!norm(name).equals(norm(entry.optString("name"))))fresh.put(entry);}
  if(fresh.length()>=30){reply(out,"A memória atingiu trinta rotinas. Apaga uma antes de guardar outra.");return;}
  try{d.put("updated",System.currentTimeMillis());}catch(Exception ignored){}
  fresh.put(d);sp(a).edit().putString(ITEMS,fresh.toString()).remove(DRAFT).apply();
  reply(out,"Guardei a rotina "+name+" com "+d.optJSONArray("steps").length()+" passos. Para começar, diz: NEXUS, executa a rotina "+name+".");
 }
 public static String summary(Activity a){
  JSONArray all=saved(a);if(all.length()==0)return "Ainda não tenho rotinas guardadas. Diz: NEXUS, vou ensinar-te uma rotina chamada manhã.";
  StringBuilder result=new StringBuilder("Rotinas guardadas neste telemóvel:\n");
  for(int i=0;i<all.length();i++){JSONObject v=all.optJSONObject(i);if(v!=null){JSONArray steps=v.optJSONArray("steps");result.append("\n• ").append(v.optString("name")).append(" (").append(steps==null?0:steps.length()).append(" passos)");}}
  result.append("\n\nDiz executa a rotina [nome] ou apaga a rotina [nome].");
  return result.toString();
 }
 private static JSONObject find(Activity a,String key){
  JSONArray all=saved(a);String n=norm(key);
  if(n.isEmpty()&&all.length()==1)return all.optJSONObject(0);
  for(int i=0;i<all.length();i++){JSONObject v=all.optJSONObject(i);if(v!=null&&norm(v.optString("name")).equals(n))return v;}
  for(int i=0;i<all.length();i++){JSONObject v=all.optJSONObject(i);if(v!=null&&norm(v.optString("name")).contains(n)&&!n.isEmpty())return v;}
  return null;
 }
 private static void askRun(Activity a,String name,Consumer<String> out){
  JSONObject lesson=find(a,name);
  if(lesson==null){reply(out,"Não encontrei essa rotina. "+summary(a));return;}
  String label=lesson.optString("name");
  JSONArray steps=lesson.optJSONArray("steps");if(steps==null||steps.length()==0){reply(out,"Essa rotina não tem passos.");return;}
  StringBuilder content=new StringBuilder("Vou executar apenas um passo de cada vez, com a tua autorização. Nunca envio mensagens, faço compras ou pagamentos por ti.\n");
  for(int i=0;i<steps.length();i++)content.append("\n").append(i+1).append(". ").append(steps.optString(i));
  new AlertDialog.Builder(a).setTitle("Executar: "+label).setMessage(content.toString())
   .setPositiveButton("Iniciar",(d,w)->{
     try{JSONObject state=new JSONObject();state.put("name",label);state.put("index",0);sp(a).edit().putString(RUN,state.toString()).apply();
      performNext(a,out);
     }catch(Exception e){reply(out,"Não consegui iniciar essa rotina.");}
   }).setNegativeButton("Cancelar",null).show();
  reply(out,"Encontrei "+label+". Confirma no ecrã para iniciar.");
 }
 private static void performNext(Activity a,Consumer<String> out){
  JSONObject r=running(a);if(r==null){reply(out,"Não há nenhuma rotina a decorrer.");return;}
  JSONObject lesson=find(a,r.optString("name"));if(lesson==null){clearRun(a);reply(out,"Já não tenho essa rotina guardada.");return;}
  JSONArray steps=lesson.optJSONArray("steps");int index=r.optInt("index",0);
  if(steps==null||index>=steps.length()){clearRun(a);reply(out,"Terminámos a rotina "+lesson.optString("name")+".");return;}
  String step=steps.optString(index),s=clean(step);
  try{r.put("index",index+1);sp(a).edit().putString(RUN,r.toString()).apply();}catch(Exception ignored){}
  boolean isOpen=s.matches("^(abre|abrir|inicia|iniciar|mostra)\\s+.+");
  boolean isSearch=s.matches("^(pesquisa|pesquisar|procura)\\s+.+");
  boolean isSettings=s.equals("abre as definicoes")||s.equals("abre definicoes");
  if(isOpen||isSearch||isSettings){
   String result=CommandRouter.dispatch(a,step);
   reply(out,"Passo "+(index+1)+": "+result);
  }else{
   new AlertDialog.Builder(a).setTitle("Passo "+(index+1)+" · "+lesson.optString("name"))
    .setMessage("Segue este passo manualmente:\n\n"+step)
    .setPositiveButton("Entendido",null).show();
   reply(out,"Passo "+(index+1)+": "+step+". Este passo precisa da tua intervenção.");
  }
  if(index+1>=steps.length())clearRun(a);
  else Toast.makeText(a,"Volta ao NEXUS e diz «próximo passo» para continuar.",Toast.LENGTH_LONG).show();
 }
 private static void delete(Activity a,String key,Consumer<String> out){
  JSONObject target=find(a,key);if(target==null){reply(out,"Não encontrei essa rotina. "+summary(a));return;}
  String name=target.optString("name");
  new AlertDialog.Builder(a).setTitle("Apagar rotina?").setMessage("Apagar definitivamente "+name+" deste telemóvel?")
  .setPositiveButton("Apagar",(d,w)->{
   JSONArray old=saved(a),fresh=new JSONArray();
   for(int i=0;i<old.length();i++){JSONObject item=old.optJSONObject(i);if(item!=null&&!norm(name).equals(norm(item.optString("name"))))fresh.put(item);}
   sp(a).edit().putString(ITEMS,fresh.toString()).apply();clearRun(a);
   reply(out,"Apaguei a rotina "+name+".");
  }).setNegativeButton("Cancelar",null).show();
  reply(out,"Confirma no ecrã se queres apagar "+name+".");
 }
}