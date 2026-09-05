import React, { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const MANAGER_URL = "https://brilhah-ai-manager.vercel.app/";

export default function App() {
  const [loadError, setLoadError] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07101d" />

      {loadError ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>BRILHAH AI Manager</Text>
          <Text style={styles.errorText}>
            Não foi possível ligar ao painel de produção. Verifica a ligação à
            internet e volta a abrir a aplicação.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ uri: MANAGER_URL }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>
                A ligar ao BRILHAH AI Manager…
              </Text>
            </View>
          )}
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
  container: {
    flex: 1,
    backgroundColor: "#07101d",
  },
  webview: {
    flex: 1,
    backgroundColor: "#07101d",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#07101d",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    color: "#f4f7fb",
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    flex: 1,
    backgroundColor: "#07101d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
  },
  errorText: {
    color: "#c7d2e0",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
