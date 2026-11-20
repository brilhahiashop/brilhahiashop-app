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
        String q = plain(raw).replaceFirst("^(ola\\s+)?(nexus|nexos|anexos)[,!: ]*", "").trim();
        if (q.length() == 0) return "Não ouvi nenhum comando.";
        if(q.matches("^(sair do nexus|fecha o nexus|fechar nexus|sair do nexos)$")){a.getSharedPreferences("privacy",0).edit().putBoolean("exited",true).apply();a.stopService(new Intent(a,BubbleService.class));a.stopService(new Intent(a,HandsFreeService.class));a.stopService(new Intent(a,ReminderSpeechService.class));a.finishAndRemoveTask();return "NEXUS encerrado.";}
        // "fecha o Facebook e abre o Instagram": switches apps; Android keeps the first in memory.
        if(q.matches("^(fecha|fechar|sair|minimiza)\\s+.*\\s+e\\s+(abre|abrir|inicia|iniciar|lanca)\\s+.*")) {
            String target=q.replaceFirst("^.*\\s+e\\s+(abre|abrir|inicia|iniciar|lanca)\\s+", "").trim()
                         .replaceFirst("^(o|a|meu|minha|app|aplicacao)\\s+", "").trim();
            String opened=openApp(a,target);
            return opened!=null ? "Abri " + opened + ". A aplicação anterior ficou em segundo plano." : "Não consegui localizar ou abrir «" + target + "» instalado.";
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
            return "Não consegui localizar ou abrir a aplicação «" + target + "» instalada. Podes abri-la manualmente.";
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
    /** Canonical names and common speech aliases, entirely local. */
    static String appName(String term){return CommandText.app(term);}
    static String[] knownPackages(String canonical){
        switch(canonical){
          case "facebook":return new String[]{"com.facebook.katana","com.facebook.lite"};
          case "instagram":return new String[]{"com.instagram.android","com.instagram.lite"};
          case "whatsapp business":return new String[]{"com.whatsapp.w4b"};
          case "whatsapp":return new String[]{"com.whatsapp","com.whatsapp.w4b"};
          case "youtube":return new String[]{"com.google.android.youtube"};
          case "spotify":return new String[]{"com.spotify.music"};
          case "chrome":return new String[]{"com.android.chrome"};
          case "maps":return new String[]{"com.google.android.apps.maps"};
          case "gmail":return new String[]{"com.google.android.gm"};
          case "tiktok":return new String[]{"com.zhiliaoapp.musically"};
          case "messenger":return new String[]{"com.facebook.orca"};
          default:return new String[0];
        }
    }
    /** On Android 13+ the IntentSender bypasses package-visibility filtering. */
    private static boolean launchPackage(Activity activity,String pkg){
        PackageManager pm=activity.getPackageManager();
        if(android.os.Build.VERSION.SDK_INT>=33){
            try{
                android.content.IntentSender sender=pm.getLaunchIntentSenderForPackage(pkg);
                if(sender!=null){
                    sender.sendIntent(activity,0,null,null,null);
                    return true;
                }
            }catch(Exception ignored){}
        }
        try{
            Intent direct=pm.getLaunchIntentForPackage(pkg);
            if(direct!=null){
                direct.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                activity.startActivity(direct);return true;
            }
        }catch(Exception ignored){}
        try{
            Intent launcher=new Intent(Intent.ACTION_MAIN);
            launcher.addCategory(Intent.CATEGORY_LAUNCHER);
            launcher.setPackage(pkg);
            launcher.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            activity.startActivity(launcher);return true;
        }catch(Exception ignored){}
        return false;
    }
    static String openApp(Activity activity,String term){
        String canonical=appName(term);
        if(canonical.isEmpty())return null;
        // First attempt direct package launch. This also works when installed-app
        // enumeration on the user's Android returns an incomplete list.
        for(String pkg:knownPackages(canonical)){
            if(launchPackage(activity,pkg))return canonical;
        }
        PackageManager pm=activity.getPackageManager();
        Intent query=new Intent(Intent.ACTION_MAIN);
        query.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> found=pm.queryIntentActivities(query,0);
        ResolveInfo best=null;int bestScore=0;
        for(ResolveInfo info:found){
            if(info.activityInfo==null||activity.getPackageName().equals(info.activityInfo.packageName))continue;
            String label=String.valueOf(info.loadLabel(pm));
            String normal=plain(label);
            int score=normal.equals(canonical)?100:normal.startsWith(canonical)?85:normal.contains(canonical)?70:0;
            if(score>bestScore){bestScore=score;best=info;}
        }
        if(best!=null&&bestScore>=70){
            if(launchPackage(activity,best.activityInfo.packageName))return String.valueOf(best.loadLabel(pm));
            try{
                Intent launch=new Intent(Intent.ACTION_MAIN);
                launch.addCategory(Intent.CATEGORY_LAUNCHER);
                launch.setClassName(best.activityInfo.packageName,best.activityInfo.name);
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                activity.startActivity(launch);
                return String.valueOf(best.loadLabel(pm));
            }catch(Exception ignored){}
        }
        return null;
    }
    static String visibleApps(Activity activity){
        PackageManager pm=activity.getPackageManager();
        Intent query=new Intent(Intent.ACTION_MAIN);
        query.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> found=pm.queryIntentActivities(query,0);
        java.util.TreeSet<String> names=new java.util.TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        for(ResolveInfo item:found)if(item.activityInfo!=null&&!item.activityInfo.packageName.equals(activity.getPackageName()))
            names.add(String.valueOf(item.loadLabel(pm)));
        StringBuilder result=new StringBuilder("Aplicações visíveis para o NEXUS: "+names.size()+".");
        int shown=0;
        for(String n:names){if(shown++>=65){result.append("\n…");break;}result.append("\n• ").append(n);}
        result.append("\n\nSe faltar uma app instalada, verifica se está num perfil secundário, espaço duplo ou conta de trabalho. No Android 13+ o NEXUS tentará abri-la mesmo sem aparecer na lista.");
        return result.toString();
    }
}
