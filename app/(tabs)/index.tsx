import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { getAuth, signOut } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import * as Icons from "phosphor-react-native";

// ─── Types ───────────────────────────────────────────────
type TabKey = "inicio" | "nutricion" | "finanzas";

type MealSlot = {
  slot: string;
  icon: string;
  meal: string | null;
  kcal: number | null;
};

type DayMeal = {
  mealId: string;
  recipeName: string;
  kcal: number;
  proteina: number;
  carbos: number;
  grasas: number;
};

type Budget = { mensual: number };

type Transaction = {
  id: string;
  monto: number;
  categoria: string;
  descripcion: string;
  fecha: any;
};

// ─── Constants ───────────────────────────────────────────
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
];

const INNER_TABS: { key: TabKey; label: string }[] = [
  { key: "inicio", label: "Inicio" },
  { key: "nutricion", label: "Nutrición" },
  { key: "finanzas", label: "Finanzas" },
];

// ─── Helpers ─────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getDayString() {
  const s = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getWeekId() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return monday.toISOString().split("T")[0];
}

function getTodayId() {
  return new Date().toISOString().split("T")[0];
}

function formatCOP(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case "Supermercado": return "ShoppingCart";
    case "Delivery": return "Motorcycle";
    case "Snacks": return "Cookie";
    default: return "Receipt";
  }
}

// ─── Main Component ───────────────────────────────────────
export default function Home() {
  const user = auth.currentUser;
  const firstName = user?.displayName?.split(" ")[0] ?? "Chef";

  const [activeTab, setActiveTab] = useState<TabKey>("inicio");

  // Inventario
  const [inventoryCount, setInventoryCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);

  // Nutrición
  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [loadingNutricion, setLoadingNutricion] = useState(true);
  const [kcalObjetivo, setKcalObjetivo] = useState(0);

  // Finanzas
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingFinanzas, setLoadingFinanzas] = useState(true);
  const [modalPresupuesto, setModalPresupuesto] = useState(false);
  const [inputPresupuesto, setInputPresupuesto] = useState("");

  useEffect(() => {
    if (!user) return;

    // Inventario
    const unsubInv = onSnapshot(
      collection(db, "users", user.uid, "pantry_inventory"),
      (snap) => {
        setInventoryCount(snap.size);
        setExpiringCount(snap.docs.filter((d) => {
          const days = d.data().expirationDays;
          return days > 0 && days <= 3;
        }).length);
      }
    );

    // Recetas
    const unsubRec = onSnapshot(
      collection(db, "users", user.uid, "recipes"),
      (snap) => setRecipesCount(snap.size)
    );

    // Perfil nutricional (TDEE)
    const unsubProfile = onSnapshot(
      doc(db, "users", user.uid, "profile", "nutricional"),
      (snap) => {
        if (snap.exists()) setKcalObjetivo(snap.data().tdee ?? 0);
      }
    );

    // Meals de hoy
    const unsubMeals = onSnapshot(
    doc(db, "users", user.uid, "plan", getTodayId()),
    (snap) => {
      console.log("snap exists:", snap.exists(), snap.data());
      if (!snap.exists()) {
        setMeals([]);
      } else {
        const data = snap.data() as Record<string, any>;
        // Convierte { desayuno: SlotComida, almuerzo: SlotComida... } en array
        const mealsArray: DayMeal[] = Object.entries(data).map(([mealType, slot]) => ({
          mealId: mealType,
          recipeName: slot.nombre,
          kcal: slot.calorias * slot.porciones,
          proteina: slot.proteinas * slot.porciones,
          carbos: slot.carbohidratos * slot.porciones,
          grasas: slot.grasas * slot.porciones,
        }));
        setMeals(mealsArray);
      }
      setLoadingNutricion(false);
    }
  );
  

    // Presupuesto
    const unsubBudget = onSnapshot(
      doc(db, "users", user.uid, "budget", "config"),
      (snap) => {
        setBudget(snap.exists() ? (snap.data() as Budget) : null);
        setLoadingFinanzas(false);
      }
    );

    // Transacciones del mes
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const unsubTx = onSnapshot(
      query(collection(db, "users", user.uid, "expense_tracking"), orderBy("fecha", "desc"), limit(50)),
      (snap) => {
        setTransactions(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }))
            .filter((t) => t.fecha?.toDate?.() >= startOfMonth)
        );
      }
    );

    return () => {
      unsubInv(); unsubRec(); unsubProfile();
      unsubMeals(); unsubBudget(); unsubTx();
    };
  }, []);

  const logout = async () => {
    await signOut(getAuth());
    router.replace("/(auth)/login");
  };

  const guardarPresupuesto = async () => {
    if (!user || !inputPresupuesto) return;
    const valor = parseInt(inputPresupuesto.replace(/\D/g, ""), 10);
    if (isNaN(valor) || valor <= 0) return;
    await setDoc(doc(db, "users", user.uid, "budget", "config"), { mensual: valor });
    setModalPresupuesto(false);
    setInputPresupuesto("");
  };

  // ── Cálculos nutrición ──
  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      proteina: acc.proteina + (m.proteina ?? 0),
      carbos: acc.carbos + (m.carbos ?? 0),
      grasas: acc.grasas + (m.grasas ?? 0),
    }),
    { kcal: 0, proteina: 0, carbos: 0, grasas: 0 }
  );
  const kcalPct = kcalObjetivo > 0 ? Math.min(totals.kcal / kcalObjetivo, 1) : 0;
  const kcalBarColor = kcalPct >= 1 ? "#E63946" : kcalPct >= 0.9 ? "#2D6A4F" : kcalPct >= 0.8 ? "#E9C46A" : "#C4918A";

  // ── Cálculos finanzas ──
  const gastadoMes = transactions.reduce((acc, t) => acc + (t.monto ?? 0), 0);
  const pctGasto = budget ? Math.min(gastadoMes / budget.mensual, 1) : 0;
  const gastoBarColor = pctGasto >= 1 ? "#E63946" : pctGasto >= 0.9 ? "#E9C46A" : "#2D6A4F";
  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const diaActual = new Date().getDate();
  const diasRestantes = diasMes - diaActual;
  const promedioDiario = diaActual > 0 ? gastadoMes / diaActual : 0;
  const proyeccion = promedioDiario * diasMes;
  const disponible = budget ? budget.mensual - gastadoMes : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
            <Text style={styles.date}>{getDayString()}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image source={require("../../Logo Chef.png")} style={styles.logo} />
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Icons.SignOutIcon size={18} color="#C4918A" weight="bold" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INNER TABS */}
        <View style={styles.innerTabBar}>
          {INNER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.innerTab, activeTab === tab.key && styles.innerTabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.innerTabText, activeTab === tab.key && styles.innerTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB INICIO ── */}
        {activeTab === "inicio" && (
          <>
            {expiringCount > 0 && (
              <TouchableOpacity style={styles.alertBanner} onPress={() => router.push("/inventario")}>
                <Text style={styles.alertEmoji}>⚠️</Text>
                <Text style={styles.alertText}>
                  {expiringCount} producto{expiringCount > 1 ? "s" : ""} vence{expiringCount === 1 ? "" : "n"} pronto
                </Text>
                <Icons.ArrowRightIcon size={14} color="#7A5C00" weight="bold" />
              </TouchableOpacity>
            )}

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}>
                <Icons.ArchiveIcon size={20} color="#C4918A" weight="fill" />
                <Text style={styles.statNumber}>{inventoryCount}</Text>
                <Text style={styles.statLabel}>Inventario</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#EEF4EE" }]}>
                <Icons.BowlFoodIcon size={20} color="#2D6A4F" weight="fill" />
                <Text style={[styles.statNumber, { color: "#2D6A4F" }]}>{recipesCount}</Text>
                <Text style={styles.statLabel}>Recetas</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}>
                <Icons.FireIcon size={20} color="#C4918A" weight="fill" />
                <Text style={styles.statNumber}>{Math.round(totals.kcal)}</Text>
                <Text style={styles.statLabel}>kcal hoy</Text>
              </View>
            </View>

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
                    <Text style={styles.mealName}>{item.meal ?? "Sin planificar"}</Text>
                  </View>
                  <TouchableOpacity style={styles.addMealBtn} onPress={() => router.push("/planificador")}>
                    <Text style={styles.addMealText}>+ Añadir</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

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
                    {IconComp && <IconComp size={26} color={item.accent} weight="fill" />}
                    <Text style={[styles.quickLabel, { color: item.accent }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── TAB NUTRICIÓN ── */}
        {activeTab === "nutricion" && (
          <>
            {loadingNutricion ? (
              <ActivityIndicator color="#C4918A" style={{ marginTop: 40 }} />
            ) : meals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icons.BowlFoodIcon size={48} color="#C4918A" weight="thin" />
                <Text style={styles.emptyTitle}>Sin comidas planificadas hoy</Text>
                <Text style={styles.emptySubtitle}>
                  Agrega recetas a tu planificador para ver tu resumen nutricional aquí.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/planificador")}>
                  <Text style={styles.emptyBtnText}>Ir al planificador</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Calorías de hoy</Text>
                  <View style={styles.kcalRow}>
                    <Text style={styles.kcalConsumed}>{Math.round(totals.kcal)}</Text>
                    <Text style={styles.kcalTotal}> / {kcalObjetivo} kcal</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${kcalPct * 100}%`, backgroundColor: kcalBarColor }]} />
                  </View>
                  <Text style={styles.kcalRemaining}>
                    {kcalObjetivo > totals.kcal
                      ? `Faltan ${Math.round(kcalObjetivo - totals.kcal)} kcal para tu meta`
                      : `Superaste tu meta por ${Math.round(totals.kcal - kcalObjetivo)} kcal`}
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Macronutrientes</Text>
                  {[
                    { label: "Proteína", val: totals.proteina, color: "#C4918A" },
                    { label: "Carbos", val: totals.carbos, color: "#E9C46A" },
                    { label: "Grasas", val: totals.grasas, color: "#2D6A4F" },
                  ].map((m) => (
                    <View key={m.label} style={{ marginBottom: 12 }}>
                      <View style={styles.macroRowFull}>
                        <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                        <Text style={styles.macroLabelFull}>{m.label}</Text>
                        <Text style={styles.macroValFull}>{Math.round(m.val)}g</Text>
                      </View>
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, {
                          width: `${Math.min((m.val / Math.max(totals.proteina + totals.carbos + totals.grasas, 1)) * 100, 100)}%`,
                          backgroundColor: m.color,
                        }]} />
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Comidas de hoy</Text>
                    <TouchableOpacity onPress={() => router.push("/planificador")}>
                      <Text style={styles.seeAll}>Ver plan →</Text>
                    </TouchableOpacity>
                  </View>
                  {meals.map((m) => (
                    <View key={m.mealId} style={styles.mealRow}>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{m.recipeName}</Text>
                      </View>
                      <Text style={styles.mealKcal}>{Math.round(m.kcal)} kcal</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* ── TAB FINANZAS ── */}
        {activeTab === "finanzas" && (
          <>
            {loadingFinanzas ? (
              <ActivityIndicator color="#C4918A" style={{ marginTop: 40 }} />
            ) : !budget ? (
              <View style={styles.emptyCard}>
                <Icons.ChartLineIcon size={48} color="#C4918A" weight="thin" />
                <Text style={styles.emptyTitle}>Sin presupuesto configurado</Text>
                <Text style={styles.emptySubtitle}>
                  Configura tu presupuesto mensual para hacer seguimiento de tus gastos.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalPresupuesto(true)}>
                  <Text style={styles.emptyBtnText}>Configurar presupuesto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Presupuesto del mes</Text>
                    <TouchableOpacity onPress={() => setModalPresupuesto(true)}>
                      <Icons.PencilSimpleIcon size={16} color="#C4918A" weight="bold" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.kcalRow}>
                    <Text style={styles.kcalConsumed}>{formatCOP(gastadoMes)}</Text>
                    <Text style={styles.kcalTotal}> / {formatCOP(budget.mensual)}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pctGasto * 100}%`, backgroundColor: gastoBarColor }]} />
                  </View>
                  <Text style={styles.kcalRemaining}>
                    {disponible >= 0
                      ? `Disponible: ${formatCOP(disponible)} · ${diasRestantes} días restantes`
                      : `Excediste tu presupuesto en ${formatCOP(Math.abs(disponible))}`}
                  </Text>

                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricVal}>{formatCOP(promedioDiario)}</Text>
                      <Text style={styles.metricLabel}>Promedio/día</Text>
                    </View>
                    <View style={[styles.metricItem, styles.metricBorder]}>
                      <Text style={[styles.metricVal, { color: proyeccion > budget.mensual ? "#E63946" : "#2D6A4F" }]}>
                        {formatCOP(proyeccion)}
                      </Text>
                      <Text style={styles.metricLabel}>Proyección</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricVal}>
                        {formatCOP(diasRestantes > 0 ? disponible / diasRestantes : 0)}
                      </Text>
                      <Text style={styles.metricLabel}>Recomend./día</Text>
                    </View>
                  </View>
                </View>

                {transactions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Icons.ReceiptIcon size={36} color="#C4918A" weight="thin" />
                    <Text style={styles.emptyTitle}>Sin gastos este mes</Text>
                    <Text style={styles.emptySubtitle}>
                      Los gastos se registran automáticamente al completar tu lista de compras.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Últimas transacciones</Text>
                    {transactions.slice(0, 5).map((t) => {
                      const IconComp = (Icons as any)[`${getCategoryIcon(t.categoria)}Icon`];
                      const fecha = t.fecha?.toDate?.();
                      const fechaStr = fecha
                        ? fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                        : "";
                      return (
                        <View key={t.id} style={styles.mealRow}>
                          <View style={styles.txIcon}>
                            {IconComp && <IconComp size={16} color="#C4918A" weight="fill" />}
                          </View>
                          <View style={styles.mealInfo}>
                            <Text style={styles.mealName}>{t.descripcion}</Text>
                            <Text style={styles.mealSlot}>{fechaStr} · {t.categoria}</Text>
                          </View>
                          <Text style={styles.mealKcal}>{formatCOP(t.monto)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* MODAL PRESUPUESTO */}
      <Modal visible={modalPresupuesto} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {budget ? "Editar presupuesto" : "Configurar presupuesto"}
            </Text>
            <Text style={styles.modalLabel}>Presupuesto mensual (COP)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: 400000"
              keyboardType="numeric"
              value={inputPresupuesto}
              onChangeText={setInputPresupuesto}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity style={styles.modalBtn} onPress={guardarPresupuesto}>
              <Text style={styles.modalBtnText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalPresupuesto(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 14, color: "#888" },
  name: { fontSize: 26, fontWeight: "700", color: "#2c1810", marginTop: 2 },
  date: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerRight: { alignItems: "center", gap: 8 },
  logo: { width: 52, height: 52, borderRadius: 12 },
  logoutBtn: { backgroundColor: "#fff", borderRadius: 10, padding: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  innerTabBar: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 4, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  innerTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  innerTabActive: { backgroundColor: "#2c1810" },
  innerTabText: { fontSize: 13, fontWeight: "600", color: "#888" },
  innerTabTextActive: { color: "#fff" },

  alertBanner: { backgroundColor: "#FFF4CC", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  alertEmoji: { fontSize: 16 },
  alertText: { flex: 1, color: "#7A5C00", fontWeight: "600", fontSize: 13 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4 },
  statNumber: { fontSize: 20, fontWeight: "700", color: "#C4918A", marginTop: 4 },
  statLabel: { fontSize: 10, color: "#888", textAlign: "center" },

  card: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#2c1810" },
  seeAll: { fontSize: 12, color: "#C4918A", fontWeight: "600" },

  kcalRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 8, marginBottom: 8 },
  kcalConsumed: { fontSize: 26, fontWeight: "700", color: "#2c1810" },
  kcalTotal: { fontSize: 13, color: "#aaa" },
  progressBg: { height: 8, backgroundColor: "#F0EBE8", borderRadius: 8, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", backgroundColor: "#C4918A", borderRadius: 8 },
  kcalRemaining: { fontSize: 11, color: "#aaa", marginBottom: 4 },

  macroRowFull: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabelFull: { flex: 1, fontSize: 13, color: "#2c1810", fontWeight: "600" },
  macroValFull: { fontSize: 13, fontWeight: "700", color: "#2c1810" },

  mealRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#F0EBE8", gap: 12 },
  mealIcon: { fontSize: 22, width: 32, textAlign: "center" },
  mealInfo: { flex: 1 },
  mealSlot: { fontSize: 11, color: "#aaa", fontWeight: "500" },
  mealName: { fontSize: 14, color: "#2c1810", fontWeight: "600", marginTop: 1 },
  mealKcal: { fontSize: 12, color: "#C4918A", fontWeight: "600" },
  addMealBtn: { backgroundColor: "#FFF4EE", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addMealText: { fontSize: 12, color: "#C4918A", fontWeight: "600" },

  metricsRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#F0EBE8", paddingTop: 14, marginTop: 8 },
  metricItem: { flex: 1, alignItems: "center", gap: 4 },
  metricBorder: { borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: "#F0EBE8" },
  metricVal: { fontSize: 13, fontWeight: "700", color: "#2c1810" },
  metricLabel: { fontSize: 10, color: "#aaa", textAlign: "center" },

  txIcon: { backgroundColor: "#FFF4EE", padding: 8, borderRadius: 10 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2c1810", marginBottom: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { width: "30%", flexGrow: 1, borderRadius: 16, padding: 16, alignItems: "center", gap: 8, minWidth: 90 },
  quickLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },

  emptyCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", gap: 10, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#2c1810", textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 20 },
  emptyBtn: { backgroundColor: "#2c1810", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#2c1810" },
  modalLabel: { fontSize: 12, color: "#888" },
  modalInput: { backgroundColor: "#F6F1F1", borderRadius: 12, padding: 14, fontSize: 16, color: "#2c1810" },
  modalBtn: { backgroundColor: "#2c1810", padding: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalCancel: { textAlign: "center", color: "#aaa", fontWeight: "600", paddingVertical: 4 },
});