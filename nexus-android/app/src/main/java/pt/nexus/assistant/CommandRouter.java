package pt.nexus.assistant;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.widget.Toast;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** Local, explicit commands. It never sends installed-app lists or command audio to NEXUS servers. */
public final class CommandRouter {
    private CommandRouter() {}
    static String plain(String s) {
        return Normalizer.normalize(s.toLowerCase(new Locale("pt","PT")), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").trim();
    }
    public static String dispatch(Activity a, String spoken) {
        String raw = spoken == null ? "" : spoken.trim();
        String q = plain(raw).replaceFirst("^(ola\\s+)?(nexus|nexos)[,!: ]*", "").trim();
        if (q.length() == 0) return "Não ouvi nenhum comando.";
        if(q.matches("^(sair do nexus|fecha o nexus|fechar nexus|sair do nexos)$")){a.stopService(new Intent(a,BubbleService.class));a.finishAndRemoveTask();return "NEXUS encerrado.";}
        // "fecha o Facebook e abre o Instagram": switches apps; Android keeps the first in memory.
        if(q.matches("^(fecha|fechar|sair|minimiza)\\s+.*\\s+e\\s+(abre|abrir|inicia|iniciar|lanca)\\s+.*")) {
            String target=q.replaceFirst("^.*\\s+e\\s+(abre|abrir|inicia|iniciar|lanca)\\s+", "").trim()
                         .replaceFirst("^(o|a|meu|minha|app|aplicacao)\\s+", "").trim();
            String opened=openApp(a,target);
            return opened!=null ? "Abri " + opened + ". A aplicação anterior ficou em segundo plano." : "Não encontrei «" + target + "» instalado.";
        }
        if (q.matches("^(fecha|fechar|sair|volta|regressa|minimiza)(\\s+.*)?") || q.contains("ecra inicial") || q.contains("ecrã inicial")) {
            Intent i = new Intent(Intent.ACTION_MAIN);
            i.addCategory(Intent.CATEGORY_HOME);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            a.startActivity(i);
            return "Voltei ao ecrã inicial. O Android pode manter a outra aplicação em memória.";
        }
        if (q.matches("^(abre|abrir|inicia|iniciar|lanca|mostra|executa|entra no|entra na)\\s+.*")) {
            String target = q.replaceFirst("^(abre|abrir|inicia|iniciar|lanca|mostra|executa|entra no|entra na)\\s+", "").trim();
            target = target.replaceFirst("^(o|a|meu|minha|aplicacao|app)\\s+", "").trim();
            if(target.equals("definicoes") || target.equals("configuracoes")) {
                a.startActivity(new Intent(Settings.ACTION_SETTINGS));
                return "Abri as definições.";
            }
            if(target.equals("camara") || target.equals("camera")) {
                Intent c = new Intent("android.media.action.IMAGE_CAPTURE");
                if(c.resolveActivity(a.getPackageManager()) != null) {a.startActivity(c);return "Abri a câmara.";}
            }
            String matched = openApp(a, target);
            if(matched != null) return "Abri " + matched + ".";
            return "Não encontrei a aplicação «" + target + "» instalada. Podes abri-la manualmente.";
        }
        if(q.startsWith("pesquisa ") || q.startsWith("pesquisar ") || q.startsWith("procura ")) {
            String term=q.replaceFirst("^(pesquisa|pesquisar|procura)\\s+", "");
            if(term.length() > 0) {
                Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse("https://www.google.com/search?q="+Uri.encode(term)));
                a.startActivity(i);
                return "Abri a pesquisa no navegador.";
            }
        }
        Intent i = new Intent(a,MainActivity.class);
        i.putExtra("question",raw);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        a.startActivity(i);
        return "Vou enviar a pergunta ao NEXUS.";
    }
    static String openApp(Activity activity, String term) {
        PackageManager pm=activity.getPackageManager();
        Intent search=new Intent(Intent.ACTION_MAIN,null);
        search.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> list=pm.queryIntentActivities(search,PackageManager.MATCH_ALL);
        String cleanTerm=plain(term);
        if(cleanTerm.isEmpty()) return null;
        String[] known;
        switch(cleanTerm){
          case "facebook": known=new String[]{"com.facebook.katana","com.facebook.lite"};break;
          case "instagram": known=new String[]{"com.instagram.android","com.instagram.lite"};break;
          case "whatsapp": known=new String[]{"com.whatsapp","com.whatsapp.w4b"};break;
          case "youtube": known=new String[]{"com.google.android.youtube"};break;
          case "spotify": known=new String[]{"com.spotify.music"};break;
          case "chrome": known=new String[]{"com.android.chrome"};break;
          case "google maps": case "maps": case "mapas": known=new String[]{"com.google.android.apps.maps"};break;
          case "gmail": known=new String[]{"com.google.android.gm"};break;
          case "tiktok": known=new String[]{"com.zhiliaoapp.musically"};break;
          case "messenger": known=new String[]{"com.facebook.orca"};break;
          default: known=new String[0];
        }
        for(String pkg:known){
          Intent launch=pm.getLaunchIntentForPackage(pkg);
          if(launch!=null){launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
           try{activity.startActivity(launch);return term;}catch(Exception ignored){}
          }
        }
        ResolveInfo best=null;
        int score=0;
        for(ResolveInfo info:list){
            if(info.activityInfo==null)continue;
            String name=String.valueOf(info.loadLabel(pm));
            String normalized=plain(name);
            String p=info.activityInfo.packageName;
            if(p.equals(activity.getPackageName()))continue;
            int current=normalized.equals(cleanTerm)?100:normalized.startsWith(cleanTerm)?80:normalized.contains(cleanTerm)?65:0;
            if(current > score){score=current;best=info;}
        }
        if(best==null || score<65) return null;
        Intent launch=new Intent(Intent.ACTION_MAIN);
        launch.addCategory(Intent.CATEGORY_LAUNCHER);
        launch.setClassName(best.activityInfo.packageName,best.activityInfo.name);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        try{activity.startActivity(launch);return String.valueOf(best.loadLabel(pm));}catch(Exception e){return null;}
    }
}
