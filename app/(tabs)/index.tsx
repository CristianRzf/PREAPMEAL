import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { getAuth, signOut } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { db, auth } from "../../config/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import * as Icons from "phosphor-react-native";

type MealSlot = {
  slot: string;
  icon: string;
  meal: string | null;
  kcal: number | null;
};

const MEAL_PLAN_TODAY: MealSlot[] = [
  { slot: "Desayuno", icon: "☀️", meal: null, kcal: null },
  { slot: "Almuerzo", icon: "🌤️", meal: null, kcal: null },
  { slot: "Cena", icon: "🌙", meal: null, kcal: null },
  { slot: "Snack", icon: "🍎", meal: null, kcal: null },
];

const QUICK_ACCESS = [
  { label: "Recetas", route: "/recetas", icon: "BowlFood", color: "#FFF4EE", accent: "#C4918A" },
  { label: "Planificador", route: "/planificador", icon: "CalendarCheck", color: "#EEF4EE", accent: "#2D6A4F" },
  { label: "Lista", route: "/listadeCompras", icon: "ShoppingCartSimple", color: "#F6F1F1", accent: "#7A5C00" },
  { label: "Inventario", route: "/inventario", icon: "List", color: "#EEF4EE", accent: "#2D6A4F" },
  { label: "Finanzas", route: "/dashboardFinanciero", icon: "ChartLine", color: "#FFF4EE", accent: "#C4918A" },
  { label: "Nutrición", route: "/dashboradNutricional", icon: "ChartDonut", color: "#EEF4EE", accent: "#2D6A4F" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getDayString() {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Capitaliza primera letra
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Home() {
  const user = auth.currentUser;
  const firstName = user?.displayName?.split(" ")[0] ?? "Chef";

  const [inventoryCount, setInventoryCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Inventario
    const invRef = collection(db, "users", user.uid, "pantry_inventory");
    const unsubInv = onSnapshot(invRef, (snap) => {
      setInventoryCount(snap.size);
      setExpiringCount(
        snap.docs.filter((d) => {
          const days = d.data().expirationDays;
          return days > 0 && days <= 3;
        }).length
      );
    });

    // Recetas guardadas
    const recRef = collection(db, "users", user.uid, "recipes");
    const unsubRec = onSnapshot(recRef, (snap) => setRecipesCount(snap.size));

    return () => {
      unsubInv();
      unsubRec();
    };
  }, []);

  const logout = async () => {
    await signOut(getAuth());
    router.replace("/(auth)/login");
  };

  // Calorías mock — reemplaza con datos reales de tu planificador
  const totalKcal = 1840;
  const consumedKcal = 620;
  const kcalPercent = Math.min(consumedKcal / totalKcal, 1);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
            <Text style={styles.date}>{capitalize(getDayString())}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image
              source={require("../../Logo Chef.png")}
              style={styles.logo}
            />
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Icons.SignOutIcon size={18} color="#C4918A" weight="bold" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ALERTA DE VENCIMIENTO */}
        {expiringCount > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => router.push("/inventario")}
          >
            <Text style={styles.alertEmoji}>⚠️</Text>
            <Text style={styles.alertText}>
              {expiringCount} producto{expiringCount > 1 ? "s" : ""} vence
              {expiringCount === 1 ? "" : "n"} pronto
            </Text>
            <Icons.ArrowRightIcon size={14} color="#7A5C00" weight="bold" />
          </TouchableOpacity>
        )}

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}>
            <Icons.ArchiveIcon size={20} color="#C4918A" weight="fill" />
            <Text style={styles.statNumber}>{inventoryCount}</Text>
            <Text style={styles.statLabel}>En inventario</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#EEF4EE" }]}>
            <Icons.BowlFoodIcon size={20} color="#2D6A4F" weight="fill" />
            <Text style={[styles.statNumber, { color: "#2D6A4F" }]}>
              {recipesCount}
            </Text>
            <Text style={styles.statLabel}>Recetas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}>
            <Icons.FireIcon size={20} color="#C4918A" weight="fill" />
            <Text style={styles.statNumber}>{consumedKcal}</Text>
            <Text style={styles.statLabel}>kcal hoy</Text>
          </View>
        </View>

        {/* NUTRICIÓN DEL DÍA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Nutrición de hoy</Text>
            <TouchableOpacity onPress={() => router.push("/dashboradNutricional")}>
              <Text style={styles.seeAll}>Ver detalle →</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de calorías */}
          <View style={styles.kcalRow}>
            <Text style={styles.kcalConsumed}>{consumedKcal} kcal</Text>
            <Text style={styles.kcalTotal}>/ {totalKcal} kcal</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${kcalPercent * 100}%` }]} />
          </View>
          <Text style={styles.kcalRemaining}>
            Te faltan {totalKcal - consumedKcal} kcal para tu meta
          </Text>

          {/* Macros */}
          <View style={styles.macrosRow}>
            {[
              { label: "Proteína", val: "38g", color: "#C4918A" },
              { label: "Carbos", val: "72g", color: "#E9C46A" },
              { label: "Grasas", val: "18g", color: "#2D6A4F" },
            ].map((m) => (
              <View key={m.label} style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                <Text style={styles.macroVal}>{m.val}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* PLAN DE COMIDAS HOY */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Plan de hoy</Text>
            <TouchableOpacity onPress={() => router.push("/planificador")}>
              <Text style={styles.seeAll}>Planificar →</Text>
            </TouchableOpacity>
          </View>
          {MEAL_PLAN_TODAY.map((item) => (
            <View key={item.slot} style={styles.mealRow}>
              <Text style={styles.mealIcon}>{item.icon}</Text>
              <View style={styles.mealInfo}>
                <Text style={styles.mealSlot}>{item.slot}</Text>
                <Text style={styles.mealName}>
                  {item.meal ?? "Sin planificar"}
                </Text>
              </View>
              {item.kcal ? (
                <Text style={styles.mealKcal}>{item.kcal} kcal</Text>
              ) : (
                <TouchableOpacity
                  style={styles.addMealBtn}
                  onPress={() => router.push("/planificador")}
                >
                  <Text style={styles.addMealText}>+ Añadir</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* ACCESOS RÁPIDOS */}
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACCESS.map((item) => {
            const IconComp = (Icons as any)[`${item.icon}Icon`];
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickCard, { backgroundColor: item.color }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                {IconComp && (
                  <IconComp size={26} color={item.accent} weight="fill" />
                )}
                <Text style={[styles.quickLabel, { color: item.accent }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  greeting: { fontSize: 14, color: "#888", fontWeight: "400" },
  name: { fontSize: 26, fontWeight: "700", color: "#2c1810", marginTop: 2 },
  date: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerRight: { alignItems: "center", gap: 8 },
  logo: { width: 52, height: 52, borderRadius: 12 },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // ALERTA
  alertBanner: {
    backgroundColor: "#FFF4CC",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  alertEmoji: { fontSize: 16 },
  alertText: { flex: 1, color: "#7A5C00", fontWeight: "600", fontSize: 13 },

  // STATS
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#C4918A",
    marginTop: 4,
  },
  statLabel: { fontSize: 10, color: "#888", textAlign: "center" },

  // CARD
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#2c1810" },
  seeAll: { fontSize: 12, color: "#C4918A", fontWeight: "600" },

  // NUTRICIÓN
  kcalRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 },
  kcalConsumed: { fontSize: 22, fontWeight: "700", color: "#2c1810" },
  kcalTotal: { fontSize: 13, color: "#aaa" },
  progressBg: {
    height: 8,
    backgroundColor: "#F0EBE8",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C4918A",
    borderRadius: 8,
  },
  kcalRemaining: { fontSize: 11, color: "#aaa", marginBottom: 14 },
  macrosRow: { flexDirection: "row", justifyContent: "space-around" },
  macroItem: { alignItems: "center", gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroVal: { fontSize: 14, fontWeight: "700", color: "#2c1810" },
  macroLabel: { fontSize: 10, color: "#aaa" },

  // PLAN COMIDAS
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0EBE8",
    gap: 12,
  },
  mealIcon: { fontSize: 22, width: 32, textAlign: "center" },
  mealInfo: { flex: 1 },
  mealSlot: { fontSize: 11, color: "#aaa", fontWeight: "500" },
  mealName: { fontSize: 14, color: "#2c1810", fontWeight: "600", marginTop: 1 },
  mealKcal: { fontSize: 12, color: "#C4918A", fontWeight: "600" },
  addMealBtn: {
    backgroundColor: "#FFF4EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addMealText: { fontSize: 12, color: "#C4918A", fontWeight: "600" },

  // ACCESOS RÁPIDOS
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    width: "30%",
    flexGrow: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    minWidth: 90,
  },
  quickLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});