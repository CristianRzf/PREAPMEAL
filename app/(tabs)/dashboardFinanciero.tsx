import { View, Text, StyleSheet } from "react-native";

export default function DashboardFinanciero() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}></Text>
      <Text style={styles.title}>Dashboard Financiero</Text>
      <Text style={styles.subtitle}>Próximamente...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F6F1F1" },
  emoji: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold", color: "#2D6A4F" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 5 },
});
