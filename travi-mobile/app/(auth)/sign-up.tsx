import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert("Missing fields", "Email and password are required.");
    if (password.length < 6) return Alert.alert("Weak password", "Password must be at least 6 characters.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() || email.split("@")[0] } },
    });
    setLoading(false);
    if (error) Alert.alert("Sign Up Failed", error.message);
    else {
      Alert.alert(
        "Check your email ✈️",
        "We sent you a confirmation link. Open it and come back to sign in.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
      );
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient colors={["#050d1a", "#0f1729", "#111c35"]} style={styles.bg}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoRow}>
            <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.logoBox}>
              <Ionicons name="map" size={20} color="#0f1729" />
            </LinearGradient>
            <Text style={styles.logoText}>
              travi<Text style={{ color: "#c9a84c" }}>.</Text>
            </Text>
          </View>

          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.sub}>Start logging your journeys for free</Text>

          <View style={styles.card}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Rei Ravelo"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="At least 6 characters"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.primaryBtnGrad}>
                {loading
                  ? <ActivityIndicator color="#0f1729" />
                  : <Text style={styles.primaryBtnText}>Create Account →</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>already have an account?</Text>
              <View style={styles.divLine} />
            </View>

            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, paddingTop: 60 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36 },
  logoBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heading: { fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 6, alignSelf: "flex-start" },
  sub: { fontSize: 15, color: "rgba(255,255,255,0.45)", marginBottom: 28, alignSelf: "flex-start" },
  card: {
    width: "100%", borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 24,
  },
  label: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16, paddingVertical: 13,
    color: "#fff", fontSize: 15, marginBottom: 4,
  },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 10 },
  primaryBtn: { marginTop: 20, borderRadius: 14, overflow: "hidden" },
  primaryBtnGrad: { paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#0f1729" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  divText: { color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: "500" },
  secondaryBtn: {
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  secondaryBtnText: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: "600" },
});
