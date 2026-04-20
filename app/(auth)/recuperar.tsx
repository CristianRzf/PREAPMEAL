import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebase";
import { router } from "expo-router";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Por favor ingresa tu correo");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Correo enviado",
        "Revisa tu bandeja para restablecer tu contraseña"
      );
      router.back(); // Regresa al login
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
      />

      <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>

      <Text style={styles.subtitle}>
        Ingresa tu correo y te enviaremos un enlace para
        restablecerla.
      </Text>

      {/* Input */}
      <Text style={styles.label}>Correo electrónico</Text>

      <TextInput
        placeholder="correoelectronico@dominio.com"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {/* Botón */}
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enviar enlace</Text>
        )}
      </TouchableOpacity>

      {/* Volver */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F1F1",
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 25,
    marginTop: 10,
  },

  label: {
    alignSelf: "flex-start",
    marginBottom: 5,
  },

  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },

  button: {
    width: "100%",
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  back: {
    marginTop: 15,
    color: "#444",
    fontWeight: "500",
  },
});