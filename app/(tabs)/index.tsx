import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { getAuth, signOut } from "firebase/auth";

export default function Home() {

  const logout = async () => {
    await signOut(getAuth());
    console.log("Usuario desconectado: " + getAuth().currentUser?.email);
    router.replace("/(auth)/login");  
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Bienvenido a MealPrep</Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30
  },
  button: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 10
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold"
  }
});