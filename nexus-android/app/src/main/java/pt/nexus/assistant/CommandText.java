package pt.nexus.assistant;
import java.text.Normalizer;
import java.util.Locale;
/** Pure, testable command grammar. Questions about actions are not device commands. */
final class CommandText {
 static String clean(String s){return Normalizer.normalize(s==null?"":s.toLowerCase(new Locale("pt","PT")),Normalizer.Form.NFD).replaceAll("\\p{M}+","").replaceAll("[?!.,:;]"," ").replaceAll("\\s+"," ").trim();}
 static String app(String term){String s=clean(term).replaceFirst("^(?:(?:o|a|meu|minha|app|aplicacao)\\s+)+","").replaceFirst("\\s+(?:por favor|se faz favor|agora|ja)$","").trim();String compact=s.replaceAll("[\\s'’-]","");
  if(compact.matches("(whatsapp|whatsap|whats|watsapp|watsap|watsup|whatsup|uatsap|zap|whatapp|whatzapp)(business|negocios|comercial)"))return "whatsapp business";
  if(compact.matches("whatsapp|whatsap|whats|watsapp|watsap|watsup|whatsup|uatsap|zap|whatapp|whatzapp"))return "whatsapp";
  if(compact.matches("face|facebook|fb"))return "facebook";if(compact.matches("insta|instagram"))return "instagram";if(compact.matches("yt|youtube"))return "youtube";if(compact.equals("tiktok"))return "tiktok";
  if(compact.matches("maps|mapas|googlemaps"))return "maps";if(compact.matches("chrome|googlechrome|navegador"))return "chrome";if(compact.matches("email|gmail|correio"))return "gmail";return s;
 }
 static String requestedApp(String phrase){String q=clean(phrase).replaceFirst("^(?:(?:ola|hey|ei)\\s+)?(?:nexus|nexos|anexos)\\s*","").replaceFirst("^(?:por favor\\s+)?(?:(?:podes|poderias|consegues)\\s+)?","");
  if(q.matches(".*\\b(instala|instalar|desinstala|desinstalar|conta|registo|codigo|password|senha)\\b.*"))return null;
  if(!q.matches("^(abre|abrir|abres|inicia|iniciar|lanca|lancar|arranca|entra|entrar|muda para|vai para|ir para)\\s+.+"))return null;
  String target=q.replaceFirst("^(abre|abrir|abres|inicia|iniciar|lanca|lancar|arranca|entra|entrar|muda para|vai para|ir para)\\s+","").replaceFirst("^(?:(?:o|a|no|na|para|app|aplicacao)\\s+)+","");
  if(target.isEmpty()||target.length()>70)return null;return app(target);
 }
}
