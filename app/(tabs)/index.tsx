import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import * as Icons from "phosphor-react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
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
import { auth, db } from "../../config/firebase";

type TabKey = "inicio" | "nutricion" | "finanzas";
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

interface RecetaComunidad {
  id: string;
  titulo: string;
  imagen: string;
  username: string;
  calorias: number;
  userId: string;
}

const { width } = Dimensions.get("window");
const COMMUNITY_CARD_W = (width - 56) / 2.3;

const getTodayId = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
};

const getDayString = () => {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const today = new Date();
  return `${days[today.getDay()]}, ${today.getDate()} de ${months[today.getMonth()]}`;
};

const INNER_TABS = [
  { key: "inicio", label: "Inicio" },
  { key: "nutricion", label: "Nutrición" },
  { key: "finanzas", label: "Finanzas" },
];

const QUICK_ACCESS = [
  {
    label: "Inventario",
    icon: "Archive",
    color: "#FFF4EE",
    accent: "#C4918A",
    route: "/inventario",
  },
  {
    label: "Planificador",
    icon: "BowlFood",
    color: "#EEF4EE",
    accent: "#2D6A4F",
    route: "/planificador",
  },
  {
    label: "Recetas",
    icon: "CookingPot",
    color: "#F4EEFF",
    accent: "#7251C2",
    route: "/recetas",
  },
  {
    label: "Lista",
    icon: "ShoppingCartSimple",
    color: "#E8F4FD",
    accent: "#2563EB",
    route: "/listadeCompras",
  },
];

function AnimatedProgressBar({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  const scaleX = useSharedValue(0);
  useEffect(() => {
    scaleX.value = withSpring(progress, { damping: 15, stiffness: 80 });
  }, [progress]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));
  return (
    <View style={styles.progressBg}>
      <Animated.View
        style={[styles.progressFill, { backgroundColor: color }, animStyle]}
      />
    </View>
  );
}

function formatCOP(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null,
  );
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
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      setFirstName(user?.displayName?.split(" ")[0] ?? "Chef");
    });

    return unsubscribeAuth;
  }, []);

  const [inventoryCount, setInventoryCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [loadingNutricion, setLoadingNutricion] = useState(true);
  const [kcalObjetivo, setKcalObjetivo] = useState(0);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingFinanzas, setLoadingFinanzas] = useState(true);
  const [modalPresupuesto, setModalPresupuesto] = useState(false);
  const [inputPresupuesto, setInputPresupuesto] = useState("");

  // ── Comunidad ─────────────────────────────────────────────────────────────
  const [recetasComunidad, setRecetasComunidad] = useState<RecetaComunidad[]>(
    [],
  );
  const [loadingComunidad, setLoadingComunidad] = useState(true);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 600 });
    scale.value = withSpring(1);
    statsOpacity.value = withTiming(1, { duration: 800 });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsubInv = onSnapshot(
      collection(db, "users", userId, "pantry_inventory"),
      (snap) => {
        setInventoryCount(snap.size);
        setExpiringCount(
          snap.docs.filter((d) => {
            const days = d.data().expirationDays;
            return days > 0 && days <= 3;
          }).length,
        );
      },
    );

    const unsubRec = onSnapshot(
      collection(db, "users", userId, "recipes"),
      (snap) => setRecipesCount(snap.size),
    );

    const unsubProfile = onSnapshot(
      doc(db, "users", userId, "profile", "nutricional"),
      (snap) => {
        if (snap.exists()) setKcalObjetivo(snap.data().tdee ?? 0);
      },
    );

    const unsubMeals = onSnapshot(
      doc(db, "users", userId, "plan", getTodayId()),
      (snap) => {
        if (!snap.exists()) {
          setMeals([]);
        } else {
          const data = snap.data() as Record<string, any>;
          setMeals(
            Object.entries(data).map(([mealType, slot]) => ({
              mealId: mealType,
              recipeName: slot?.nombre || "Sin nombre",
              kcal: Number(slot?.calorias ?? 0) * Number(slot?.porciones ?? 1),
              proteina:
                Number(slot?.proteinas ?? 0) * Number(slot?.porciones ?? 1),
              carbos:
                Number(slot?.carbohidratos ?? 0) * Number(slot?.porciones ?? 1),
              grasas: Number(slot?.grasas ?? 0) * Number(slot?.porciones ?? 1),
            })),
          );
        }
        setLoadingNutricion(false);
      },
    );

    const unsubBudget = onSnapshot(
      doc(db, "users", userId, "budget", "config"),
      (snap) => {
        setBudget(snap.exists() ? (snap.data() as Budget) : null);
        setLoadingFinanzas(false);
      },
    );

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const unsubTx = onSnapshot(
      query(
        collection(db, "users", userId, "expense_tracking"),
        orderBy("fecha", "desc"),
        limit(50),
      ),
      (snap) => {
        setTransactions(
          snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Transaction, "id">),
            }))
            .filter((t) => t.fecha?.toDate?.() >= startOfMonth),
        );
      },
    );

    return () => {
      unsubInv();
      unsubRec();
      unsubProfile();
      unsubMeals();
      unsubBudget();
      unsubTx();
    };
  }, [userId]);

  // Carga preview de comunidad
  useEffect(() => {
    cargarComunidad();
  }, []);

  const cargarComunidad = async () => {
    setLoadingComunidad(true);
    try {
      const q = query(
        collection(db, "public_recipes"),
        orderBy("creadoEn", "desc"),
        limit(6),
      );
      const snap = await getDocs(q);
      setRecetasComunidad(
        snap.docs.map((d) => ({
          id: d.id,
          titulo: d.data().titulo || "",
          imagen: d.data().imagen || "",
          username: d.data().username || "",
          calorias: d.data().calorias || 0,
          userId: d.data().userId || "",
        })),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComunidad(false);
    }
  };

  const gestureHandler = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .activeOffsetY([-10, 10])
    .onStart(() => {
      runOnJS(Haptics.selectionAsync)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const threshold = 80;
      if (
        Math.abs(event.velocityX) > 500 ||
        Math.abs(event.translationX) > threshold
      ) {
        const newIndex =
          event.translationX > 0
            ? Math.max(0, currentTabIndex.value - 1)
            : Math.min(2, currentTabIndex.value + 1);
        currentTabIndex.value = newIndex;
        runOnJS(setActiveTab)(INNER_TABS[newIndex].key as TabKey);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
      translateX.value = withSpring(0);
    });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ scale: interpolate(statsOpacity.value, [0, 1], [0.9, 1]) }],
  }));

  const headerParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -40]) }],
  }));

  const logout = async () => {
    await signOut(getAuth());
    router.replace("/(auth)/login");
  };

  const guardarPresupuesto = async () => {
    if (!user || !inputPresupuesto) return;
    const valor = parseInt(inputPresupuesto.replace(/\D/g, ""), 10);
    if (isNaN(valor) || valor <= 0) return;
    await setDoc(doc(db, "users", user.uid, "budget", "config"), {
      mensual: valor,
    });
    setModalPresupuesto(false);
    setInputPresupuesto("");
  };

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      proteina: acc.proteina + (m.proteina ?? 0),
      carbos: acc.carbos + (m.carbos ?? 0),
      grasas: acc.grasas + (m.grasas ?? 0),
    }),
    { kcal: 0, proteina: 0, carbos: 0, grasas: 0 },
  );

  const kcalPct =
    kcalObjetivo > 0 ? Math.min(totals.kcal / kcalObjetivo, 1) : 0;
  const kcalBarColor =
    kcalPct >= 1
      ? "#E63946"
      : kcalPct >= 0.9
        ? "#2D6A4F"
        : kcalPct >= 0.8
          ? "#E9C46A"
          : "#C4918A";

  const gastadoMes = transactions.reduce((acc, t) => acc + (t.monto ?? 0), 0);
  const pctGasto = budget ? Math.min(gastadoMes / budget.mensual, 1) : 0;
  const gastoBarColor =
    pctGasto >= 1 ? "#E63946" : pctGasto >= 0.9 ? "#E9C46A" : "#2D6A4F";
  const diasMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate();
  const diaActual = new Date().getDate();
  const diasRestantes = diasMes - diaActual;
  const promedioDiario = diaActual > 0 ? gastadoMes / diaActual : 0;
  const proyeccion = promedioDiario * diasMes;
  const disponible = budget ? budget.mensual - gastadoMes : 0;

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
            <Image
              source={require("../../Logo Chef.png")}
              style={styles.logo}
            />
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
              style={[
                styles.innerTab,
                activeTab === tabItem.key && styles.innerTabActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tabItem.key as TabKey);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.innerTabText,
                  activeTab === tabItem.key && styles.innerTabTextActive,
                ]}
              >
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB INICIO ── */}
        {activeTab === "inicio" && (
          <>
            {expiringCount > 0 && (
              <TouchableOpacity
                style={styles.alertBanner}
                onPress={() => router.push("/inventario" as any)}
              >
                <Text style={styles.alertEmoji}>⚠️</Text>
                <Text style={styles.alertText}>
                  {expiringCount} producto{expiringCount > 1 ? "s" : ""} vence
                  {expiringCount === 1 ? "" : "n"} pronto
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
                <Text style={[styles.statNumber, { color: "#2D6A4F" }]}>
                  {recipesCount}
                </Text>
                <Text style={styles.statLabel}>Recetas</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}>
                <Icons.FireIcon size={20} color="#C4918A" weight="fill" />
                <Text style={styles.statNumber}>{Math.round(totals.kcal)}</Text>
                <Text style={styles.statLabel}>kcal hoy</Text>
              </View>
            </Animated.View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Plan de hoy</Text>
                <TouchableOpacity
                  onPress={() => router.push("/planificador" as any)}
                >
                  <Text style={styles.seeAll}>Planificar →</Text>
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
                      <TouchableOpacity
                        style={styles.addMealBtn}
                        onPress={() => router.push("/planificador" as any)}
                      >
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
                        <Text style={styles.mealSlot}>
                          {m.mealId.charAt(0).toUpperCase() + m.mealId.slice(1)}
                        </Text>
                        <Text style={styles.mealName}>{m.recipeName}</Text>
                      </View>
                      <Text style={styles.mealKcal}>
                        {Math.round(m.kcal)} kcal
                      </Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.addMealBtn,
                      { alignSelf: "flex-end", marginTop: 8 },
                    ]}
                    onPress={() => router.push("/planificador" as any)}
                  >
                    <Text style={styles.addMealText}>+ Añadir más</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACCESS.map((item) => {
                const IconComp = (Icons as any)[`${item.icon}Icon`];
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.quickCard, { backgroundColor: item.color }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push(item.route as any);
                    }}
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

            {/* ── SECCIÓN COMUNIDAD ─────────────────────────────────────── */}
            <View style={styles.comunidadHeader}>
              <View>
                <Text style={styles.sectionTitle}>Comunidad</Text>
                <Text style={styles.comunidadSub}>
                  Recetas recientes de la comunidad
                </Text>
              </View>
              <TouchableOpacity
                style={styles.comunidadVerTodo}
                onPress={() => router.push("/comunidad" as any)}
              >
                <Text style={styles.comunidadVerTodoText}>Ver todo</Text>
                <Icons.ArrowRightIcon size={13} color="#C4918A" weight="bold" />
              </TouchableOpacity>
            </View>

            {loadingComunidad ? (
              <ActivityIndicator color="#C4918A" style={{ marginBottom: 16 }} />
            ) : recetasComunidad.length === 0 ? (
              <View style={styles.comunidadEmpty}>
                <Icons.UsersIcon size={32} color="#C4918A" weight="thin" />
                <Text style={styles.comunidadEmptyText}>
                  Aún no hay recetas en la comunidad
                </Text>
                <TouchableOpacity
                  style={styles.comunidadEmptyBtn}
                  onPress={() => router.push("/recetas" as any)}
                >
                  <Text style={styles.comunidadEmptyBtnText}>
                    Publicar receta
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.comunidadScroll}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                {recetasComunidad.map((receta) => (
                  <TouchableOpacity
                    key={receta.id}
                    style={styles.comunidadCard}
                    onPress={() => router.push("/recetas" as any)}
                    activeOpacity={0.88}
                  >
                    {receta.imagen ? (
                      <Image
                        source={{ uri: receta.imagen }}
                        style={styles.comunidadCardImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.comunidadCardImg,
                          styles.comunidadCardImgPlaceholder,
                        ]}
                      >
                        <Icons.BowlFoodIcon
                          size={28}
                          color="#C4918A"
                          weight="thin"
                        />
                      </View>
                    )}
                    <View style={styles.comunidadCardOverlay} />
                    <View style={styles.comunidadCardInfo}>
                      <Text
                        style={styles.comunidadCardTitulo}
                        numberOfLines={2}
                      >
                        {receta.titulo}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/perfilPublico",
                            params: { uid: receta.userId },
                          } as any)
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.comunidadCardAutor}>
                          @{receta.username}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.comunidadCardKcal}>
                        {receta.calorias} kcal
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Card "Ver más" */}
                <TouchableOpacity
                  style={styles.comunidadCardVerMas}
                  onPress={() => router.push("/comunidad" as any)}
                  activeOpacity={0.8}
                >
                  <Icons.ArrowRightIcon
                    size={28}
                    color="#C4918A"
                    weight="bold"
                  />
                  <Text style={styles.comunidadCardVerMasText}>
                    Ver{"\n"}más
                  </Text>
                </TouchableOpacity>
              </Animated.ScrollView>
            )}
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
                <Text style={styles.emptyTitle}>
                  Sin comidas planificadas hoy
                </Text>
                <Text style={styles.emptySubtitle}>
                  Agrega recetas a tu planificador para ver tu resumen
                  nutricional aquí.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push("/planificador" as any)}
                >
                  <Text style={styles.emptyBtnText}>Ir al planificador</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Calorías de hoy</Text>
                  <View style={styles.kcalRow}>
                    <Text style={styles.kcalConsumed}>
                      {Math.round(totals.kcal)}
                    </Text>
                    <Text style={styles.kcalTotal}> / {kcalObjetivo} kcal</Text>
                  </View>
                  <AnimatedProgressBar
                    progress={kcalPct}
                    color={kcalBarColor}
                  />
                  <Text style={styles.kcalRemaining}>
                    {kcalObjetivo > totals.kcal
                      ? `Faltan ${Math.round(kcalObjetivo - totals.kcal)} kcal para tu meta`
                      : `Superaste tu meta por ${Math.round(totals.kcal - kcalObjetivo)} kcal`}
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={[styles.cardTitle, { marginBottom: 14 }]}>
                    Macronutrientes
                  </Text>
                  {[
                    {
                      label: "Proteína",
                      val: totals.proteina,
                      color: "#C4918A",
                    },
                    { label: "Carbos", val: totals.carbos, color: "#E9C46A" },
                    { label: "Grasas", val: totals.grasas, color: "#2D6A4F" },
                  ].map((m) => (
                    <View key={m.label} style={{ marginBottom: 12 }}>
                      <View style={styles.macroRowFull}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: m.color },
                          ]}
                        />
                        <Text style={styles.macroLabelFull}>{m.label}</Text>
                        <Text style={styles.macroValFull}>
                          {Math.round(m.val)}g
                        </Text>
                      </View>
                      <AnimatedProgressBar
                        progress={Math.min(
                          m.val /
                            Math.max(
                              totals.proteina + totals.carbos + totals.grasas,
                              1,
                            ),
                          1,
                        )}
                        color={m.color}
                      />
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Comidas de hoy</Text>
                    <TouchableOpacity
                      onPress={() => router.push("/planificador" as any)}
                    >
                      <Text style={styles.seeAll}>Ver plan →</Text>
                    </TouchableOpacity>
                  </View>
                  {meals.map((m) => (
                    <View key={m.mealId} style={styles.mealRow}>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{m.recipeName}</Text>
                      </View>
                      <Text style={styles.mealKcal}>
                        {Math.round(m.kcal)} kcal
                      </Text>
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
                <Icons.PiggyBankIcon size={48} color="#C4918A" weight="thin" />
                <Text style={styles.emptyTitle}>
                  Sin presupuesto configurado
                </Text>
                <Text style={styles.emptySubtitle}>
                  Configura tu presupuesto mensual para hacer seguimiento de tus
                  gastos.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setModalPresupuesto(true)}
                >
                  <Text style={styles.emptyBtnText}>
                    Configurar presupuesto
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Presupuesto del mes</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setInputPresupuesto(budget.mensual.toString());
                        setModalPresupuesto(true);
                      }}
                    >
                      <Icons.PencilSimpleIcon
                        size={16}
                        color="#C4918A"
                        weight="bold"
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.kcalRow}>
                    <Text style={styles.kcalConsumed}>
                      {formatCOP(gastadoMes)}
                    </Text>
                    <Text style={styles.kcalTotal}>
                      {" "}
                      / {formatCOP(budget.mensual)}
                    </Text>
                  </View>
                  <AnimatedProgressBar
                    progress={pctGasto}
                    color={gastoBarColor}
                  />
                  <Text style={styles.kcalRemaining}>
                    {disponible >= 0
                      ? `Disponible: ${formatCOP(disponible)} · ${diasRestantes} días restantes`
                      : `Excediste tu presupuesto en ${formatCOP(Math.abs(disponible))}`}
                  </Text>
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricVal}>
                        {formatCOP(promedioDiario)}
                      </Text>
                      <Text style={styles.metricLabel}>Promedio/día</Text>
                    </View>
                    <View style={[styles.metricItem, styles.metricBorder]}>
                      <Text
                        style={[
                          styles.metricVal,
                          {
                            color:
                              proyeccion > budget.mensual
                                ? "#E63946"
                                : "#2D6A4F",
                          },
                        ]}
                      >
                        {formatCOP(proyeccion)}
                      </Text>
                      <Text style={styles.metricLabel}>Proyección</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricVal}>
                        {formatCOP(
                          diasRestantes > 0 ? disponible / diasRestantes : 0,
                        )}
                      </Text>
                      <Text style={styles.metricLabel}>Recomend./día</Text>
                    </View>
                  </View>
                </View>

                {transactions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Icons.ReceiptIcon
                      size={36}
                      color="#C4918A"
                      weight="thin"
                    />
                    <Text style={styles.emptyTitle}>Sin gastos este mes</Text>
                    <Text style={styles.emptySubtitle}>
                      Los gastos se registran automáticamente al completar tu
                      lista de compras.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={[styles.cardTitle, { marginBottom: 14 }]}>
                      Últimas transacciones
                    </Text>
                    {transactions.slice(0, 5).map((t) => {
                      const fecha = t.fecha?.toDate?.();
                      const fechaStr = fecha
                        ? fecha.toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                          })
                        : "";
                      return (
                        <View key={t.id} style={styles.mealRow}>
                          <View style={styles.txIcon}>
                            <Icons.ReceiptIcon
                              size={16}
                              color="#C4918A"
                              weight="fill"
                            />
                          </View>
                          <View style={styles.mealInfo}>
                            <Text style={styles.mealName}>{t.descripcion}</Text>
                            <Text style={styles.mealSlot}>
                              {fechaStr} · {t.categoria}
                            </Text>
                          </View>
                          <Text style={styles.mealKcal}>
                            {formatCOP(t.monto)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/planificador" as any);
          }}
        >
          <Icons.PlusIcon size={24} color="#fff" weight="bold" />
        </TouchableOpacity>
      </Animated.View>

      {/* MODAL PRESUPUESTO */}
      <Modal visible={modalPresupuesto} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
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
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={guardarPresupuesto}
            >
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 14, color: "#888" },
  name: { fontSize: 24, fontWeight: "700", color: "#2c1810", marginTop: 2 },
  date: { fontSize: 12, color: "#aaa", marginTop: 2 },
  logo: { width: 48, height: 48, borderRadius: 12 },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  innerTabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  innerTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  innerTabActive: { backgroundColor: "#2c1810" },
  innerTabText: { fontSize: 13, fontWeight: "600", color: "#888" },
  innerTabTextActive: { color: "#fff" },
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
  kcalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  kcalConsumed: { fontSize: 26, fontWeight: "700", color: "#2c1810" },
  kcalTotal: { fontSize: 13, color: "#aaa" },
  progressBg: {
    height: 8,
    backgroundColor: "#F0EBE8",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    width: "100%",
    borderRadius: 8,
    transformOrigin: "left center" as any,
  },
  kcalRemaining: { fontSize: 11, color: "#aaa", marginBottom: 4 },
  macroRowFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabelFull: {
    flex: 1,
    fontSize: 13,
    color: "#2c1810",
    fontWeight: "600",
  },
  macroValFull: { fontSize: 13, fontWeight: "700", color: "#2c1810" },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 4,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  quickLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },

  // ── Comunidad ─────────────────────────────────────────────────────────────
  comunidadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  comunidadSub: { fontSize: 11, color: "#aaa", marginTop: 2 },
  comunidadVerTodo: { flexDirection: "row", alignItems: "center", gap: 4 },
  comunidadVerTodoText: { fontSize: 12, color: "#C4918A", fontWeight: "600" },
  comunidadScroll: { marginLeft: -20, paddingLeft: 20, marginBottom: 16 },
  comunidadCard: {
    width: COMMUNITY_CARD_W,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 10,
    position: "relative",
  },
  comunidadCardImg: { width: "100%", height: "100%" },
  comunidadCardImgPlaceholder: {
    backgroundColor: "#F0EAE7",
    justifyContent: "center",
    alignItems: "center",
  },
  comunidadCardOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  comunidadCardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  comunidadCardTitulo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 16,
    marginBottom: 2,
  },
  comunidadCardAutor: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    textDecorationLine: "underline",
    marginBottom: 2,
  },
  comunidadCardKcal: { fontSize: 9, color: "rgba(255,255,255,0.7)" },
  comunidadCardVerMas: {
    width: 80,
    height: 160,
    borderRadius: 16,
    backgroundColor: "#FFF4EE",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginRight: 10,
  },
  comunidadCardVerMasText: {
    fontSize: 12,
    color: "#C4918A",
    fontWeight: "700",
    textAlign: "center",
  },
  comunidadEmpty: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  comunidadEmptyText: { fontSize: 13, color: "#aaa", textAlign: "center" },
  comunidadEmptyBtn: {
    backgroundColor: "#FFF4EE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  comunidadEmptyBtnText: { fontSize: 12, color: "#C4918A", fontWeight: "600" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c1810",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: "#2c1810",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  metricsRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#F0EBE8",
    paddingTop: 14,
    marginTop: 8,
  },
  metricItem: { flex: 1, alignItems: "center", gap: 4 },
  metricBorder: {
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "#F0EBE8",
  },
  metricVal: { fontSize: 13, fontWeight: "700", color: "#2c1810" },
  metricLabel: { fontSize: 10, color: "#aaa", textAlign: "center" },
  txIcon: { backgroundColor: "#FFF4EE", padding: 8, borderRadius: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#2c1810" },
  modalLabel: { fontSize: 12, color: "#888" },
  modalInput: {
    backgroundColor: "#F6F1F1",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#2c1810",
  },
  modalBtn: {
    backgroundColor: "#2c1810",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalCancel: {
    textAlign: "center",
    color: "#aaa",
    fontWeight: "600",
    paddingVertical: 4,
  },
  fabContainer: { position: "absolute", bottom: 30, right: 20, zIndex: 1000 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#C4918A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C4918A",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
