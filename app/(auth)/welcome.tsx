import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";

export default function Welcome() {

  return (
    <View style={styles.container}>

      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
      />

      <Text style={styles.title}>Bienvenido a MealPrep</Text>

      <Text style={styles.subtitle}>
        Planifica tus comidas, controla tu nutrición y organiza tu cocina
      </Text>

      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={() => router.push("/(auth)/login")}
      >
        <Text style={styles.buttonText}>Iniciar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonSecondary}
        onPress={() => router.push("/(auth)/register")}
      >
        <Text style={styles.buttonSecondaryText}>Crear cuenta</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#F6F1F1"
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 30
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10
  },

  subtitle: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginBottom: 40
  },

  buttonPrimary: {
    backgroundColor: "#000",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },

  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#000",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center"
  },

  buttonSecondaryText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold"
  }

});