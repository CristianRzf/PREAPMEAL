import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import {
  FORM_LIMITS,
  isValidEmail,
  limitText,
  normalizeEmail,
} from "../../utils/formValidators";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const getFriendlyAuthError = (
    error: unknown,
    provider: "email" | "google",
  ) => {
    if (provider === "google") {
      const responseError = error as {
        code?: string;
        message?: string;
        description?: string;
      } | null;
      if (
        responseError?.code === "ERR_CANCELED" ||
        responseError?.code === "ERR_REQUEST_CANCELED"
      ) {
        return null;
      }

      if (responseError?.description) {
        return responseError.description;
      }

      return "No se pudo iniciar sesión con Google. Revisa tu configuración de OAuth y vuelve a intentarlo.";
    }

    const authError = error as { code?: string; message?: string } | null;

    switch (authError?.code) {
      case "auth/invalid-email":
        return "El correo electrónico no es válido.";
      case "auth/user-not-found":
        return "No existe una cuenta con ese correo.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "El correo o la contraseña son incorrectos.";
      case "auth/too-many-requests":
        return "Demasiados intentos fallidos. Intenta de nuevo más tarde.";
      case "auth/network-request-failed":
        return "No hay conexión con Firebase. Verifica tu internet.";
      default:
        return (
          authError?.message || "No se pudo iniciar sesión. Inténtalo de nuevo."
        );
    }
  };

  // Google Auth
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "preapmeal",
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleFirebaseLogin(id_token);
      }
    }
  }, [response]);

  const handleGoogleFirebaseLogin = async (idToken: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      router.replace("/(tabs)");
      return userCredential.user?.email;
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthError(error, "google");
      if (friendlyMessage) {
        setAuthError(friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError(null);

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setAuthError("Por favor ingresa email y contraseña.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setAuthError("El correo electrónico no es válido.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      router.replace("/(tabs)");
      console.log("Usuario logueado:", userCredential.user?.email);
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthError(error, "email");
      setAuthError(friendlyMessage);
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

      <Text style={styles.title}>Iniciar sesión</Text>

      <Text style={styles.subtitle}>
        Ingresa tu correo electrónico{"\n"}para iniciar sesión
      </Text>

      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

      {/* Email */}
      <Text style={styles.label}>Email</Text>

      <TextInput
        placeholder="correoelectronico@dominio.com"
        style={styles.input}
        value={email}
        onChangeText={(value) => setEmail(limitText(value, FORM_LIMITS.email))}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        maxLength={FORM_LIMITS.email}
      />

      {/* Contraseña */}
      <Text style={styles.label}>Contraseña</Text>

      <TextInput
        placeholder="Ingresa tu contraseña"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={(value) =>
          setPassword(limitText(value, FORM_LIMITS.password))
        }
        maxLength={FORM_LIMITS.password}
      />

      {/* Botón */}
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continuar</Text>
        )}
      </TouchableOpacity>

      {/* Forgot password */}
      <TouchableOpacity onPress={() => router.push("/recuperar" as any)}>
        <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      {/* Separador */}
      <View style={styles.separatorContainer}>
        <View style={styles.line} />
        <Text style={styles.separator}>o</Text>
        <View style={styles.line} />
      </View>

      {/* Google */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={async () => {
          setAuthError(null);

          if (!request) {
            setAuthError(
              "Google aún no está listo. Revisa los client IDs en tu .env.",
            );
            return;
          }

          try {
            await promptAsync();
          } catch (error) {
            const friendlyMessage = getFriendlyAuthError(error, "google");
            if (friendlyMessage) {
              setAuthError(friendlyMessage);
            }
          }
        }}
        disabled={!request || loading}
      >
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
          }}
          style={styles.googleIcon}
        />
        <Text style={styles.googleText}>Continuar con Google</Text>
      </TouchableOpacity>

      {/* Register */}
      <Text style={styles.register}>
        ¿Aún no tienes cuenta?{" "}
        <Text
          style={styles.registerLink}
          onPress={() => router.push("/(auth)/register")}
        >
          Regístrate
        </Text>
      </Text>

      {/* Terms */}
      <Text style={styles.terms}>
        Al hacer clic en continuar aceptas nuestros Términos de servicio y
        Política de privacidad
      </Text>
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
    width: 140,
    height: 140,
    marginBottom: 10,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },

  errorText: {
    width: "100%",
    color: "#B00020",
    backgroundColor: "#FDECEC",
    borderColor: "#F5B5B5",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  label: {
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 5,
  },

  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
  },

  button: {
    width: "100%",
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  forgot: {
    marginTop: 10,
    color: "#333",
  },

  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },

  separator: {
    marginHorizontal: 10,
    color: "#888",
  },

  googleButton: {
    width: "100%",
    backgroundColor: "#eee",
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  googleIcon: {
    width: 20,
    height: 20,
  },

  googleText: {
    fontWeight: "500",
  },

  register: {
    marginTop: 15,
  },

  registerLink: {
    color: "#007AFF",
    fontWeight: "bold",
  },

  terms: {
    fontSize: 12,
    textAlign: "center",
    color: "#666",
    marginTop: 25,
  },
});
