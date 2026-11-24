package pt.nexus.jarvis;

import android.accounts.Account;
import android.app.Activity;
import android.content.Intent;
import android.content.IntentSender;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.SystemClock;
import android.util.Base64;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * On-device Gmail triage (up to 3 user-authorized Google accounts).
 * OAuth handled by Google Play Services. Access tokens remain in process memory;
 * messages and tokens are NOT forwarded to any external AI or backend.
 * Gmail OAuth restricted-scope verification and Android OAuth client registration
 * (package + SHA-1) are prerequisites to production use.
 */
final class NexusGmail {
    static final int REQUEST_AUTH=998;
    private static final String READ="https://www.googleapis.com/auth/gmail.readonly";
    private static final String MODIFY="https://www.googleapis.com/auth/gmail.modify";
    private static final String PREF="nexus-gmail-accounts";
    private static final Pattern DUE=Pattern.compile(
        "(?:vencimento|data\\s+limite|prazo\\s+de\\s+pagamento|pag(?:ar|amento)\\s+at[eé]|due\\s+date)\\D{0,35}(\\d{1,2})[/-](\\d{1,2})[/-](20\\d{2})",Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private final MainActivity host;
    private final AuthorizationClient auth;
    private int activeSlot=-1;
    private String action="", messageId="";
    private final List<Integer> queue=new ArrayList<>();

    NexusGmail(MainActivity host){
        this.host=host;
        this.auth=Identity.getAuthorizationClient(host);
    }
    String accounts(){
        JSONArray result=new JSONArray();
        SharedPreferences p=host.getSharedPreferences(PREF,0);
        for(int i=0;i<3;i++){
            JSONObject entry=new JSONObject();
            try{entry.put("slot",i).put("email",p.getString("account_"+i,""));}
            catch(Exception ignored){}
            result.put(entry);
        }
        return result.toString();
    }
    void connect(int slot){
        if(slot<0||slot>=3){send("status",new JSONObject(),"Escolhe uma das três contas.");return;}
        authorize(slot,"connect","",true);
    }
    void scanAll(){
        queue.clear();
        SharedPreferences p=host.getSharedPreferences(PREF,0);
        for(int i=0;i<3;i++)if(!p.getString("account_"+i,"").isEmpty())queue.add(i);
        if(queue.isEmpty()){send("status",new JSONObject(),"Liga primeiro as tuas contas Gmail nas Definições.");return;}
        continueScan();
    }
    void scanSpam(int slot){
        if(slot<0||slot>=3)return;
        authorize(slot,"spam","",false);
    }
    void readOne(int slot,String id){
        if(!validId(id)||slot<0||slot>=3)return;
        authorize(slot,"read",id,false);
    }
    void trashOne(int slot,String id){
        if(!validId(id)||slot<0||slot>=3)return;
        // Called only after the user has explicitly confirmed this precise message in the UI.
        authorize(slot,"trash",id,false);
    }
    void setAutoBills(boolean enabled){
        host.getSharedPreferences(PREF,0).edit().putBoolean("autoBills",enabled).apply();
        send("status",new JSONObject(),enabled?
          "Lembretes de possíveis faturas ativados. Não faço pagamentos.":"Lembretes automáticos de faturas desativados.");
    }
    boolean autoBills(){return host.getSharedPreferences(PREF,0).getBoolean("autoBills",false);}
    void remove(int slot){
        if(slot<0||slot>=3)return;
        host.getSharedPreferences(PREF,0).edit().remove("account_"+slot).apply();
        send("accounts",new JSONObject(),"Conta desligada desta aplicação. Revoga também o acesso nas definições da conta Google, se necessário.");
    }
    private void continueScan(){
        if(queue.isEmpty()){send("complete",new JSONObject(),"Terminei a leitura das contas autorizadas.");return;}
        int slot=queue.remove(0);
        authorize(slot,"scan","",false);
    }
    private void authorize(int slot,String requestedAction,String id,boolean choose){
        if(activeSlot>=0){send("status",new JSONObject(),"Já há uma autorização Google em curso.");return;}
        activeSlot=slot;action=requestedAction;messageId=id;
        try{
            List<Scope> scopes=new ArrayList<>();
            scopes.add(new Scope("trash".equals(action)?MODIFY:READ));
            AuthorizationRequest.Builder builder=AuthorizationRequest.builder().setRequestedScopes(scopes);
            String account=host.getSharedPreferences(PREF,0).getString("account_"+slot,"");
            if(!choose&&!account.isEmpty())builder.setAccount(new Account(account,"com.google"));
            else builder.setPrompt(AuthorizationRequest.Prompt.SELECT_ACCOUNT);
            auth.authorize(builder.build())
                .addOnSuccessListener(result->{
                    if(result.hasResolution()){
                        try{
                            host.startIntentSenderForResult(result.getPendingIntent().getIntentSender(),REQUEST_AUTH,null,0,0,0);
                        }catch(IntentSender.SendIntentException e){fail("Não consegui abrir a autorização Google.");}
                    }else{handleAuth(result);}
                })
                .addOnFailureListener(e->fail("A ligação Google não está disponível. Confirma o OAuth Android, a assinatura APK e o acesso Gmail."));
        }catch(Exception e){fail("Não consegui iniciar a ligação Gmail.");}
    }
    boolean onActivityResult(int request,int result,Intent intent){
        if(request!=REQUEST_AUTH)return false;
        if(result!=Activity.RESULT_OK||intent==null){fail("A autorização para esta conta foi cancelada.");return true;}
        try{handleAuth(auth.getAuthorizationResultFromIntent(intent));}
        catch(Exception e){fail("O Google não autorizou o acesso a esta conta.");}
        return true;
    }
    private void handleAuth(AuthorizationResult result){
        if(result==null||result.getAccessToken()==null||result.getAccessToken().isEmpty()){
            fail("A autorização não devolveu um token válido.");return;
        }
        final String token=result.getAccessToken(),operation=action,id=messageId;
        final int slot=activeSlot;
        // Do not persist token; it is an expiring user-authorized Google access token.
        new Thread(()->{
            try{
                JSONObject profile=get("https://gmail.googleapis.com/gmail/v1/users/me/profile",token);
                String email=profile.optString("emailAddress","");
                String previous=host.getSharedPreferences(PREF,0).getString("account_"+slot,"");
                if(!email.contains("@"))throw new Exception("Identidade da conta não confirmada.");
                if(!"connect".equals(operation)&&!previous.isEmpty()&&!email.equalsIgnoreCase(previous))
                    throw new Exception("O Google devolveu uma conta diferente da selecionada.");
                if("connect".equals(operation)){
                    host.getSharedPreferences(PREF,0).edit().putString("account_"+slot,email).apply();
                    JSONObject o=new JSONObject().put("slot",slot).put("email",email);
                    send("linked",o,"Conta Gmail autorizada: "+email);
                    listMessages(slot,email,token,false);
                }else if("scan".equals(operation)||"spam".equals(operation)){
                    listMessages(slot,email,token,"spam".equals(operation));
                }else if("read".equals(operation)){
                    JSONObject item=get("https://gmail.googleapis.com/gmail/v1/users/me/messages/"+id+"?format=full",token);
                    JSONObject output=classify(item,email,slot,true);
                    output.put("body",extractText(item));
                    send("message",output,"Email lido apenas no telemóvel.");
                }else if("trash".equals(operation)){
                    if(result.getGrantedScopes()==null||!result.getGrantedScopes().contains(MODIFY))
                        throw new Exception("Falta a autorização de modificar emails.");
                    JSONObject answer=post("https://gmail.googleapis.com/gmail/v1/users/me/messages/"+id+"/trash",token);
                    send("trashed",new JSONObject().put("slot",slot).put("id",id),"Email movido para o Lixo do Gmail. Pode ser recuperado durante o prazo definido pelo Gmail.");
                }
            }catch(Exception e){
                send("error",new JSONObject().put("slot",slot),shortError(e.getMessage()));
            }finally{
                host.runOnUiThread(()->{
                    activeSlot=-1;action="";messageId="";
                    if("scan".equals(operation))continueScan();
                });
            }
        },"NEXUS-Gmail").start();
    }
    private void listMessages(int slot,String email,String token,boolean spam)throws Exception {
        String url="https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=12"+
            "&q="+Uri.encode(spam?"in:spam newer_than:60d":"in:inbox newer_than:30d")+
            (spam?"&includeSpamTrash=true":"");
        JSONObject data=get(url,token);
        JSONArray records=data.optJSONArray("messages"),items=new JSONArray();
        if(records!=null)for(int i=0;i<records.length()&&i<12;i++){
            JSONObject record=records.optJSONObject(i);
            if(record==null)continue;
            String id=record.optString("id","");
            if(!validId(id))continue;
            try{
                JSONObject message=get("https://gmail.googleapis.com/gmail/v1/users/me/messages/"+
                    id+"?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date",token);
                JSONObject classified=classify(message,email,slot,false);
                if(spam)classified.put("category","spam");
                items.put(classified);
                if(!spam&&autoBills())maybeScheduleBill(classified);
            }catch(Exception ignored){}
        }
        JSONObject output=new JSONObject().put("slot",slot).put("email",email)
            .put("spam",spam).put("messages",items).put("checkedAt",System.currentTimeMillis());
        send(spam?"spam":"inbox",output,"Analisei "+items.length()+" emails de "+email+".");
    }
    private JSONObject classify(JSONObject item,String email,int slot,boolean full)throws Exception {
        String from="",subject="",date="";
        JSONObject payload=item.optJSONObject("payload");
        JSONArray headers=payload==null?null:payload.optJSONArray("headers");
        if(headers!=null)for(int i=0;i<headers.length();i++){
            JSONObject h=headers.optJSONObject(i);
            if(h==null)continue;
            String value=h.optString("value","");
            String name=h.optString("name","").toLowerCase(Locale.ROOT);
            if("from".equals(name))from=value;
            else if("subject".equals(name))subject=value;
            else if("date".equals(name))date=value;
        }
        JSONArray labels=item.optJSONArray("labelIds");
        boolean gmailImportant=hasLabel(labels,"IMPORTANT"),spam=hasLabel(labels,"SPAM");
        boolean promo=hasLabel(labels,"CATEGORY_PROMOTIONS");
        String snippet=item.optString("snippet","");
        String hay=(subject+" "+snippet).toLowerCase(Locale.ROOT);
        boolean paid=hay.matches("(?s).*(?:pagamento recebido|j[aá] pago|fatura paga|recibo de pagamento|pago com sucesso|pagamento conclu[ií]do).*");
        boolean invoice=hay.matches("(?s).*(?:fatura|factura|invoice|aviso de pagamento|vencimento|conta para pagar|pagamento pendente).*");
        boolean threat=hay.matches("(?s).*(?:a sua conta ser[aá] bloqueada|verifique imediatamente|suspens[aã]o urgente|clique imediatamente).*");
        boolean marketing=hay.matches("(?s).*(?:newsletter|promo[cç][aã]o|desconto|cup[aã]o|oferta exclusiva|black friday|liquida[cç][aã]o).*");
        String category=spam?"spam":invoice&&!paid?"fatura":promo||marketing?"promocao":gmailImportant||invoice?"importante":"normal";
        Matcher m=DUE.matcher(hay);
        long dueMillis=0;
        if("fatura".equals(category)&&!threat&&m.find()){
            try{
                int day=Integer.parseInt(m.group(1)),month=Integer.parseInt(m.group(2)),year=Integer.parseInt(m.group(3));
                LocalDate due=LocalDate.of(year,month,day);
                if(due.isAfter(LocalDate.now().minusDays(1))&&due.isBefore(LocalDate.now().plusYears(1)))
                    dueMillis=due.atTime(9,0).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            }catch(Exception ignored){}
        }
        return new JSONObject().put("slot",slot).put("id",item.optString("id",""))
            .put("email",email).put("from",from).put("subject",subject).put("date",date)
            .put("snippet",snippet.length()>400?snippet.substring(0,400):snippet)
            .put("category",category).put("suspicious",threat||spam).put("dueAt",dueMillis)
            .put("important",gmailImportant).put("unread",hasLabel(labels,"UNREAD"));
    }
    private void maybeScheduleBill(JSONObject item){
        long due=item.optLong("dueAt",0);
        if(due<=0||item.optBoolean("suspicious",false))return;
        String id=item.optString("id",""),email=item.optString("email","");
        if(!validId(id))return;
        String key="bills:"+email.hashCode()+":"+id;
        SharedPreferences prefs=host.getSharedPreferences(PREF,0);
        if(prefs.getBoolean(key,false))return;
        long when=due-2*24*60*60*1000L;
        if(when<=System.currentTimeMillis()+60000){
            if(due<System.currentTimeMillis())return;
            when=System.currentTimeMillis()+2*60*1000L;
        }
        String title="Verificar possível fatura: "+item.optString("subject","Sem assunto");
        if(title.length()>110)title=title.substring(0,110);
        String response=NexusReminders.add(host,title,when);
        if(response.startsWith("Lembrete guardado")){
            prefs.edit().putBoolean(key,true).apply();
            try{send("billScheduled",new JSONObject().put("email",email).put("subject",title)
                .put("dueAt",due),"Possível fatura identificada e lembrete criado para verificação.");}
            catch(Exception ignored){}
        }
    }
    private static boolean hasLabel(JSONArray arr,String target){
        if(arr==null)return false;
        for(int i=0;i<arr.length();i++)if(target.equals(arr.optString(i)))return true;
        return false;
    }
    private static String extractText(JSONObject msg){
        JSONObject body=msg.optJSONObject("payload");
        String text=partText(body,0);
        if(text.trim().isEmpty())text=msg.optString("snippet","");
        return text.length()>4000?text.substring(0,4000):text;
    }
    private static String partText(JSONObject part,int depth){
        if(part==null||depth>4)return "";
        if("text/plain".equals(part.optString("mimeType"))){
            JSONObject body=part.optJSONObject("body");
            if(body!=null&&!body.optString("data").isEmpty()){
                try{return new String(Base64.decode(body.optString("data"),Base64.URL_SAFE),StandardCharsets.UTF_8);}
                catch(Exception ignored){}
            }
        }
        JSONArray children=part.optJSONArray("parts");
        if(children!=null)for(int i=0;i<children.length();i++){
            String t=partText(children.optJSONObject(i),depth+1);
            if(!t.isEmpty())return t;
        }
        return "";
    }
    private static boolean validId(String id){return id!=null&&id.matches("[a-zA-Z0-9_-]{6,120}");}
    private static String shortError(String err){
        if(err==null)return "Não consegui consultar o Gmail.";
        if(err.contains("HTTP 401"))return "A autorização da conta expirou. Volta a autorizar no JARVIS.";
        if(err.contains("HTTP 403"))return "A API Gmail não está autorizada no projeto Google Cloud ou falta aprovação OAuth.";
        if(err.contains("HTTP 429"))return "O Gmail limitou temporariamente os pedidos; tenta mais tarde.";
        return err.length()>160?err.substring(0,160):err;
    }
    private static JSONObject get(String url,String token)throws Exception{return request("GET",url,token);}
    private static JSONObject post(String url,String token)throws Exception{return request("POST",url,token);}
    private static JSONObject request(String method,String endpoint,String token)throws Exception{
        URL url=new URL(endpoint);
        if(!"https".equalsIgnoreCase(url.getProtocol())||!"gmail.googleapis.com".equalsIgnoreCase(url.getHost()))
            throw new SecurityException("Domínio de email não autorizado.");
        HttpURLConnection c=(HttpURLConnection)url.openConnection();
        try{
            c.setRequestMethod(method);c.setRequestProperty("Authorization","Bearer "+token);
            c.setRequestProperty("Accept","application/json");
            c.setConnectTimeout(7500);c.setReadTimeout(7500);
            if("POST".equals(method)){c.setDoOutput(true);c.setFixedLengthStreamingMode(0);c.connect();}
            int code=c.getResponseCode();
            if(code<200||code>=300)throw new Exception("HTTP "+code);
            try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                byte[] block=new byte[4096];int n;
                while((n=in.read(block))!=-1&&out.size()<1500000)out.write(block,0,n);
                return new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
            }
        }finally{c.disconnect();}
    }
    private void send(String type,JSONObject data,String message){
        try{
            JSONObject payload=new JSONObject(data.toString()).put("note",message);
            host.emitMailEvent(type,payload);
        }catch(Exception ignored){}
    }
    private void fail(String message){
        final String operation=action;
        activeSlot=-1;action="";messageId="";
        send("error",new JSONObject(),message);
        if("scan".equals(operation))continueScan();
    }
}
