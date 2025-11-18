import { apiPost, apiGet } from "./services/api";
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Image source={require('./assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>BRILHAH IA SHOP</Text>
      <Text style={styles.subtitle}>Autopilot E‑Commerce (demo)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 220, height: 220, resizeMode: 'contain' },
  title: { color: '#00e5ff', fontSize: 28, marginTop: 20, fontWeight: '700' },
  subtitle: { color: '#a7f0ff', marginTop: 8 }
});
