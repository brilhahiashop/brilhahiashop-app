package pt.nexus.assistant;
import org.junit.Test;
import static org.junit.Assert.*;
public class CommandTextTest {
 @Test public void whatsappSpeechVariants(){for(String s:new String[]{"WhatsApp","whats app","what's app","watsap","what's up","uatsap"})assertEquals(s,"whatsapp",CommandText.app(s));}
 @Test public void timeAndDurationInPortuguese(){
  assertArrayEquals(new int[]{6,30},NexusIntent.clockTime("Desperta-me amanhã às seis e meia"));
  assertArrayEquals(new int[]{14,15},NexusIntent.clockTime("Cria alarme para as 14h15"));
  assertEquals(20,NexusIntent.durationMinutes("Põe um temporizador de 20 minutos"));
  assertEquals(60,NexusIntent.durationMinutes("Põe um temporizador de uma hora"));
 }
  @Test public void businessIsExplicit(){assertEquals("whatsapp business",CommandText.app("Whats App Business"));assertEquals("whatsapp business",CommandText.requestedApp("NEXUS, abre o WhatsApp Business por favor"));}
 @Test public void politeCommands(){assertEquals("whatsapp",CommandText.requestedApp("Podes abrir o Whats App por favor?"));assertEquals("instagram",CommandText.requestedApp("Muda para o Insta"));assertEquals("facebook",CommandText.requestedApp("NEXUS abre o Facebook"));}
 @Test public void explanationsAreNotCommands(){assertNull(CommandText.requestedApp("Como abrir o WhatsApp?"));assertNull(CommandText.requestedApp("Explica como abrir o Instagram"));assertNull(CommandText.requestedApp("Podes abrir uma conta no Facebook"));assertNull(CommandText.requestedApp("Instalar whatsapp"));}
}
