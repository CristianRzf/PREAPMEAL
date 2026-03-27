import { router } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type MealType = "desayuno" | "almuerzo" | "cena" | "snack";

interface Receta {
  id: string;
  nombre: string;
  imagen: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  tiempo: number;
  dificultad: string;
  tipo: MealType[];
  ingredientes: {
    nombre: string;
    cantidad: number;
    unidad: string;
    precio: number;
  }[];
}

interface SlotComida {
  recetaId: string;
  nombre: string;
  imagen: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  porciones: number;
}

type PlanSemana = {
  [fecha: string]: {
    [meal in MealType]?: SlotComida;
  };
};

// ─── Recetas hardcodeadas (muestra) ──────────────────────────────────────────

const RECETAS_DEMO: Receta[] = [
  {
    id: "r1",
    nombre: "Avena con frutas",
    imagen:
      "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=200",
    calorias: 320,
    proteinas: 12,
    carbohidratos: 55,
    grasas: 6,
    tiempo: 10,
    dificultad: "fácil",
    tipo: ["desayuno"],
    ingredientes: [
      { nombre: "Avena", cantidad: 80, unidad: "g", precio: 800 },
      { nombre: "Leche", cantidad: 200, unidad: "ml", precio: 1200 },
      { nombre: "Banano", cantidad: 1, unidad: "unidad", precio: 500 },
    ],
  },
  {
    id: "r2",
    nombre: "Huevos revueltos",
    imagen:
      "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=200",
    calorias: 280,
    proteinas: 18,
    carbohidratos: 5,
    grasas: 20,
    tiempo: 15,
    dificultad: "fácil",
    tipo: ["desayuno"],
    ingredientes: [
      { nombre: "Huevos", cantidad: 3, unidad: "unidad", precio: 1500 },
      { nombre: "Mantequilla", cantidad: 10, unidad: "g", precio: 400 },
    ],
  },
  {
    id: "r3",
    nombre: "Arroz con pollo",
    imagen:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200",
    calorias: 520,
    proteinas: 38,
    carbohidratos: 62,
    grasas: 10,
    tiempo: 40,
    dificultad: "intermedio",
    tipo: ["almuerzo"],
    ingredientes: [
      { nombre: "Arroz", cantidad: 150, unidad: "g", precio: 1000 },
      { nombre: "Pechuga de pollo", cantidad: 200, unidad: "g", precio: 4000 },
      { nombre: "Zanahoria", cantidad: 1, unidad: "unidad", precio: 600 },
    ],
  },
  {
    id: "r4",
    nombre: "Ensalada César",
    imagen:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200",
    calorias: 310,
    proteinas: 14,
    carbohidratos: 18,
    grasas: 22,
    tiempo: 15,
    dificultad: "fácil",
    tipo: ["almuerzo", "cena"],
    ingredientes: [
      { nombre: "Lechuga romana", cantidad: 150, unidad: "g", precio: 2000 },
      { nombre: "Pollo", cantidad: 100, unidad: "g", precio: 2500 },
      { nombre: "Aderezo César", cantidad: 30, unidad: "ml", precio: 1500 },
    ],
  },
  {
    id: "r5",
    nombre: "Salmón al horno",
    imagen:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200",
    calorias: 420,
    proteinas: 42,
    carbohidratos: 8,
    grasas: 24,
    tiempo: 30,
    dificultad: "intermedio",
    tipo: ["cena"],
    ingredientes: [
      { nombre: "Salmón", cantidad: 200, unidad: "g", precio: 12000 },
      { nombre: "Limón", cantidad: 1, unidad: "unidad", precio: 500 },
      { nombre: "Aceite de oliva", cantidad: 15, unidad: "ml", precio: 800 },
    ],
  },
  {
    id: "r6",
    nombre: "Pasta boloñesa",
    imagen: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=200",
    calorias: 580,
    proteinas: 28,
    carbohidratos: 72,
    grasas: 18,
    tiempo: 45,
    dificultad: "intermedio",
    tipo: ["almuerzo", "cena"],
    ingredientes: [
      { nombre: "Pasta", cantidad: 200, unidad: "g", precio: 2000 },
      { nombre: "Carne molida", cantidad: 150, unidad: "g", precio: 4500 },
      { nombre: "Tomate", cantidad: 200, unidad: "g", precio: 1000 },
    ],
  },
  {
    id: "r7",
    nombre: "Yogur con granola",
    imagen:
      "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=200",
    calorias: 210,
    proteinas: 10,
    carbohidratos: 32,
    grasas: 5,
    tiempo: 5,
    dificultad: "fácil",
    tipo: ["snack", "desayuno"],
    ingredientes: [
      { nombre: "Yogur griego", cantidad: 150, unidad: "g", precio: 3000 },
      { nombre: "Granola", cantidad: 40, unidad: "g", precio: 1500 },
    ],
  },
  {
    id: "r8",
    nombre: "Batido proteico",
    imagen:
      "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=200",
    calorias: 180,
    proteinas: 24,
    carbohidratos: 15,
    grasas: 3,
    tiempo: 5,
    dificultad: "fácil",
    tipo: ["snack", "desayuno"],
    ingredientes: [
      { nombre: "Proteína en polvo", cantidad: 30, unidad: "g", precio: 4000 },
      { nombre: "Leche", cantidad: 250, unidad: "ml", precio: 1500 },
      { nombre: "Banano", cantidad: 1, unidad: "unidad", precio: 500 },
    ],
  },
];

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: "☀️ Desayuno",
  almuerzo: "🍽️ Almuerzo",
  cena: "🌙 Cena",
  snack: "🍎 Snack",
};

const MEAL_COLORS: Record<MealType, string> = {
  desayuno: "#FF9500",
  almuerzo: "#34C759",
  cena: "#5856D6",
  snack: "#FF2D55",
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MEALS: MealType[] = ["desayuno", "almuerzo", "cena", "snack"];
const OBJETIVO_CALORIAS = 2000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function calcDayNutrition(dayPlan: { [meal in MealType]?: SlotComida }) {
  return Object.values(dayPlan || {}).reduce(
    (acc, slot) => {
      if (!slot) return acc;
      return {
        calorias: acc.calorias + slot.calorias * slot.porciones,
        proteinas: acc.proteinas + slot.proteinas * slot.porciones,
        carbohidratos: acc.carbohidratos + slot.carbohidratos * slot.porciones,
        grasas: acc.grasas + slot.grasas * slot.porciones,
      };
    },
    { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Planificador() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDates, setWeekDates] = useState<Date[]>(getWeekDates(0));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [plan, setPlan] = useState<PlanSemana>({});
  const [loading, setLoading] = useState(false);

  // Modales
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalOpciones, setModalOpciones] = useState(false);
  const [modalPorciones, setModalPorciones] = useState(false);
  const [modalMover, setModalMover] = useState(false);

  // Selección actual
  const [slotActual, setSlotActual] = useState<{
    meal: MealType;
    fecha: string;
  } | null>(null);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState<Receta | null>(
    null,
  );
  const [porciones, setPorciones] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMeal, setFiltroMeal] = useState<MealType | "todas">("todas");

  // Mover
  const [diaDestino, setDiaDestino] = useState<string>("");
  const [mealDestino, setMealDestino] = useState<MealType>("almuerzo");

  const db = getFirestore();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    setWeekDates(getWeekDates(weekOffset));
  }, [weekOffset]);

  useEffect(() => {
    if (userId) cargarPlan();
  }, [weekDates, userId]);

  // ─── Firestore ─────────────────────────────────────────────────────────────

  const cargarPlan = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const keys = weekDates.map(dateKey);
      const newPlan: PlanSemana = {};
      for (const key of keys) {
        const ref = doc(db, "users", userId, "plan", key);
        const snap = await getDoc(ref);
        if (snap.exists()) newPlan[key] = snap.data() as any;
      }
      setPlan(newPlan);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const guardarSlot = async (
    fecha: string,
    meal: MealType,
    slot: SlotComida,
  ) => {
    if (!userId) return;
    const ref = doc(db, "users", userId, "plan", fecha);
    const existing = plan[fecha] || {};
    const updated = { ...existing, [meal]: slot };
    await setDoc(ref, updated, { merge: true });
    setPlan((prev) => ({ ...prev, [fecha]: updated }));
  };

  const eliminarSlot = async (fecha: string, meal: MealType) => {
    if (!userId) return;
    const ref = doc(db, "users", userId, "plan", fecha);
    const existing = { ...(plan[fecha] || {}) };
    delete existing[meal];
    if (Object.keys(existing).length === 0) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, existing);
    }
    setPlan((prev) => {
      const updated = { ...prev, [fecha]: existing };
      if (Object.keys(existing).length === 0) delete updated[fecha];
      return updated;
    });
  };

  // ─── Acciones ──────────────────────────────────────────────────────────────

  const abrirAgregar = (fecha: string, meal: MealType) => {
    setSlotActual({ fecha, meal });
    setFiltroMeal(meal);
    setBusqueda("");
    setRecetaSeleccionada(null);
    setPorciones(1);
    setModalAgregar(true);
  };

  const confirmarAgregar = async () => {
    if (!recetaSeleccionada || !slotActual) return;
    const slot: SlotComida = {
      recetaId: recetaSeleccionada.id,
      nombre: recetaSeleccionada.nombre,
      imagen: recetaSeleccionada.imagen,
      calorias: recetaSeleccionada.calorias,
      proteinas: recetaSeleccionada.proteinas,
      carbohidratos: recetaSeleccionada.carbohidratos,
      grasas: recetaSeleccionada.grasas,
      porciones,
    };
    await guardarSlot(slotActual.fecha, slotActual.meal, slot);
    setModalAgregar(false);
    setModalPorciones(false);
  };

  const abrirOpciones = (fecha: string, meal: MealType) => {
    setSlotActual({ fecha, meal });
    setModalOpciones(true);
  };

  const handleEliminar = () => {
    Alert.alert("Eliminar receta", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          if (!slotActual) return;
          await eliminarSlot(slotActual.fecha, slotActual.meal);
          setModalOpciones(false);
        },
      },
    ]);
  };

  const handleCambiarPorciones = () => {
    if (!slotActual) return;
    const slot = plan[slotActual.fecha]?.[slotActual.meal];
    if (slot) setPorciones(slot.porciones);
    setModalOpciones(false);
    setModalPorciones(true);
  };

  const confirmarCambiarPorciones = async () => {
    if (!slotActual) return;
    const slot = plan[slotActual.fecha]?.[slotActual.meal];
    if (!slot) return;
    await guardarSlot(slotActual.fecha, slotActual.meal, {
      ...slot,
      porciones,
    });
    setModalPorciones(false);
  };

  const handleMover = () => {
    setDiaDestino(dateKey(selectedDay));
    setMealDestino("almuerzo");
    setModalOpciones(false);
    setModalMover(true);
  };

  const confirmarMover = async () => {
    if (!slotActual) return;
    const slot = plan[slotActual.fecha]?.[slotActual.meal];
    if (!slot) return;

    const destinoOcupado = plan[diaDestino]?.[mealDestino];
    if (destinoOcupado) {
      Alert.alert(
        "Destino ocupado",
        `Ya hay una receta en ese slot. ¿Reemplazar?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Reemplazar",
            onPress: async () => {
              await eliminarSlot(slotActual.fecha, slotActual.meal);
              await guardarSlot(diaDestino, mealDestino, slot);
              setModalMover(false);
            },
          },
        ],
      );
    } else {
      await eliminarSlot(slotActual.fecha, slotActual.meal);
      await guardarSlot(diaDestino, mealDestino, slot);
      setModalMover(false);
    }
  };

  const generarListaCompras = async () => {
    const todasRecetas = Object.values(plan).flatMap(
      (day) => Object.values(day || {}).filter(Boolean) as SlotComida[],
    );
    if (todasRecetas.length === 0) return;

    if (!userId) return;
    setLoading(true);

    try {
      // Consolidar ingredientes
      const consolidado: Record<
        string,
        {
          nombre: string;
          cantidad: number;
          unidad: string;
          precio: number;
          recetas: string[];
        }
      > = {};

      for (const slot of todasRecetas) {
        const receta = RECETAS_DEMO.find((r) => r.id === slot.recetaId);
        if (!receta) continue;
        for (const ing of receta.ingredientes) {
          const key = ing.nombre.toLowerCase();
          if (consolidado[key]) {
            consolidado[key].cantidad += ing.cantidad * slot.porciones;
            consolidado[key].precio += ing.precio * slot.porciones;
            if (!consolidado[key].recetas.includes(slot.nombre))
              consolidado[key].recetas.push(slot.nombre);
          } else {
            consolidado[key] = {
              nombre: ing.nombre,
              cantidad: ing.cantidad * slot.porciones,
              unidad: ing.unidad,
              precio: ing.precio * slot.porciones,
              recetas: [slot.nombre],
            };
          }
        }
      }

      const items = Object.values(consolidado).map((ing) => ({
        ...ing,
        comprado: false,
      }));

      await addDoc(collection(db, "users", userId, "listas"), {
        items,
        creadoEn: serverTimestamp(),
        completada: false,
        totalEstimado: items.reduce((a, i) => a + i.precio, 0),
      });

      Alert.alert("✅ Lista creada", "Tu lista de compras fue generada.", [
        {
          text: "Ver lista",
          onPress: () => router.push("/(tabs)/listadeCompras"),
        },
        { text: "OK" },
      ]);
    } catch (e) {
      Alert.alert("Error", "No se pudo generar la lista.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Datos computados ──────────────────────────────────────────────────────

  const recetasFiltradas = RECETAS_DEMO.filter((r) => {
    const matchBusqueda = r.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    const matchMeal = filtroMeal === "todas" || r.tipo.includes(filtroMeal);
    return matchBusqueda && matchMeal;
  });

  const totalRecetas = Object.values(plan).reduce(
    (acc, day) => acc + Object.values(day || {}).filter(Boolean).length,
    0,
  );

  const resumenSemanal = weekDates.reduce(
    (acc, date) => {
      const key = dateKey(date);
      const day = plan[key] || {};
      const n = calcDayNutrition(day);
      const tieneRecetas = Object.values(day).filter(Boolean).length > 0;
      return {
        calorias: acc.calorias + n.calorias,
        proteinas: acc.proteinas + n.proteinas,
        diasCompletos: acc.diasCompletos + (tieneRecetas ? 1 : 0),
      };
    },
    { calorias: 0, proteinas: 0, diasCompletos: 0 },
  );

  const selectedKey = dateKey(selectedDay);
  const dayPlan = plan[selectedKey] || {};
  const dayNutrition = calcDayNutrition(dayPlan);
  const caloriasProgress = Math.min(
    dayNutrition.calorias / OBJETIVO_CALORIAS,
    1,
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📅 Mi Semana</Text>
          {totalRecetas > 0 && (
            <TouchableOpacity
              style={styles.btnLista}
              onPress={generarListaCompras}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnListaText}>🛒 Generar lista</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Navegación semana */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.weekBtn}
            onPress={() => setWeekOffset((w) => w - 1)}
          >
            <Text style={styles.weekBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>
            {weekDates[0]?.toLocaleDateString("es-CO", {
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {weekDates[6]?.toLocaleDateString("es-CO", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity
            style={styles.weekBtn}
            onPress={() => setWeekOffset((w) => w + 1)}
          >
            <Text style={styles.weekBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de día */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daySelector}
        >
          {weekDates.map((date, i) => {
            const key = dateKey(date);
            const isSelected = key === selectedKey;
            const isToday = key === dateKey(new Date());
            const hasMeals =
              Object.values(plan[key] || {}).filter(Boolean).length > 0;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                onPress={() => setSelectedDay(date)}
              >
                <Text
                  style={[styles.dayName, isSelected && styles.dayNameSelected]}
                >
                  {DIAS[date.getDay()]}
                </Text>
                <Text
                  style={[styles.dayNum, isSelected && styles.dayNumSelected]}
                >
                  {date.getDate()}
                </Text>
                {hasMeals && (
                  <View
                    style={[
                      styles.dotMeal,
                      isSelected && styles.dotMealSelected,
                    ]}
                  />
                )}
                {isToday && <Text style={styles.todayLabel}>hoy</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Resumen nutricional del día */}
        <View style={styles.nutritionCard}>
          <View style={styles.nutritionHeader}>
            <Text style={styles.nutritionTitle}>
              {selectedDay.toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
            <Text style={styles.caloriesText}>
              {dayNutrition.calorias} / {OBJETIVO_CALORIAS} kcal
            </Text>
          </View>

          {/* Barra progreso */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${caloriasProgress * 100}%`,
                  backgroundColor:
                    caloriasProgress > 1
                      ? "#FF3B30"
                      : caloriasProgress > 0.9
                        ? "#FF9500"
                        : "#34C759",
                },
              ]}
            />
          </View>

          {/* Macros */}
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: "#5856D6" }]} />
              <Text style={styles.macroLabel}>Proteínas</Text>
              <Text style={styles.macroValue}>{dayNutrition.proteinas}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: "#34C759" }]} />
              <Text style={styles.macroLabel}>Carbos</Text>
              <Text style={styles.macroValue}>
                {dayNutrition.carbohidratos}g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: "#FF9500" }]} />
              <Text style={styles.macroLabel}>Grasas</Text>
              <Text style={styles.macroValue}>{dayNutrition.grasas}g</Text>
            </View>
          </View>
        </View>

        {/* Slots de comidas */}
        <View style={styles.mealsContainer}>
          {MEALS.map((meal) => {
            const slot = dayPlan[meal];
            return (
              <View key={meal} style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <View
                    style={[
                      styles.mealDot,
                      { backgroundColor: MEAL_COLORS[meal] },
                    ]}
                  />
                  <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                </View>

                {slot ? (
                  <View style={styles.slotFilled}>
                    <Image
                      source={{ uri: slot.imagen }}
                      style={styles.slotImage}
                    />
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotName} numberOfLines={1}>
                        {slot.nombre}
                      </Text>
                      <Text style={styles.slotCals}>
                        🔥 {slot.calorias * slot.porciones} kcal
                      </Text>
                      <Text style={styles.slotPorciones}>
                        {slot.porciones} porción{slot.porciones > 1 ? "es" : ""}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.slotMenu}
                      onPress={() => abrirOpciones(selectedKey, meal)}
                    >
                      <Text style={styles.slotMenuIcon}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.slotEmpty}
                    onPress={() => abrirAgregar(selectedKey, meal)}
                  >
                    <Text style={styles.slotEmptyIcon}>+</Text>
                    <Text style={styles.slotEmptyText}>Agregar receta</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Resumen semanal */}
        <View style={styles.weekSummary}>
          <Text style={styles.weekSummaryTitle}>📊 Resumen semanal</Text>
          <View style={styles.weekSummaryGrid}>
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryValue}>
                {Math.round(resumenSemanal.calorias / 7)}
              </Text>
              <Text style={styles.weekSummaryLabel}>kcal/día promedio</Text>
            </View>
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryValue}>
                {Math.round(resumenSemanal.proteinas)}g
              </Text>
              <Text style={styles.weekSummaryLabel}>proteínas totales</Text>
            </View>
            <View style={styles.weekSummaryItem}>
              <Text style={[styles.weekSummaryValue, { color: "#2D6A4F" }]}>
                {resumenSemanal.diasCompletos}/7
              </Text>
              <Text style={styles.weekSummaryLabel}>días con comidas</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ─── Modal Agregar Receta ─────────────────────────────────────────── */}
      <Modal visible={modalAgregar} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalAgregar(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Agregar receta</Text>
            <View style={{ width: 30 }} />
          </View>

          {/* Búsqueda */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar receta..."
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>

          {/* Filtros de tipo */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
          >
            {(["todas", ...MEALS] as (MealType | "todas")[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  filtroMeal === f && styles.filterChipActive,
                ]}
                onPress={() => setFiltroMeal(f)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filtroMeal === f && styles.filterChipTextActive,
                  ]}
                >
                  {f === "todas" ? "Todas" : MEAL_LABELS[f as MealType]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {recetaSeleccionada ? (
            // Vista de porciones
            <ScrollView
              contentContainerStyle={styles.porcionesView}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: recetaSeleccionada.imagen }}
                style={styles.recetaImagenGrande}
              />
              <Text style={styles.recetaNombreGrande}>
                {recetaSeleccionada.nombre}
              </Text>

              <Text style={styles.porcionesLabel}>Número de porciones</Text>
              <View style={styles.porcionesControl}>
                <TouchableOpacity
                  style={styles.porcionBtn}
                  onPress={() => setPorciones((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.porcionBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.porcionNum}>{porciones}</Text>
                <TouchableOpacity
                  style={styles.porcionBtn}
                  onPress={() => setPorciones((p) => Math.min(10, p + 1))}
                >
                  <Text style={styles.porcionBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Preview nutricional */}
              <View style={styles.nutritionPreview}>
                <Text style={styles.nutritionPreviewTitle}>
                  Preview nutricional ({porciones} porción
                  {porciones > 1 ? "es" : ""})
                </Text>
                <View style={styles.macrosRow}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {recetaSeleccionada.calorias * porciones}
                    </Text>
                    <Text style={styles.macroLabel}>kcal</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {recetaSeleccionada.proteinas * porciones}g
                    </Text>
                    <Text style={styles.macroLabel}>proteínas</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {recetaSeleccionada.carbohidratos * porciones}g
                    </Text>
                    <Text style={styles.macroLabel}>carbos</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {recetaSeleccionada.grasas * porciones}g
                    </Text>
                    <Text style={styles.macroLabel}>grasas</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setRecetaSeleccionada(null)}
                >
                  <Text style={styles.btnSecondaryText}>← Cambiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={confirmarAgregar}
                >
                  <Text style={styles.btnPrimaryText}>✓ Confirmar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={recetasFiltradas}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recetaCard}
                  onPress={() => {
                    setRecetaSeleccionada(item);
                    setPorciones(1);
                  }}
                >
                  <Image
                    source={{ uri: item.imagen }}
                    style={styles.recetaCardImage}
                  />
                  <View style={styles.recetaCardInfo}>
                    <Text style={styles.recetaCardName}>{item.nombre}</Text>
                    <Text style={styles.recetaCardCals}>
                      🔥 {item.calorias} kcal · ⏱️ {item.tiempo} min
                    </Text>
                    <Text style={styles.recetaCardDif}>{item.dificultad}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── Modal Opciones ───────────────────────────────────────────────── */}
      <Modal visible={modalOpciones} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setModalOpciones(false)}
        >
          <View style={styles.optionsModal}>
            <Text style={styles.optionsTitle}>Opciones</Text>
            {[
              {
                icon: "🔢",
                label: "Cambiar porciones",
                onPress: handleCambiarPorciones,
              },
              {
                icon: "🔄",
                label: "Reemplazar receta",
                onPress: () => {
                  setModalOpciones(false);
                  setBusqueda("");
                  setRecetaSeleccionada(null);
                  setPorciones(1);
                  setModalAgregar(true);
                },
              },
              { icon: "↗️", label: "Mover a otro slot", onPress: handleMover },
              {
                icon: "🗑️",
                label: "Eliminar",
                onPress: handleEliminar,
                danger: true,
              },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={styles.optionItem}
                onPress={opt.onPress}
              >
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    opt.danger && { color: "#FF3B30" },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Modal Cambiar Porciones ──────────────────────────────────────── */}
      <Modal visible={modalPorciones} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.porcionesModal}>
            <Text style={styles.modalTitle}>Cambiar porciones</Text>
            <View style={styles.porcionesControl}>
              <TouchableOpacity
                style={styles.porcionBtn}
                onPress={() => setPorciones((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.porcionBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.porcionNum}>{porciones}</Text>
              <TouchableOpacity
                style={styles.porcionBtn}
                onPress={() => setPorciones((p) => Math.min(10, p + 1))}
              >
                <Text style={styles.porcionBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setModalPorciones(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={confirmarCambiarPorciones}
              >
                <Text style={styles.btnPrimaryText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Mover ──────────────────────────────────────────────────── */}
      <Modal visible={modalMover} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.moverModal}>
            <Text style={styles.modalTitle}>Mover a...</Text>

            <Text style={styles.moverLabel}>Día destino</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {weekDates.map((date) => {
                const key = dateKey(date);
                const isSelected = key === diaDestino;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.dayChip,
                      isSelected && styles.dayChipSelected,
                      { marginRight: 8 },
                    ]}
                    onPress={() => setDiaDestino(key)}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        isSelected && styles.dayNameSelected,
                      ]}
                    >
                      {DIAS[date.getDay()]}
                    </Text>
                    <Text
                      style={[
                        styles.dayNum,
                        isSelected && styles.dayNumSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.moverLabel}>Comida destino</Text>
            <View style={styles.mealChips}>
              {MEALS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.filterChip,
                    mealDestino === m && styles.filterChipActive,
                  ]}
                  onPress={() => setMealDestino(m)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      mealDestino === m && styles.filterChipTextActive,
                    ]}
                  >
                    {MEAL_LABELS[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setModalMover(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={confirmarMover}
              >
                <Text style={styles.btnPrimaryText}>Mover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F1F1" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1A1A1A" },
  btnLista: {
    backgroundColor: "#2D6A4F",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnListaText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  weekBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  weekBtnText: { fontSize: 20, color: "#2D6A4F", fontWeight: "bold" },
  weekLabel: { fontSize: 14, color: "#555", fontWeight: "500" },

  daySelector: { paddingLeft: 16, marginBottom: 16 },
  dayChip: {
    alignItems: "center",
    marginRight: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    minWidth: 52,
    elevation: 1,
  },
  dayChipSelected: { backgroundColor: "#2D6A4F" },
  dayName: { fontSize: 11, color: "#888", fontWeight: "500" },
  dayNameSelected: { color: "#fff" },
  dayNum: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },
  dayNumSelected: { color: "#fff" },
  dotMeal: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#2D6A4F",
    marginTop: 3,
  },
  dotMealSelected: { backgroundColor: "#fff" },
  todayLabel: {
    fontSize: 9,
    color: "#FF9500",
    fontWeight: "700",
    marginTop: 1,
  },

  nutritionCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    textTransform: "capitalize",
  },
  caloriesText: { fontSize: 13, color: "#555" },
  progressBar: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  macrosRow: { flexDirection: "row", justifyContent: "space-around" },
  macroItem: { alignItems: "center", gap: 3 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 11, color: "#888" },
  macroValue: { fontSize: 14, fontWeight: "bold", color: "#1A1A1A" },

  mealsContainer: { paddingHorizontal: 16, gap: 12 },
  mealSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    elevation: 1,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  mealDot: { width: 10, height: 10, borderRadius: 5 },
  mealTitle: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },

  slotFilled: { flexDirection: "row", alignItems: "center", gap: 10 },
  slotImage: { width: 60, height: 60, borderRadius: 10 },
  slotInfo: { flex: 1 },
  slotName: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  slotCals: { fontSize: 12, color: "#888", marginTop: 2 },
  slotPorciones: { fontSize: 11, color: "#2D6A4F", marginTop: 1 },
  slotMenu: { padding: 8 },
  slotMenuIcon: { fontSize: 20, color: "#888" },

  slotEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    borderStyle: "dashed",
    paddingHorizontal: 14,
  },
  slotEmptyIcon: { fontSize: 20, color: "#BDBDBD" },
  slotEmptyText: { fontSize: 14, color: "#BDBDBD" },

  weekSummary: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 1,
  },
  weekSummaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 14,
  },
  weekSummaryGrid: { flexDirection: "row", justifyContent: "space-around" },
  weekSummaryItem: { alignItems: "center" },
  weekSummaryValue: { fontSize: 22, fontWeight: "bold", color: "#1A1A1A" },
  weekSummaryLabel: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    marginTop: 3,
  },

  // Modales
  modalContainer: {
    flex: 1,
    backgroundColor: "#F6F1F1",
    justifyContent: "flex-start",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalClose: { fontSize: 18, color: "#888", padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },

  filterRow: {
    paddingLeft: 16,
    marginBottom: 8,
    height: 50,
    paddingVertical: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    elevation: 1,
    height: 34,
    justifyContent: "center",
  },
  filterChipActive: { backgroundColor: "#2D6A4F" },
  filterChipText: { fontSize: 12, color: "#555" },
  filterChipTextActive: { color: "#fff", fontWeight: "600" },

  recetaCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 2,
    alignSelf: "stretch",
  },

  recetaCardImage: { width: 80, height: 80 },
  recetaCardInfo: { flex: 1, padding: 10, justifyContent: "center" },
  recetaCardName: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  recetaCardCals: { fontSize: 12, color: "#888", marginTop: 3 },
  recetaCardDif: { fontSize: 11, color: "#2D6A4F", marginTop: 2 },

  porcionesView: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
    paddingBottom: 60,
    justifyContent: "flex-start",
  },
  recetaImagenGrande: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
  },
  recetaNombreGrande: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 20,
    textAlign: "center",
  },
  porcionesLabel: { fontSize: 15, color: "#555", marginBottom: 12 },
  porcionesControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  porcionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2D6A4F",
    alignItems: "center",
    justifyContent: "center",
  },
  porcionBtnText: { fontSize: 22, color: "#fff", fontWeight: "bold" },
  porcionNum: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1A1A1A",
    minWidth: 40,
    textAlign: "center",
  },

  nutritionPreview: {
    width: "100%",
    backgroundColor: "#F0F7F4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  nutritionPreviewTitle: {
    fontSize: 13,
    color: "#2D6A4F",
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },

  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#2D6A4F",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  btnSecondary: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  btnSecondaryText: { color: "#555", fontWeight: "600", fontSize: 15 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  optionsModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  optionIcon: { fontSize: 20 },
  optionLabel: { fontSize: 15, color: "#1A1A1A" },

  porcionesModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 20,
  },
  moverModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  moverLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  mealChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
});
