import { Stack } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    Timestamp
} from "firebase/firestore";
import * as Icons from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebase";
import {
    FORM_LIMITS,
    limitText,
    onlyDigits,
    sanitizeDecimal,
} from "../../utils/formValidators";

// ─── Types ────────────────────────────────────────────────────────────────────

type Seccion =
  | "Frutas y verduras"
  | "Carnes y proteínas"
  | "Lácteos"
  | "Panadería"
  | "Enlatados"
  | "Granos y cereales"
  | "Condimentos"
  | "Congelados"
  | "Otros";

type ItemCompra = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio: number;
  comprado: boolean;
  seccion: Seccion;
  recetas?: string[];
};

type Lista = {
  id: string;
  items: ItemCompra[];
  creadoEn: Timestamp;
  completada: boolean;
  totalEstimado: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SECCIONES: Seccion[] = [
  "Frutas y verduras",
  "Carnes y proteínas",
  "Lácteos",
  "Panadería",
  "Enlatados",
  "Granos y cereales",
  "Condimentos",
  "Congelados",
];

const SECCION_ICONS: Record<Seccion, string> = {
  "Frutas y verduras": "",
  "Carnes y proteínas": "",
  Lácteos: "",
  Panadería: "",
  Enlatados: "",
  "Granos y cereales": "",
  Condimentos: "",
  Congelados: "",
  Otros: "",
};

const UNIDADES = ["g", "kg", "ml", "L", "unidad", "paquete", "caja", "bolsa"];

const FORM_EMPTY = {
  nombre: "",
  cantidad: "",
  unidad: "unidad",
  precio: "",
  seccion: "Frutas y verduras" as Seccion,
};

function formatCOP(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function inferSeccion(nombre: string): Seccion {
  const n = nombre.toLowerCase();
  if (/leche|queso|yogur|mantequilla|crema/.test(n)) return "Lácteos";
  if (/pollo|res|cerdo|atún|huevo|salmón|carne|pechuga/.test(n))
    return "Carnes y proteínas";
  if (/arroz|avena|pasta|frijol|lenteja|garbanzo|cereal|quinoa/.test(n))
    return "Granos y cereales";
  if (/pan|arepa|galleta|bizcocho/.test(n)) return "Panadería";
  if (/tomate|frijol|atún|sardina|enlatado/.test(n)) return "Enlatados";
  if (
    /sal|azúcar|aceite|vinagre|pimienta|ajo|cebolla en polvo|salsa|mayonesa/.test(
      n,
    )
  )
    return "Condimentos";
  if (/helado|nugget|congelado|brócoli congelado/.test(n)) return "Congelados";
  if (
    /manzana|banano|naranja|tomate|lechuga|espinaca|zanahoria|papa|cebolla|ajo|limón|aguacate/.test(
      n,
    )
  )
    return "Frutas y verduras";
  return "Otros";
}

// ─── Swipeable Item ───────────────────────────────────────────────────────────

function SwipeableItem({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ItemCompra;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const THRESHOLD = -70;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -90));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const resetSwipe = () =>
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();

  return (
    <View style={swipeStyles.wrapper}>
      {/* Delete bg */}
      <View style={swipeStyles.deleteBg}>
        <TouchableOpacity
          style={swipeStyles.deleteAction}
          onPress={() => {
            resetSwipe();
            Alert.alert("Eliminar item", `¿Eliminar "${item.nombre}"?`, [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: onDelete },
            ]);
          }}
        >
          <Icons.TrashIcon size={20} color="#fff" weight="bold" />
          <Text style={swipeStyles.deleteText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[swipeStyles.row, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Checkbox */}
        <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
          {item.comprado ? (
            <Icons.CheckSquareIcon size={22} color="#C4918A" weight="fill" />
          ) : (
            <Icons.SquareIcon size={22} color="#ccc" weight="regular" />
          )}
        </TouchableOpacity>

        {/* Info */}
        <TouchableOpacity
          style={styles.itemInfo}
          onLongPress={onEdit}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.itemNombre,
              item.comprado && styles.itemNombreTachado,
            ]}
            numberOfLines={1}
          >
            {item.nombre}
          </Text>
          <Text style={styles.itemMeta}>
            {item.cantidad} {item.unidad}
            {item.recetas && item.recetas.length > 0 && (
              <Text style={styles.itemRecetas}>
                {" "}
                · {item.recetas.slice(0, 2).join(", ")}
              </Text>
            )}
          </Text>
        </TouchableOpacity>

        {/* Precio */}
        <Text style={[styles.itemPrecio, item.comprado && { color: "#ccc" }]}>
          {formatCOP(item.precio)}
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ListadeCompras() {
  const user = auth.currentUser;

  const [lista, setLista] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal agregar / editar
  const [modalForm, setModalForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);

  // Modal completar compras
  const [modalCompletar, setModalCompletar] = useState(false);
  const [gastoReal, setGastoReal] = useState("");
  const [savingCompletar, setSavingCompletar] = useState(false);

  // ── Firestore listener ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "listas"),
      orderBy("creadoEn", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const activa = snap.docs.find((d) => !d.data().completada);
      if (activa) {
        const data = activa.data();
        setLista({
          id: activa.id,
          items: (data.items || []).map((it: any, i: number) => ({
            ...it,
            id: it.id ?? `item-${i}`,
            seccion: it.seccion ?? inferSeccion(it.nombre ?? ""),
          })),
          creadoEn: data.creadoEn,
          completada: data.completada,
          totalEstimado: data.totalEstimado ?? 0,
        });
      } else {
        setLista(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Helpers Firestore ───────────────────────────────────────────────────────

  const updateItems = async (newItems: ItemCompra[]) => {
    if (!user || !lista) return;
    const total = newItems.reduce(
      (a, it) => a + (it.comprado ? 0 : it.precio),
      0,
    );
    await updateDoc(doc(db, "users", user.uid, "listas", lista.id), {
      items: newItems,
      totalEstimado: newItems.reduce((a, it) => a + it.precio, 0),
    });
  };

  const toggleItem = async (itemId: string) => {
    if (!lista) return;
    const newItems = lista.items.map((it) =>
      it.id === itemId ? { ...it, comprado: !it.comprado } : it,
    );
    await updateItems(newItems);
  };

  const deleteItem = async (itemId: string) => {
    if (!lista) return;
    const newItems = lista.items.filter((it) => it.id !== itemId);
    await updateItems(newItems);
  };

  const openAdd = () => {
    setEditingItemId(null);
    setForm(FORM_EMPTY);
    setModalForm(true);
  };

  const openEdit = (item: ItemCompra) => {
    setEditingItemId(item.id);
    setForm({
      nombre: item.nombre,
      cantidad: item.cantidad.toString(),
      unidad: item.unidad,
      precio: item.precio.toString(),
      seccion: item.seccion,
    });
    setModalForm(true);
  };

  const saveForm = async () => {
    const nombre = form.nombre.trim();
    const cantidad =
      parseFloat(
        sanitizeDecimal(form.cantidad, FORM_LIMITS.shoppingQuantity),
      ) || 1;
    const precio =
      parseInt(
        onlyDigits(form.precio).slice(0, FORM_LIMITS.shoppingPrice),
        10,
      ) || 0;

    if (!nombre) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return;
    }
    if (nombre.length > FORM_LIMITS.shoppingItemName) {
      Alert.alert(
        "Error",
        `El nombre no puede superar ${FORM_LIMITS.shoppingItemName} caracteres.`,
      );
      return;
    }
    if (cantidad <= 0 || Number.isNaN(cantidad)) {
      Alert.alert("Error", "Ingresa una cantidad válida.");
      return;
    }
    if (precio < 0 || Number.isNaN(precio)) {
      Alert.alert("Error", "Ingresa un precio válido.");
      return;
    }

    if (!lista || !user) {
      // No hay lista activa → crear nueva
      const newItem: Omit<ItemCompra, "id"> = {
        nombre: nombre.slice(0, FORM_LIMITS.shoppingItemName),
        cantidad,
        unidad: form.unidad,
        precio,
        comprado: false,
        seccion: form.seccion,
        recetas: [],
      };
      await addDoc(collection(db, "users", user!.uid, "listas"), {
        items: [{ ...newItem, id: `item-${Date.now()}` }],
        creadoEn: serverTimestamp(),
        completada: false,
        totalEstimado: precio,
      });
    } else {
      let newItems: ItemCompra[];
      if (editingItemId) {
        newItems = lista.items.map((it) =>
          it.id === editingItemId
            ? {
                ...it,
                nombre: nombre.slice(0, FORM_LIMITS.shoppingItemName),
                cantidad,
                unidad: form.unidad,
                precio,
                seccion: form.seccion,
              }
            : it,
        );
      } else {
        const newItem: ItemCompra = {
          id: `item-${Date.now()}`,
          nombre: form.nombre.trim(),
          cantidad,
          unidad: form.unidad,
          precio,
          comprado: false,
          seccion: form.seccion,
          recetas: [],
        };
        newItems = [...lista.items, newItem];
      }
      await updateItems(newItems);
    }
    setModalForm(false);
  };

  // ── Completar compras ───────────────────────────────────────────────────────

  const handleCompletar = async () => {
    if (!lista || !user) return;
    const realVal = parseInt(gastoReal.replace(/\D/g, ""), 10);
    if (isNaN(realVal) || realVal <= 0) {
      Alert.alert("Error", "Ingresa un monto válido.");
      return;
    }
    setSavingCompletar(true);
    try {
      await addDoc(collection(db, "users", user.uid, "expense_tracking"), {
        monto: realVal,
        categoria: "Supermercado",
        descripcion: "Lista de compras",
        fecha: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.uid, "listas", lista.id), {
        completada: true,
        gastoReal: realVal,
      });
      setModalCompletar(false);
      setGastoReal("");
      Alert.alert(
        "Compras completadas",
        `Gastaste ${formatCOP(realVal)}. El gasto se registró en tus finanzas.`,
      );
    } catch {
      Alert.alert("Error", "No se pudo completar la compra.");
    } finally {
      setSavingCompletar(false);
    }
  };

  // ── Cálculos ────────────────────────────────────────────────────────────────

  const totalItems = lista?.items.length ?? 0;
  const comprados = lista?.items.filter((it) => it.comprado).length ?? 0;
  const pctComprado = totalItems > 0 ? comprados / totalItems : 0;
  const totalEstimado = lista?.items.reduce((a, it) => a + it.precio, 0) ?? 0;
  const puedeCompletar = pctComprado >= 0.5 && totalItems > 0;

  // Agrupar items por sección (pendientes primero, comprados al final dentro de cada sección)
  const itemsPorSeccion: Record<string, ItemCompra[]> = {};
  (lista?.items ?? []).forEach((it) => {
    const sec = it.seccion ?? "Otros";
    if (!itemsPorSeccion[sec]) itemsPorSeccion[sec] = [];
    itemsPorSeccion[sec].push(it);
  });
  Object.keys(itemsPorSeccion).forEach((sec) => {
    itemsPorSeccion[sec].sort(
      (a, b) => Number(a.comprado) - Number(b.comprado),
    );
  });

  const gastoRealNum = parseInt(gastoReal.replace(/\D/g, ""), 10) || 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lista de Compras</Text>
          <Text style={styles.headerSub}>Organiza tus compras</Text>
        </View>
        <View style={styles.headerRight}>
          <Image
            source={require("../../Logo Chef.png")}
            style={styles.headerLogo}
          />
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Icons.PlusIcon size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C4918A" />
        </View>
      ) : !lista ? (
        /* ── Estado vacío ── */
        <View style={styles.centered}>
          <Icons.ShoppingCartSimpleIcon
            size={56}
            color="#C4918A"
            weight="thin"
          />
          <Text style={styles.emptyTitle}>Sin lista activa</Text>
          <Text style={styles.emptySubtitle}>
            Genera una lista desde el Planificador o agrega items manualmente.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
            <Text style={styles.emptyBtnText}>+ Agregar item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* PROGRESO */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {comprados}/{totalItems} items comprados
              </Text>
              <Text style={styles.progressTotal}>
                {formatCOP(totalEstimado)}
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${pctComprado * 100}%`,
                    backgroundColor: pctComprado >= 1 ? "#2D6A4F" : "#C4918A",
                  },
                ]}
              />
            </View>
            <Text style={styles.progressSub}>
              {pctComprado >= 1
                ? "Todo listo"
                : pctComprado >= 0.5
                  ? "Mas de la mitad"
                  : `Faltan ${totalItems - comprados} items`}
            </Text>
          </View>

          {/* LISTA */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(itemsPorSeccion).map(([seccion, items]) => (
              <View key={seccion} style={styles.seccionGroup}>
                {/* Sección header */}
                <View style={styles.seccionHeader}>
                  <Text style={styles.seccionNombre}>{seccion}</Text>
                  <Text style={styles.seccionCount}>
                    {items.filter((i) => i.comprado).length}/{items.length}
                  </Text>
                </View>

                {/* Items */}
                <View style={styles.seccionCard}>
                  {items.map((item, idx) => (
                    <View key={item.id}>
                      <SwipeableItem
                        item={item}
                        onToggle={() => toggleItem(item.id)}
                        onEdit={() => openEdit(item)}
                        onDelete={() => deleteItem(item.id)}
                      />
                      {idx < items.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* BOTON COMPLETAR */}
          {puedeCompletar && (
            <View style={styles.completarWrapper}>
              <TouchableOpacity
                style={styles.completarBtn}
                onPress={() => setModalCompletar(true)}
              >
                <Icons.CheckCircleIcon size={20} color="#fff" weight="fill" />
                <Text style={styles.completarText}>Completar compras</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ── MODAL AGREGAR / EDITAR ─────────────────────────────────────────── */}
      <Modal visible={modalForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalDragBar} />
            <Text style={styles.modalTitle}>
              {editingItemId ? "Editar item" : "Agregar item"}
            </Text>

            <Text style={styles.fieldLabel}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Leche entera"
              placeholderTextColor="#aaa"
              value={form.nombre}
              onChangeText={(v) =>
                setForm({
                  ...form,
                  nombre: limitText(v, FORM_LIMITS.shoppingItemName),
                  seccion: inferSeccion(v),
                })
              }
              maxLength={FORM_LIMITS.shoppingItemName}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Cantidad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={form.cantidad}
                  onChangeText={(v) =>
                    setForm({
                      ...form,
                      cantidad: sanitizeDecimal(
                        v,
                        FORM_LIMITS.shoppingQuantity,
                      ),
                    })
                  }
                  maxLength={FORM_LIMITS.shoppingQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Precio (COP)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3500"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={form.precio}
                  onChangeText={(v) =>
                    setForm({
                      ...form,
                      precio: onlyDigits(v).slice(0, FORM_LIMITS.shoppingPrice),
                    })
                  }
                  maxLength={FORM_LIMITS.shoppingPrice}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Unidad</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              {UNIDADES.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, form.unidad === u && styles.chipActive]}
                  onPress={() => setForm({ ...form, unidad: u })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.unidad === u && styles.chipTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Seccion</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
            >
              {SECCIONES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, form.seccion === s && styles.chipActive]}
                  onPress={() => setForm({ ...form, seccion: s })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.seccion === s && styles.chipTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalBtn} onPress={saveForm}>
              <Text style={styles.modalBtnText}>
                {editingItemId ? "Guardar cambios" : "Agregar"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalForm(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL COMPLETAR COMPRAS ────────────────────────────────────────── */}
      <Modal visible={modalCompletar} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalDragBar} />
            <Text style={styles.modalTitle}>Completar compras</Text>

            {/* Comparación estimado vs real */}
            <View style={styles.comparacionRow}>
              <View style={styles.comparacionItem}>
                <Text style={styles.comparacionLabel}>Estimado</Text>
                <Text style={styles.comparacionVal}>
                  {formatCOP(totalEstimado)}
                </Text>
              </View>
              <Icons.ArrowRightIcon size={18} color="#ccc" />
              <View style={styles.comparacionItem}>
                <Text style={styles.comparacionLabel}>Real</Text>
                <Text
                  style={[
                    styles.comparacionVal,
                    {
                      color:
                        gastoRealNum > totalEstimado
                          ? "#E63946"
                          : gastoRealNum > 0
                            ? "#2D6A4F"
                            : "#2c1810",
                    },
                  ]}
                >
                  {gastoRealNum > 0 ? formatCOP(gastoRealNum) : "—"}
                </Text>
              </View>
            </View>

            {gastoRealNum > 0 && (
              <Text style={styles.diferencia}>
                {gastoRealNum > totalEstimado
                  ? `Gastaste ${formatCOP(gastoRealNum - totalEstimado)} mas de lo estimado`
                  : gastoRealNum < totalEstimado
                    ? `Ahorraste ${formatCOP(totalEstimado - gastoRealNum)}`
                    : "Exacto al estimado"}
              </Text>
            )}

            <Text style={styles.fieldLabel}>Cuanto gastaste? (COP)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 85000"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={gastoReal}
              onChangeText={(v) =>
                setGastoReal(onlyDigits(v).slice(0, FORM_LIMITS.shoppingPrice))
              }
              maxLength={FORM_LIMITS.shoppingPrice}
            />

            <TouchableOpacity
              style={[styles.modalBtn, savingCompletar && { opacity: 0.7 }]}
              onPress={handleCompletar}
              disabled={savingCompletar}
            >
              {savingCompletar ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>Guardar y completar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalCompletar(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Swipe styles ─────────────────────────────────────────────────────────────

const swipeStyles = StyleSheet.create({
  wrapper: { overflow: "hidden" },
  deleteBg: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "#E63946",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteAction: { alignItems: "center", gap: 4 },
  deleteText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  row: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 32,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2c1810",
    marginTop: 2,
  },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  addBtn: {
    backgroundColor: "#C4918A",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  // Progreso
  progressCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: { fontSize: 14, fontWeight: "600", color: "#2c1810" },
  progressTotal: { fontSize: 14, fontWeight: "700", color: "#C4918A" },
  progressBg: {
    height: 8,
    backgroundColor: "#F0EBE8",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: { height: "100%", borderRadius: 8 },
  progressSub: { fontSize: 11, color: "#aaa" },

  // Secciones
  seccionGroup: { marginBottom: 16 },
  seccionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  seccionNombre: { flex: 1, fontSize: 14, fontWeight: "700", color: "#2c1810" },
  seccionCount: { fontSize: 12, color: "#aaa", fontWeight: "600" },
  seccionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  // Items
  checkbox: { padding: 2 },
  itemInfo: { flex: 1 },
  itemNombre: { fontSize: 14, fontWeight: "600", color: "#2c1810" },
  itemNombreTachado: {
    textDecorationLine: "line-through",
    color: "#bbb",
    opacity: 0.5,
  },
  itemMeta: { fontSize: 11, color: "#aaa", marginTop: 2 },
  itemRecetas: { color: "#C4918A" },
  itemPrecio: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C4918A",
    minWidth: 60,
    textAlign: "right",
  },
  divider: { height: 0.5, backgroundColor: "#F0EBE8", marginHorizontal: 14 },

  // Boton completar
  completarWrapper: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  completarBtn: {
    backgroundColor: "#2D6A4F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  completarText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Empty
  emptyTitle: {
    fontSize: 18,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Modal
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
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 4,
  },
  modalDragBar: {
    width: 40,
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F6F1F1",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#2c1810",
    marginBottom: 4,
  },
  row2: { flexDirection: "row", gap: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F6F1F1",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2c1810" },
  chipText: { fontSize: 12, color: "#888", fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  modalBtn: {
    backgroundColor: "#2c1810",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalCancel: {
    textAlign: "center",
    color: "#aaa",
    fontWeight: "600",
    paddingVertical: 10,
  },

  // Modal completar
  comparacionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F6F1F1",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  comparacionItem: { alignItems: "center", gap: 4 },
  comparacionLabel: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  comparacionVal: { fontSize: 20, fontWeight: "700", color: "#2c1810" },
  diferencia: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginBottom: 8,
  },
});
