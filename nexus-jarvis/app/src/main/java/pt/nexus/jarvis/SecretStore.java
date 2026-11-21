package pt.nexus.jarvis;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** AES-256-GCM, Android Keystore, separate encrypted records for each token. */
final class SecretStore {
    private static final String ALIAS="nexus-jarvis-v1";
    private static boolean allowed(String s){return "stoken".equals(s)||"key".equals(s);}
    private static SecretKey getKey() throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        if(!ks.containsAlias(ALIAS)){
            KeyGenerator gen=KeyGenerator.getInstance("AES","AndroidKeyStore");
            gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            gen.generateKey();
        }
        return (SecretKey)ks.getKey(ALIAS,null);
    }
    static synchronized boolean save(Context c,String slot,String value){
        if(!allowed(slot))return false;
        try{
            SharedPreferences p=c.getSharedPreferences("nexus-jarvis-secrets",Context.MODE_PRIVATE);
            if(value==null||value.isEmpty())return p.edit().remove(slot+".iv").remove(slot+".ct").commit();
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,getKey());
            return p.edit()
                .putString(slot+".iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP))
                .putString(slot+".ct",Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP)).commit();
        }catch(Exception e){return false;}
    }
    static synchronized String read(Context c,String slot){
        if(!allowed(slot))return "";
        try{
            SharedPreferences p=c.getSharedPreferences("nexus-jarvis-secrets",Context.MODE_PRIVATE);
            String iv=p.getString(slot+".iv",""),ct=p.getString(slot+".ct","");
            if(iv.isEmpty()||ct.isEmpty())return "";
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,getKey(),new GCMParameterSpec(128,Base64.decode(iv,Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(ct,Base64.NO_WRAP)),StandardCharsets.UTF_8);
        }catch(Exception e){return "";}
    }
}
