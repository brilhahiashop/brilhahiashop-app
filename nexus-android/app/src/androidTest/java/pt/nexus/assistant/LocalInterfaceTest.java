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
 @Test public void interfaceWorksOfflineAndSurvivesReload() throws Exception {
  Instrumentation i=InstrumentationRegistry.getInstrumentation();
  i.getUiAutomation().executeShellCommand("svc wifi disable").close();i.getUiAutomation().executeShellCommand("svc data disable").close();
  System.out.println("NEXUS TEST: network disabled; launching local interface");
  MainActivity a=(MainActivity)i.startActivitySync(new Intent(i.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  try {
   String result="";for(int n=0;n<40;n++){result=evaluate(i,a,"document.querySelector('.avatar')?.naturalWidth>0 && typeof nexusReceiveQuestion==='function'");if("true".equals(result))break;Thread.sleep(250);}assertEquals("Local avatar and JS must work offline","true",result);
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
