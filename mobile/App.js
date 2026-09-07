import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const MANAGER_URL = "https://brilhah-ai-manager.vercel.app/";
const SUPABASE_URL = "https://lnezqvonjcvhgaogndqh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bm64tpscRoPyieo2qQqpCQ_BNSX-TcC";
const DEFAULT_EMAIL = "brilhahiashop@gmail.com";

export default function App() {
  const webRef = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendLoginEmail() {
    const target = email.trim().toLowerCase();
    if (!target || !target.includes("@")) {
      Alert.alert("Email inválido", "Confirma o endereço de email.");
      return;
    }
    try {
      setBusy(true);
      const r = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: target,
          create_user: false,
          data: { source: "brilhah_mobile_recovery" },
          gotrue_meta_security: {},
          options: { emailRedirectTo: MANAGER_URL },
        }),
      });
      if (!r.ok) throw new Error("Não foi possível enviar o email.");
      Alert.alert(
        "Email enviado",
        "Enviámos um link de acesso para o teu email. Abre-o no telemóvel e depois volta à APP."
      );
    } catch (e) {
      Alert.alert("Não foi possível enviar", e?.message || "Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  function injectAccountUpdate(payload) {
    const script = `
      (async function(){
        try {
          const keys = Object.keys(localStorage || {});
          const authKey = keys.find(k => k.includes('auth-token'));
          if (!authKey) { window.ReactNativeWebView.postMessage(JSON.stringify({type:'account-update',ok:false,message:'Sessão não encontrada. Entra primeiro na APP.'})); return; }
          const raw = localStorage.getItem(authKey);
          const parsed = JSON.parse(raw || '{}');
          const token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
          if (!token) { window.ReactNativeWebView.postMessage(JSON.stringify({type:'account-update',ok:false,message:'Sessão expirada. Entra novamente.'})); return; }
          const body = ${JSON.stringify(payload)};
          const r = await fetch('${SUPABASE_URL}/auth/v1/user', {
            method:'PUT',
            headers:{
              'apikey':'${SUPABASE_ANON_KEY}',
              'Authorization':'Bearer '+token,
              'Content-Type':'application/json'
            },
            body:JSON.stringify(body)
          });
          const j = await r.json().catch(()=>({}));
          if (!r.ok) throw new Error(j?.msg || j?.message || j?.error_description || 'Não foi possível atualizar.');
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'account-update',ok:true,message:'Dados atualizados com sucesso.'}));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'account-update',ok:false,message:String(e?.message||e)}));
        }
      })(); true;
    `;
    webRef.current?.injectJavaScript(script);
  }

  function changeEmail() {
    const value = newEmail.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      Alert.alert("Email inválido", "Introduz o novo email.");
      return;
    }
    injectAccountUpdate({ email: value });
  }

  function changePassword() {
    if (newPassword.length < 12) {
      Alert.alert("Password curta", "Usa pelo menos 12 caracteres.");
      return;
    }
    injectAccountUpdate({ password: newPassword });
  }

  function onMessage({ nativeEvent }) {
    try {
      const m = JSON.parse(nativeEvent.data || "{}");
      if (m.type === "account-update") {
        Alert.alert(m.ok ? "Concluído" : "Não foi possível", m.message || "");
        if (m.ok) {
          setNewEmail("");
          setNewPassword("");
          setSettingsOpen(false);
        }
      }
    } catch {}
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07101d" />

      <View style={styles.topBar}>
        <Text style={styles.brand}>BRILHAH AI MANAGER</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsOpen(true)}>
          <Text style={styles.settingsBtnText}>⚙ Definições</Text>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>BRILHAH AI Manager</Text>
          <Text style={styles.errorText}>
            Não foi possível ligar ao painel. Verifica a internet e tenta novamente.
          </Text>
          <TouchableOpacity style={styles.primary} onPress={() => setLoadError(false)}>
            <Text style={styles.primaryText}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => setSettingsOpen(true)}>
            <Text style={styles.secondaryText}>Definições de acesso</Text>
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
          onMessage={onMessage}
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

      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Definições de acesso</Text>
              <TouchableOpacity onPress={() => setSettingsOpen(false)}><Text style={styles.close}>✕</Text></TouchableOpacity>
            </View>

            <Text style={styles.label}>Email principal</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.primary} disabled={busy} onPress={sendLoginEmail}>
              <Text style={styles.primaryText}>{busy ? "A enviar…" : "Esqueci a password · Enviar email"}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.note}>As opções abaixo funcionam quando já tens uma sessão iniciada na APP.</Text>

            <Text style={styles.label}>Mudar email</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="novo@email.com"
              placeholderTextColor="#66758b"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.secondary} onPress={changeEmail}>
              <Text style={styles.secondaryText}>Guardar novo email</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Mudar password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nova password"
              placeholderTextColor="#66758b"
              secureTextEntry
            />
            <TouchableOpacity style={styles.secondary} onPress={changePassword}>
              <Text style={styles.secondaryText}>Guardar nova password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07101d" },
  topBar: {
    minHeight: 50,
    backgroundColor: "#07101d",
    borderBottomWidth: 1,
    borderBottomColor: "#243551",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: "#f4f7fb", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  settingsBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#13213a" },
  settingsBtnText: { color: "#f4f7fb", fontSize: 12, fontWeight: "700" },
  webview: { flex: 1, backgroundColor: "#07101d" },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#07101d", alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: "#f4f7fb", fontSize: 14, fontWeight: "600" },
  error: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  errorTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  errorText: { color: "#c7d2e0", fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 16 },
  primary: { marginTop: 12, width: "100%", backgroundColor: "#d8b36b", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: "#17120a", fontWeight: "800", fontSize: 14 },
  secondary: { marginTop: 10, width: "100%", backgroundColor: "#13213a", borderWidth: 1, borderColor: "#2d4264", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  secondaryText: { color: "#f4f7fb", fontWeight: "700", fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.62)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#0b1423", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, borderWidth: 1, borderColor: "#243551" },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  close: { color: "#fff", fontSize: 20, padding: 6 },
  label: { color: "#aeb9ca", fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#07101d", borderWidth: 1, borderColor: "#2d4264", borderRadius: 12, color: "#fff", paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  divider: { height: 1, backgroundColor: "#243551", marginVertical: 18 },
  note: { color: "#8f9db2", fontSize: 12, lineHeight: 18 },
});
