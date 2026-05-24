import { router } from "expo-router";
import {
    fetchSignInMethodsForEmail,
    sendPasswordResetEmail,
} from "firebase/auth";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../config/firebase";
import { isValidEmail, normalizeEmail } from "../../utils/formValidators";

type Estado = "idle" | "loading" | "enviado" | "error";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async () => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setErrorMsg("Por favor ingresa tu correo");
      setEstado("error");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setErrorMsg("Ingresa un correo válido");
      setEstado("error");
      return;
    }

    setEstado("loading");
    setErrorMsg("");

    try {
      const signInMethods = await fetchSignInMethodsForEmail(
        auth,
        normalizedEmail,
      );

      if (signInMethods.length === 0) {
        setErrorMsg("No encontramos una cuenta asociada a ese correo.");
        setEstado("error");
        return;
      }

      await sendPasswordResetEmail(auth, normalizedEmail);
      setEstado("enviado");
    } catch (error: any) {
      if (error.code === "auth/network-request-failed") {
        setErrorMsg(
          "No hay conexión. Verifica tu internet e inténtalo de nuevo.",
        );
      } else if (error.code === "auth/invalid-email") {
        setErrorMsg("Ingresa un correo válido.");
      } else if (error.code === "auth/too-many-requests") {
        setErrorMsg("Demasiados intentos. Intenta de nuevo más tarde.");
      } else if (error.code === "auth/user-not-found") {
        setErrorMsg("No encontramos una cuenta asociada a ese correo.");
      } else {
        setErrorMsg("Ocurrió un error al validar el correo. Intenta de nuevo.");
      }
      setEstado("error");
    }
  };

  // ── Estado: correo enviado ──
  if (estado === "enviado") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✉️</Text>
          </View>
          <Text style={styles.successTitle}>Correo enviado</Text>
          <Text style={styles.successSubtitle}>
            Revisa tu bandeja de entrada en{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
            {"\n"}y sigue las instrucciones para restablecer tu contraseña.
          </Text>
          <Text style={styles.successNote}>
            ¿No lo ves? Revisa tu carpeta de spam.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setEstado("idle");
              setEmail("");
            }}
          >
            <Text style={styles.retryText}>Usar otro correo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Estado: formulario ──
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <View style={styles.container}>
          {/* Botón volver */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Logo */}
          <Image source={require("../../Logo Chef.png")} style={styles.logo} />

          {/* Textos */}
          <Text style={styles.title}>¿Olvidaste tu{"\n"}contraseña?</Text>
          <Text style={styles.subtitle}>
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </Text>

          {/* Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              placeholder="correo@dominio.com"
              placeholderTextColor="#bbb"
              style={[styles.input, estado === "error" && styles.inputError]}
              value={email}
              onChangeText={(v) => {
                setEmail(limitText(v, FORM_LIMITS.resetEmail));
                if (estado === "error") setEstado("idle");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              maxLength={FORM_LIMITS.resetEmail}
            />
            {estado === "error" && (
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            )}
          </View>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.button, estado === "loading" && { opacity: 0.7 }]}
            onPress={handleReset}
            disabled={estado === "loading"}
            activeOpacity={0.85}
          >
            {estado === "loading" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar enlace</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  kav: { flex: 1 },

  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },

  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: { fontSize: 20, color: "#2c1810" },

  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 10,
    lineHeight: 34,
  },

  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 32,
    lineHeight: 22,
  },

  inputWrapper: { marginBottom: 20 },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    fontSize: 15,
    color: "#2c1810",
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
  },

  inputError: {
    borderColor: "#E63946",
    backgroundColor: "#FFF5F5",
  },

  errorText: {
    color: "#E63946",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },

  button: {
    backgroundColor: "#2c1810",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  backText: {
    textAlign: "center",
    color: "#888",
    fontWeight: "500",
    fontSize: 14,
  },

  // Success state
  successContainer: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFF4EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#C4918A",
  },

  successEmoji: { fontSize: 40 },

  successTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 16,
  },

  successSubtitle: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },

  emailHighlight: {
    color: "#2c1810",
    fontWeight: "700",
  },

  successNote: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 32,
  },

  retryBtn: {
    marginTop: 12,
  },

  retryText: {
    color: "#C4918A",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
});
