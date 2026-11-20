package pt.nexus.assistant;
import android.net.Uri;
import org.json.*;
import org.w3c.dom.*;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.*;

/**
 * On-demand, bounded public-source lookup. No credentials or contacts leave the device.
 * Search is best-effort: free third-party sources can be unreachable or rate-limited.
 */
final class NexusResearch {
 static final class Result {
  final String query;final JSONArray sources=new JSONArray();
  Result(String q){query=q;}
  String evidence(){
   StringBuilder b=new StringBuilder();
   for(int i=0;i<sources.length();i++){
    JSONObject x=sources.optJSONObject(i);if(x==null)continue;
    b.append("\n").append(i+1).append(". Título: ").append(x.optString("title"))
     .append("\nURL: ").append(x.optString("url"))
     .append("\nResumo: ").append(x.optString("snippet")).append("\n");
   }
   return b.toString();
  }
 }
 private static String clean(String s){
  return (s==null?"":s).replaceAll("<[^>]+>"," ").replaceAll("(?is)\\s+"," ").trim();
 }
 private static String bound(String s,int max){return s==null?"":s.substring(0,Math.min(s.length(),max));}
 private static byte[] fetch(String url,int cap) throws IOException {
  URL u=new URL(url);if(!u.getProtocol().equals("https"))throw new IOException("HTTPS obrigatório");
  HttpsURLConnection c=(HttpsURLConnection)u.openConnection();
  c.setConnectTimeout(4000);c.setReadTimeout(4500);c.setRequestProperty("Accept","application/rss+xml, application/json, text/xml");
  c.setRequestProperty("User-Agent","NEXUSAndroid/0.9 (+local personal assistant)");
  try{
   int status=c.getResponseCode();if(status<200||status>=300)throw new IOException("HTTP "+status);
   ByteArrayOutputStream output=new ByteArrayOutputStream();
   try(InputStream in=c.getInputStream()){
    byte[] buffer=new byte[4096];int count;while((count=in.read(buffer))!=-1){
     if(output.size()+count>cap)throw new IOException("Fonte excedeu limite");
     output.write(buffer,0,count);
    }
   }
   return output.toByteArray();
  }finally{c.disconnect();}
 }
 private static boolean validUrl(String url){
  if(url==null)return false;
  try{Uri u=Uri.parse(url);return "https".equals(u.getScheme())&&u.getHost()!=null&&!u.getHost().isEmpty();}
  catch(Exception e){return false;}
 }
 private static void add(Result r,String title,String link,String snippet,Set<String> used){
  String t=bound(clean(title),170),d=bound(clean(snippet),650),url=bound(link,900);
  if(!validUrl(url)||t.length()<3||used.contains(url)||r.sources.length()>=7)return;
  JSONObject item=new JSONObject();
  try{item.put("title",t);item.put("url",url);item.put("snippet",d);r.sources.put(item);used.add(url);}catch(Exception ignored){}
 }
 private static void rss(Result r,String url,Set<String> seen,int max){
  try{
   byte[] bytes=fetch(url,270_000);
   DocumentBuilderFactory factory=DocumentBuilderFactory.newInstance();
   factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
   factory.setFeature("http://xml.org/sax/features/external-general-entities",false);
   factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
   factory.setXIncludeAware(false);factory.setExpandEntityReferences(false);
   Document doc=factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes));
   NodeList nodes=doc.getElementsByTagName("item");
   for(int i=0;i<nodes.getLength()&&i<max&&r.sources.length()<7;i++){
    Element el=(Element)nodes.item(i);
    add(r,firstText(el,"title"),firstText(el,"link"),firstText(el,"description"),seen);
   }
  }catch(Exception ignored){/* A ausência de resultados não é sucesso. */}
 }
 private static String firstText(Element el,String tag){
  NodeList l=el.getElementsByTagName(tag);
  return l.getLength()>0?l.item(0).getTextContent():"";
 }
 private static void wiki(Result r,String query,Set<String> seen){
  try{
   String link="https://pt.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=4&srsearch="+Uri.encode(query);
   JSONObject root=new JSONObject(new String(fetch(link,160_000),StandardCharsets.UTF_8));
   JSONArray search=root.getJSONObject("query").getJSONArray("search");
   for(int i=0;i<search.length()&&r.sources.length()<7;i++){
    JSONObject item=search.getJSONObject(i);
    String title=item.optString("title"),snippet=item.optString("snippet");
    add(r,title,"https://pt.wikipedia.org/wiki/"+Uri.encode(title.replace(' ','_')),snippet,seen);
   }
  }catch(Exception ignored){}
 }
 private static void meals(Result r,String query,Set<String> seen){
  try{
   String term=query.toLowerCase(Locale.ROOT);
   String keyword=term.matches(".*\\b(frango|galinha)\\b.*")?"chicken":
      term.matches(".*\\b(arroz)\\b.*")?"rice":
      term.matches(".*\\b(peixe|bacalhau|salm[aã]o)\\b.*")?"fish":
      term.matches(".*\\b(carne|vaca|bife)\\b.*")?"beef":
      term.matches(".*\\b(bolo|sobremesa|doce)\\b.*")?"cake":term.contains("receita")?"pasta":"";
   if(keyword.isEmpty())return;
   JSONObject data=new JSONObject(new String(fetch("https://www.themealdb.com/api/json/v1/1/search.php?s="+Uri.encode(keyword),230_000),StandardCharsets.UTF_8));
   JSONArray items=data.optJSONArray("meals");if(items==null)return;
   for(int i=0;i<items.length()&&i<3;i++){
    JSONObject meal=items.getJSONObject(i);
    String name=meal.optString("strMeal"),instructions=bound(meal.optString("strInstructions"),350);
    String link=meal.optString("strSource");
    if(!validUrl(link))link="https://www.themealdb.com/api/json/v1/1/lookup.php?i="+meal.optString("idMeal");
    add(r,"Receita: "+name,link,instructions,seen);
   }
  }catch(Exception ignored){}
 }
 static boolean needsRecentSources(String question){
  String q=NexusIntent.norm(question);
  return q.matches(".*\\b(hoje|ontem|amanha|agora|atual|atuais|atualizado|ultimas|noticias|recentes|2026|precos|onde comprar|resultado de jogo)\\b.*");
 }
 static Result search(String query){
  String cleaned=bound(query==null?"":query.trim(),250);Result r=new Result(cleaned);
  if(cleaned.length()<2)return r;
  Set<String> seen=new HashSet<>();
  // General-purpose search results via a public RSS result representation.
  rss(r,"https://www.bing.com/search?format=rss&q="+Uri.encode(cleaned),seen,6);
  if(needsRecentSources(cleaned)){
   rss(r,"https://news.google.com/rss/search?q="+Uri.encode(cleaned)+"&hl=pt-PT&gl=PT&ceid=PT:pt",seen,4);
  }
  if(r.sources.length()<3&&NexusIntent.norm(cleaned).matches(".*\\b(o que e|quem foi|historia|cientifico|ciencia|definicao|biografia|historia de)\\b.*"))
   wiki(r,cleaned,seen);
  if(NexusIntent.norm(cleaned).contains("receita")||NexusIntent.norm(cleaned).matches(".*\\b(frango|arroz|peixe|bolo)\\b.*"))
   meals(r,cleaned,seen);
  return r;
 }
}
