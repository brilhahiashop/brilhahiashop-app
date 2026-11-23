package pt.nexus.jarvis;

import android.net.Uri;
import org.json.*;
import org.w3c.dom.*;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;

/**
 * Local research aggregator. Concurrent lookups, strict HTTPS, safe XML, deadline, and
 * source attribution. Providers are public best-effort feeds, not a guaranteed search API.
 * No contact data, app inventory, microphone recordings, or credentials are transmitted.
 */
final class NexusResearch {
 static String norm(String text) {
  return java.text.Normalizer.normalize((text==null?"":text).toLowerCase(java.util.Locale.ROOT),java.text.Normalizer.Form.NFD)
    .replaceAll("\\p{M}+","").replaceAll("[?!.,:;]"," ").replaceAll("\\s+"," ").trim();
 }

 static final class Result {
  final String query;final JSONArray sources=new JSONArray();
  final long checkedAt=System.currentTimeMillis();
  Result(String q){query=q;}
  String evidence(){
   StringBuilder b=new StringBuilder();
   for(int i=0;i<sources.length();i++){
    JSONObject x=sources.optJSONObject(i);if(x==null)continue;
    b.append("\n").append(i+1).append(". Título: ").append(x.optString("title"))
     .append("\nURL: ").append(x.optString("url"))
     .append("\nResumo: ").append(x.optString("snippet"));
    if(x.has("published"))b.append("\nPublicado em: ").append(x.optString("published"));
    b.append("\n");
   }
   return b.toString();
  }
 }
 static final class CacheEntry {
  final Result value;final long moment=System.currentTimeMillis();
  CacheEntry(Result r){value=r;}
 }
 private static final LinkedHashMap<String,CacheEntry> CACHE=new LinkedHashMap<String,CacheEntry>(20,.75f,true){
  @Override protected boolean removeEldestEntry(Map.Entry<String,CacheEntry> eldest){return size()>16;}
 };
 private static String clean(String s){
  return (s==null?"":s).replaceAll("<[^>]+>"," ").replaceAll("&nbsp;"," ")
   .replaceAll("&amp;","&").replaceAll("&quot;","\"").replaceAll("&#39;","'")
   .replaceAll("(?is)\\s+"," ").trim();
 }
 private static String bound(String s,int max){return s==null?"":s.substring(0,Math.min(s.length(),max));}
 private static byte[] fetch(String url,int cap) throws IOException {
  URL u=new URL(url);if(!"https".equals(u.getProtocol()))throw new IOException("Só HTTPS");
  HttpsURLConnection c=(HttpsURLConnection)u.openConnection();
  c.setInstanceFollowRedirects(true);
  c.setConnectTimeout(2900);c.setReadTimeout(3300);
  c.setRequestProperty("Accept","application/rss+xml,application/xml,application/json,text/xml");
  c.setRequestProperty("User-Agent","Mozilla/5.0 (compatible; NEXUSAndroid/1.0; personal research)");
  try{
   int status=c.getResponseCode();if(status<200||status>=300)throw new IOException("Fonte HTTP "+status);
   ByteArrayOutputStream output=new ByteArrayOutputStream();
   try(InputStream in=c.getInputStream()){
    byte[] buffer=new byte[4096];int n;
    while((n=in.read(buffer))!=-1){
     if(output.size()+n>cap)throw new IOException("Fonte excedeu limite");
     output.write(buffer,0,n);
    }
   }
   return output.toByteArray();
  }finally{c.disconnect();}
 }
 private static boolean safeLink(String link){
  if(link==null||link.length()>1200)return false;
  try{
   Uri u=Uri.parse(link);
   String h=u.getHost();
   return "https".equalsIgnoreCase(u.getScheme())&&h!=null&&!h.isEmpty()&&
     !h.equalsIgnoreCase("localhost")&&!h.endsWith(".local")&&!h.startsWith("192.168.")&&!h.startsWith("10.");
  }catch(Exception e){return false;}
 }
 private static void put(Result result,String title,String link,String summary,String date,Set<String> known){
  String t=bound(clean(title),180),d=bound(clean(summary),850);
  if(!safeLink(link)||t.length()<3||known.contains(link)||result.sources.length()>=12)return;
  try{
   JSONObject obj=new JSONObject().put("title",t).put("url",link).put("snippet",d);
   if(date!=null&&!date.trim().isEmpty())obj.put("published",bound(clean(date),90));
   result.sources.put(obj);known.add(link);
  }catch(Exception ignored){}
 }
 private static Document safeXml(byte[] data)throws Exception{
  DocumentBuilderFactory f=DocumentBuilderFactory.newInstance();
  f.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
  f.setFeature("http://xml.org/sax/features/external-general-entities",false);
  f.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
  f.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd",false);
  f.setXIncludeAware(false);f.setExpandEntityReferences(false);
  return f.newDocumentBuilder().parse(new ByteArrayInputStream(data));
 }
 private static String child(Element parent,String tag){
  NodeList n=parent.getElementsByTagName(tag);
  return n.getLength()>0?n.item(0).getTextContent():"";
 }
 private static Result rss(String query,String url,int count){
  Result r=new Result(query);Set<String> used=new HashSet<>();
  try{
   Document doc=safeXml(fetch(url,340000));NodeList items=doc.getElementsByTagName("item");
   for(int i=0;i<items.getLength()&&i<count;i++){
    Element item=(Element)items.item(i);
    put(r,child(item,"title"),child(item,"link"),child(item,"description"),child(item,"pubDate"),used);
   }
  }catch(Exception ignored){}
  return r;
 }
 private static Result wiki(String q){
  Result r=new Result(q);Set<String> used=new HashSet<>();
  try{
   String url="https://pt.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=7&srsearch="+Uri.encode(q);
   JSONObject data=new JSONObject(new String(fetch(url,170000),StandardCharsets.UTF_8));
   JSONArray list=data.getJSONObject("query").getJSONArray("search");
   for(int i=0;i<list.length();i++){
    JSONObject it=list.getJSONObject(i);String title=it.optString("title");
    put(r,title,"https://pt.wikipedia.org/wiki/"+Uri.encode(title.replace(' ','_')),it.optString("snippet"),null,used);
   }
  }catch(Exception ignored){}
  return r;
 }
 private static Result meals(String q){
  Result result=new Result(q);Set<String> used=new HashSet<>();
  try{
   String query=norm(q);
   // Generic ingredient lookups only: never substitute an unrelated meal for a named dish.
   String t=query.replaceAll("\\b(receita|receitas|de|do|da|como|fazer|preparar|cozinhar|um|uma|os|as|com)\\b","").trim();
   String term=null;
   if(t.matches(".*\\b(frango|galinha)\\b.*"))term="chicken";
   else if(t.matches(".*\\b(bacalhau)\\b.*"))term="cod";
   else if(t.matches(".*\\b(salmao)\\b.*"))term="salmon";
   else if(t.matches(".*\\b(arroz)\\b.*"))term="rice";
   else if(t.matches(".*\\b(bolo)\\b.*"))term="cake";
   else if(t.matches(".*\\b(lasanha)\\b.*"))term="lasagne";
   else if(t.matches(".*\\b(sopa)\\b.*"))term="soup";
   else if(t.matches(".*\\b(omelete|ovos)\\b.*"))term="omelette";
   else if(t.matches(".*\\b(peixe)\\b.*"))term="fish";
   else if(t.matches(".*\\b(batata)\\b.*"))term="potato";
   else if(t.matches(".*\\b(carne|vaca)\\b.*"))term="beef";
   else if(t.matches(".*\\b(peru)\\b.*"))term="turkey";
   else if(t.matches(".*\\b(massa)\\b.*"))term="pasta";
   if(term==null)return result;
   JSONObject data=new JSONObject(new String(fetch("https://www.themealdb.com/api/json/v1/1/search.php?s="+Uri.encode(term),300000),StandardCharsets.UTF_8));
   JSONArray rows=data.optJSONArray("meals");
   if(rows!=null)for(int i=0;i<rows.length()&&i<3;i++){
    JSONObject meal=rows.optJSONObject(i);if(meal==null)continue;
    String title=meal.optString("strMeal");
    String link=meal.optString("strSource");
    if(!safeLink(link))link="https://www.themealdb.com/meal/"+meal.optString("idMeal");
    put(result,"Receita: "+title,link,meal.optString("strInstructions"),null,used);
   }
  }catch(Exception ignored){}
  return result;
 }
 static boolean shouldLookup(String utterance){
  String q=norm(utterance);
  if(q.isEmpty()||q.matches("^(ola|bom dia|boa tarde|boa noite|obrigado|obrigada|como estas|tudo bem|bom trabalho|adeus|ate logo)[ ]*[?!]*$"))return false;
  if(needsRecentSources(q))return true;
  if(q.matches(".*\\b(pesquisa|procura|investiga|fontes|referencias|compara|comparacao|verifica|aprofundar|aprofundadamente|detalhadamente|estudo|analise profunda)\\b.*"))return true;
  return q.matches("^(o que e|quem e|quem foi|porque|por que|como funciona|como fazer|como posso|quais sao|qual e|quanto custa|quantos|em que ano|onde fica|onde encontrar|que diferenca|qual a diferenca|explica me|fala me sobre|diz me tudo sobre)\\b.*");
 }
 static boolean needsRecentSources(String q){
  return norm(q).matches(".*\\b(hoje|ontem|amanha|agora|atual|atuais|atualizado|ultimas|noticias|noticiario|recentes|2026|precos|onde comprar|resultado de jogo|em direto|ao vivo)\\b.*");
 }
 private static String relevanceQuery(String question){
  String q=norm(question);
  if(q.matches("(noticias|noticias de hoje|noticias hoje|noticiario|as noticias|ultimas noticias|noticias atuais|diz me as noticias|quais sao as noticias hoje|noticias do dia|noticias de portugal|noticias em portugal)"))
   return "Portugal últimas notícias hoje";
  return bound(question,220);
 }
 private static boolean isNews(String q){
  return norm(q).matches(".*\\b(noticias|noticia|noticiario|ultimas|jornal|atualidade|manchetes)\\b.*");
 }
 private static boolean isRecipe(String q){return norm(q).matches(".*\\b(receita|receitas|cozinhar|preparar|ingredientes|culinaria|bolo|frango|arroz|peixe|bacalhau|lasanha|omelete|sopa|massa|comida)\\b.*");}
 static Result search(String request){return search(request,false);}
 static Result search(String request,boolean forceRefresh){
  String q=bound(request==null?"":request.trim(),230);
  Result empty=new Result(q);if(q.length()<2)return empty;
  String key=norm(q);
  if(!forceRefresh)synchronized(CACHE){CacheEntry e=CACHE.get(key);if(e!=null&&System.currentTimeMillis()-e.moment<(needsRecentSources(q)?75000:240000))return e.value;}
  String search=relevanceQuery(q);
  boolean news=isNews(q),recipe=isRecipe(q);
  ExecutorService pool=Executors.newFixedThreadPool(4);
  ExecutorCompletionService<Result> completed=new ExecutorCompletionService<>(pool);
  int total=0;
  // Search in parallel: a failed provider cannot stall all the others.
  completed.submit(()->rss(q,"https://www.bing.com/search?format=rss&q="+Uri.encode(search),8));total++;
  if(news||needsRecentSources(q)){
   completed.submit(()->rss(q,"https://news.google.com/rss/search?q="+Uri.encode(search)+"&hl=pt-PT&gl=PT&ceid=PT:pt",8));total++;
   completed.submit(()->rss(q,"https://www.bing.com/news/search?format=rss&q="+Uri.encode(search),6));total++;
  }else{
   completed.submit(()->wiki(search));total++;
  }
  if(recipe){completed.submit(()->meals(search));total++;}
  if(news&&total<4){
   completed.submit(()->rss(q,"https://news.google.com/rss?hl=pt-PT&gl=PT&ceid=PT:pt",8));total++;
  }
  Result combined=new Result(q);Set<String> seen=new HashSet<>();
  long end=System.currentTimeMillis()+5700;
  try{
   for(int n=0;n<total;n++){
    long remaining=end-System.currentTimeMillis();
    if(remaining<=0)break;
    Future<Result> task=completed.poll(remaining,TimeUnit.MILLISECONDS);
    if(task==null)break;
    Result next=task.get(80,TimeUnit.MILLISECONDS);
    for(int i=0;i<next.sources.length();i++){
     JSONObject item=next.sources.optJSONObject(i);
     if(item!=null)put(combined,item.optString("title"),item.optString("url"),item.optString("snippet"),item.optString("published"),seen);
    }
    if(combined.sources.length()>=9)break;
   }
  }catch(Exception ignored){}finally{pool.shutdownNow();}
  synchronized(CACHE){if(combined.sources.length()>0)CACHE.put(key,new CacheEntry(combined));}
  return combined;
 }
}
