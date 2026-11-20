package pt.nexus.assistant;
import android.app.Instrumentation;
import android.content.Intent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.*;
@RunWith(AndroidJUnit4.class)
public class LocalInterfaceTest {
 private WebView find(View v){if(v instanceof WebView)return (WebView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){WebView w=find(g.getChildAt(i));if(w!=null)return w;}}return null;}
 private String evaluate(Instrumentation inst,MainActivity a,String script) throws Exception {CompletableFuture<String> f=new CompletableFuture<>();inst.runOnMainSync(()->find(a.getWindow().getDecorView()).evaluateJavascript(script,f::complete));return f.get(5,TimeUnit.SECONDS);}
 @Test public void sourceLookupRouting(){
   assertTrue(NexusResearch.shouldLookup("Quais são as notícias de hoje?"));
   assertTrue(NexusResearch.shouldLookup("NEXUS, pesquisa Portugal na internet"));
   assertTrue(NexusResearch.shouldLookup("Explica-me como funciona um motor elétrico"));
   assertFalse(NexusResearch.shouldLookup("Olá"));
   assertFalse(NexusResearch.shouldLookup("Como estás?"));
 }
  @Test public void naturalDeviceAndSearchIntents(){
  assertEquals(NexusIntent.Kind.RESEARCH,NexusIntent.parse("Pesquisa receitas no Google e apresenta resultados").kind);
  assertEquals(NexusIntent.Kind.BROWSER_SEARCH,NexusIntent.parse("Abre o Google e pesquisa receitas").kind);
  assertEquals(NexusIntent.Kind.CALL,NexusIntent.parse("NEXUS, liga ao meu filho").kind);
  assertEquals(NexusIntent.Kind.MESSAGE,NexusIntent.parse("Envia mensagem ao meu filho a dizer que chego às seis").kind);
  assertEquals(NexusIntent.Kind.ALARM,NexusIntent.parse("Desperta-me amanhã às seis").kind);
  assertEquals(NexusIntent.Kind.APP,NexusIntent.parse("NEXUS abre o Facebook").kind);
  assertEquals(2,NexusIntent.splitActions("NEXUS abre o Facebook e depois liga ao meu filho").size());
  assertEquals(1,NexusIntent.splitActions("Quero saber mais sobre trabalho e depois de estudar").size());
 }
  @Test public void optInOperatorGrammar(){
   assertTrue(NexusAccessibilityService.handles("NEXUS, volta atrás"));
   assertTrue(NexusAccessibilityService.handles("NEXUS, desce"));
   assertTrue(NexusAccessibilityService.handles("NEXUS, toca em pesquisar"));
   assertTrue(NexusAccessibilityService.handles("NEXUS, escreve bom dia"));
   assertFalse(NexusAccessibilityService.handles("NEXUS, envia o pagamento"));
 }
  @Test public void handsFreeWakeWordAndAppSwitchingParsing(){
  assertEquals("abre facebook",HandsFreeService.commandAfterWakeWord("NEXUS, abre Facebook"));
  assertEquals("abre whatsapp",HandsFreeService.commandAfterWakeWord("Anexos, abre WhatsApp"));
  assertEquals("muda para instagram",HandsFreeService.commandAfterWakeWord("NEXUS muda para Instagram"));
  assertNull(HandsFreeService.commandAfterWakeWord("Abre o Facebook"));
  assertEquals("facebook",HandsFreeService.requestedApp("abre o meu face"));
  assertEquals("instagram",HandsFreeService.requestedApp("muda para Instagram"));
  assertEquals("whatsapp",HandsFreeService.requestedApp("abre o WhatsApp"));
  assertEquals("facebook",HandsFreeService.requestedApp("como é que se abre o meu face"));
 }
  @Test public void recognizedAppsAndLearningMemory() throws Exception {
  assertEquals("facebook",CommandRouter.appName("o Facebook"));
  assertEquals("facebook",CommandRouter.appName("Face"));
  assertEquals("instagram",CommandRouter.appName("Insta"));
  assertEquals("whatsapp",CommandRouter.appName("WhatsApp"));
  assertEquals("maps",CommandRouter.appName("Google Maps"));
  assertTrue(CommandRouter.knownPackages("instagram").length>0);
  Instrumentation i=InstrumentationRegistry.getInstrumentation();
  MainActivity a=(MainActivity)i.startActivitySync(new Intent(i.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  try{
   i.runOnMainSync(()->{
    a.getSharedPreferences("nexus_learning_v1",0).edit().clear().commit();
    java.util.function.Consumer<String> ignore=s->{};
    assertTrue(LearningManager.handle(a,"NEXUS, vou ensinar-te uma rotina chamada teste",ignore));
    assertTrue(LearningManager.handle(a,"Primeiro abre o Facebook",ignore));
    assertTrue(LearningManager.handle(a,"Depois pesquisa fotografia",ignore));
    assertTrue(LearningManager.handle(a,"guarda a rotina",ignore));
    assertTrue(LearningManager.summary(a).contains("2 passos"));
    a.getSharedPreferences("nexus_learning_v1",0).edit().clear().commit();
   });
  }finally{i.runOnMainSync(a::finishAndRemoveTask);}
 }
 @Test public void interfaceWorksOfflineAndSurvivesReload() throws Exception {
  Instrumentation i=InstrumentationRegistry.getInstrumentation();
  i.getUiAutomation().executeShellCommand("svc wifi disable").close();i.getUiAutomation().executeShellCommand("svc data disable").close();
  System.out.println("NEXUS TEST: network disabled; launching local interface");
  MainActivity a=(MainActivity)i.startActivitySync(new Intent(i.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  try {
   String result="";for(int n=0;n<40;n++){result=evaluate(i,a,"document.querySelector('.avatar')?.naturalWidth>0 && typeof nexusReceiveQuestion==='function'");if("true".equals(result))break;Thread.sleep(250);}assertEquals("Local avatar and JS must work offline","true",result);
   assertEquals("false",evaluate(i,a,"!!document.querySelector('#photoRig')"));
   assertEquals("true",evaluate(i,a,"!!document.querySelector('#nexusVoiceEnergy')"));
   assertEquals("true",evaluate(i,a,"typeof nexusBoot==='function'"));
   assertEquals("true",evaluate(i,a,"!!document.querySelector('#holoTranscript')"));

   System.out.println("NEXUS TEST: local avatar loaded offline");
   assertEquals("\"https://appassets.androidplatform.net\"",evaluate(i,a,"location.origin"));
   assertEquals("true",evaluate(i,a,"typeof NexusNative.listen==='function'"));
   evaluate(i,a,"addCard('Fotografia','Teste local');addCard('Música','Segundo painel');rotate(-1)");
   assertEquals("\"Fotografia\"",evaluate(i,a,"document.querySelector('#panelTopic').textContent"));
   evaluate(i,a,"location.reload()");Thread.sleep(1200);
   assertEquals("true",evaluate(i,a,"document.querySelector('.avatar').naturalWidth>0"));
   evaluate(i,a,"setState('speaking');nexusStopAll()");assertEquals("\"idle\"",evaluate(i,a,"state"));
  } finally {i.runOnMainSync(a::finishAndRemoveTask);}
 }
}
