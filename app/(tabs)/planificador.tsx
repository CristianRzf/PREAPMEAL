import { router, Stack, Tabs } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
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

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  snack: "Snack",
};

const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MEALS: MealType[] = ["desayuno", "almuerzo", "cena", "snack"];
const OBJETIVO_CALORIAS = 2000;

// Paleta del diseño Figma
const COLORS = {
  bg: "#F5F0ED",
  card: "#C4918A",
  cardDark: "#B07D76",
  surface: "#FFFFFF",
  tableHeader: "#F8F4F1",
  tableBorder: "#EDE8E4",
  text: "#2C1810",
  textMuted: "#7A5C56",
  textLight: "#FFFFFF",
  accent: "#2D6A4F",
  danger: "#E05050",
  dot: "#C4918A",
};

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

/**
 * Normaliza el campo tipo/mealType del seed a MealType[]
 * para compatibilidad con los filtros del planificador.
 */
function normalizarTipo(data: any): MealType[] {
  if (Array.isArray(data.tipo) && data.tipo.length > 0) return data.tipo;
  if (data.mealType && typeof data.mealType === "string") {
    return [data.mealType as MealType];
  }
  return ["almuerzo"];
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Planificador() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDates, setWeekDates] = useState<Date[]>(getWeekDates(0));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [plan, setPlan] = useState<PlanSemana>({});
  const [loading, setLoading] = useState(false);

  // ── Recetas desde Firestore (reemplaza RECETAS_DEMO) ──
  const [recetasFirestore, setRecetasFirestore] = useState<Receta[]>([]);
  const [cargandoRecetas, setCargandoRecetas] = useState(false);

  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalOpciones, setModalOpciones] = useState(false);
  const [modalPorciones, setModalPorciones] = useState(false);
  const [modalMover, setModalMover] = useState(false);

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

  // Carga recetas de Firestore al montar el componente
  useEffect(() => {
    cargarRecetasFirestore();
  }, []);

  // ─── Firestore — Recetas ──────────────────────────────────────────────────

  const cargarRecetasFirestore = async () => {
    setCargandoRecetas(true);
    try {
      const q = query(collection(db, "recipes"), orderBy("creadoEn", "desc"));
      const snap = await getDocs(q);
      const lista: Receta[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          nombre: data.titulo || data.nombre || "Sin nombre",
          imagen: data.imagen || "",
          calorias: data.calorias || 0,
          proteinas: data.proteinas || 0,
          carbohidratos: data.carbohidratos || 0,
          grasas: data.grasas || 0,
          tiempo: data.tiempo || 30,
          dificultad: data.dificultad || "fácil",
          tipo: normalizarTipo(data),
          ingredientes: Array.isArray(data.ingredientes)
            ? data.ingredientes
            : [],
        };
      });
      setRecetasFirestore(lista);
    } catch (e) {
      console.error("Error cargando recetas:", e);
      Alert.alert("Error", "No se pudieron cargar las recetas.");
    } finally {
      setCargandoRecetas(false);
    }
  };

  // ─── Firestore — Plan ─────────────────────────────────────────────────────

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
    const todayKey = dateKey(new Date());
    const primerDiaValido = weekDates.find((d) => dateKey(d) >= todayKey);
    setDiaDestino(primerDiaValido ? dateKey(primerDiaValido) : todayKey);
    if (slotActual) setMealDestino(slotActual.meal);
    setModalOpciones(false);
    setModalMover(true);
  };

  const confirmarMover = async () => {
    if (!slotActual) return;
    const slot = plan[slotActual.fecha]?.[slotActual.meal];
    if (!slot) return;
    const destinoOcupado = plan[diaDestino]?.[mealDestino];
    if (destinoOcupado) {
      Alert.alert("Destino ocupado", "¿Reemplazar la receta existente?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reemplazar",
          onPress: async () => {
            await eliminarSlot(slotActual.fecha, slotActual.meal);
            await guardarSlot(diaDestino, mealDestino, slot);
            setModalMover(false);
          },
        },
      ]);
    } else {
      await eliminarSlot(slotActual.fecha, slotActual.meal);
      await guardarSlot(diaDestino, mealDestino, slot);
      setModalMover(false);
    }
  };

  // generarListaCompras usa recetasFirestore en lugar de RECETAS_DEMO
  const generarListaCompras = async () => {
    const todasRecetas = Object.values(plan).flatMap(
      (day) => Object.values(day || {}).filter(Boolean) as SlotComida[],
    );
    if (todasRecetas.length === 0) return;
    if (!userId) return;
    setLoading(true);
    try {
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
        const receta = recetasFirestore.find((r) => r.id === slot.recetaId);
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
      Alert.alert("Lista creada", "Tu lista de compras fue generada.", [
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

  // Filtra sobre recetasFirestore en lugar de RECETAS_DEMO
  const recetasFiltradas = recetasFirestore.filter((r) => {
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

  const calPromedioSemana = Math.round(resumenSemanal.calorias / 7);
  const proteinasSemana = Math.round(resumenSemanal.proteinas);
  const recetasUnicas = new Set(
    Object.values(plan).flatMap((day) =>
      Object.values(day || {})
        .filter(Boolean)
        .map((s) => (s as SlotComida).recetaId),
    ),
  ).size;

  const selectedKey = dateKey(selectedDay);
  const dayPlan = plan[selectedKey] || {};

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── HEADER (igual al Home) ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Planificador</Text>
            <Text style={styles.headerSub}>Organiza tu semana</Text>
          </View>
          <Image
            source={require("../../Logo Chef.png")}
            style={styles.headerLogo}
          />
        </View>

        {/* ── Stats cards — 1 fila de 4 ── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>
            <Text style={styles.statNumber}>{totalRecetas}</Text>
            <Text style={styles.statLabel}>Comidas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.cardDark }]}>
            <Text style={styles.statNumber}>{calPromedioSemana}</Text>
            <Text style={styles.statLabel}>Cal/Día</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>
            <Text style={styles.statNumber}>{proteinasSemana}</Text>
            <Text style={styles.statLabel}>Proteína</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.cardDark }]}>
            <Text style={styles.statNumber}>{recetasUnicas}</Text>
            <Text style={styles.statLabel}>Recetas</Text>
          </View>
        </View>

        {/* ── Tabla semanal ── */}
        <View style={styles.tableCard}>
          {/* Encabezado de tabla */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell}>Semana actual</Text>
            <View style={styles.tableHeaderDays}>
              {weekDates.map((date) => {
                const key = dateKey(date);
                const isSelected = key === selectedKey;
                const isToday = key === dateKey(new Date());
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.dayHeaderBtn,
                      isSelected && styles.dayHeaderBtnActive,
                    ]}
                    onPress={() => setSelectedDay(date)}
                  >
                    <Text
                      style={[
                        styles.dayHeaderLabel,
                        isSelected && styles.dayHeaderLabelActive,
                      ]}
                    >
                      {DIAS_CORTO[date.getDay()]}
                    </Text>
                    <Text
                      style={[
                        styles.dayHeaderNum,
                        isSelected && styles.dayHeaderNumActive,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    {isToday && <View style={styles.todayDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Navegación semana */}
          <View style={styles.weekNavRow}>
            <TouchableOpacity
              onPress={() => setWeekOffset((w) => w - 1)}
              style={styles.weekNavBtn}
            >
              <Text style={styles.weekNavArrow}>{"<"}</Text>
            </TouchableOpacity>
            <Text style={styles.weekNavLabel}>
              {weekDates[0]?.toLocaleDateString("es-CO", {
                day: "numeric",
                month: "short",
              })}
              {" – "}
              {weekDates[6]?.toLocaleDateString("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              onPress={() => setWeekOffset((w) => w + 1)}
              style={styles.weekNavBtn}
            >
              <Text style={styles.weekNavArrow}>{">"}</Text>
            </TouchableOpacity>
          </View>

          {/* Filas de comidas */}
          {MEALS.map((meal, mealIdx) => (
            <View
              key={meal}
              style={[
                styles.mealRow,
                mealIdx < MEALS.length - 1 && styles.mealRowBorder,
              ]}
            >
              {/* Label comida */}
              <View style={styles.mealLabelCell}>
                <Text style={styles.mealLabelText}>{MEAL_LABELS[meal]}</Text>
              </View>

              {/* Celdas por día */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dayCellsScroll}
              >
                <View style={styles.dayCellsRow}>
                  {weekDates.map((date) => {
                    const key = dateKey(date);
                    const slot = plan[key]?.[meal];
                    const isSelected = key === selectedKey;
                    const todayKey = dateKey(new Date());
                    const isPast = key < todayKey;
                    return (
                      <View
                        key={key}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isPast && styles.dayCellPast,
                        ]}
                      >
                        {slot ? (
                          <TouchableOpacity
                            style={styles.slotFilledCell}
                            onPress={() => !isPast && abrirOpciones(key, meal)}
                            activeOpacity={isPast ? 1 : 0.7}
                          >
                            <Image
                              source={{ uri: slot.imagen }}
                              style={[
                                styles.slotThumb,
                                isPast && { opacity: 0.4 },
                              ]}
                            />
                            <Text
                              style={[
                                styles.slotCellName,
                                isPast && { color: "#bbb" },
                              ]}
                              numberOfLines={1}
                            >
                              {slot.nombre}
                            </Text>
                            <Text style={styles.slotCellCals}>
                              {slot.calorias * slot.porciones} cal
                            </Text>
                          </TouchableOpacity>
                        ) : isPast ? (
                          <View
                            style={[
                              styles.slotEmptyCell,
                              { borderColor: "#ddd", opacity: 0.35 },
                            ]}
                          />
                        ) : (
                          <TouchableOpacity
                            style={styles.slotEmptyCell}
                            onPress={() => abrirAgregar(key, meal)}
                          >
                            <Text style={styles.slotEmptyPlus}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ))}
        </View>

        {/* ── Botones de acción inferiores ── */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            totalRecetas === 0 && styles.actionBtnDisabled,
          ]}
          onPress={generarListaCompras}
          disabled={loading || totalRecetas === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>Generar lista de compras</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => router.push("/(tabs)?tab=nutricion")}
        >
          <Text style={[styles.actionBtnText, { color: COLORS.text }]}>
            Ver panel nutricional
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── Modal Agregar Receta ─────────────────────────────────────────── */}
      <Modal visible={modalAgregar} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalAgregar(false)}>
              <Text style={styles.modalClose}>X</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Agregar receta</Text>
            <View style={{ width: 30 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar receta..."
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>

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

          {/* Loading mientras cargan las recetas de Firestore */}
          {cargandoRecetas ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.card} />
              <Text style={styles.loadingText}>Cargando recetas...</Text>
            </View>
          ) : recetaSeleccionada ? (
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
                  <Text style={styles.porcionBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.porcionNum}>{porciones}</Text>
                <TouchableOpacity
                  style={styles.porcionBtn}
                  onPress={() => setPorciones((p) => Math.min(10, p + 1))}
                >
                  <Text style={styles.porcionBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.nutritionPreview}>
                <Text style={styles.nutritionPreviewTitle}>
                  Preview nutricional ({porciones} porción
                  {porciones > 1 ? "es" : ""})
                </Text>
                <View style={styles.macrosRow}>
                  {[
                    {
                      label: "kcal",
                      value: recetaSeleccionada.calorias * porciones,
                    },
                    {
                      label: "proteínas",
                      value: recetaSeleccionada.proteinas * porciones,
                      unit: "g",
                    },
                    {
                      label: "carbos",
                      value: recetaSeleccionada.carbohidratos * porciones,
                      unit: "g",
                    },
                    {
                      label: "grasas",
                      value: recetaSeleccionada.grasas * porciones,
                      unit: "g",
                    },
                  ].map((m) => (
                    <View key={m.label} style={styles.macroItem}>
                      <Text style={styles.macroValue}>
                        {m.value}
                        {m.unit ?? ""}
                      </Text>
                      <Text style={styles.macroLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setRecetaSeleccionada(null)}
                >
                  <Text style={styles.btnSecondaryText}>Cambiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={confirmarAgregar}
                >
                  <Text style={styles.btnPrimaryText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={recetasFiltradas}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No se encontraron recetas</Text>
              }
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
                      {item.calorias} kcal - {item.tiempo} min
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
              { label: "Cambiar porciones", onPress: handleCambiarPorciones },
              {
                label: "Reemplazar receta",
                onPress: () => {
                  setModalOpciones(false);
                  setBusqueda("");
                  setRecetaSeleccionada(null);
                  setPorciones(1);
                  setModalAgregar(true);
                },
              },
              { label: "Mover a otro slot", onPress: handleMover },
              { label: "Eliminar", onPress: handleEliminar, danger: true },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={styles.optionItem}
                onPress={opt.onPress}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    opt.danger && { color: COLORS.danger },
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
                <Text style={styles.porcionBtnText}>-</Text>
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
              {weekDates
                .filter((date) => dateKey(date) >= dateKey(new Date()))
                .map((date) => {
                  const key = dateKey(date);
                  const isSel = key === diaDestino;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dayHeaderBtn,
                        isSel && styles.dayHeaderBtnActive,
                        { marginRight: 8 },
                      ]}
                      onPress={() => setDiaDestino(key)}
                    >
                      <Text
                        style={[
                          styles.dayHeaderLabel,
                          isSel && styles.dayHeaderLabelActive,
                        ]}
                      >
                        {DIAS_CORTO[date.getDay()]}
                      </Text>
                      <Text
                        style={[
                          styles.dayHeaderNum,
                          isSel && styles.dayHeaderNumActive,
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
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },
  headerRight: { alignItems: "center", gap: 8 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textLight,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    fontWeight: "500",
    marginTop: 2,
    opacity: 0.9,
    textAlign: "center",
  },

  tableCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tableHeaderRow: {
    backgroundColor: COLORS.tableHeader,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.tableBorder,
  },
  tableHeaderCell: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  tableHeaderDays: {
    flexDirection: "row",
    gap: 4,
  },
  dayHeaderBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 38,
  },
  dayHeaderBtnActive: {
    backgroundColor: COLORS.card,
  },
  dayHeaderLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  dayHeaderLabelActive: { color: "#fff" },
  dayHeaderNum: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  dayHeaderNumActive: { color: "#fff" },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.card,
    marginTop: 2,
  },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.tableBorder,
  },
  weekNavBtn: { padding: 4 },
  weekNavArrow: { fontSize: 22, color: COLORS.textMuted, fontWeight: "300" },
  weekNavLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },

  mealRow: {
    flexDirection: "row",
    minHeight: 64,
  },
  mealRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.tableBorder,
  },
  mealLabelCell: {
    width: 72,
    justifyContent: "center",
    paddingLeft: 12,
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: COLORS.tableBorder,
  },
  mealLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  dayCellsScroll: { flex: 1 },
  dayCellsRow: { flexDirection: "row" },
  dayCell: {
    width: 52,
    minHeight: 64,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: COLORS.tableBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCellSelected: {
    backgroundColor: "#FDF7F5",
  },
  dayCellPast: {
    backgroundColor: "#F9F9F9",
  },
  slotFilledCell: {
    width: 44,
    alignItems: "center",
    gap: 2,
  },
  slotThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  slotCellName: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
    width: 44,
  },
  slotCellCals: {
    fontSize: 8,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  slotEmptyCell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.tableBorder,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  slotEmptyPlus: {
    fontSize: 18,
    color: COLORS.tableBorder,
    lineHeight: 22,
  },

  actionBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.tableBorder,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
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
  modalTitle: { fontSize: 17, fontWeight: "bold", color: COLORS.text },

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
  filterChipActive: { backgroundColor: COLORS.card },
  filterChipText: { fontSize: 12, color: "#555" },
  filterChipTextActive: { color: "#fff", fontWeight: "600" },

  recetaCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 2,
  },
  recetaCardImage: { width: 80, height: 80 },
  recetaCardInfo: { flex: 1, padding: 10, justifyContent: "center" },
  recetaCardName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  recetaCardCals: { fontSize: 12, color: "#888", marginTop: 3 },
  recetaCardDif: { fontSize: 11, color: COLORS.card, marginTop: 2 },

  porcionesView: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
    paddingBottom: 60,
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
    color: COLORS.text,
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
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  porcionBtnText: { fontSize: 22, color: "#fff", fontWeight: "bold" },
  porcionNum: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
    minWidth: 40,
    textAlign: "center",
  },

  nutritionPreview: {
    width: "100%",
    backgroundColor: "#FDF7F5",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  nutritionPreviewTitle: {
    fontSize: 13,
    color: COLORS.card,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  macrosRow: { flexDirection: "row", justifyContent: "space-around" },
  macroItem: { alignItems: "center", gap: 3 },
  macroLabel: { fontSize: 11, color: "#888" },
  macroValue: { fontSize: 14, fontWeight: "bold", color: COLORS.text },

  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
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
  optionLabel: { fontSize: 15, color: COLORS.text },

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

  // Únicos estilos nuevos — loading y empty state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 40,
  },
});
