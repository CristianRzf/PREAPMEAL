import { auth } from "../../config/firebase";
import { router } from "expo-router";
import { sendEmailVerification } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const appState = useRef(AppState.currentState);

  // 🔄 Detectar cuando el usuario vuelve a la app (PRO)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        await auth.currentUser?.reload();

        if (auth.currentUser?.emailVerified) {
          alert("Correo verificado automáticamente ✅");
          router.replace("./(tabs)/index");
        }
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  // ⏱️ Cooldown del botón reenviar
  useEffect(() => {
    if (resendCooldown === 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleReload = async () => {
    setLoading(true);

    await auth.currentUser?.reload();

    if (auth.currentUser?.emailVerified) {
      alert("Correo verificado ✅");
      router.replace("./(tabs)/index");
    } else {
      alert("Aún no has verificado tu correo ❌");
    }

    setLoading(false);
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;

    try {
      await sendEmailVerification(auth.currentUser);
      alert("Correo reenviado 📩");

      setResendCooldown(30); // ⏱️ 30 segundos
    } catch (error: any) {
      alert("Error al reenviar: " + error.message);
      console.log("Error al reenviar correo de verificación:", error );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📩 Verifica tu correo</Text>

      <Text style={styles.text}>
        Te enviamos un enlace de verificación a tu email.
        {"\n\n"}
        ✔ Revisa tu bandeja de entrada{"\n"}
        ✔ También revisa spam o promociones
      </Text>

      {/* BOTÓN MANUAL (respaldo) */}
      <TouchableOpacity style={styles.button} onPress={handleReload}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Ya verifiqué</Text>
        )}
      </TouchableOpacity>

      {/* REENVIAR */}
      <TouchableOpacity
        onPress={handleResend}
        disabled={resendCooldown > 0}
      >
        <Text style={styles.resend}>
          {resendCooldown > 0
            ? `Reenviar en ${resendCooldown}s`
            : "Reenviar correo"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F1F1",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  resend: {
    color: "#007AFF",
    marginTop: 10,
  },
});