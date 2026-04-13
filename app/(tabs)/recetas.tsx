import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";

export default function RecetasScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Recetas</Text>
          <Text style={styles.headerSub}>Explora y cocina</Text>
        </View>
        <Image
          source={require("../../Logo Chef.png")}
          style={styles.headerLogo}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Próximamente...</Text>
        <Text style={styles.subtitle}>Aquí verás todas tus recetas</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F0ED" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#2C1810", marginTop: 2 },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#2C1810" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 5 },
});
