import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  withRepeat,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import { router, useLocalSearchParams } from "expo-router";
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
import Animated from "react-native-reanimated";

// Tipos de tabs disponibles en la navegacion interna
type TabKey = "inicio" | "nutricion" | "finanzas";

// Estructura para los slots de comida del plan diario
type MealSlot = {
  slot: string;
  icon: string;
  meal: string | null;
  kcal: number | null;
};

// Estructura para las comidas registradas en el dia
type DayMeal = {
  mealId: string;
  recipeName: string;
  kcal: number;
  proteina: number;
  carbos: number;
  grasas: number;
};

// Estructura del presupuesto mensual
type Budget = { mensual: number };

// Estructura de las transacciones financieras
type Transaction = {
  id: string;
  monto: number;
  categoria: string;
  descripcion: string;
  fecha: any;
};

// Funcion que genera el ID de la fecha actual en formato YYYY-MM-DD
const getTodayId = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

// Funcion que retorna el saludo segun la hora del dia
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
};

// Funcion que retorna la fecha actual en formato legible
const getDayString = () => {
  const days = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const today = new Date();
  return `${days[today.getDay()]}, ${today.getDate()} de ${months[today.getMonth()]}`;
};

// Configuracion de tabs internas de la pantalla principal
const INNER_TABS = [
  { key: "inicio", label: "Inicio" },
  { key: "nutricion", label: "Nutricion" },
  { key: "finanzas", label: "Finanzas" },
];

// Datos de ejemplo para el plan de comidas del dia
const MEAL_PLAN_TODAY: MealSlot[] = [
  { slot: "Desayuno", icon: "🌅", meal: null, kcal: null },
  { slot: "Almuerzo", icon: "☀️", meal: null, kcal: null },
  { slot: "Cena", icon: "🌙", meal: null, kcal: null },
  { slot: "Snacks", icon: "🍎", meal: null, kcal: null },
];

// Configuracion de accesos rapidos del dashboard
const QUICK_ACCESS = [
  { label: "Inventario", icon: "Archive", color: "#FFF4EE", accent: "#C4918A", route: "/inventario" },
  { label: "Planificador", icon: "BowlFood", color: "#EEF4EE", accent: "#2D6A4F", route: "/planificador" },
  { label: "Recetas", icon: "CookingPot", color: "#F4EEFF", accent: "#7251C2", route: "/recetas" },
  { label: "Finanzas", icon: "PiggyBank", color: "#E8F4FD", accent: "#2563EB", route: "/finanzas" },
];

// Componente reutilizable para barras de progreso animadas
// FIX: Usa scaleX con valor numerico (0-1) en lugar de width con string porcentual
// Esto evita el error de Reanimated/Fabric: "You attempted to set the key `current`
// with the value `undefined` on an object that is meant to be immutable and has been frozen."
function AnimatedProgressBar({
  progress, // valor entre 0 y 1
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
      {/* El fill ocupa el 100% del contenedor y se escala desde el origen izquierdo */}
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: color },
          animStyle,
        ]}
      />
    </View>
  );
}

// Componente principal de la pantalla Home
export default function Home() {
  const user = auth.currentUser;
  const firstName = user?.displayName?.split(" ")[0] ?? "Chef";

  const [activeTab, setActiveTab] = useState<TabKey>("inicio");
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab = params.tab;

  // Estados de animaciones con Reanimated
  const translateY = useSharedValue(100);
  const scale = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const currentTabIndex = useSharedValue(0);
  const statsStagger = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Efecto para cambiar de tab cuando se recibe por parametro
  useEffect(() => {
    if (tab === "nutricion") setActiveTab("nutricion");
    else if (tab === "finanzas") setActiveTab("finanzas");
  }, [tab]);

  // Estados del inventario
  const [inventoryCount, setInventoryCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);

  // Estados de nutricion
  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [loadingNutricion, setLoadingNutricion] = useState(true);
  const [kcalObjetivo, setKcalObjetivo] = useState(0);

  // Estados de finanzas
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingFinanzas, setLoadingFinanzas] = useState(true);
  const [modalPresupuesto, setModalPresupuesto] = useState(false);
  const [inputPresupuesto, setInputPresupuesto] = useState("");

  // Inicializacion de animaciones al montar el componente
  useEffect(() => {
    translateY.value = withTiming(0, { duration: 600 });
    scale.value = withSpring(1);
    statsStagger.value = withTiming(1, { duration: 800 });
    pulseScale.value = withRepeat(withTiming(0.95, { duration: 1500 }), -1, true);
  }, []);

  // Efecto principal para cargar datos del usuario desde Firestore
  useEffect(() => {
    if (!user) return;

    // Listener para el inventario de despensa
    const unsubInv = onSnapshot(
      collection(db, "users", user.uid, "pantry_inventory"),
      (snap) => {
        setInventoryCount(snap.size);
        setExpiringCount(
          snap.docs.filter((d) => {
            const days = d.data().expirationDays;
            return days > 0 && days <= 3;
          }).length
        );
      }
    );

    // Listener para recetas guardadas
    const unsubRec = onSnapshot(
      collection(db, "users", user.uid, "recipes"),
      (snap) => setRecipesCount(snap.size)
    );

    // Listener para perfil nutricional y objetivo de calorias
    const unsubProfile = onSnapshot(
      doc(db, "users", user.uid, "profile", "nutricional"),
      (snap) => {
        if (snap.exists()) setKcalObjetivo(snap.data().tdee ?? 0);
      }
    );

    // Listener para comidas planificadas del dia actual
    const unsubMeals = onSnapshot(
      doc(db, "users", user.uid, "plan", getTodayId()),
      (snap) => {
        if (!snap.exists()) {
          setMeals([]);
        } else {
          const data = snap.data() as Record<string, any>;
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

    // Listener para configuracion de presupuesto
    const unsubBudget = onSnapshot(
      doc(db, "users", user.uid, "budget", "config"),
      (snap) => {
        setBudget(snap.exists() ? (snap.data() as Budget) : null);
        setLoadingFinanzas(false);
      }
    );

    // Listener para transacciones del mes actual
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const unsubTx = onSnapshot(
      query(
        collection(db, "users", user.uid, "expense_tracking"),
        orderBy("fecha", "desc"),
        limit(50)
      ),
      (snap) => {
        setTransactions(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }))
            .filter((t) => t.fecha?.toDate?.() >= startOfMonth)
        );
      }
    );

    // Limpieza de listeners al desmontar
    return () => {
      unsubInv();
      unsubRec();
      unsubProfile();
      unsubMeals();
      unsubBudget();
      unsubTx();
    };
  }, []);

  // Configuracion del gesto de deslizamiento para cambiar tabs
  const gestureHandler = Gesture.Pan()
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
        const newTab: TabKey = INNER_TABS[newIndex].key as TabKey;
        runOnJS(setActiveTab)(newTab);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
      translateX.value = withSpring(0);
    });

  // Manejador de scroll animado
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Estilo animado para el boton flotante
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  // Estilo animado para las estadisticas con efecto stagger
  // FIX: Se elimino la escala como objeto intermedio (causaba mutation en Fabric)
  // Ahora se aplica directamente como estilo en el componente View
  const statsAnimatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(statsStagger.value, [0, 1], [0, 1]);
    return {
      opacity: progress,
      transform: [{ scale: interpolate(progress, [0, 1], [0.9, 1]) }],
    };
  });

  // Estilo animado para el desplazamiento lateral de tabs
  const animatedTabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Estilo animado para el efecto parallax del header
  const headerParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 100], [0, -40]) },
    ],
  }));

  // Estilos animados para el pulso
  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Funcion para cerrar sesion
  const logout = async () => {
    await signOut(getAuth());
    router.replace("/(auth)/login");
  };

  // Funcion para guardar el presupuesto en Firestore
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

  // Calculo de totales nutricionales del dia
  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      proteina: acc.proteina + (m.proteina ?? 0),
      carbos: acc.carbos + (m.carbos ?? 0),
      grasas: acc.grasas + (m.grasas ?? 0),
    }),
    { kcal: 0, proteina: 0, carbos: 0, grasas: 0 }
  );

  // FIX: kcalPct es un numero entre 0 y 1 que se pasa directamente
  // al componente AnimatedProgressBar — ya no se usa progressWidth shared value
  // ni strings de porcentaje como "80%" dentro de useAnimatedStyle
  const kcalPct = kcalObjetivo > 0 ? Math.min(totals.kcal / kcalObjetivo, 1) : 0;
  const kcalBarColor =
    kcalPct >= 1
      ? "#E63946"
      : kcalPct >= 0.9
      ? "#2D6A4F"
      : kcalPct >= 0.8
      ? "#E9C46A"
      : "#C4918A";

  // Calculos financieros del mes
  const gastadoMes = transactions.reduce((acc, t) => acc + (t.monto ?? 0), 0);
  const pctGasto = budget ? Math.min(gastadoMes / budget.mensual, 1) : 0;
  const gastoBarColor =
    pctGasto >= 1 ? "#E63946" : pctGasto >= 0.9 ? "#E9C46A" : "#2D6A4F";
  const diasMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  const diaActual = new Date().getDate();
  const diasRestantes = diasMes - diaActual;
  const promedioDiario = diaActual > 0 ? gastadoMes / diaActual : 0;
  const proyeccion = promedioDiario * diasMes;
  const disponible = budget ? budget.mensual - gastadoMes : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <GestureDetector gesture={gestureHandler}>
        <Animated.View style={[{ flex: 1 }, animatedTabStyle]}>
          <Animated.ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            {/* Header con logo, saludo y boton de cerrar sesion */}
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

            {/* Barra de navegacion interna entre tabs */}
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
                    currentTabIndex.value = INNER_TABS.findIndex(
                      (t) => t.key === tabItem.key
                    );
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

            {/* Contenido de la tab Inicio */}
            {activeTab === "inicio" && (
              <>
                {/* Banner de alerta de productos por vencer */}
                {expiringCount > 0 && (
                  <TouchableOpacity
                    style={styles.alertBanner}
                    onPress={() => router.push("/inventario")}
                  >
                    <Text style={styles.alertEmoji}>!</Text>
                    <Text style={styles.alertText}>
                      {expiringCount} producto
                      {expiringCount > 1 ? "s" : ""} vence
                      {expiringCount === 1 ? "" : "n"} pronto
                    </Text>
                    <Icons.ArrowRightIcon
                      size={14}
                      color="#7A5C00"
                      weight="bold"
                    />
                  </TouchableOpacity>
                )}

                {/* Tarjetas de estadisticas animadas */}
                <Animated.View style={[styles.statsRow, statsAnimatedStyle]}>
                  <View
                    style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}
                  >
                    <Icons.ArchiveIcon
                      size={20}
                      color="#C4918A"
                      weight="fill"
                    />
                    <Text style={styles.statNumber}>{inventoryCount}</Text>
                    <Text style={styles.statLabel}>Inventario</Text>
                  </View>
                  <View
                    style={[styles.statCard, { backgroundColor: "#EEF4EE" }]}
                  >
                    <Icons.BowlFoodIcon
                      size={20}
                      color="#2D6A4F"
                      weight="fill"
                    />
                    <Text
                      style={[styles.statNumber, { color: "#2D6A4F" }]}
                    >
                      {recipesCount}
                    </Text>
                    <Text style={styles.statLabel}>Recetas</Text>
                  </View>
                  <View
                    style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}
                  >
                    <Icons.FireIcon size={20} color="#C4918A" weight="fill" />
                    <Text style={styles.statNumber}>
                      {Math.round(totals.kcal)}
                    </Text>
                    <Text style={styles.statLabel}>kcal hoy</Text>
                  </View>
                </Animated.View>

                {/* Tarjeta de racha diaria */}
                <View style={styles.streakCard}>
                  <View style={styles.streakHeader}>
                    <Icons.FireIcon size={20} color="#E9C46A" weight="fill" />
                    <Text style={styles.streakTitle}>Racha actual</Text>
                  </View>
                  <Text style={styles.streakNumber}>7 dias</Text>
                  <Text style={styles.streakSubtitle}>
                    Sigue asi! Completa tu plan de hoy
                  </Text>
                </View>

                {/* Tarjeta con el plan de comidas de hoy */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Plan de hoy</Text>
                    <TouchableOpacity
                      onPress={() => router.push("/planificador")}
                    >
                      <Text style={styles.seeAll}>Planificar</Text>
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
                      <TouchableOpacity
                        style={styles.addMealBtn}
                        onPress={() => router.push("/planificador")}
                      >
                        <Text style={styles.addMealText}>+ Anadir</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Seccion de accesos rapidos */}
                <Text style={styles.sectionTitle}>Accesos rapidos</Text>
                <View style={styles.quickGrid}>
                  {QUICK_ACCESS.map((item) => {
                    const IconComp = (Icons as any)[`${item.icon}Icon`];
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[
                          styles.quickCard,
                          { backgroundColor: item.color },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium
                          );
                          router.push(item.route as any);
                        }}
                        activeOpacity={0.75}
                      >
                        {IconComp && (
                          <IconComp
                            size={26}
                            color={item.accent}
                            weight="fill"
                          />
                        )}
                        <Text
                          style={[styles.quickLabel, { color: item.accent }]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Contenido de la tab Nutricion */}
            {activeTab === "nutricion" && (
              <>
                {loadingNutricion ? (
                  <ActivityIndicator
                    color="#C4918A"
                    style={{ marginTop: 40 }}
                  />
                ) : meals.length === 0 ? (
                  <Animated.View
                    style={[styles.emptyCard, pulseAnimatedStyle]}
                  >
                    <Icons.BowlFoodIcon
                      size={48}
                      color="#C4918A"
                      weight="thin"
                    />
                    <Text style={styles.emptyTitle}>
                      Sin comidas planificadas hoy
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      Agrega recetas a tu planificador para ver tu resumen
                      nutricional aqui.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyBtn}
                      onPress={() => router.push("/planificador")}
                    >
                      <Text style={styles.emptyBtnText}>
                        Ir al planificador
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ) : (
                  <>
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Calorias de hoy</Text>
                      <View style={styles.kcalRow}>
                        <Text style={styles.kcalConsumed}>
                          {Math.round(totals.kcal)}
                        </Text>
                        <Text style={styles.kcalTotal}>
                          {" "}
                          / {kcalObjetivo} kcal
                        </Text>
                      </View>

                      {/*
                       * FIX PRINCIPAL: Se reemplaza el Animated.View con width string porcentual
                       * por el componente AnimatedProgressBar que usa scaleX (valor numerico).
                       * Esto elimina el error:
                       * "You attempted to set the key `current` with the value `undefined`
                       *  on an object that is meant to be immutable and has been frozen."
                       */}
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
                  </>
                )}
              </>
            )}

            {/* Contenido de la tab Finanzas */}
            {activeTab === "finanzas" && (
              <>
                {loadingFinanzas ? (
                  <ActivityIndicator
                    color="#C4918A"
                    style={{ marginTop: 40 }}
                  />
                ) : (
                  <>
                    {budget ? (
                      <>
                        <View style={styles.card}>
                          <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>
                              Presupuesto mensual
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setInputPresupuesto(
                                  budget.mensual.toString()
                                );
                                setModalPresupuesto(true);
                              }}
                            >
                              <Text style={styles.seeAll}>Editar</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.kcalConsumed}>
                            ${gastadoMes.toLocaleString()}
                          </Text>
                          <Text style={styles.kcalTotal}>
                            {" "}
                            / ${budget.mensual.toLocaleString()}
                          </Text>

                          {/*
                           * FIX PRINCIPAL: Mismo fix que en Nutricion.
                           * Se usa AnimatedProgressBar con scaleX en lugar de
                           * width con string porcentual dentro de useAnimatedStyle.
                           */}
                          <AnimatedProgressBar
                            progress={pctGasto}
                            color={gastoBarColor}
                          />

                          <Text style={styles.kcalRemaining}>
                            {disponible > 0
                              ? `Disponible: $${disponible.toLocaleString()} (${diasRestantes} dias restantes)`
                              : `Excedido por $${Math.abs(disponible).toLocaleString()}`}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Animated.View
                        style={[styles.emptyCard, pulseAnimatedStyle]}
                      >
                        <Icons.PiggyBankIcon
                          size={48}
                          color="#C4918A"
                          weight="thin"
                        />
                        <Text style={styles.emptyTitle}>
                          Sin presupuesto configurado
                        </Text>
                        <Text style={styles.emptySubtitle}>
                          Configura tu presupuesto mensual para hacer
                          seguimiento de tus gastos.
                        </Text>
                        <TouchableOpacity
                          style={styles.emptyBtn}
                          onPress={() => setModalPresupuesto(true)}
                        >
                          <Text style={styles.emptyBtnText}>
                            Configurar presupuesto
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                  </>
                )}
              </>
            )}

            <View style={{ height: 100 }} />
          </Animated.ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* Boton flotante de accion principal */}
      <Animated.View style={[styles.fabContainer, fabStyle]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/planificador");
          }}
        >
          <Icons.PlusIcon size={24} color="#fff" weight="bold" />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal para configurar el presupuesto */}
      <Modal
        visible={modalPresupuesto}
        transparent
        animationType="slide"
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {budget ? "Editar presupuesto" : "Configurar presupuesto"}
              </Text>
              <Text style={styles.modalLabel}>
                Presupuesto mensual (COP)
              </Text>
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
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}

// Definicion de estilos
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: { fontSize: 14, color: "#888" },
  name: { fontSize: 26, fontWeight: "700", color: "#2c1810", marginTop: 2 },
  date: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerRight: { alignItems: "center", gap: 8 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
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
  // FIX: progressBg ahora es el contenedor que da el ancho real
  // progressFill ocupa el 100% y se escala via scaleX desde la izquierda
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
    width: "100%",         // ocupa todo el contenedor
    borderRadius: 8,
    // El origen de la transformacion es la esquina izquierda
    // scaleX: 0 = invisible, scaleX: 1 = completo
    // React Native escala desde el centro por defecto,
    // por eso usamos translateX para compensar y simular origen izquierdo
    transformOrigin: "left center" as any,
  },
  kcalRemaining: { fontSize: 11, color: "#aaa", marginBottom: 4 },
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
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  quickCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  quickLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
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
  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    zIndex: 1000,
  },
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
  streakCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E9C46A",
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2c1810",
    marginBottom: 4,
  },
  streakSubtitle: {
    fontSize: 12,
    color: "#7A5C00",
    textAlign: "center",
    fontWeight: "500",
  },
});