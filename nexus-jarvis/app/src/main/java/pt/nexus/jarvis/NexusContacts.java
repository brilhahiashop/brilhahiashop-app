package pt.nexus.jarvis;
import android.Manifest;
import android.app.AlertDialog;
import android.content.*;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.ContactsContract;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.widget.Toast;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;
import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Consumer;
import java.util.regex.*;

/** Opt-in contact selection and action confirmation. Contacts never go to the NEXUS server. */
final class NexusContacts {
 static final int PICK_CONTACT=740,REQUEST_CALL=741;
 private static final String PREF="nexus_private_aliases_v1",KEY="nexus-personal-contacts-v1";
 private final MainActivity host;
 private String pendingAlias,pendingMessage;
 private String awaitingNumber;
 private boolean whatsappMode=false;
 private Consumer<String> answer;
 NexusContacts(MainActivity host){this.host=host;}
 private static String normalize(String s){
  return Normalizer.normalize((s==null?"":s).toLowerCase(new Locale("pt","PT")),Normalizer.Form.NFD)
   .replaceAll("\\p{M}+","").replaceAll("[?!.,:;]"," ").replaceAll("\\s+"," ").trim();
 }
 private String canonical(String input){
  String s=normalize(input).replaceFirst("^(?:(?:para|ao|a|o|a minha|o meu|meu|minha|para o|para a|a)\\s+)+","");
  if(s.matches("(filho|o filho|meu filho|ao meu filho)"))return "filho";
  if(s.matches("(filha|a filha|minha filha)"))return "filha";
  return s.length()>65?s.substring(0,65):s;
 }
 private SecretKey key()throws Exception{
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(!ks.containsAlias(KEY)){
   KeyGenerator g=KeyGenerator.getInstance("AES","AndroidKeyStore");
   g.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
   g.generateKey();
  }return(SecretKey)ks.getKey(KEY,null);
 }
 private String read(String alias){
  try{
   String data=host.getSharedPreferences(PREF,0).getString(alias,"");
   if(data.isEmpty())return "";
   String[] parts=data.split(":",2);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
   cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
   return new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),"UTF-8");
  }catch(Exception e){return "";}
 }
 private void save(String alias,String number){
  try{
   Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
   String data=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+
    Base64.encodeToString(cipher.doFinal(number.getBytes("UTF-8")),Base64.NO_WRAP);
   host.getSharedPreferences(PREF,0).edit().putString(alias,data).apply();
  }catch(Exception e){Toast.makeText(host,"Não foi possível guardar o contacto.",Toast.LENGTH_LONG).show();}
 }
 void call(String target,Consumer<String> callback){
  pendingAlias=canonical(target);pendingMessage=null;whatsappMode=false;answer=callback;
  if(pendingAlias.length()<2){callback.accept("Diz o nome da pessoa a quem queres ligar.");return;}
  String known=read(pendingAlias);
  if(known.isEmpty())chooseContact();
  else confirmCall(known);
 }
 void message(String natural,Consumer<String> callback){
  answer=callback;
  String q=natural.replaceFirst("(?iu)^(ol[aá]\\s+)?(nexus|nexos)[,!: ]*","")
     .replaceFirst("(?iu)^(manda|enviar|envia|escreve|prepara|redige|quero enviar|quero mandar)\\s+(uma\\s+)?(mensagem|sms|whatsapp|recado)\\s*","");
  Matcher m=Pattern.compile("(?iu)^(?:para|ao|a|à)\\s+(.+?)\\s+(?:a dizer|dizendo|que diga|com o texto|a dizer que)\\s+(.+)$").matcher(q.trim());
  String alias,body;
  if(m.find()){alias=m.group(1);body=m.group(2);}
  else{
   Matcher m2=Pattern.compile("(?iu)^(?:para|ao|a|à)\\s+(.+)$").matcher(q.trim());
   alias=m2.find()?m2.group(1):"";body="";
  }
  pendingAlias=canonical(alias);pendingMessage=body;
  if(pendingAlias.isEmpty()){
   callback.accept("Preciso que digas a quem é a mensagem. Por exemplo: envia uma mensagem ao meu filho a dizer que chego às seis.");
   return;
  }
  String known=read(pendingAlias);if(known.isEmpty())chooseContact();else composeMessage(known);
 }

 void compose(String target,String body,boolean whatsapp,Consumer<String> callback){
  answer=callback;pendingAlias=canonical(target);pendingMessage=body==null?"":body.trim();
  whatsappMode=whatsapp;
  if(pendingAlias.length()<2){callback.accept("Diz o nome do contacto.");return;}
  String digits=read(pendingAlias);
  if(digits.isEmpty())chooseContact();else composeMessage(digits);
 }
 private void chooseContact(){
  try{
   Intent pick=new Intent(Intent.ACTION_PICK,ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
   host.startActivityForResult(pick,PICK_CONTACT);
   answer.accept("Escolhe o contacto correspondente a "+pendingAlias+" uma vez. Vou guardar esta associação apenas neste telemóvel.");
  }catch(Exception e){answer.accept("Não consegui abrir os contactos. Confirma se tens uma aplicação de contactos instalada.");}
 }
 void onPicked(int result,Intent data){
  if(result!=android.app.Activity.RESULT_OK||data==null||data.getData()==null){if(answer!=null)answer.accept("Não foi selecionado nenhum contacto.");return;}
  String number=null;
  try(Cursor c=host.getContentResolver().query(data.getData(),
    new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},null,null,null)){
   if(c!=null&&c.moveToFirst())number=c.getString(0);
  }catch(Exception ignored){}
  if(number==null||number.trim().isEmpty()){if(answer!=null)answer.accept("O contacto selecionado não tem um número válido.");return;}
  String digits=number.replaceAll("[^\\d+]","");
  if(!digits.matches("\\+?\\d{7,15}")){if(answer!=null)answer.accept("Esse contacto não tem um número de telefone utilizável.");return;}
  save(pendingAlias,digits);
  if(pendingMessage==null)confirmCall(digits);else composeMessage(digits);
 }
 private void confirmCall(String number){
  String suffix=number.length()>3?number.substring(number.length()-3):number;
  new AlertDialog.Builder(host).setTitle("NEXUS · Confirmar chamada")
    .setMessage("Ligar agora para "+pendingAlias+" (terminado em "+suffix+")?")
    .setPositiveButton("Ligar",(d,w)->callNow(number))
    .setNegativeButton("Cancelar",(d,w)->{if(answer!=null)answer.accept("Chamada cancelada.");})
    .show();
  if(answer!=null)answer.accept("Encontrei "+pendingAlias+". Confirma a chamada no ecrã.");
 }
 private void callNow(String number){
  awaitingNumber=number;
  if(Build.VERSION.SDK_INT>=23&&host.checkSelfPermission(Manifest.permission.CALL_PHONE)!=PackageManager.PERMISSION_GRANTED){
   host.requestPermissions(new String[]{Manifest.permission.CALL_PHONE},REQUEST_CALL);
   return;
  }
  place(number);
 }
 void onCallPermissionResult(int[] granted){
  if(awaitingNumber==null)return;
  String n=awaitingNumber;awaitingNumber=null;
  if(granted.length>0&&granted[0]==PackageManager.PERMISSION_GRANTED)place(n);
  else dial(n);
 }
 private void place(String number){
  awaitingNumber=null;
  try{host.startActivity(new Intent(Intent.ACTION_CALL,Uri.parse("tel:"+number)));
   if(answer!=null)answer.accept("A iniciar a chamada para "+pendingAlias+".");
  }catch(Exception e){dial(number);}
 }
 private void dial(String number){
  try{host.startActivity(new Intent(Intent.ACTION_DIAL,Uri.parse("tel:"+number)));
   if(answer!=null)answer.accept("Abri o marcador. Toca em ligar para concluir.");
  }catch(Exception e){if(answer!=null)answer.accept("Não foi possível abrir o telefone.");}
 }
 private void composeMessage(String number){
  String message=pendingMessage==null?"":pendingMessage;
  String alias=pendingAlias;
  new AlertDialog.Builder(host)
   .setTitle(whatsappMode?"NEXUS · WhatsApp":"NEXUS · SMS")
   .setMessage("Para "+alias+":\n\n"+(message.isEmpty()?"(sem texto ainda)":message)+"\n\nO envio só fica concluído quando carregares em Enviar na aplicação.")
   .setPositiveButton("Abrir mensagem",(dialog,which)->{
     try{
       if(whatsappMode){
         String phone=number.replaceAll("[^0-9]","");
         if(phone.length()==9&&phone.startsWith("9"))phone="351"+phone;
         Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse("https://wa.me/"+phone+"?text="+Uri.encode(message)));
         host.startActivity(intent);
       }else{
         Intent sms=new Intent(Intent.ACTION_SENDTO,Uri.parse("smsto:"+number));
         sms.putExtra("sms_body",message);
         host.startActivity(sms);
       }
       if(answer!=null)answer.accept("Abri a conversa. Confirma o envio na aplicação.");
     }catch(Exception e){if(answer!=null)answer.accept("Não consegui abrir a aplicação de mensagens.");}
   }).setNegativeButton("Cancelar",null).show();
  if(answer!=null)answer.accept("Mensagem para "+alias+" preparada. Confirma no ecrã.");
 }
}
