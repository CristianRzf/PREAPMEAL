import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import * as Icons from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, G, Path, Text as SvgText, Rect } from "react-native-svg";
import { auth, db } from "../../config/firebase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TabKey = "inicio" | "nutricion" | "finanzas";

type DayMeal = {
  mealId: string;
  recipeName: string;
  kcal: number;
  proteina: number;
  carbos: number;
  grasas: number;
};

type Budget = {
  mensual: number;
  alertas?: { pct75: boolean; pct90: boolean; pct100: boolean };
};

type Transaction = {
  id: string;
  monto: number;
  categoria: string;
  descripcion: string;
  fecha: any;
};

type MacroGoals = {
  proteinas: number;
  carbohidratos: number;
  grasas: number;
};

type WeekDay = {
  label: string;
  dateId: string;
  kcal: number;
};

interface RecetaComunidad {
  id: string;
  titulo: string;
  imagen: string;
  username: string;
  calorias: number;
  userId: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const { width } = Dimensions.get("window");
const COMMUNITY_CARD_W = (width - 56) / 2.3;

const CATEGORIAS_GASTO = [
  "Supermercado",
  "Delivery",
  "Snacks",
  "Restaurante",
  "Otro",
];

const CAT_COLORS: Record<string, string> = {
  Supermercado: "#2D6A4F",
  Delivery: "#4A90E2",
  Snacks: "#F5A623",
  Restaurante: "#C4918A",
  Otro: "#888",
};

const INNER_TABS = [
  { key: "inicio", label: "Inicio" },
  { key: "nutricion", label: "Nutrición" },
  { key: "finanzas", label: "Finanzas" },
];

const QUICK_ACCESS = [
  { label: "Inventario", icon: "Archive", color: "#FFF4EE", accent: "#C4918A", route: "/inventario" },
  { label: "Planificador", icon: "BowlFood", color: "#EEF4EE", accent: "#2D6A4F", route: "/planificador" },
  { label: "Recetas", icon: "CookingPot", color: "#F4EEFF", accent: "#7251C2", route: "/recetas" },
  { label: "Lista", icon: "ShoppingCartSimple", color: "#E8F4FD", accent: "#2563EB", route: "/listadeCompras" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTodayId = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const getDateId = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
};

const getDayString = () => {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const today = new Date();
  return `${days[today.getDay()]}, ${today.getDate()} de ${months[today.getMonth()]}`;
};

const formatCOP = (value: number) =>
  `$${Math.round(value).toLocaleString("es-CO")}`;

const getKcalColor = (pct: number): string => {
  if (pct === 0) return "#C4918A";
  if (pct >= 0.9 && pct <= 1.1) return "#2D6A4F";
  if ((pct >= 0.8 && pct < 0.9) || (pct > 1.1 && pct <= 1.2)) return "#E9C46A";
  return "#E63946";
};

// Agrupar transacciones por semana del mes (4 semanas)
const groupByWeek = (txs: Transaction[]): number[] => {
  const weeks = [0, 0, 0, 0];
  txs.forEach((t) => {
    const fecha = t.fecha?.toDate?.();
    if (!fecha) return;
    const day = fecha.getDate();
    const idx = Math.min(Math.floor((day - 1) / 7), 3);
    weeks[idx] += t.monto;
  });
  return weeks;
};

// Agrupar por categoría
const groupByCategoria = (txs: Transaction[]): Record<string, number> => {
  const result: Record<string, number> = {};
  txs.forEach((t) => {
    const cat = t.categoria || "Otro";
    result[cat] = (result[cat] || 0) + t.monto;
  });
  return result;
};

// ─── Componentes internos ──────────────────────────────────────────────────────

function AnimatedProgressBar({ progress, color }: { progress: number; color: string }) {
  const scaleX = useSharedValue(0);
  useEffect(() => {
    scaleX.value = withSpring(Math.max(0, Math.min(progress, 1)), {
      damping: 15,
      stiffness: 80,
    });
  }, [progress]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));
  return (
    <View style={styles.progressBg}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, animStyle]} />
    </View>
  );
}

function CircularProgress({
  progress, color, size = 160, strokeWidth = 14, consumed, goal,
}: {
  progress: number; color: string; size?: number; strokeWidth?: number;
  consumed: number; goal: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.max(0, Math.min(progress, 1));
  const strokeDashoffset = circumference * (1 - safeProgress);
  const pct = goal > 0 ? Math.round(safeProgress * 100) : 0;
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#F0EBE8" strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={radius} stroke={color}
            strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#2c1810" }}>{Math.round(consumed)}</Text>
        <Text style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>de {goal} kcal</Text>
        <View style={{ backgroundColor: color + "22", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color }}>{pct}%</Text>
        </View>
      </View>
    </View>
  );
}

function DonutChart({ proteina, carbos, grasas }: { proteina: number; carbos: number; grasas: number }) {
  const total = proteina + carbos + grasas;
  if (total === 0) return null;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 44;
  const innerR = 26;
  const slices = [
    { value: proteina, color: "#4A90E2", label: "Proteína" },
    { value: carbos, color: "#2D6A4F", label: "Carbos" },
    { value: grasas, color: "#F5A623", label: "Grasas" },
  ];
  let currentAngle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; value: number }[] = [];
  for (const slice of slices) {
    const angle = (slice.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(currentAngle);
    const y1 = cy + r * Math.sin(currentAngle);
    const x2 = cx + r * Math.cos(currentAngle + angle);
    const y2 = cy + r * Math.sin(currentAngle + angle);
    const ix1 = cx + innerR * Math.cos(currentAngle);
    const iy1 = cy + innerR * Math.sin(currentAngle);
    const ix2 = cx + innerR * Math.cos(currentAngle + angle);
    const iy2 = cy + innerR * Math.sin(currentAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = [`M ${x1} ${y1}`, `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`, `L ${ix2} ${iy2}`, `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`, "Z"].join(" ");
    paths.push({ d, color: slice.color, label: slice.label, value: slice.value });
    currentAngle += angle;
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Svg width={size} height={size}>
        {paths.map((p, i) => <Path key={i} d={p.d} fill={p.color} />)}
      </Svg>
      <View style={{ gap: 6 }}>
        {slices.map((s) => (
          <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
            <Text style={{ fontSize: 12, color: "#2c1810", fontWeight: "600" }}>{s.label}</Text>
            <Text style={{ fontSize: 12, color: "#aaa" }}>
              {Math.round(s.value)}g · {Math.round((s.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WeeklyLineChart({ weekData, objetivo }: { weekData: WeekDay[]; objetivo: number }) {
  const chartW = width - 80;
  const chartH = 100;
  const padding = 8;
  const maxVal = Math.max(...weekData.map((d) => d.kcal), objetivo * 1.2, 100);
  const toY = (val: number) => chartH - padding - (val / maxVal) * (chartH - padding * 2);
  const toX = (i: number) => padding + (i / (weekData.length - 1)) * (chartW - padding * 2);
  const objY = toY(objetivo);
  const areaD =
    weekData.length > 1
      ? `M ${toX(0)} ${chartH} L ${weekData.map((d, i) => `${toX(i)} ${toY(d.kcal)}`).join(" L ")} L ${toX(weekData.length - 1)} ${chartH} Z`
      : "";
  return (
    <View>
      <Svg width={chartW} height={chartH + 20}>
        {areaD ? <Path d={areaD} fill="#C4918A22" /> : null}
        {objetivo > 0 && (
          <Path d={`M ${padding} ${objY} L ${chartW - padding} ${objY}`} stroke="#2D6A4F" strokeWidth={1} strokeDasharray="4 4" />
        )}
        {weekData.length > 1 && (
          <Path
            d={`M ${weekData.map((d, i) => `${toX(i)} ${toY(d.kcal)}`).join(" L ")}`}
            stroke="#C4918A" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {weekData.map((d, i) => {
          const isToday = i === weekData.length - 1;
          return (
            <Circle key={i} cx={toX(i)} cy={toY(d.kcal)} r={isToday ? 5 : 3}
              fill={isToday ? "#C4918A" : "#fff"} stroke="#C4918A" strokeWidth={2} />
          );
        })}
        {weekData.map((d, i) => (
          <SvgText key={i} x={toX(i)} y={chartH + 14} fontSize="9" fill="#aaa" textAnchor="middle">
            {d.label}
          </SvgText>
        ))}
      </Svg>
      {objetivo > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <View style={{ width: 16, height: 2, backgroundColor: "#2D6A4F" }} />
          <Text style={{ fontSize: 10, color: "#2D6A4F" }}>Meta: {objetivo} kcal</Text>
        </View>
      )}
    </View>
  );
}

// RF-08.4.3: Gráfico de barras semanal (4 semanas)
function WeeklyBarChart({ weeks, presupuestoSemanal }: { weeks: number[]; presupuestoSemanal: number }) {
  const chartW = width - 80;
  const chartH = 90;
  const maxVal = Math.max(...weeks, presupuestoSemanal * 1.2, 1000);
  const barW = (chartW - 40) / 4 - 8;
  const weekColors = ["#4A90E2", "#2D6A4F", "#C4918A", "#F5A623"];
  const labels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
  return (
    <Svg width={chartW} height={chartH + 28}>
      {presupuestoSemanal > 0 && (() => {
        const y = chartH - (presupuestoSemanal / maxVal) * chartH;
        return (
          <Path
            d={`M 0 ${y} L ${chartW} ${y}`}
            stroke="#E63946" strokeWidth={1} strokeDasharray="4 3"
          />
        );
      })()}
      {weeks.map((val, i) => {
        const barH = Math.max(2, (val / maxVal) * chartH);
        const x = 20 + i * ((chartW - 40) / 4);
        const y = chartH - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={weekColors[i]} />
            {val > 0 && (
              <SvgText x={x + barW / 2} y={y - 4} fontSize="8" fill="#888" textAnchor="middle">
                {formatCOP(val).replace("$", "")}
              </SvgText>
            )}
            <SvgText x={x + barW / 2} y={chartH + 14} fontSize="9" fill="#aaa" textAnchor="middle">
              {labels[i]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// RF-08.4.4: Donut de gastos por categoría
function CategoryDonut({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const size = 110;
  const cx = size / 2;
  const cy = size / 2;
  const r = 40;
  const innerR = 22;
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  let currentAngle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; value: number }[] = [];
  for (const [cat, val] of entries) {
    const angle = (val / total) * 2 * Math.PI;
    if (angle < 0.01) { currentAngle += angle; continue; }
    const x1 = cx + r * Math.cos(currentAngle);
    const y1 = cy + r * Math.sin(currentAngle);
    const x2 = cx + r * Math.cos(currentAngle + angle);
    const y2 = cy + r * Math.sin(currentAngle + angle);
    const ix1 = cx + innerR * Math.cos(currentAngle);
    const iy1 = cy + innerR * Math.sin(currentAngle);
    const ix2 = cx + innerR * Math.cos(currentAngle + angle);
    const iy2 = cy + innerR * Math.sin(currentAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = [`M ${x1} ${y1}`, `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`, `L ${ix2} ${iy2}`, `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`, "Z"].join(" ");
    paths.push({ d, color: CAT_COLORS[cat] ?? "#888", label: cat, value: val });
    currentAngle += angle;
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Svg width={size} height={size}>
        {paths.map((p, i) => <Path key={i} d={p.d} fill={p.color} />)}
      </Svg>
      <View style={{ flex: 1, gap: 5 }}>
        {entries.map(([cat, val]) => (
          <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CAT_COLORS[cat] ?? "#888" }} />
            <Text style={{ fontSize: 11, color: "#2c1810", fontWeight: "600", flex: 1 }}>{cat}</Text>
            <Text style={{ fontSize: 11, color: "#888" }}>{formatCOP(val)}</Text>
            <Text style={{ fontSize: 10, color: "#aaa", width: 34, textAlign: "right" }}>
              {Math.round((val / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// RF-08.5.4: Fila de transacción con swipe para eliminar
function TransactionRow({
  transaction, onDelete, onEdit,
}: {
  transaction: Transaction; onDelete: (id: string) => void; onEdit: (t: Transaction) => void;
}) {
  const translateX = useSharedValue(0);
  const deleteVisible = useSharedValue(0);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.value = Math.max(g.dx, -80);
          deleteVisible.value = Math.min(-g.dx / 80, 1);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          Alert.alert("Eliminar gasto", "¿Confirmas que quieres eliminar esta transacción?", [
            { text: "Cancelar", onPress: () => { translateX.value = withSpring(0); deleteVisible.value = withTiming(0); } },
            { text: "Eliminar", style: "destructive", onPress: () => { onDelete(transaction.id); translateX.value = withSpring(0); deleteVisible.value = withTiming(0); } },
          ]);
        } else {
          translateX.value = withSpring(0);
          deleteVisible.value = withTiming(0);
        }
      },
    })
  ).current;

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const deleteStyle = useAnimatedStyle(() => ({ opacity: deleteVisible.value }));

  const fecha = transaction.fecha?.toDate?.();
  const fechaStr = fecha
    ? fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    : "";

  return (
    <View style={{ overflow: "hidden" }}>
      <Animated.View style={[{ position: "absolute", right: 0, top: 0, bottom: 0, width: 70, backgroundColor: "#E63946", justifyContent: "center", alignItems: "center", borderRadius: 10 }, deleteStyle]}>
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Eliminar</Text>
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={rowStyle}>
        <TouchableOpacity onPress={() => onEdit(transaction)} style={styles.mealRow} activeOpacity={0.85}>
          <View style={[styles.txIcon, { backgroundColor: (CAT_COLORS[transaction.categoria] ?? "#888") + "22" }]}>
            <Icons.ReceiptIcon size={16} color={CAT_COLORS[transaction.categoria] ?? "#888"} weight="fill" />
          </View>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>{transaction.descripcion}</Text>
            <Text style={styles.mealSlot}>{fechaStr} · {transaction.categoria}</Text>
          </View>
          <Text style={[styles.mealKcal, { color: "#2c1810" }]}>{formatCOP(transaction.monto)}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function Home() {
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [firstName, setFirstName] = useState("Chef");
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const translateX = useSharedValue(0);
  const currentTabIndex = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const translateY = useSharedValue(100);
  const scale = useSharedValue(0);
  const statsOpacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      if (tab === "nutricion") setActiveTab("nutricion");
      else if (tab === "finanzas") setActiveTab("finanzas");
    }, [tab])
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      setFirstName(user?.displayName?.split(" ")[0] ?? "Chef");
    });
    return unsub;
  }, []);

  // ── Estado nutrición ──
  const [inventoryCount, setInventoryCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [loadingNutricion, setLoadingNutricion] = useState(true);
  const [kcalObjetivo, setKcalObjetivo] = useState(0);
  const [macroGoals, setMacroGoals] = useState<MacroGoals>({ proteinas: 0, carbohidratos: 0, grasas: 0 });

  // ── Estado finanzas ──
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loadingFinanzas, setLoadingFinanzas] = useState(true);
  const [modalPresupuesto, setModalPresupuesto] = useState(false);
  const [inputPresupuesto, setInputPresupuesto] = useState("");
  const [alertaPct75, setAlertaPct75] = useState(true);
  const [alertaPct90, setAlertaPct90] = useState(true);
  const [alertaPct100, setAlertaPct100] = useState(true);
  const [txMesAnterior, setTxMesAnterior] = useState<Transaction[]>([]);
  const [loadingMesAnterior, setLoadingMesAnterior] = useState(false);
  const [filtroCat, setFiltroCat] = useState<string>("Todas");
  const [filtroMes, setFiltroMes] = useState<number>(new Date().getMonth());
  const [showAllTx, setShowAllTx] = useState(false);

  // ── Modal transacción manual ──
  const [modalTx, setModalTx] = useState(false);
  const [editandoTx, setEditandoTx] = useState<Transaction | null>(null);
  const [txForm, setTxForm] = useState({ monto: "", categoria: "Supermercado", descripcion: "", fecha: "" });

  // ── Estado comunidad ──
  const [recetasComunidad, setRecetasComunidad] = useState<RecetaComunidad[]>([]);
  const [loadingComunidad, setLoadingComunidad] = useState(true);

  // ── Estado semanal nutrición ──
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [loadingSemanal, setLoadingSemanal] = useState(true);

  // ── Alertas ya enviadas para no repetir ──
  const alertasEnviadas = useRef<Set<string>>(new Set());

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 600 });
    scale.value = withSpring(1);
    statsOpacity.value = withTiming(1, { duration: 800 });
  }, []);

  // ── Suscripciones Firestore ──
  useEffect(() => {
    if (!userId) return;

    const unsubInv = onSnapshot(collection(db, "users", userId, "pantry_inventory"), (snap) => {
      setInventoryCount(snap.size);
      setExpiringCount(snap.docs.filter((d) => { const days = d.data().expirationDays; return days > 0 && days <= 3; }).length);
    });

    const unsubRec = onSnapshot(collection(db, "users", userId, "recipes"), (snap) => setRecipesCount(snap.size));

    let semanaYaCargada = false;
    const unsubProfile = onSnapshot(doc(db, "users", userId), (snap) => {
      const triggerSemana = () => {
        if (!semanaYaCargada) { semanaYaCargada = true; cargarSemana(userId); }
      };
      if (snap.exists()) {
        const data = snap.data();
        const tdee = Number(data.tdee) || 0;
        setKcalObjetivo(tdee);
        setMacroGoals({
          proteinas: Number(data.macros?.proteinas) || 0,
          carbohidratos: Number(data.macros?.carbohidratos) || 0,
          grasas: Number(data.macros?.grasas) || 0,
        });
      }
      triggerSemana();
    });

    const unsubMeals = onSnapshot(doc(db, "users", userId, "plan", getTodayId()), (snap) => {
      if (!snap.exists()) { setMeals([]); } else {
        const data = snap.data() as Record<string, any>;
        setMeals(Object.entries(data).map(([mealType, slot]) => ({
          mealId: mealType,
          recipeName: slot?.nombre || "Sin nombre",
          kcal: Number(slot?.calorias ?? 0) * Number(slot?.porciones ?? 1),
          proteina: Number(slot?.proteinas ?? 0) * Number(slot?.porciones ?? 1),
          carbos: Number(slot?.carbohidratos ?? 0) * Number(slot?.porciones ?? 1),
          grasas: Number(slot?.grasas ?? 0) * Number(slot?.porciones ?? 1),
        })));
      }
      setLoadingNutricion(false);
    });

    const unsubBudget = onSnapshot(doc(db, "users", userId, "budget", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Budget;
        setBudget(data);
        setAlertaPct75(data.alertas?.pct75 ?? true);
        setAlertaPct90(data.alertas?.pct90 ?? true);
        setAlertaPct100(data.alertas?.pct100 ?? true);
      } else {
        setBudget(null);
      }
      setLoadingFinanzas(false);
    });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const unsubTx = onSnapshot(
      query(collection(db, "users", userId, "expense_tracking"), orderBy("fecha", "desc"), limit(100)),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }))
          .filter((t) => t.fecha?.toDate?.() >= startOfMonth);
        setAllTransactions(all);
        setTransactions(all);
      }
    );

    return () => { unsubInv(); unsubRec(); unsubProfile(); unsubMeals(); unsubBudget(); unsubTx(); };
  }, [userId]);

  // ── RF-08.6: Notificaciones financieras ──
  useEffect(() => {
    if (!budget || allTransactions.length === 0) return;
    const gastado = allTransactions.reduce((acc, t) => acc + t.monto, 0);
    const pct = gastado / budget.mensual;
    const disponible = budget.mensual - gastado;
    const key75 = `alerta75_${new Date().getMonth()}`;
    const key90 = `alerta90_${new Date().getMonth()}`;
    const key100 = `alerta100_${new Date().getMonth()}`;

    if (alertaPct75 && pct >= 0.75 && pct < 0.9 && !alertasEnviadas.current.has(key75)) {
      alertasEnviadas.current.add(key75);
      Alert.alert(
        "Presupuesto al 75%",
        `Llevas el 75% de tu presupuesto.\nHas gastado ${formatCOP(gastado)} de ${formatCOP(budget.mensual)}.\nTe quedan ${formatCOP(disponible)}.`
      );
    }
    if (alertaPct90 && pct >= 0.9 && pct < 1 && !alertasEnviadas.current.has(key90)) {
      alertasEnviadas.current.add(key90);
      Alert.alert(
        "Presupuesto al 90%",
        `Llevas el 90% de tu presupuesto.\nSolo quedan ${formatCOP(disponible)}.`
      );
    }
    if (alertaPct100 && pct >= 1 && !alertasEnviadas.current.has(key100)) {
      alertasEnviadas.current.add(key100);
      Alert.alert(
        "Presupuesto excedido",
        `Excediste tu presupuesto.\nHas gastado ${formatCOP(gastado)} de ${formatCOP(budget.mensual)}.\nExcedente: ${formatCOP(gastado - budget.mensual)}.`
      );
    }
  }, [allTransactions, budget, alertaPct75, alertaPct90, alertaPct100]);

  // ── Carga mes anterior para comparación RF-08.4.5 ──
  useEffect(() => {
    if (!userId) return;
    cargarMesAnterior(userId);
  }, [userId]);

  const cargarMesAnterior = async (uid: string) => {
    setLoadingMesAnterior(true);
    const now = new Date();
    const startMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endMesAnt = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    try {
      const snap = await getDocs(
        query(
          collection(db, "users", uid, "expense_tracking"),
          orderBy("fecha", "desc"),
          limit(200)
        )
      );
      const txs = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }))
        .filter((t) => {
          const f = t.fecha?.toDate?.();
          return f && f >= startMesAnt && f <= endMesAnt;
        });
      setTxMesAnterior(txs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMesAnterior(false);
    }
  };

  // ── Carga comunidad ──
  useEffect(() => { cargarComunidad(); }, []);

  const cargarComunidad = async () => {
    setLoadingComunidad(true);
    try {
      const q = query(collection(db, "public_recipes"), orderBy("creadoEn", "desc"), limit(6));
      const snap = await getDocs(q);
      setRecetasComunidad(snap.docs.map((d) => ({
        id: d.id, titulo: d.data().titulo || "", imagen: d.data().imagen || "",
        username: d.data().username || "", calorias: d.data().calorias || 0, userId: d.data().userId || "",
      })));
    } catch (e) { console.error(e); } finally { setLoadingComunidad(false); }
  };

  // ── Carga semanal nutrición ──
  const cargarSemana = async (uid: string) => {
    setLoadingSemanal(true);
    const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const result: WeekDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const dateId = getDateId(i);
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = dayLabels[d.getDay()];
      try {
        const snap = await getDoc(doc(db, "users", uid, "plan", dateId));
        let kcal = 0;
        if (snap.exists()) {
          const data = snap.data() as Record<string, any>;
          kcal = Object.values(data).reduce((acc: number, slot: any) => acc + Number(slot?.calorias ?? 0) * Number(slot?.porciones ?? 1), 0);
        }
        result.push({ label, dateId, kcal: Math.round(kcal) });
      } catch { result.push({ label, dateId, kcal: 0 }); }
    }
    setWeekData(result);
    setLoadingSemanal(false);
  };

  // ── Logout ──
  const logout = async () => {
    await signOut(getAuth());
    router.replace("/(auth)/login");
  };

  // ── RF-08.1.1: Guardar presupuesto con validación ──
  const guardarPresupuesto = async () => {
    if (!userId || !inputPresupuesto) return;
    const valor = parseInt(inputPresupuesto.replace(/\D/g, ""), 10);
    if (isNaN(valor) || valor <= 0) {
      Alert.alert("Error", "Ingresa un valor mayor a cero.");
      return;
    }
    if (valor >= 10_000_000) {
      Alert.alert("Error", "El presupuesto no puede superar $10,000,000.");
      return;
    }
    await setDoc(doc(db, "users", userId, "budget", "config"), {
      mensual: valor,
      alertas: { pct75: alertaPct75, pct90: alertaPct90, pct100: alertaPct100 },
    });
    setModalPresupuesto(false);
    setInputPresupuesto("");
  };

  // ── RF-08.5.2 / RF-08.5.3: Guardar transacción manual o edición ──
  const guardarTransaccion = async () => {
    if (!userId) return;
    const monto = parseInt(txForm.monto.replace(/\D/g, ""), 10);
    if (isNaN(monto) || monto <= 0) {
      Alert.alert("Error", "Ingresa un monto válido.");
      return;
    }
    const fecha = txForm.fecha ? new Date(txForm.fecha) : new Date();
    try {
      if (editandoTx) {
        await updateDoc(doc(db, "users", userId, "expense_tracking", editandoTx.id), {
          monto, categoria: txForm.categoria, descripcion: txForm.descripcion || "Gasto manual", fecha,
        });
      } else {
        await addDoc(collection(db, "users", userId, "expense_tracking"), {
          monto, categoria: txForm.categoria, descripcion: txForm.descripcion || "Gasto manual", fecha,
        });
      }
      setModalTx(false);
      setEditandoTx(null);
      setTxForm({ monto: "", categoria: "Supermercado", descripcion: "", fecha: "" });
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar la transacción.");
    }
  };

  // ── RF-08.5.4: Eliminar transacción ──
  const eliminarTransaccion = async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, "users", userId, "expense_tracking", id));
    } catch (e) {
      Alert.alert("Error", "No se pudo eliminar la transacción.");
    }
  };

  const abrirEdicion = (t: Transaction) => {
    setEditandoTx(t);
    const fecha = t.fecha?.toDate?.();
    setTxForm({
      monto: t.monto.toString(),
      categoria: t.categoria || "Supermercado",
      descripcion: t.descripcion || "",
      fecha: fecha ? fecha.toISOString().split("T")[0] : "",
    });
    setModalTx(true);
  };

  // ── Scroll ──
  const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }, { scale: scale.value }] }));
  const statsAnimatedStyle = useAnimatedStyle(() => ({ opacity: statsOpacity.value, transform: [{ scale: interpolate(statsOpacity.value, [0, 1], [0.9, 1]) }] }));
  const headerParallaxStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -40]) }] }));

  // ── Cálculos nutrición ──
  const totals = meals.reduce((acc, m) => ({
    kcal: acc.kcal + (m.kcal ?? 0), proteina: acc.proteina + (m.proteina ?? 0),
    carbos: acc.carbos + (m.carbos ?? 0), grasas: acc.grasas + (m.grasas ?? 0),
  }), { kcal: 0, proteina: 0, carbos: 0, grasas: 0 });

  const kcalPct = kcalObjetivo > 0 ? totals.kcal / kcalObjetivo : 0;
  const kcalBarColor = getKcalColor(kcalPct);

  const diasConDatos = weekData.filter((d) => d.kcal > 0);
  const promedioSemanal = diasConDatos.length > 0
    ? Math.round(diasConDatos.reduce((a, d) => a + d.kcal, 0) / diasConDatos.length) : 0;
  const diasCumplidos = weekData.filter((d) => {
    const p = kcalObjetivo > 0 ? d.kcal / kcalObjetivo : 0;
    return p >= 0.9 && p <= 1.1;
  }).length;
  const mensajeMotivacional = diasCumplidos >= 6 ? "Semana casi perfecta!" : diasCumplidos >= 4 ? "Muy buen ritmo!" : diasCumplidos >= 2 ? "Vas bien, sigue así" : "Esta semana podemos mejorar";

  // ── Cálculos finanzas ──
  const txFiltradas = (() => {
    let base = allTransactions;
    if (filtroCat !== "Todas") base = base.filter((t) => t.categoria === filtroCat);
    return base;
  })();

  const gastadoMes = allTransactions.reduce((acc, t) => acc + (t.monto ?? 0), 0);
  const pctGasto = budget ? Math.min(gastadoMes / budget.mensual, 1) : 0;
  const gastoBarColor = pctGasto >= 1 ? "#E63946" : pctGasto >= 0.9 ? "#E9C46A" : "#2D6A4F";
  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const diaActual = new Date().getDate();
  const diasRestantes = diasMes - diaActual;
  const promedioDiario = diaActual > 0 ? gastadoMes / diaActual : 0;
  const proyeccion = promedioDiario * diasMes;
  const disponible = budget ? budget.mensual - gastadoMes : 0;

  const presupuestoSemanal = budget ? budget.mensual / 4.33 : 0;
  const presupuestoDiario = budget ? budget.mensual / 30 : 0;

  const weeklyBars = groupByWeek(allTransactions);
  const catData = groupByCategoria(allTransactions);

  const gastadoMesAnt = txMesAnterior.reduce((acc, t) => acc + t.monto, 0);
  const diffMesAnt = gastadoMes - gastadoMesAnt;
  const diffPctMesAnt = gastadoMesAnt > 0 ? ((diffMesAnt / gastadoMesAnt) * 100) : 0;

  const txParaMostrar = showAllTx ? txFiltradas : txFiltradas.slice(0, 5);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* HEADER */}
        <Animated.View style={[styles.header, headerParallaxStyle]}>
          <View style={styles.headerLeft}>
            <Image source={require("../../Logo Chef.png")} style={styles.logo} />
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{firstName} 👋</Text>
              <Text style={styles.date}>{getDayString()}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Icons.SignOutIcon size={18} color="#C4918A" weight="bold" />
          </TouchableOpacity>
        </Animated.View>

        {/* INNER TABS */}
        <View style={styles.innerTabBar}>
          {INNER_TABS.map((tabItem) => (
            <TouchableOpacity
              key={tabItem.key}
              style={[styles.innerTab, activeTab === tabItem.key && styles.innerTabActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tabItem.key as TabKey); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.innerTabText, activeTab === tabItem.key && styles.innerTabTextActive]}>
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══ TAB INICIO ══ */}
        {activeTab === "inicio" && (
          <>
            {expiringCount > 0 && (
              <TouchableOpacity style={styles.alertBanner} onPress={() => router.push("/inventario" as any)}>
                <Text style={styles.alertEmoji}>⚠️</Text>
                <Text style={styles.alertText}>
                  {expiringCount} producto{expiringCount > 1 ? "s" : ""} vence{expiringCount === 1 ? "" : "n"} pronto
                </Text>
                <Icons.ArrowRightIcon size={14} color="#7A5C00" weight="bold" />
              </TouchableOpacity>
            )}

            <Animated.View style={[styles.statsRow, statsAnimatedStyle]}>
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
            </Animated.View>

            {/* Plan de hoy */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Plan de hoy</Text>
                <TouchableOpacity onPress={() => router.push("/planificador" as any)}>
                  <Text style={styles.seeAll}>Planificar</Text>
                </TouchableOpacity>
              </View>
              {meals.length === 0 ? (
                <>
                  {[
                    { slot: "Desayuno", icon: "🌅" },
                    { slot: "Almuerzo", icon: "☀️" },
                    { slot: "Cena", icon: "🌙" },
                    { slot: "Snacks", icon: "🍎" },
                  ].map((item) => (
                    <View key={item.slot} style={styles.mealRow}>
                      <Text style={styles.mealIcon}>{item.icon}</Text>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealSlot}>{item.slot}</Text>
                        <Text style={styles.mealName}>Sin planificar</Text>
                      </View>
                      <TouchableOpacity style={styles.addMealBtn} onPress={() => router.push("/planificador" as any)}>
                        <Text style={styles.addMealText}>+ Añadir</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  {meals.map((m) => (
                    <View key={m.mealId} style={styles.mealRow}>
                      <Text style={styles.mealIcon}>
                        {m.mealId === "desayuno"
                          ? "🌅"
                          : m.mealId === "almuerzo"
                            ? "☀️"
                            : m.mealId === "cena"
                              ? "🌙"
                              : "🍎"}
                      </Text>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealSlot}>{m.mealId.charAt(0).toUpperCase() + m.mealId.slice(1)}</Text>
                        <Text style={styles.mealName}>{m.recipeName}</Text>
                      </View>
                      <Text style={styles.mealKcal}>{Math.round(m.kcal)} kcal</Text>
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.addMealBtn, { alignSelf: "flex-end", marginTop: 8 }]} onPress={() => router.push("/planificador" as any)}>
                    <Text style={styles.addMealText}>+ Añadir más</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Accesos rápidos */}
            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACCESS.map((item) => {
                const IconComp = (Icons as any)[`${item.icon}Icon`];
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.quickCard, { backgroundColor: item.color }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(item.route as any); }}
                    activeOpacity={0.75}
                  >
                    {IconComp && (
                      <IconComp size={26} color={item.accent} weight="fill" />
                    )}
                    <Text style={[styles.quickLabel, { color: item.accent }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Comunidad */}
            <View style={styles.comunidadHeader}>
              <View>
                <Text style={styles.sectionTitle}>Comunidad</Text>
                <Text style={styles.comunidadSub}>Recetas recientes</Text>
              </View>
              <TouchableOpacity style={styles.comunidadVerTodo} onPress={() => router.push("/comunidad" as any)}>
                <Text style={styles.comunidadVerTodoText}>Ver todo</Text>
                <Icons.ArrowRightIcon size={13} color="#C4918A" weight="bold" />
              </TouchableOpacity>
            </View>

            {loadingComunidad ? (
              <ActivityIndicator color="#C4918A" style={{ marginBottom: 16 }} />
            ) : recetasComunidad.length === 0 ? (
              <View style={styles.comunidadEmpty}>
                <Icons.UsersIcon size={32} color="#C4918A" weight="thin" />
                <Text style={styles.comunidadEmptyText}>Aún no hay recetas en la comunidad</Text>
                <TouchableOpacity style={styles.comunidadEmptyBtn} onPress={() => router.push("/recetas" as any)}>
                  <Text style={styles.comunidadEmptyBtnText}>Publicar receta</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.comunidadScroll} contentContainerStyle={{ paddingRight: 20 }}>
                {recetasComunidad.map((receta) => (
                  <TouchableOpacity key={receta.id} style={styles.comunidadCard} onPress={() => router.push("/recetas" as any)} activeOpacity={0.88}>
                    {receta.imagen ? (
                      <Image source={{ uri: receta.imagen }} style={styles.comunidadCardImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.comunidadCardImg, styles.comunidadCardImgPlaceholder]}>
                        <Icons.BowlFoodIcon size={28} color="#C4918A" weight="thin" />
                      </View>
                    )}
                    <View style={styles.comunidadCardOverlay} />
                    <View style={styles.comunidadCardInfo}>
                      <Text style={styles.comunidadCardTitulo} numberOfLines={2}>{receta.titulo}</Text>
                      <TouchableOpacity onPress={() => router.push({ pathname: "/perfilPublico", params: { uid: receta.userId } } as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.comunidadCardAutor}>@{receta.username}</Text>
                      </TouchableOpacity>
                      <Text style={styles.comunidadCardKcal}>{receta.calorias} kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.comunidadCardVerMas} onPress={() => router.push("/comunidad" as any)} activeOpacity={0.8}>
                  <Icons.ArrowRightIcon size={28} color="#C4918A" weight="bold" />
                  <Text style={styles.comunidadCardVerMasText}>Ver{"\n"}más</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </>
        )}

        {/* ══ TAB NUTRICIÓN ══ */}
        {activeTab === "nutricion" && (
          <>
            {loadingNutricion ? (
              <ActivityIndicator color="#C4918A" style={{ marginTop: 40 }} />
            ) : meals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icons.BowlFoodIcon size={48} color="#C4918A" weight="thin" />
                <Text style={styles.emptyTitle}>Sin comidas planificadas hoy</Text>
                <Text style={styles.emptySubtitle}>Agrega recetas a tu planificador para ver tu resumen nutricional aquí.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/planificador" as any)}>
                  <Text style={styles.emptyBtnText}>Ir al planificador</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Nutrición de Hoy</Text>
                    <Text style={styles.dateChip}>{getDayString()}</Text>
                  </View>
                  <View style={{ alignItems: "center", paddingVertical: 12 }}>
                    <CircularProgress progress={kcalPct} color={kcalBarColor} consumed={totals.kcal} goal={kcalObjetivo} size={170} strokeWidth={16} />
                  </View>
                  <Text style={[styles.kcalRemaining, { textAlign: "center", marginTop: 4 }]}>
                    {kcalObjetivo > totals.kcal
                      ? `Faltan ${Math.round(kcalObjetivo - totals.kcal)} kcal para tu meta`
                      : `Superaste tu meta por ${Math.round(totals.kcal - kcalObjetivo)} kcal`}
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={[styles.cardTitle, { marginBottom: 16 }]}>Macronutrientes</Text>
                  <DonutChart proteina={totals.proteina} carbos={totals.carbos} grasas={totals.grasas} />
                  <View style={styles.divider} />
                  <View style={styles.macroGrid}>
                    {[
                      { label: "Proteína", val: totals.proteina, goal: macroGoals.proteinas, color: "#4A90E2" },
                      { label: "Carbos", val: totals.carbos, goal: macroGoals.carbohidratos, color: "#2D6A4F" },
                      { label: "Grasas", val: totals.grasas, goal: macroGoals.grasas, color: "#F5A623" },
                    ].map((m) => {
                      const pct = m.goal > 0 ? Math.min(m.val / m.goal, 1) : 0;
                      const pctColor = getKcalColor(m.goal > 0 ? m.val / m.goal : 0);
                      return (
                        <View key={m.label} style={styles.macroGridItem}>
                          <View style={[styles.macroDot, { backgroundColor: m.color, alignSelf: "center" }]} />
                          <Text style={styles.macroGridLabel}>{m.label}</Text>
                          <Text style={styles.macroGridVal}>{Math.round(m.val)}g</Text>
                          {m.goal > 0 && <Text style={styles.macroGridGoal}>/ {m.goal}g</Text>}
                          <AnimatedProgressBar progress={pct} color={m.color} />
                          {m.goal > 0 && <Text style={[styles.macroGridPct, { color: pctColor }]}>{Math.round(pct * 100)}%</Text>}
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Comidas de hoy</Text>
                    <TouchableOpacity onPress={() => router.push("/planificador" as any)}>
                      <Text style={styles.seeAll}>Ver plan</Text>
                    </TouchableOpacity>
                  </View>
                  {meals.map((m) => (
                    <View key={m.mealId} style={styles.mealRow}>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealSlot}>{m.mealId.charAt(0).toUpperCase() + m.mealId.slice(1)}</Text>
                        <Text style={styles.mealName}>{m.recipeName}</Text>
                      </View>
                      <Text style={styles.mealKcal}>{Math.round(m.kcal)} kcal</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Resumen Semanal</Text>
                  {loadingSemanal ? (
                    <ActivityIndicator color="#C4918A" />
                  ) : (
                    <>
                      {weekData.length > 0 && <WeeklyLineChart weekData={weekData} objetivo={kcalObjetivo} />}
                      <View style={styles.divider} />
                      {kcalObjetivo === 0 && (
                        <View style={styles.motivBanner}>
                          <Text style={[styles.motivText, { color: "#aaa" }]}>Configura tu perfil nutricional para ver vs objetivo</Text>
                        </View>
                      )}
                      <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricVal}>{promedioSemanal > 0 ? promedioSemanal : "--"}</Text>
                          <Text style={styles.metricLabel}>Prom. kcal/día</Text>
                        </View>
                        <View style={[styles.metricItem, styles.metricBorder]}>
                          <Text style={[styles.metricVal, { color: "#C4918A" }]}>{kcalObjetivo > 0 ? `${diasCumplidos}/7` : "--"}</Text>
                          <Text style={styles.metricLabel}>Días con meta</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricVal, { color: kcalObjetivo > 0 && promedioSemanal >= kcalObjetivo * 0.9 ? "#2D6A4F" : "#E63946" }]}>
                            {kcalObjetivo > 0 && promedioSemanal > 0 ? `${Math.round((promedioSemanal / kcalObjetivo) * 100)}%` : "--"}
                          </Text>
                          <Text style={styles.metricLabel}>vs Objetivo</Text>
                        </View>
                      </View>
                      <View style={styles.motivBanner}>
                        <Text style={styles.motivText}>{mensajeMotivacional}</Text>
                      </View>
                    </>
                  )}
                </View>
              </>
            )}
          </>
        )}

        {/* ══ TAB FINANZAS ══ */}
        {activeTab === "finanzas" && (
          <>
            {loadingFinanzas ? (
              <ActivityIndicator color="#C4918A" style={{ marginTop: 40 }} />
            ) : !budget ? (
              <View style={styles.emptyCard}>
                <Icons.PiggyBankIcon size={48} color="#C4918A" weight="thin" />
                <Text style={styles.emptyTitle}>Sin presupuesto configurado</Text>
                <Text style={styles.emptySubtitle}>Configura tu presupuesto mensual para hacer seguimiento de tus gastos.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalPresupuesto(true)}>
                  <Text style={styles.emptyBtnText}>Configurar presupuesto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* RF-08.4.1 / RF-08.4.2: Card principal presupuesto */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Presupuesto del mes</Text>
                    <TouchableOpacity onPress={() => { setInputPresupuesto(budget.mensual.toString()); setModalPresupuesto(true); }}>
                      <Icons.PencilSimpleIcon size={16} color="#C4918A" weight="bold" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.kcalRow}>
                    <Text style={styles.kcalConsumed}>{formatCOP(gastadoMes)}</Text>
                    <Text style={styles.kcalTotal}> / {formatCOP(budget.mensual)}</Text>
                  </View>
                  <AnimatedProgressBar progress={pctGasto} color={gastoBarColor} />
                  <Text style={styles.kcalRemaining}>
                    {disponible >= 0
                      ? `Disponible: ${formatCOP(disponible)} · ${diasRestantes} días restantes`
                      : `Excediste tu presupuesto en ${formatCOP(Math.abs(disponible))}`}
                  </Text>

                  {/* RF-08.1.2: Equivalencias */}
                  <View style={[styles.metricsRow, { marginTop: 12 }]}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricVal}>{formatCOP(presupuestoDiario)}</Text>
                      <Text style={styles.metricLabel}>Presup. diario</Text>
                    </View>
                    <View style={[styles.metricItem, styles.metricBorder]}>
                      <Text style={styles.metricVal}>{formatCOP(presupuestoSemanal)}</Text>
                      <Text style={styles.metricLabel}>Presup. semanal</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricVal}>{formatCOP(budget.mensual)}</Text>
                      <Text style={styles.metricLabel}>Presup. mensual</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* RF-08.4.2: Métricas clave */}
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

                {/* RF-08.4.5: Comparación con mes anterior */}
                <View style={styles.card}>
                  <Text style={[styles.cardTitle, { marginBottom: 12 }]}>vs Mes anterior</Text>
                  {loadingMesAnterior ? (
                    <ActivityIndicator color="#C4918A" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Mes anterior</Text>
                        <Text style={{ fontSize: 18, fontWeight: "700", color: "#2c1810" }}>{formatCOP(gastadoMesAnt)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Este mes</Text>
                        <Text style={{ fontSize: 18, fontWeight: "700", color: "#2c1810" }}>{formatCOP(gastadoMes)}</Text>
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <View style={[styles.diffChip, { backgroundColor: diffMesAnt <= 0 ? "#EEF4EE" : "#FFF0F0" }]}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: diffMesAnt <= 0 ? "#2D6A4F" : "#E63946" }}>
                            {diffMesAnt <= 0 ? "▼" : "▲"} {formatCOP(Math.abs(diffMesAnt))}
                          </Text>
                          <Text style={{ fontSize: 10, color: diffMesAnt <= 0 ? "#2D6A4F" : "#E63946", marginTop: 1 }}>
                            {diffMesAnt <= 0 ? "-" : "+"}{Math.abs(Math.round(diffPctMesAnt))}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* RF-08.4.3: Gráfico de barras semanal */}
                <View style={styles.card}>
                  <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Gastos por semana</Text>
                  <WeeklyBarChart weeks={weeklyBars} presupuestoSemanal={presupuestoSemanal} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <View style={{ width: 16, height: 2, backgroundColor: "#E63946" }} />
                    <Text style={{ fontSize: 10, color: "#E63946" }}>Presupuesto semanal: {formatCOP(presupuestoSemanal)}</Text>
                  </View>
                </View>

                {/* RF-08.4.4: Donut por categoría */}
                {Object.keys(catData).length > 0 && (
                  <View style={styles.card}>
                    <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Desglose por categoría</Text>
                    <CategoryDonut data={catData} />
                  </View>
                )}

                {/* RF-08.4.6 / RF-08.5: Historial de transacciones */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Transacciones</Text>
                    <TouchableOpacity
                      style={styles.addMealBtn}
                      onPress={() => { setEditandoTx(null); setTxForm({ monto: "", categoria: "Supermercado", descripcion: "", fecha: "" }); setModalTx(true); }}
                    >
                      <Text style={styles.addMealText}>+ Agregar</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Filtros */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {["Todas", ...CATEGORIAS_GASTO].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setFiltroCat(cat)}
                        style={[styles.filterChip, filtroCat === cat && styles.filterChipActive]}
                      >
                        <Text style={[styles.filterChipText, filtroCat === cat && styles.filterChipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {txFiltradas.length === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: 20 }}>
                      <Text style={{ fontSize: 13, color: "#aaa" }}>Sin transacciones{filtroCat !== "Todas" ? ` en "${filtroCat}"` : " este mes"}</Text>
                      <Text style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>Los gastos se registran al completar la lista de compras</Text>
                    </View>
                  ) : (
                    <>
                      {txParaMostrar.map((t) => (
                        <TransactionRow key={t.id} transaction={t} onDelete={eliminarTransaccion} onEdit={abrirEdicion} />
                      ))}
                      {txFiltradas.length > 5 && (
                        <TouchableOpacity onPress={() => setShowAllTx(!showAllTx)} style={{ alignItems: "center", paddingTop: 12 }}>
                          <Text style={{ fontSize: 13, color: "#C4918A", fontWeight: "600" }}>
                            {showAllTx ? "Ver menos" : `Ver todas (${txFiltradas.length})`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, fabStyle]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/planificador" as any); }}
        >
          <Icons.PlusIcon size={24} color="#fff" weight="bold" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── MODAL PRESUPUESTO (RF-08.1) ── */}
      <Modal visible={modalPresupuesto} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{budget ? "Editar presupuesto" : "Configurar presupuesto"}</Text>

            <Text style={styles.modalLabel}>Presupuesto mensual en COP (máx. $10,000,000)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: 400000"
              keyboardType="numeric"
              value={inputPresupuesto}
              onChangeText={setInputPresupuesto}
              placeholderTextColor="#aaa"
            />

            {/* RF-08.1.2: Equivalencias en tiempo real */}
            {inputPresupuesto.length > 0 && (() => {
              const val = parseInt(inputPresupuesto.replace(/\D/g, ""), 10);
              if (isNaN(val) || val <= 0) return null;
              return (
                <View style={styles.equivalencias}>
                  <View style={styles.eqItem}>
                    <Text style={styles.eqLabel}>Semanal</Text>
                    <Text style={styles.eqVal}>{formatCOP(val / 4.33)}</Text>
                  </View>
                  <View style={styles.eqItem}>
                    <Text style={styles.eqLabel}>Diario</Text>
                    <Text style={styles.eqVal}>{formatCOP(val / 30)}</Text>
                  </View>
                </View>
              );
            })()}

            {/* RF-08.1.3: Alertas */}
            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Alertas de presupuesto</Text>
            {[
              { label: "Al 75% del presupuesto", value: alertaPct75, setter: setAlertaPct75 },
              { label: "Al 90% del presupuesto", value: alertaPct90, setter: setAlertaPct90 },
              { label: "Al exceder el 100%", value: alertaPct100, setter: setAlertaPct100 },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.checkRow}
                onPress={() => item.setter(!item.value)}
                activeOpacity={0.75}
              >
                <View style={[styles.checkbox, item.value && styles.checkboxActive]}>
                  {item.value && <Text style={{ color: "#fff", fontSize: 12, lineHeight: 16 }}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalBtn} onPress={guardarPresupuesto}>
              <Text style={styles.modalBtnText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalPresupuesto(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL TRANSACCIÓN MANUAL (RF-08.5.2 / RF-08.5.3) ── */}
      <Modal visible={modalTx} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editandoTx ? "Editar transacción" : "Nueva transacción"}</Text>

            <Text style={styles.modalLabel}>Monto (COP) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: 45000"
              keyboardType="numeric"
              value={txForm.monto}
              onChangeText={(v) => setTxForm((f) => ({ ...f, monto: v.replace(/\D/g, "") }))}
              placeholderTextColor="#aaa"
            />

            <Text style={styles.modalLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {CATEGORIAS_GASTO.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setTxForm((f) => ({ ...f, categoria: cat }))}
                  style={[styles.filterChip, txForm.categoria === cat && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, txForm.categoria === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Descripción (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Mercado semanal"
              value={txForm.descripcion}
              onChangeText={(v) => setTxForm((f) => ({ ...f, descripcion: v }))}
              placeholderTextColor="#aaa"
            />

            <Text style={styles.modalLabel}>Fecha (opcional, por defecto hoy)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="AAAA-MM-DD"
              value={txForm.fecha}
              onChangeText={(v) => setTxForm((f) => ({ ...f, fecha: v }))}
              placeholderTextColor="#aaa"
            />

            <TouchableOpacity style={styles.modalBtn} onPress={guardarTransaccion}>
              <Text style={styles.modalBtnText}>{editandoTx ? "Guardar cambios" : "Registrar gasto"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalTx(false); setEditandoTx(null); }}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 14, color: "#888" },
  name: { fontSize: 24, fontWeight: "700", color: "#2c1810", marginTop: 2 },
  date: { fontSize: 12, color: "#aaa", marginTop: 2 },
  logo: { width: 48, height: 48, borderRadius: 12 },
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
  dateChip: { fontSize: 11, color: "#C4918A", fontWeight: "600", backgroundColor: "#FFF4EE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  kcalRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 8, marginBottom: 8 },
  kcalConsumed: { fontSize: 26, fontWeight: "700", color: "#2c1810" },
  kcalTotal: { fontSize: 13, color: "#aaa" },
  progressBg: { height: 8, backgroundColor: "#F0EBE8", borderRadius: 8, overflow: "hidden", marginBottom: 6, marginTop: 8 },
  progressFill: { height: "100%", width: "100%", borderRadius: 8, transformOrigin: "left center" as any },
  kcalRemaining: { fontSize: 11, color: "#aaa", marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#F0EBE8", marginVertical: 14 },
  macroGrid: { flexDirection: "row", gap: 10, marginTop: 4 },
  macroGridItem: { flex: 1, alignItems: "stretch", gap: 3 },
  macroGridLabel: { fontSize: 11, color: "#888", fontWeight: "600", textAlign: "center", marginTop: 4 },
  macroGridVal: { fontSize: 15, fontWeight: "700", color: "#2c1810", textAlign: "center" },
  macroGridGoal: { fontSize: 10, color: "#aaa", textAlign: "center" },
  macroGridPct: { fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 2 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  mealRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#F0EBE8", gap: 12 },
  mealIcon: { fontSize: 22, width: 32, textAlign: "center" },
  mealInfo: { flex: 1 },
  mealSlot: { fontSize: 11, color: "#aaa", fontWeight: "500" },
  mealName: { fontSize: 14, color: "#2c1810", fontWeight: "600", marginTop: 1 },
  mealKcal: { fontSize: 12, color: "#C4918A", fontWeight: "600" },
  addMealBtn: { backgroundColor: "#FFF4EE", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addMealText: { fontSize: 12, color: "#C4918A", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2c1810", marginBottom: 4 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  quickCard: { width: "47%", borderRadius: 16, padding: 16, alignItems: "center", gap: 8 },
  quickLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  comunidadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  comunidadSub: { fontSize: 11, color: "#aaa", marginTop: 2 },
  comunidadVerTodo: { flexDirection: "row", alignItems: "center", gap: 4 },
  comunidadVerTodoText: { fontSize: 12, color: "#C4918A", fontWeight: "600" },
  comunidadScroll: { marginLeft: -20, paddingLeft: 20, marginBottom: 16 },
  comunidadCard: { width: COMMUNITY_CARD_W, height: 160, borderRadius: 16, overflow: "hidden", marginRight: 10, position: "relative" },
  comunidadCardImg: { width: "100%", height: "100%" },
  comunidadCardImgPlaceholder: { backgroundColor: "#F0EAE7", justifyContent: "center", alignItems: "center" },
  comunidadCardOverlay: { position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.32)" },
  comunidadCardInfo: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 },
  comunidadCardTitulo: { fontSize: 12, fontWeight: "700", color: "#fff", lineHeight: 16, marginBottom: 2 },
  comunidadCardAutor: { fontSize: 10, color: "rgba(255,255,255,0.8)", textDecorationLine: "underline", marginBottom: 2 },
  comunidadCardKcal: { fontSize: 9, color: "rgba(255,255,255,0.7)" },
  comunidadCardVerMas: { width: 80, height: 160, borderRadius: 16, backgroundColor: "#FFF4EE", justifyContent: "center", alignItems: "center", gap: 6, marginRight: 10 },
  comunidadCardVerMasText: { fontSize: 12, color: "#C4918A", fontWeight: "700", textAlign: "center" },
  comunidadEmpty: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", gap: 8, marginBottom: 16 },
  comunidadEmptyText: { fontSize: 13, color: "#aaa", textAlign: "center" },
  comunidadEmptyBtn: { backgroundColor: "#FFF4EE", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  comunidadEmptyBtnText: { fontSize: 12, color: "#C4918A", fontWeight: "600" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", gap: 10, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#2c1810", textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 20 },
  emptyBtn: { backgroundColor: "#2c1810", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  metricsRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#F0EBE8", paddingTop: 14, marginTop: 8 },
  metricItem: { flex: 1, alignItems: "center", gap: 4 },
  metricBorder: { borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: "#F0EBE8" },
  metricVal: { fontSize: 13, fontWeight: "700", color: "#2c1810" },
  metricLabel: { fontSize: 10, color: "#aaa", textAlign: "center" },
  motivBanner: { backgroundColor: "#FFF4EE", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 12 },
  motivText: { fontSize: 13, fontWeight: "700", color: "#C4918A" },
  txIcon: { padding: 8, borderRadius: 10 },
  diffChip: { borderRadius: 10, padding: 8, alignItems: "center", minWidth: 80 },
  filterChip: { backgroundColor: "#F6F1F1", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  filterChipActive: { backgroundColor: "#2c1810" },
  filterChipText: { fontSize: 12, color: "#888", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, maxHeight: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#2c1810" },
  modalLabel: { fontSize: 12, color: "#888" },
  modalInput: { backgroundColor: "#F6F1F1", borderRadius: 12, padding: 14, fontSize: 16, color: "#2c1810" },
  modalBtn: { backgroundColor: "#2c1810", padding: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalCancel: { textAlign: "center", color: "#aaa", fontWeight: "600", paddingVertical: 4 },
  equivalencias: { flexDirection: "row", gap: 10, backgroundColor: "#F6F1F1", borderRadius: 12, padding: 12 },
  eqItem: { flex: 1, alignItems: "center" },
  eqLabel: { fontSize: 10, color: "#aaa", marginBottom: 2 },
  eqVal: { fontSize: 14, fontWeight: "700", color: "#2c1810" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#D0C8C4", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#2c1810", borderColor: "#2c1810" },
  checkLabel: { fontSize: 13, color: "#2c1810" },
  fabContainer: { position: "absolute", bottom: 30, right: 20, zIndex: 1000 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#C4918A", justifyContent: "center", alignItems: "center", shadowColor: "#C4918A", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
});