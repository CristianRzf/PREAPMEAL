import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebase";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      alert("Ingresa tu correo");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      alert("📩 Revisa tu correo para cambiar tu contraseña");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar contraseña</Text>

      <Text style={styles.subtitle}>
        Ingresa tu correo y te enviaremos un enlace
      </Text>

      <TextInput
        placeholder="correo@ejemplo.com"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enviar correo</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F1F1",
    padding: 25,
    justifyContent: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },

  subtitle: {
    color: "#555",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});