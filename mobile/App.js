import "react-native-url-polyfill/auto";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { WebView } from "react-native-webview";
import { SOCIAL_UI } from "./social-ai";

const MANAGER_URL = "https://brilhah-ai-manager.vercel.app/";
const SUPABASE_URL = "https://lnezqvonjcvhgaogndqh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bm64tpscRoPyieo2qQqpCQ_BNSX-TcC";
const ADMIN_EMAIL = "brilhahiashop+admin@gmail.com";
const APP_AUTH_REDIRECT = "brilhah://auth/callback";

const nativeSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "implicit",
  },
});

const BRILHAH_UI = `
(function(){
  if (window.__brilhahMobileUiV4) return true;
  window.__brilhahMobileUiV4 = true;
  var SB_URL='${SUPABASE_URL}';
  var SB_KEY='${SUPABASE_ANON_KEY}';
  var REDIRECT='${MANAGER_URL}';
${SOCIAL_UI}

  function ensureCss(){
    if(document.getElementById('brilhah-mobile-css')) return;
    var s=document.createElement('style');
    s.id='brilhah-mobile-css';
    s.textContent='.br-mobile-link{display:block;width:100%;margin-top:12px;border:0;background:transparent;color:#d7b56d;font-weight:700;font-size:14px;text-align:center;padding:10px;cursor:pointer}'+
      '.br-modal{position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:18px}'+
      '.br-card{width:min(430px,100%);background:#0b1423;border:1px solid #2a3b58;border-radius:20px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.5);color:#fff}'+
      '.br-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.br-head h3{margin:0;font-size:20px}.br-x{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}'+
      '.br-label{display:block;color:#aeb9ca;font-size:12px;margin:10px 0 6px}.br-input{box-sizing:border-box;width:100%;border:1px solid #2d4264;border-radius:12px;background:#07101d;color:#fff;padding:12px;font-size:15px}'+
      '.br-primary,.br-secondary{box-sizing:border-box;width:100%;margin-top:12px;border-radius:12px;padding:13px;font-weight:800;font-size:14px;cursor:pointer}.br-primary{border:0;background:#d8b36b;color:#17120a}.br-secondary{background:#13213a;color:#fff;border:1px solid #2d4264}'+
      '.br-msg{margin-top:10px;font-size:13px;line-height:1.45}.br-ok{color:#98d6ad}.br-err{color:#ffb3b3}.br-note{color:#8f9db2;font-size:12px;line-height:1.5;margin-top:10px}.br-sep{height:1px;background:#243551;margin:18px 0}#br-settings-nav{margin-top:6px}';
    document.head.appendChild(s);
  }

  function openModal(title, bodyHtml){
    var old=document.getElementById('br-mobile-modal'); if(old) old.remove();
    var w=document.createElement('div'); w.id='br-mobile-modal'; w.className='br-modal';
    w.innerHTML='<div class="br-card"><div class="br-head"><h3>'+title+'</h3><button class="br-x" id="br-close" type="button">✕</button></div>'+bodyHtml+'</div>';
    document.body.appendChild(w);
    document.getElementById('br-close').onclick=function(){w.remove();};
    w.addEventListener('click',function(e){if(e.target===w)w.remove();});
    return w;
  }

  function showRecovery(){
    openModal('Recuperar palavra-passe','<label class="br-label">Email</label><input id="br-rec-email" class="br-input" type="email" autocomplete="email" placeholder="o teu email"><button id="br-rec-send" class="br-primary" type="button">Enviar email de recuperação</button><div id="br-rec-msg" class="br-msg"></div><div class="br-note">Receberás um email seguro para recuperar o acesso. A BRILHAH nunca pede a tua palavra-passe por email.</div>');
    var emailInput=document.querySelector('input[type=email]');
    document.getElementById('br-rec-email').value=(emailInput&&emailInput.value)||'brilhahiashop+admin@gmail.com';
    document.getElementById('br-rec-send').onclick=async function(){
      var email=document.getElementById('br-rec-email').value.trim().toLowerCase();
      var msg=document.getElementById('br-rec-msg');
      if(!email||email.indexOf('@')<1){msg.className='br-msg br-err';msg.textContent='Confirma o email.';return;}
      var b=document.getElementById('br-rec-send'); b.disabled=true; b.textContent='A enviar…';
      try{
        var r=await fetch(SB_URL+'/auth/v1/recover?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:email})});
        if(!r.ok){var j=await r.json().catch(function(){return {};});throw new Error(j.msg||j.message||'Não foi possível enviar o email.');}
        msg.className='br-msg br-ok';msg.textContent='Email enviado. Verifica a caixa de entrada e o spam.';
      }catch(e){msg.className='br-msg br-err';msg.textContent=String(e.message||e);}finally{b.disabled=false;b.textContent='Enviar email de recuperação';}
    };
  }

  function authToken(){
    try{
      var keys=Object.keys(localStorage||{}); var k=keys.find(function(x){return x.indexOf('auth-token')>=0;});
      if(!k)return null; var p=JSON.parse(localStorage.getItem(k)||'{}');
      return p.access_token||(p.currentSession&&p.currentSession.access_token)||(p.session&&p.session.access_token)||null;
    }catch(e){return null;}
  }

  function showSettings(){
    openModal('Definições da conta','<label class="br-label">Novo email</label><input id="br-new-email" class="br-input" type="email" autocomplete="email"><button id="br-save-email" class="br-secondary" type="button">Guardar novo email</button><div class="br-sep"></div><label class="br-label">Nova palavra-passe</label><input id="br-new-pass" class="br-input" type="password" autocomplete="new-password" placeholder="mínimo 12 caracteres"><button id="br-save-pass" class="br-secondary" type="button">Guardar nova palavra-passe</button><div id="br-set-msg" class="br-msg"></div><div class="br-note">As alterações exigem uma sessão iniciada. Uma mudança de email pode requerer confirmação por email.</div>');
    async function updateAccount(payload){
      var msg=document.getElementById('br-set-msg'); var token=authToken();
      if(!token){msg.className='br-msg br-err';msg.textContent='Sessão expirada. Entra novamente.';return;}
      try{
        var r=await fetch(SB_URL+'/auth/v1/user',{method:'PUT',headers:{apikey:SB_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        var j=await r.json().catch(function(){return {};}); if(!r.ok)throw new Error(j.msg||j.message||j.error_description||'Não foi possível atualizar.');
        msg.className='br-msg br-ok';msg.textContent='Alteração guardada com sucesso.';
      }catch(e){msg.className='br-msg br-err';msg.textContent=String(e.message||e);}
    }
    document.getElementById('br-save-email').onclick=function(){var v=document.getElementById('br-new-email').value.trim().toLowerCase();var m=document.getElementById('br-set-msg');if(!v||v.indexOf('@')<1){m.className='br-msg br-err';m.textContent='Introduz um email válido.';return;}updateAccount({email:v});};
    document.getElementById('br-save-pass').onclick=function(){var v=document.getElementById('br-new-pass').value;var m=document.getElementById('br-set-msg');if(v.length<12){m.className='br-msg br-err';m.textContent='Usa pelo menos 12 caracteres.';return;}updateAccount({password:v});};
  }

  function loggedIn(){
    var app=document.getElementById('app');
    return !!(app&&!app.classList.contains('hidden'));
  }

  function addRecovery(){
    if(loggedIn()) return;
    var auth=document.getElementById('auth'); if(!auth||document.getElementById('br-recover-btn')) return;
    var btn=document.createElement('button'); btn.id='br-recover-btn'; btn.className='br-mobile-link'; btn.type='button'; btn.textContent='Recuperar palavra-passe'; btn.onclick=showRecovery;
    var form=auth.querySelector('form')||auth.querySelector('.card')||auth; form.appendChild(btn);
  }

  function addSettings(){
    var old=document.getElementById('br-settings-nav');
    if(!loggedIn()){if(old)old.remove();return;}
    if(old)return;
    var side=document.getElementById('side')||document.querySelector('aside'); if(!side)return;
    var btn=document.createElement('button'); btn.id='br-settings-nav'; btn.className='nav'; btn.type='button'; btn.innerHTML='<span class="ico">⚙</span>Definições'; btn.onclick=showSettings; side.appendChild(btn);
  }

  function tick(){ensureCss();addRecovery();addSettings();addSocial();}
  tick(); setInterval(tick,900);
})(); true;
`;

export default function App() {
  const webRef = useRef(null);
  const sessionRetryTimer = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const [authStage, setAuthStage] = useState("loading");
  const [authMessage, setAuthMessage] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [managerSession, setManagerSession] = useState(null);

  const checkAdminAndMfa = async (session) => {
    const email = String(session?.user?.email || "").toLowerCase();
    if (!session || email !== ADMIN_EMAIL) {
      await nativeSupabase.auth.signOut().catch(() => {});
      throw new Error("Esta não é a conta administrativa BRILHAH.");
    }

    const aal = await nativeSupabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.error) throw aal.error;

    setManagerSession(session);
    if (aal.data?.currentLevel === "aal2") {
      setAuthMessage("");
      setAuthStage("app");
      return;
    }

    const factors = await nativeSupabase.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const verified = (factors.data?.totp || []).find((x) => x.status === "verified");
    if (!verified) throw new Error("Não encontrei o MFA antigo BRILHAH.");

    setAuthMessage("");
    setAuthStage("mfa");
  };

  const restoreNativeSession = async () => {
    try {
      const { data, error } = await nativeSupabase.auth.getSession();
      if (error) throw error;
      if (!data?.session) {
        setAuthStage("email");
        return;
      }
      await checkAdminAndMfa(data.session);
    } catch (e) {
      setAuthMessage(String(e?.message || e));
      setAuthStage("email");
    }
  };

  const processAuthCallback = async (url) => {
    const value = String(url || "");
    if (!value.startsWith(APP_AUTH_REDIRECT)) return;
    try {
      setBusy(true);
      setAuthMessage("A confirmar o acesso…");

      const u = new URL(value);
      const hp = new URLSearchParams((u.hash || "").replace(/^#/, ""));
      const qp = u.searchParams;
      const err =
        qp.get("error_description") ||
        qp.get("error") ||
        hp.get("error_description") ||
        hp.get("error");
      if (err) throw new Error(decodeURIComponent(err));

      const accessToken = qp.get("access_token") || hp.get("access_token");
      const refreshToken = qp.get("refresh_token") || hp.get("refresh_token");

      if (!accessToken || !refreshToken) {
        throw new Error("O email abriu a APP sem uma sessão válida. Pede um novo link.");
      }

      const { data, error } = await nativeSupabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      if (!data?.session) throw new Error("Não foi possível criar a sessão BRILHAH.");

      await checkAdminAndMfa(data.session);
    } catch (e) {
      setAuthMessage(String(e?.message || e));
      setAuthStage("email");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    restoreNativeSession();

    Linking.getInitialURL()
      .then((url) => {
        if (url) processAuthCallback(url);
      })
      .catch(() => {});

    const sub = Linking.addEventListener("url", ({ url }) => processAuthCallback(url));
    return () => {
      sub.remove();
      if (sessionRetryTimer.current) clearTimeout(sessionRetryTimer.current);
    };
  }, []);

  const sendAccessEmail = async () => {
    try {
      setBusy(true);
      setAuthMessage("A enviar email de acesso…");

      const response = await fetch(
        SUPABASE_URL +
          "/auth/v1/recover?redirect_to=" +
          encodeURIComponent(APP_AUTH_REDIRECT),
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: ADMIN_EMAIL }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.msg ||
            payload?.message ||
            payload?.error_description ||
            "Não foi possível enviar o email."
        );
      }

      setAuthMessage(
        "Email enviado. Abre apenas o «Reset Your Password» mais recente e toca em Reset Password. O link abre diretamente esta APP; não vais definir nenhuma password."
      );
    } catch (e) {
      const msg = String(e?.message || e);
      setAuthMessage(
        msg.toLowerCase().includes("rate limit")
          ? "Limite temporário de emails atingido. Aguarda alguns minutos e tenta novamente."
          : msg
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyMfa = async () => {
    try {
      setBusy(true);
      setAuthMessage("A confirmar MFA…");
      const code = String(mfaCode || "").replace(/\D/g, "").slice(0, 6);
      if (code.length !== 6) throw new Error("Introduz os 6 dígitos do Authenticator BRILHAH.");

      const factors = await nativeSupabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const factor = (factors.data?.totp || []).find((x) => x.status === "verified");
      if (!factor) throw new Error("Não encontrei o MFA antigo BRILHAH.");

      const challenge = await nativeSupabase.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw challenge.error;

      const verified = await nativeSupabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code,
      });
      if (verified.error) throw verified.error;

      const aal = await nativeSupabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal.error) throw aal.error;
      if (aal.data?.currentLevel !== "aal2") {
        throw new Error("O MFA não ficou confirmado. Usa o código atual e tenta novamente.");
      }

      const current = await nativeSupabase.auth.getSession();
      if (current.error || !current.data?.session) {
        throw current.error || new Error("Sessão inválida depois do MFA.");
      }

      setManagerSession(current.data.session);
      setMfaCode("");
      setAuthMessage("");
      setAuthStage("app");
    } catch (e) {
      setAuthMessage(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const injectManagerSession = () => {
    const at = managerSession?.access_token;
    const rt = managerSession?.refresh_token;
    if (!at || !rt || !webRef.current) return;

    const callback =
      APP_AUTH_REDIRECT +
      "?access_token=" +
      encodeURIComponent(at) +
      "&refresh_token=" +
      encodeURIComponent(rt);
    const encoded = JSON.stringify(callback);

    const deliver =
      `(function(){try{if(window.__brilhahFinishGoogleOAuth){window.__brilhahFinishGoogleOAuth(${encoded});return "ok";}}catch(e){}return "retry";})();true;`;

    webRef.current.injectJavaScript(deliver);
    if (sessionRetryTimer.current) clearTimeout(sessionRetryTimer.current);
    sessionRetryTimer.current = setTimeout(() => {
      webRef.current?.injectJavaScript(deliver);
    }, 700);
    setTimeout(() => webRef.current?.injectJavaScript(deliver), 1600);
  };

  const handleWebMessage = async ({ nativeEvent }) => {
    try {
      const msg = JSON.parse(nativeEvent.data || "{}");
      if (msg?.type !== "open-external") return;
      const url = String(msg.url || "");
      const allowed =
        url.startsWith("https://account.buffer.com/") ||
        url.startsWith("https://publish.buffer.com/");
      if (!allowed) return;
      await Linking.openURL(url);
    } catch {}
  };

  if (authStage !== "app") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#07101d" />
        <View style={styles.authWrap}>
          <View style={styles.authCard}>
            <Text style={styles.authBrand}>BRILHAH AI MANAGER</Text>
            <Text style={styles.authTitle}>
              {authStage === "mfa" ? "Confirmar MFA" : "Acesso privado"}
            </Text>
            <Text style={styles.authSub}>
              {authStage === "mfa"
                ? "Introduz o código atual do teu Authenticator BRILHAH."
                : "Email BRILHAH + código MFA. Sem palavra-passe."}
            </Text>

            {authStage === "loading" ? (
              <View style={styles.authLoading}>
                <ActivityIndicator size="large" />
                <Text style={styles.authHint}>A verificar sessão…</Text>
              </View>
            ) : authStage === "mfa" ? (
              <>
                <Text style={styles.authLabel}>Código MFA</Text>
                <TextInput
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  placeholderTextColor="#64748b"
                  style={styles.authInput}
                />
                <TouchableOpacity
                  style={[styles.authPrimary, busy && styles.authDisabled]}
                  onPress={verifyMfa}
                  disabled={busy}
                >
                  <Text style={styles.authPrimaryText}>
                    {busy ? "A confirmar…" : "Entrar"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.authLabel}>Email</Text>
                <View style={styles.authEmailBox}>
                  <Text style={styles.authEmail}>{ADMIN_EMAIL}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.authPrimary, busy && styles.authDisabled]}
                  onPress={sendAccessEmail}
                  disabled={busy}
                >
                  <Text style={styles.authPrimaryText}>
                    {busy ? "A enviar…" : "Enviar email de acesso"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {!!authMessage && (
              <Text style={styles.authMessage}>{authMessage}</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07101d" />
      {loadError ? (
        <View style={styles.error}>
          <Image source={require("./assets/logo.png")} style={styles.brandLogo} resizeMode="contain" />
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
              <Image source={require("./assets/logo.png")} style={styles.brandLogo} resizeMode="contain" />
              <Text style={styles.loadingText}>A ligar ao BRILHAH AI Manager…</Text>
            </View>
          )}
          injectedJavaScript={BRILHAH_UI}
          onLoadEnd={() => {
            webRef.current?.injectJavaScript(BRILHAH_UI);
            setTimeout(injectManagerSession, 250);
          }}
          onMessage={handleWebMessage}
          onShouldStartLoadWithRequest={() => true}
          onError={() => setLoadError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500) setLoadError(true);
          }}
          userAgent="BRILHAH-AI-Manager/1.0.12"
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
  authWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  authCard: { width: "100%", maxWidth: 460, backgroundColor: "#0f1a2d", borderWidth: 1, borderColor: "#2a3b58", borderRadius: 24, padding: 24 },
  authBrand: { color: "#57d3d1", fontSize: 12, fontWeight: "900", letterSpacing: 2.1 },
  authTitle: { color: "#f8fafc", fontSize: 34, fontWeight: "800", marginTop: 18 },
  authSub: { color: "#94a3b8", fontSize: 16, lineHeight: 24, marginTop: 12, marginBottom: 18 },
  authLabel: { color: "#94a3b8", fontSize: 13, marginBottom: 7, marginTop: 6 },
  authEmailBox: { borderWidth: 1, borderColor: "#2a3b58", backgroundColor: "#07101d", borderRadius: 13, paddingVertical: 15, paddingHorizontal: 14 },
  authEmail: { color: "#fff", fontSize: 16 },
  authInput: { borderWidth: 1, borderColor: "#2a3b58", backgroundColor: "#07101d", color: "#fff", borderRadius: 13, paddingVertical: 14, paddingHorizontal: 14, fontSize: 24, letterSpacing: 8, textAlign: "center" },
  authPrimary: { marginTop: 16, backgroundColor: "#5d6dff", borderRadius: 13, paddingVertical: 15, alignItems: "center" },
  authDisabled: { opacity: 0.55 },
  authPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  authMessage: { color: "#cbd5e1", fontSize: 13, lineHeight: 19, marginTop: 14 },
  authLoading: { alignItems: "center", paddingVertical: 22, gap: 12 },
  authHint: { color: "#94a3b8", fontSize: 13 },
  webview: { flex: 1, backgroundColor: "#07101d" },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#07101d", alignItems: "center", justifyContent: "center", gap: 14 },
  brandLogo: { width: 168, height: 168, marginBottom: 6 },
  loadingText: { color: "#f4f7fb", fontSize: 14, fontWeight: "600" },
  error: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  errorTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  errorText: { color: "#c7d2e0", fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 16 },
  primary: { marginTop: 12, width: "100%", backgroundColor: "#d8b36b", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: "#17120a", fontWeight: "800", fontSize: 14 },
});
