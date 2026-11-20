package pt.nexus.assistant;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
final class SecretStore {
 private static SecretKey key() throws Exception {
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(!ks.containsAlias("nexus-access")){KeyGenerator g=KeyGenerator.getInstance("AES","AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder("nexus-access",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}
  return (SecretKey)ks.getKey("nexus-access",null);
 }
 static void save(Context c,String value) throws Exception {
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
  c.getSharedPreferences("access",0).edit().putString("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).putString("value",Base64.encodeToString(cipher.doFinal(value.getBytes("UTF-8")),Base64.NO_WRAP)).apply();
 }
 static String read(Context c){try{android.content.SharedPreferences p=c.getSharedPreferences("access",0);if(!p.contains("value"))return "";Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(p.getString("iv",""),0)));return new String(cipher.doFinal(Base64.decode(p.getString("value",""),0)),"UTF-8");}catch(Exception e){return "";}}
}
