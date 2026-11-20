package pt.nexus.assistant;
import org.junit.Test;
import static org.junit.Assert.*;
public class CommandTextTest {
 @Test public void whatsappSpeechVariants(){for(String s:new String[]{"WhatsApp","whats app","what's app","watsap","what's up","uatsap"})assertEquals(s,"whatsapp",CommandText.app(s));}
 @Test public void businessIsExplicit(){assertEquals("whatsapp business",CommandText.app("Whats App Business"));assertEquals("whatsapp business",CommandText.requestedApp("NEXUS, abre o WhatsApp Business por favor"));}
 @Test public void politeCommands(){assertEquals("whatsapp",CommandText.requestedApp("Podes abrir o Whats App por favor?"));assertEquals("instagram",CommandText.requestedApp("Muda para o Insta"));assertEquals("facebook",CommandText.requestedApp("NEXUS abre o Facebook"));}
 @Test public void explanationsAreNotCommands(){assertNull(CommandText.requestedApp("Como abrir o WhatsApp?"));assertNull(CommandText.requestedApp("Explica como abrir o Instagram"));assertNull(CommandText.requestedApp("Podes abrir uma conta no Facebook"));assertNull(CommandText.requestedApp("Instalar whatsapp"));}
}
