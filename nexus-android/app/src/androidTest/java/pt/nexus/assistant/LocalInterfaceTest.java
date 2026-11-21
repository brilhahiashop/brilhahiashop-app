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

/** Device tests exercise the full local UI and learning flow without repeated costly WebView launches. */
@RunWith(AndroidJUnit4.class)
public class LocalInterfaceTest {
 private WebView find(View v){
  if(v instanceof WebView)return (WebView)v;
  if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int k=0;k<g.getChildCount();k++){WebView child=find(g.getChildAt(k));if(child!=null)return child;}}
  return null;
 }
 private String evaluate(Instrumentation inst,MainActivity a,String script) throws Exception {
  CompletableFuture<String> f=new CompletableFuture<>();
  inst.runOnMainSync(()->{
   WebView w=find(a.getWindow().getDecorView());
   if(w==null){f.completeExceptionally(new IllegalStateException("NEXUS WebView missing"));return;}
   w.evaluateJavascript(script,f::complete);
  });
  return f.get(8,TimeUnit.SECONDS);
 }
 private void assertWebReady(Instrumentation inst,MainActivity a) throws Exception {
  String check="document.readyState==='complete' && document.querySelector('.avatar')?.naturalWidth>0 && typeof nexusReceiveQuestion==='function' && typeof nexusBoot==='function' && !!document.querySelector('#nexusVoiceEnergy') && !!document.querySelector('#holoTranscript')";
  String result="false";
  for(int attempt=0;attempt<70;attempt++){
   result=evaluate(inst,a,check);
   if("true".equals(result))return;
   Thread.sleep(250);
  }
  fail("NEXUS local page, scripts, speech indicators and avatar did not become ready; last result="+result);
 }
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
 @Test public void recognizedAppsAndLearningMemory(){
  assertEquals("facebook",CommandRouter.appName("o Facebook"));
  assertEquals("facebook",CommandRouter.appName("Face"));
  assertEquals("instagram",CommandRouter.appName("Insta"));
  assertEquals("whatsapp",CommandRouter.appName("WhatsApp"));
  assertEquals("maps",CommandRouter.appName("Google Maps"));
  assertTrue(CommandRouter.knownPackages("instagram").length>0);
  // Persistence and teaching are exercised below in the same Activity as the UI,
  // avoiding a second heavyweight WebView + TTS launch on small emulators.
 }
 @Test public void interfaceWorksOfflineAndSurvivesReload() throws Exception {
  Instrumentation inst=InstrumentationRegistry.getInstrumentation();
  MainActivity app=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  try {
   assertWebReady(inst,app);
   assertEquals("false",evaluate(inst,app,"!!document.querySelector('#photoRig')"));
   assertEquals("true",evaluate(inst,app,"typeof NexusNative.listen==='function'"));
   assertEquals("\"https://appassets.androidplatform.net\"",evaluate(inst,app,"location.origin"));
   evaluate(inst,app,"addCard('Fotografia','Teste local');addCard('Música','Segundo painel');rotate(-1)");
   assertEquals("\"Fotografia\"",evaluate(inst,app,"document.querySelector('#panelTopic').textContent"));
   // Verify local procedural memory while the same foreground Activity is alive.
   inst.runOnMainSync(()->{
    app.getSharedPreferences("nexus_learning_v1",0).edit().clear().commit();
    java.util.function.Consumer<String> output=s->{};
    assertTrue(LearningManager.handle(app,"NEXUS, vou ensinar-te uma rotina chamada teste",output));
    assertTrue(LearningManager.handle(app,"Primeiro abre o Facebook",output));
    assertTrue(LearningManager.handle(app,"Depois pesquisa fotografia",output));
    assertTrue(LearningManager.handle(app,"guarda a rotina",output));
    assertTrue(LearningManager.summary(app).contains("2 passos"));
    app.getSharedPreferences("nexus_learning_v1",0).edit().clear().commit();
   });
   evaluate(inst,app,"location.reload()");
   assertWebReady(inst,app);
   assertEquals("true",evaluate(inst,app,"!!document.querySelector('#nexusVoiceEnergy')"));
   evaluate(inst,app,"setState('speaking');nexusStopAll()");
   assertEquals("\"idle\"",evaluate(inst,app,"state"));
  } finally {
    inst.runOnMainSync(app::finish);
  }
 }
}
