package pt.nexus.assistant;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.*;

/** Pure command intent interpretation. No account data, models, or permissions required. */
final class NexusIntent {
 enum Kind { CALL, MESSAGE, ALARM, TIMER, RESEARCH, BROWSER_SEARCH, APP, ACCESSIBILITY, GENERAL }
 final Kind kind; final String argument; final String original;
 NexusIntent(Kind k,String a,String o){kind=k;argument=a;original=o;}
 static String norm(String s){
  return Normalizer.normalize((s==null?"":s).toLowerCase(new Locale("pt","PT")),Normalizer.Form.NFD)
   .replaceAll("\\p{M}+","").replaceAll("[-!?.,:;]"," ").replaceAll("\\s+"," ").trim();
 }
 static String strip(String x){return norm(x).replaceFirst("^(?:(?:ola|hey|ei)\\s+)?(?:nexus|nexos|anexos)\\s*","")
  .replaceFirst("^(?:por favor\\s+)?(?:(?:podes|poderias|consegues|queria que|quero que)\\s+)?","").trim();}
 static boolean isQuestionAboutHow(String q){
  return q.matches("^(como|porque|por que|de que forma|o que acontece se|explica como|ensina me como)\\s+.*");
 }
 static NexusIntent parse(String utterance){
  String q=strip(utterance);
  if(q.isEmpty())return new NexusIntent(Kind.GENERAL,"",utterance);
  if(NexusAccessibilityService.handles(utterance))return new NexusIntent(Kind.ACCESSIBILITY,q,utterance);
  if(isQuestionAboutHow(q))return new NexusIntent(Kind.GENERAL,q,utterance);
  if(q.matches("^(desperta me|acorda me|poe o despertador|coloca o despertador|programa um alarme|cria um alarme|define um alarme|ativa o alarme|podes por um alarme)\\b.*"))
   return new NexusIntent(Kind.ALARM,q,utterance);
  if(q.matches("^(poe um temporizador|define um temporizador|conta (regressiva|para tras)|marca um temporizador|avisa me daqui a)\\b.*"))
   return new NexusIntent(Kind.TIMER,q,utterance);
  if(q.matches("^(liga|ligar|faz uma chamada|fazer uma chamada|telefona|telefonar|chama por telefone|quero ligar|preciso de ligar)\\b.*")){
   String target=q.replaceFirst("^(liga|ligar|faz uma chamada|fazer uma chamada|telefona|telefonar|chama por telefone|quero ligar|preciso de ligar)\\s*","")
    .replaceFirst("^(para|ao|a|a o|o|a minha|a meu|a minha|meu|minha|para o|para a)\\s+","").trim();
   if(!target.isEmpty())return new NexusIntent(Kind.CALL,target,utterance);
  }
  if(q.matches("^(manda|enviar|envia|escreve|prepara|redige|quero enviar|quero mandar)\\s+(uma\\s+)?(mensagem|sms|whatsapp|recado)\\b.*")){
   return new NexusIntent(Kind.MESSAGE,q,utterance);
  }
  if(q.matches("^(abre|abrir)\\s+(o\\s+)?(google|chrome|navegador)\\s+e\\s+(pesquisa|procura|pesquisar)\\b.*")
   ||q.matches("^(abre|abrir)\\s+(a\\s+)?(pesquisa|pagina de pesquisa)\\s+no google\\b.*"))
   return new NexusIntent(Kind.BROWSER_SEARCH,q,utterance);
  if(q.matches("^(pesquisa|pesquisar|procura|procurar|investiga|investigar|encontra|encontrar|faz uma pesquisa|faz pesquisa|ve na internet|ve na net|consulta na internet|pesquisa na internet|pesquisa no google|pesquisa online|procura no google)\\b.*")
   || q.matches(".*\\b(pesquisa na internet|pesquisa na net|pesquisa no google|informacao atualizada|informacoes recentes|na internet|na net|online|ultimas noticias)\\b.*")
   ||q.matches("^(quais|qual|o que|como estao|quanto|quem)\\s+.*\\b(hoje|agora|atualmente|este mes|esta semana|ultimas|recentes)\\b.*")){
    String term=q.replaceFirst("^(pesquisa|pesquisar|procura|procurar|investiga|investigar|encontra|encontrar|faz uma pesquisa|faz pesquisa|ve na internet|ve na net|consulta na internet)\\s*","")
    .replaceFirst("^(no|na|sobre|por|acerca de|google|internet|na net|na internet|online|no google)\\s+","").trim();
    return new NexusIntent(Kind.RESEARCH,term.isEmpty()?q:term,utterance);
  }
  String app=CommandText.requestedApp(utterance);
  if(app!=null)return new NexusIntent(Kind.APP,app,utterance);
  return new NexusIntent(Kind.GENERAL,q,utterance);
 }
 static List<String> splitActions(String phrase){
  String[] parts=phrase.split("(?iu)\\s+(?:e depois|e a seguir|depois disso|a seguir)\\s+");
  if(parts.length<=1||parts.length>4)return Collections.singletonList(phrase);
  List<String> steps=new ArrayList<>();
  for(String p:parts){
    NexusIntent intent=parse(p);
    if(intent.kind==Kind.GENERAL||intent.argument.isEmpty())return Collections.singletonList(phrase);
    steps.add(p.trim());
  }
  return steps;
 }
 static int timeWord(String s){
  switch(norm(s)){case "zero":return 0;case "uma":case "um":return 1;case "duas":case "dois":return 2;case "tres":return 3;case "quatro":return 4;case "cinco":return 5;case "seis":return 6;case "sete":return 7;case "oito":return 8;case "nove":return 9;case "dez":return 10;case "onze":return 11;case "doze":return 12;case "treze":return 13;case "catorze":case "quatorze":return 14;case "quinze":return 15;case "dezasseis":return 16;case "dezassete":return 17;case "dezoito":return 18;case "dezanove":return 19;case "vinte":return 20;case "trinta":return 30;default:try{return Integer.parseInt(s);}catch(Exception e){return -1;}}
 }
 static int[] clockTime(String original){
   String s=norm(original);Matcher m=Pattern.compile("\\b(?:as|pelas|para as|para|horas?)\\s+(\\d{1,2}|uma|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quinze|dezasseis|dezoito|vinte)(?:\\s*(?:h|horas|:|e)\\s*(\\d{1,2}|meia|quinze|trinta|quarenta e cinco))?").matcher(s);
   if(!m.find())return null;
   int hour=timeWord(m.group(1)),minute=m.group(2)==null?0:m.group(2).equals("meia")?30:m.group(2).equals("quarenta e cinco")?45:timeWord(m.group(2));
   if(hour<0||hour>23||minute<0||minute>59)return null;
   if((s.contains("da tarde")||s.contains("da noite"))&&hour<12)hour+=12;
   return new int[]{hour,minute};
 }
 static int durationMinutes(String utterance){
  String q=norm(utterance);
  Matcher m=Pattern.compile("(\\d+|uma|um|dois|duas|tres|quatro|cinco|dez|quinze|vinte|trinta)\\s+(minutos?|horas?)").matcher(q);
  if(!m.find())return -1;
  int qty=timeWord(m.group(1));
  if(qty<1)return -1;return m.group(2).startsWith("hora")?qty*60:qty;
 }
}
