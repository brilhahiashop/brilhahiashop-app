import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const MANAGER_URL = "https://brilhah-ai-manager.vercel.app/";
const SUPABASE_URL = "https://lnezqvonjcvhgaogndqh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bm64tpscRoPyieo2qQqpCQ_BNSX-TcC";

const BRILHAH_UI = `
(function(){
  if (window.__brilhahMobileUiV3) return true;
  window.__brilhahMobileUiV3 = true;

  const SB_URL='${SUPABASE_URL}';
  const SB_KEY='${SUPABASE_ANON_KEY}';
  const REDIRECT='${MANAGER_URL}';

  function css(){
    if(document.getElementById('brilhah-mobile-css')) return;
    const s=document.createElement('style');
    s.id='brilhah-mobile-css';
    s.textContent=`
      .br-mobile-link{display:block;width:100%;margin-top:12px;border:0;background:transparent;color:#d7b56d;font-weight:700;font-size:14px;text-align:center;padding:10px;cursor:pointer}
      .br-modal{position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:18px}
      .br-card{width:min(430px,100%);background:#0b1423;border:1px solid #2a3b58;border-radius:20px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.5);color:#fff}
      .br-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.br-head h3{margin:0;font-size:20px}.br-x{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
      .br-label{display:block;color:#aeb9ca;font-size:12px;margin:10px 0 6px}.br-input{box-sizing:border-box;width:100%;border:1px solid #2d4264;border-radius:12px;background:#07101d;color:#fff;padding:12px;font-size:15px}
      .br-primary,.br-secondary{box-sizing:border-box;width:100%;margin-top:12px;border-radius:12px;padding:13px;border:0;font-weight:800;font-size:14px;cursor:pointer}.br-primary{background:#d8b36b;color:#17120a}.br-secondary{background:#13213a;color:#fff;border:1px solid #2d4264}
      .br-msg{margin-top:10px;font-size:13px;line-height:1.45}.br-ok{color:#98d6ad}.br-err{color:#ffb3b3}.br-note{color:#8f9db2;font-size:12px;line-height:1.5;margin-top:10px}.br-sep{height:1px;background:#243551;margin:18px 0}
      #br-settings-nav{margin-top:6px}
    `;
    document.head.appendChild(s);
  }

  function modal(title, bodyHtml){
    const old=document.getElementById('br-mobile-modal'); if(old) old.remove();
    const w=document.createElement('div'); w.id='br-mobile-modal'; w.className='br-modal';
    w.innerHTML='<div class="br-card"><div class="br-head"><h3>'+title+'</h3><button class="br-x" id="br-close">✕</button></div>'+bodyHtml+'</div>';
    document.body.appendChild(w);
    document.getElementById('br-close').onclick=()=>w.remove();
    w.addEventListener('click',e=>{if(e.target===w)w.remove();});
    return w;
  }

  function showRecovery(){
    const w=modal('Recuperar palavra-passe',
      '<label class="br-label">Email</label><input id="br-rec-email" class="br-input" type="email" autocomplete="email" placeholder="o teu email">'+
      '<button id="br-rec-send" class="br-primary">Enviar email de recuperação</button><div id="br-rec-msg" class="br-msg"></div>'+
      '<div class="br-note">Receberás um email seguro para recuperar o acesso. A BRILHAH nunca pede a tua palavra-passe por email.</div>'
    );
    const known=(document.querySelector('input[type=email]')||{}).value||'brilhahiashop@gmail.com';
    document.getElementById('br-rec-email').value=known;
    document.getElementById('br-rec-send').onclick=async()=>{
      const email=document.getElementById('br-rec-email').value.trim().toLowerCase();
      const msg=document.getElementById('br-rec-msg');
      if(!email||!email.includes('@')){msg.className='br-msg br-err';msg.textContent='Confirma o email.';return;}
      const b=document.getElementById('br-rec-send'); b.disabled=true; b.textContent='A enviar…';
      try{
        const r=await fetch(SB_URL+'/auth/v1/recover?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email})});
        if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.msg||j.message||'Não foi possível enviar o email.');}
        msg.className='br-msg br-ok';msg.textContent='Email enviado. Verifica a caixa de entrada e o spam.';
      }catch(e){msg.className='br-msg br-err';msg.textContent=String(e.message||e);}finally{b.disabled=false;b.textContent='Enviar email de recuperação';}
    };
  }

  function authToken(){
    try{
      const k=Object.keys(localStorage).find(x=>x.includes('auth-token'));
      if(!k)return null; const p=JSON.parse(localStorage.getItem(k)||'{}'); return p.access_token||p.currentSession?.access_token||p.session?.access_token||null;
    }catch(e){return null;}
  }

  function showSettings(){
    const w=modal('Definições da conta',
      '<label class="br-label">Novo email</label><input id="br-new-email" class="br-input" type="email" autocomplete="email">'+
      '<button id="br-save-email" class="br-secondary">Guardar novo email</button><div class="br-sep"></div>'+
      '<label class="br-label">Nova palavra-passe</label><input id="br-new-pass" class="br-input" type="password" autocomplete="new-password" placeholder="mínimo 12 caracteres">'+
      '<button id="br-save-pass" class="br-secondary">Guardar nova palavra-passe</button><div id="br-set-msg" class="br-msg"></div>'+
      '<div class="br-note">As alterações exigem uma sessão iniciada. Uma mudança de email pode requerer confirmação por email.</div>'
    );
    async function update(payload){
      const msg=document.getElementById('br-set-msg'); const token=authToken();
      if(!token){msg.className='br-msg br-err';msg.textContent='Sessão expirada. Entra novamente.';return;}
      try{
        const r=await fetch(SB_URL+'/auth/v1/user',{method:'PUT',headers:{apikey:SB_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const j=await r.json().catch(()=>({})); if(!r.ok)throw new Error(j.msg||j.message||j.error_description||'Não foi possível atualizar.');
        msg.className='br-msg br-ok';msg.textContent='Alteração guardada com sucesso.';
      }catch(e){msg.className='br-msg br-err';msg.textContent=String(e.message||e);}
    }
    document.getElementById('br-save-email').onclick=()=>{const v=document.getElementById('br-new-email').value.trim().toLowerCase();if(!v||!v.includes('@')){const m=document.getElementById('br-set-msg');m.className='br-msg br-err';m.textContent='Introduz um email válido.';return;}update({email:v});};
    document.getElementById('br-save-pass').onclick=()=>{const v=document.getElementById('br-new-pass').value;if(v.length<12){const m=document.getElementById('br-set-msg');m.className='br-msg br-err';m.textContent='Usa pelo menos 12 caracteres.';return;}update({password:v});};
  }

  function isLogged(){
    const app=document.getElementById('app');
    return !!(app && !app.classList.contains('hidden'));
  }

  function addRecovery(){
    if(isLogged()) return;
    const auth=document.getElementById('auth'); if(!auth) return;
    if(document.getElementById('br-recover-btn')) return;
    const btn=document.createElement('button');btn.id='br-recover-btn';btn.className='br-mobile-link';btn.type='button';btn.textContent='Recuperar palavra-passe';btn.onclick=showRecovery;
    const form=auth.querySelector('form')||auth.querySelector('.card')||auth; form.appendChild(btn);
  }

  function addSettings(){
    if(!isLogged()) { const old=document.getElementById('br-settings-nav'); if(old)old.remove(); return; }
    if(document.getElementById('br-settings-nav')) return;
    const side=document.getElementById('side')||document.querySelector('aside'); if(!side)return;
    const btn=document.createElement('button');btn.id='br-settings-nav';btn.className='nav';btn.type='button';btn.innerHTML='<span class="ico">⚙</span>Definições';btn.onclick=showSettings;
    side.appendChild(btn);
  }

  function tick(){css();addRecovery();addSettings();}
  tick(); setInterval(tick,900);
})(); true;
`;

export default function App() {
  const webRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07101d" />
      {loadError ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>BRILHAH AI Manager</Text>
          <Text style={styles.errorText}>Não foi possível ligar ao painel de produção.</Text>
          <TouchableOpacity style={styles.primary} onPress={() => setLoadError(false)}>
            <Text style={styles.primaryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: MANAGER_URL }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>A ligar ao BRILHAH AI Manager…</Text>
            </View>
          )}
          injectedJavaScript={BRILHAH_UI}
          onLoadEnd={() => webRef.current?.injectJavaScript(BRILHAH_UI)}
          onError={() => setLoadError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500) setLoadError(true);
          }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07101d" },
  webview: { flex: 1, backgroundColor: "#07101d" },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#07101d", alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: "#f4f7fb", fontSize: 14, fontWeight: "600" },
  error: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  errorTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  errorText: { color: "#c7d2e0", fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 16 },
  primary: { marginTop: 12, width: "100%", backgroundColor: "#d8b36b", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: "#17120a", fontWeight: "800", fontSize: 14 },
});
