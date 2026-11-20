#!/usr/bin/env python3
"""NEXUS 0.3.1: terminate owned AV and floating controls when closing."""
from pathlib import Path
r = Path(__file__).resolve().parent
src = r / "app/src/main/java/pt/nexus/assistant"
p = src / "MainActivity.java"
s = p.read_text()
def change(old, new):
    global s
    if old not in s:
        raise RuntimeError("Expected MainActivity source missing: "+old[:50])
    s = s.replace(old, new, 1)

change("    private String pendingQuestion;", """    private String pendingQuestion;
    private boolean shuttingDown = false;
    private static final String STOP_MEDIA_JS = "(function(){try{speechSynthesis.cancel()}catch(e){}"+
      "try{if(window.__nexusStopMedia)window.__nexusStopMedia()}catch(e){}"+
      "try{document.querySelectorAll('audio,video').forEach(function(v){v.pause();if(v.srcObject&&v.srcObject.getTracks)v.srcObject.getTracks().forEach(function(t){t.stop()});v.srcObject=null})}catch(e){}"+
      "})();";
    private static final String TRACK_MEDIA_JS = "(function(){if(window.__nexusMediaTracked)return;window.__nexusMediaTracked=true;"+
      "window.__nexusStreams=[];window.__nexusStopMedia=function(){window.__nexusStreams.forEach(function(s){try{s.getTracks().forEach(function(t){t.stop()})}catch(e){}});window.__nexusStreams=[]};"+
      "document.addEventListener('visibilitychange',function(){if(document.hidden)window.__nexusStopMedia()});"+
      "try{if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){var old=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);"+
      "navigator.mediaDevices.getUserMedia=function(c){return old(c).then(function(s){window.__nexusStreams.push(s);return s})}}}catch(e){}"+
      "})();";""")
change("            @Override public void onPageFinished(WebView view,String url){", """            @Override public void onPageFinished(WebView view,String url){
                if (url!=null && url.startsWith("https://nexus-assistente-seguro.vercel.app/")) {
                    try { view.evaluateJavascript(TRACK_MEDIA_JS,null); } catch(Exception ignored){}
                }""")
change('        Button assistant=button("✦  ASSISTENTE");assistant.setOnClickListener(v->chooseAssistant());\n        for(Button b:new Button[]{mic,floatBtn,assistant})', '''        Button browser=button("↗  WEB");browser.setOnClickListener(v->{
            try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(SITE)));}
            catch(Exception e){Toast.makeText(this,"Não foi possível abrir o Chrome.",Toast.LENGTH_SHORT).show();}
        });
        Button exit=button("✕  SAIR");exit.setOnClickListener(v->closeNexus());
        for(Button b:new Button[]{mic,floatBtn,browser,exit})''')
change("    @Override public void onBackPressed(){if(web!=null && web.canGoBack())web.goBack();else super.onBackPressed();}", '''    @Override public void onBackPressed(){
        if(web!=null && web.canGoBack()){web.goBack();return;}
        new AlertDialog.Builder(this).setTitle("Fechar NEXUS?")
            .setMessage("A voz, a câmara e o botão flutuante do NEXUS serão desativados.")
            .setPositiveButton("Sair e desligar",(d,w)->closeNexus())
            .setNegativeButton("Continuar",null).show();
    }''')
change("    @Override protected void onResume(){super.onResume();updateBubbleButton();}\n    @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}", '''    private void stopWebMedia(){
        if(web==null)return;
        try{web.evaluateJavascript(STOP_MEDIA_JS,null);}catch(Exception ignored){}
        try{web.onPause();}catch(Exception ignored){}
    }
    private void closeNexus(){
        if(shuttingDown)return;shuttingDown=true;
        stopWebMedia();
        if(pendingWebPermission!=null){try{pendingWebPermission.deny();}catch(Exception ignored){}pendingWebPermission=null;}
        try{stopService(new Intent(this,BubbleService.class));}catch(Exception ignored){}
        BubbleService.active=false;
        try{if(web!=null){web.stopLoading();web.loadUrl("about:blank");}}catch(Exception ignored){}
        finishAndRemoveTask();
    }
    @Override protected void onPause(){stopWebMedia();super.onPause();}
    @Override protected void onResume(){
        super.onResume();if(web!=null){try{web.onResume();}catch(Exception ignored){}}
        updateBubbleButton();
    }
    @Override protected void onDestroy(){
        stopWebMedia();
        if(!isChangingConfigurations()){
            try{stopService(new Intent(this,BubbleService.class));}catch(Exception ignored){}
            BubbleService.active=false;
        }
        if(web!=null){try{web.destroy();}catch(Exception ignored){}web=null;}
        super.onDestroy();
    }''')
p.write_text(s)

p=src/"BubbleService.java"
s=p.read_text()
assert "return START_STICKY;" in s
s=s.replace("return START_STICKY;", "return START_NOT_STICKY;")
anchor="    @Override public void onDestroy(){active=false;airEnabled=false;"
assert anchor in s
s=s.replace(anchor,'''    @Override public void onTaskRemoved(Intent rootIntent){
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }
'''+anchor)
p.write_text(s)
p=r/"app/src/main/AndroidManifest.xml"
s=p.read_text()
old='<service android:name=".BubbleService" android:exported="false"'
assert old in s
p.write_text(s.replace(old,old+' android:stopWithTask="true"'))
p=r/"app/build.gradle"
s=p.read_text()
assert "versionCode 3" in s and "versionName '0.3.0'" in s
p.write_text(s.replace("versionCode 3","versionCode 4").replace("versionName '0.3.0'","versionName '0.3.1'"))
print("Privacy close patch successful")
