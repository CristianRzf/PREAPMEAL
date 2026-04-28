import { Ionicons } from "@expo/vector-icons";
<<<<<<< Updated upstream
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
=======
>>>>>>> Stashed changes
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
<<<<<<< Updated upstream
  getDoc,
=======
>>>>>>> Stashed changes
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
=======
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
>>>>>>> Stashed changes
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
<<<<<<< Updated upstream

// ─── Cloudinary ───────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dbbsgfsr6";
const CLOUDINARY_UPLOAD_PRESET = "mealprep_uploads";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

=======
import * as ImagePicker from "expo-image-picker";

>>>>>>> Stashed changes
// ─── Paleta ───────────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#F5F0ED",
  card: "#C4918A",
  surface: "#FFFFFF",
  text: "#2C1810",
  textMuted: "#7A5C56",
<<<<<<< Updated upstream
  border: "#EDE8E4",
  error: "#e53935",
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TabType = "Explorar" | "Mis recetas";
type Dificultad = "fácil" | "intermedio" | "difícil";
type MealType = "desayuno" | "almuerzo" | "cena" | "snack";

interface RecetaUsuario {
  id: string;
=======
  textLight: "#FFFFFF",
  border: "#EDE8E4",
  accent: "#2D6A4F",
  danger: "#E05050",
};

const { width } = Dimensions.get("window");

// ─── Tipos ────────────────────────────────────────────────────────────────────
type MealType = "desayuno" | "almuerzo" | "cena" | "snack";
type Dificultad = "fácil" | "intermedio" | "difícil";
type TabType = "Explorar" | "Mis recetas";

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

interface RecetaUsuario {
  id: string;
  tipo: "custom" | "library";
  recetaId?: string;
>>>>>>> Stashed changes
  titulo: string;
  descripcion: string;
  imagen: string;
  calorias: number;
  tiempo: number;
  dificultad: string;
<<<<<<< Updated upstream
  mealType: string;
  userId: string;
  username: string;
  publica: boolean;
  globalId?: string;
  creadoEn: any;
}

const MEAL_LABELS: Record<string, string> = {
  desayuno: "Desayuno", almuerzo: "Almuerzo", cena: "Cena", snack: "Snack", todas: "Todas",
};

// ─── Subir imagen a Cloudinary ────────────────────────────────────────────────
async function subirImagenCloudinary(uri: string): Promise<string> {
  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("file", blob);
  } else {
    const filename = uri.split("/").pop() || "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    formData.append("file", { uri, name: filename, type } as any);
  }
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
  if (!response.ok) throw new Error(`Cloudinary error: ${await response.text()}`);
  const data = await response.json();
  return data.secure_url;
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function RecetasScreen() {
  const auth = getAuth();
  const db = getFirestore();
  const userId = auth.currentUser?.uid;

  const [activeTab, setActiveTab] = useState<TabType>("Explorar");

  // Explorar
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<MealType | "todas">("todas");
  const [filtroDif, setFiltroDif] = useState<Dificultad | "todas">("todas");
  const [recetasExplorar, setRecetasExplorar] = useState<RecetaUsuario[]>([]);
  const [loadingExplorar, setLoadingExplorar] = useState(true);

  // Mis recetas
  const [misRecetas, setMisRecetas] = useState<RecetaUsuario[]>([]);
  const [loadingMisRecetas, setLoadingMisRecetas] = useState(false);

  // Modal subir
  const [modalSubir, setModalSubir] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [formTitulo, setFormTitulo] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCals, setFormCals] = useState("");
  const [formTiempo, setFormTiempo] = useState("");
  const [formDif, setFormDif] = useState<Dificultad>("fácil");
  const [formMeal, setFormMeal] = useState<MealType>("almuerzo");
  const [formImagenUri, setFormImagenUri] = useState<string | null>(null);
  const [formImagenUrl, setFormImagenUrl] = useState<string | null>(null);
  const [formPublica, setFormPublica] = useState(true);

  // Modal detalle
  const [recetaDetalle, setRecetaDetalle] = useState<RecetaUsuario | null>(null);

  useEffect(() => { cargarExplorar(); }, []);
  useEffect(() => { if (activeTab === "Mis recetas") cargarMisRecetas(); }, [activeTab]);

  const cargarExplorar = async () => {
    setLoadingExplorar(true);
    try {
      const q = query(collection(db, "recipes"), orderBy("creadoEn", "desc"));
      const snap = await getDocs(q);
      setRecetasExplorar(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecetaUsuario)));
    } catch (e) { console.error(e); }
    finally { setLoadingExplorar(false); }
  };

  const cargarMisRecetas = async () => {
    if (!userId) return;
    setLoadingMisRecetas(true);
    try {
      const q = query(collection(db, "users", userId, "recipes"), orderBy("creadoEn", "desc"));
      const snap = await getDocs(q);
      setMisRecetas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecetaUsuario)));
    } catch (e) { console.error(e); }
    finally { setLoadingMisRecetas(false); }
  };

  const resetForm = () => {
    setFormTitulo(""); setFormDesc(""); setFormCals("");
    setFormTiempo(""); setFormDif("fácil"); setFormMeal("almuerzo");
    setFormImagenUri(null); setFormImagenUrl(null); setFormPublica(true);
  };

  const seleccionarImagen = () => {
    Alert.alert("Agregar foto", "¿Cómo quieres agregar la imagen?", [
      { text: "Galería", onPress: abrirGaleria },
      { text: "Cámara", onPress: abrirCamara },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const abrirGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) await procesarImagen(result.assets[0].uri);
  };

  const abrirCamara = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) await procesarImagen(result.assets[0].uri);
  };

  const procesarImagen = async (uri: string) => {
    setFormImagenUri(uri);
    setUploadingImg(true);
    try {
      const url = await subirImagenCloudinary(uri);
      setFormImagenUrl(url);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo subir la imagen.");
      setFormImagenUri(null);
    } finally { setUploadingImg(false); }
  };

  // ─── Validaciones ─────────────────────────────────────────────────────────
  const calsValidas = formCals === "" || (Number(formCals) >= 50 && Number(formCals) <= 3000);
  const tiempoValido = formTiempo === "" || (Number(formTiempo) >= 1 && Number(formTiempo) <= 720);
  const tituloValido = formTitulo.trim().length === 0 || (formTitulo.trim().length >= 3 && formTitulo.trim().length <= 60);

  const publicarReceta = async () => {
    if (!userId) return;
    if (uploadingImg) { Alert.alert("Espera", "La imagen aún se está subiendo."); return; }

    const titulo = formTitulo.trim();
    const cals = Number(formCals);
    const tiempo = Number(formTiempo);

    // Validaciones con mensajes claros
    if (!formImagenUrl) { Alert.alert("Foto requerida", "Agrega una foto a tu receta."); return; }
    if (titulo.length < 3) { Alert.alert("Título muy corto", "El título debe tener al menos 3 caracteres."); return; }
    if (titulo.length > 60) { Alert.alert("Título muy largo", "El título no puede superar los 60 caracteres."); return; }
    if (!formCals || isNaN(cals) || cals < 50 || cals > 3000) {
      Alert.alert("Calorías inválidas", "Las calorías deben estar entre 50 y 3000 kcal por porción."); return;
    }
    if (!formTiempo || isNaN(tiempo) || tiempo < 1 || tiempo > 720) {
      Alert.alert("Tiempo inválido", "El tiempo debe estar entre 1 y 720 minutos (12 horas máximo)."); return;
    }

    setSaving(true);
    try {
      const userSnap = await getDoc(doc(db, "users", userId));
      const username = userSnap.exists() ? (userSnap.data().username || "usuario") : "usuario";

      const recetaBase = {
        titulo,
        descripcion: formDesc.trim(),
        imagen: formImagenUrl,
        calorias: cals,
        tiempo,
        dificultad: formDif,
        mealType: formMeal,
        userId,
        username,
        publica: formPublica,
        creadoEn: serverTimestamp(),
      };

      let globalId: string | null = null;
      if (formPublica) {
        const globalRef = await addDoc(collection(db, "recipes"), recetaBase);
        globalId = globalRef.id;
      }

      await addDoc(collection(db, "users", userId, "recipes"), {
        ...recetaBase,
        ...(globalId ? { globalId } : {}),
      });

      Alert.alert(
        "✓ Guardada",
        formPublica
          ? "Tu receta es visible para toda la comunidad."
          : "Tu receta se guardó como privada. Solo tú puedes verla."
      );
      resetForm();
      setModalSubir(false);
      cargarExplorar();
      cargarMisRecetas();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo guardar la receta.");
    } finally { setSaving(false); }
  };

  const eliminarReceta = (receta: RecetaUsuario) => {
    Alert.alert("Eliminar", "¿Eliminar esta receta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          if (!userId) return;
          try {
            await deleteDoc(doc(db, "users", userId, "recipes", receta.id));
            if (receta.publica && receta.globalId) {
              await deleteDoc(doc(db, "recipes", receta.globalId));
            } else if (receta.publica) {
              const q = query(collection(db, "recipes"), where("userId", "==", userId), where("titulo", "==", receta.titulo));
              const snap = await getDocs(q);
              for (const d of snap.docs) await deleteDoc(doc(db, "recipes", d.id));
            }
            setMisRecetas((p) => p.filter((r) => r.id !== receta.id));
            setRecetasExplorar((p) => p.filter((r) => r.id !== receta.globalId && !(r.userId === userId && r.titulo === receta.titulo)));
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar.");
          }
        },
      },
    ]);
  };

  const recetasFiltradas = recetasExplorar.filter((r) => {
    const matchBusqueda = r.titulo.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === "todas" || r.mealType === filtroTipo;
    const matchDif = filtroDif === "todas" || r.dificultad === filtroDif;
    return matchBusqueda && matchTipo && matchDif;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Recetas</Text>
          <Text style={styles.headerSub}>Explora y cocina</Text>
        </View>
        <View style={styles.headerRight}>
          <Image source={require("../../Logo Chef.png")} style={styles.headerLogo} />
          <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalSubir(true); }}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(["Explorar", "Mis recetas"] as TabType[]).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB EXPLORAR ── */}
      {activeTab === "Explorar" && (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput style={styles.searchInput} placeholder="Buscar receta..." placeholderTextColor={COLORS.textMuted} value={busqueda} onChangeText={setBusqueda} />
            {busqueda.length > 0 && <TouchableOpacity onPress={() => setBusqueda("")}><Ionicons name="close-circle" size={18} color={COLORS.textMuted} /></TouchableOpacity>}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(["todas", "desayuno", "almuerzo", "cena", "snack"] as const).map((f) => (
              <TouchableOpacity key={f} style={[styles.filterChip, filtroTipo === f && styles.filterChipActive]} onPress={() => setFiltroTipo(f)}>
                <Text style={[styles.filterChipText, filtroTipo === f && styles.filterChipTextActive]}>{MEAL_LABELS[f]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: -4 }]}>
            {(["todas", "fácil", "intermedio", "difícil"] as const).map((f) => (
              <TouchableOpacity key={f} style={[styles.filterChip, filtroDif === f && styles.filterChipActive]} onPress={() => setFiltroDif(f)}>
                <Text style={[styles.filterChipText, filtroDif === f && styles.filterChipTextActive]}>
                  {f === "todas" ? "Cualquier nivel" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingExplorar ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.card} /></View>
          ) : recetasFiltradas.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="restaurant-outline" size={56} color={COLORS.card} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>
                {busqueda || filtroTipo !== "todas" || filtroDif !== "todas" ? "No hay recetas que coincidan" : "Aún no hay recetas públicas"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {busqueda || filtroTipo !== "todas" || filtroDif !== "todas" ? "Intenta con otros filtros" : "¡Sé el primero en compartir una receta!"}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetForm(); setModalSubir(true); }}>
                <Text style={styles.emptyBtnText}>+ Compartir receta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              <View style={styles.gridCol}>
                {recetasFiltradas.filter((_, i) => i % 2 === 0).map((r) => (
                  <RecetaCard key={r.id} receta={r} onPress={() => setRecetaDetalle(r)} />
                ))}
              </View>
              <View style={styles.gridCol}>
                {recetasFiltradas.filter((_, i) => i % 2 !== 0).map((r) => (
                  <RecetaCard key={r.id} receta={r} onPress={() => setRecetaDetalle(r)} />
                ))}
              </View>
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── TAB MIS RECETAS ── */}
      {activeTab === "Mis recetas" && (
        <View style={{ flex: 1 }}>
          {loadingMisRecetas ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.card} /></View>
          ) : misRecetas.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="restaurant-outline" size={56} color={COLORS.card} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>Aún no tienes recetas</Text>
              <Text style={styles.emptySubtitle}>Crea tu primera receta</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetForm(); setModalSubir(true); }}>
                <Text style={styles.emptyBtnText}>+ Nueva receta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={misRecetas}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.misRecetaCard}>
                  {item.imagen ? (
                    <Image source={{ uri: item.imagen }} style={styles.misRecetaImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.misRecetaImg, styles.misRecetaImgPlaceholder]}>
                      <Ionicons name="image-outline" size={24} color={COLORS.card} />
                    </View>
                  )}
                  <View style={styles.misRecetaInfo}>
                    <Text style={styles.misRecetaNombre} numberOfLines={2}>{item.titulo}</Text>
                    <View style={styles.misRecetaMeta}>
                      <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.misRecetaMetaText}>{item.tiempo} min</Text>
                      <Ionicons name="flame-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.misRecetaMetaText}>{item.calorias} kcal</Text>
                    </View>
                    <View style={styles.badgesRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.dificultad}</Text>
                      </View>
                      <View style={[styles.badge, item.publica ? styles.badgePublica : styles.badgePrivada]}>
                        <Ionicons name={item.publica ? "globe-outline" : "lock-closed-outline"} size={10} color={item.publica ? "#2D6A4F" : "#7A5C56"} />
                        <Text style={[styles.badgeText, item.publica ? styles.badgeTextPublica : styles.badgeTextPrivada]}>
                          {item.publica ? "Pública" : "Privada"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => eliminarReceta(item)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.card} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ─── Modal Detalle ────────────────────────────────────────────────── */}
      <Modal visible={!!recetaDetalle} animationType="slide" statusBarTranslucent>
        {recetaDetalle && (
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View>
                {recetaDetalle.imagen ? (
                  <Image source={{ uri: recetaDetalle.imagen }} style={styles.detalleImagen} resizeMode="cover" />
                ) : (
                  <View style={[styles.detalleImagen, styles.detalleImagenPlaceholder]}>
                    <Ionicons name="restaurant-outline" size={56} color={COLORS.card} />
                  </View>
                )}
                <TouchableOpacity style={styles.detalleBackBtn} onPress={() => setRecetaDetalle(null)}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.detalleContent}>
                <Text style={styles.detalleNombre}>{recetaDetalle.titulo}</Text>
                <Text style={styles.detalleAutor}>por @{recetaDetalle.username}</Text>
                {recetaDetalle.descripcion ? <Text style={styles.detalleDesc}>{recetaDetalle.descripcion}</Text> : null}
                <View style={styles.detalleMeta}>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons name="time-outline" size={16} color={COLORS.card} />
                    <Text style={styles.detalleMetaText}>{recetaDetalle.tiempo} min</Text>
                  </View>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons name="flame-outline" size={16} color={COLORS.card} />
                    <Text style={styles.detalleMetaText}>{recetaDetalle.calorias} kcal</Text>
                  </View>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons name="bar-chart-outline" size={16} color={COLORS.card} />
                    <Text style={styles.detalleMetaText}>{recetaDetalle.dificultad}</Text>
                  </View>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons name="restaurant-outline" size={16} color={COLORS.card} />
                    <Text style={styles.detalleMetaText}>{MEAL_LABELS[recetaDetalle.mealType] || recetaDetalle.mealType}</Text>
                  </View>
                </View>
                <View style={{ height: 40 }} />
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ─── Modal Nueva Receta ───────────────────────────────────────────── */}
      <Modal visible={modalSubir} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top", "left", "right"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalSubir(false)}>
              <Ionicons name="chevron-down" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nueva receta</Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>

            {/* Foto */}
            <TouchableOpacity style={styles.fotoBtn} onPress={seleccionarImagen} disabled={uploadingImg}>
              {formImagenUri ? (
                <View style={{ width: "100%", height: "100%" }}>
                  <Image source={{ uri: formImagenUri }} style={styles.fotoPrev} resizeMode="cover" />
                  {uploadingImg && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.uploadingText}>Subiendo imagen...</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <Ionicons name="camera-outline" size={36} color={COLORS.card} />
                  <Text style={styles.fotoPlaceholderText}>Toca para agregar foto</Text>
                  <Text style={styles.fotoPlaceholderSub}>Galería o cámara</Text>
                </View>
              )}
            </TouchableOpacity>

            {formImagenUrl && !uploadingImg && (
              <View style={styles.imgSuccessRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.imgSuccessText}>Imagen subida correctamente</Text>
              </View>
            )}

            {/* Título */}
            <Text style={styles.fieldLabel}>Título *</Text>
            <TextInput
              style={[styles.input, !tituloValido && styles.inputError]}
              value={formTitulo}
              onChangeText={setFormTitulo}
              placeholder="Nombre de tu receta"
              placeholderTextColor={COLORS.textMuted}
              maxLength={60}
            />
            <View style={styles.hintRow}>
              {!tituloValido
                ? <Text style={styles.hintError}>Mínimo 3, máximo 60 caracteres</Text>
                : <Text style={styles.fieldHint}>3 – 60 caracteres</Text>
              }
              <Text style={[styles.fieldHint, formTitulo.length > 50 && { color: COLORS.error }]}>
                {formTitulo.length}/60
              </Text>
            </View>

            {/* Descripción */}
            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={formDesc}
              onChangeText={setFormDesc}
              placeholder="Describe brevemente tu receta..."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            {/* Calorías + Tiempo */}
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Calorías *</Text>
                <TextInput
                  style={[styles.input, formCals.length > 0 && !calsValidas && styles.inputError]}
                  value={formCals}
                  onChangeText={setFormCals}
                  placeholder="kcal"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                />
                {formCals.length > 0 && !calsValidas
                  ? <Text style={styles.hintError}>50 – 3000 kcal</Text>
                  : <Text style={styles.fieldHint}>50 – 3000 kcal</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Tiempo (min) *</Text>
                <TextInput
                  style={[styles.input, formTiempo.length > 0 && !tiempoValido && styles.inputError]}
                  value={formTiempo}
                  onChangeText={setFormTiempo}
                  placeholder="min"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                />
                {formTiempo.length > 0 && !tiempoValido
                  ? <Text style={styles.hintError}>1 – 720 min</Text>
                  : <Text style={styles.fieldHint}>1 – 720 min (12h)</Text>
                }
              </View>
            </View>

            {/* Tipo de comida */}
            <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Tipo de comida</Text>
            <View style={styles.chipRow}>
              {(["desayuno", "almuerzo", "cena", "snack"] as MealType[]).map((m) => (
                <TouchableOpacity key={m} style={[styles.chip, formMeal === m && styles.chipActive]} onPress={() => setFormMeal(m)}>
                  <Text style={[styles.chipText, formMeal === m && styles.chipTextActive]}>{MEAL_LABELS[m]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dificultad */}
            <Text style={styles.fieldLabel}>Dificultad</Text>
            <View style={styles.chipRow}>
              {(["fácil", "intermedio", "difícil"] as Dificultad[]).map((d) => (
                <TouchableOpacity key={d} style={[styles.chip, formDif === d && styles.chipActive]} onPress={() => setFormDif(d)}>
                  <Text style={[styles.chipText, formDif === d && styles.chipTextActive]}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Privacidad */}
            <Text style={styles.fieldLabel}>Privacidad</Text>
            <View style={styles.privacidadRow}>
              <TouchableOpacity
                style={[styles.privacidadChip, formPublica && styles.privacidadChipActive]}
                onPress={() => setFormPublica(true)}
              >
                <Ionicons name="globe-outline" size={16} color={formPublica ? "#fff" : COLORS.textMuted} />
                <View>
                  <Text style={[styles.privacidadChipTitle, formPublica && styles.privacidadChipTitleActive]}>Pública</Text>
                  <Text style={[styles.privacidadChipSub, formPublica && styles.privacidadChipSubActive]}>Visible en Explorar</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacidadChip, !formPublica && styles.privacidadChipActive]}
                onPress={() => setFormPublica(false)}
              >
                <Ionicons name="lock-closed-outline" size={16} color={!formPublica ? "#fff" : COLORS.textMuted} />
                <View>
                  <Text style={[styles.privacidadChipTitle, !formPublica && styles.privacidadChipTitleActive]}>Privada</Text>
                  <Text style={[styles.privacidadChipSub, !formPublica && styles.privacidadChipSubActive]}>Solo tú la ves</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.publishBtn, (saving || uploadingImg) && { opacity: 0.7 }]}
              onPress={publicarReceta}
              disabled={saving || uploadingImg}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.publishBtnText}>{formPublica ? "Publicar en comunidad" : "Guardar receta"}</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── RecetaCard ───────────────────────────────────────────────────────────────
function RecetaCard({ receta, onPress }: { receta: RecetaUsuario; onPress: () => void }) {
  return (
    <TouchableOpacity style={cardStyles.container} onPress={onPress} activeOpacity={0.85}>
      {receta.imagen ? (
        <Image source={{ uri: receta.imagen }} style={cardStyles.imagen} resizeMode="cover" />
      ) : (
        <View style={[cardStyles.imagen, cardStyles.imagenPlaceholder]}>
          <Ionicons name="restaurant-outline" size={32} color={COLORS.card} />
        </View>
      )}
      <View style={cardStyles.overlay} />
      <View style={cardStyles.info}>
        <Text style={cardStyles.nombre} numberOfLines={2}>{receta.titulo}</Text>
        <Text style={cardStyles.autor}>@{receta.username}</Text>
        <View style={cardStyles.meta}>
          <View style={cardStyles.metaItem}>
            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={cardStyles.metaText}>{receta.tiempo} min</Text>
          </View>
          <View style={cardStyles.metaItem}>
            <Ionicons name="flame-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={cardStyles.metaText}>{receta.calorias} kcal</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: { width: CARD_WIDTH, height: 170, borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  imagen: { width: "100%", height: "100%", position: "absolute" },
  imagenPlaceholder: { backgroundColor: "#F0EAE7", justifyContent: "center", alignItems: "center" },
  overlay: { position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.3)" },
  info: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 },
  nombre: { fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 2, lineHeight: 17 },
  autor: { fontSize: 10, color: "rgba(255,255,255,0.75)", marginBottom: 4 },
=======
  creadoEn: any;
}

// ─── Biblioteca de recetas ────────────────────────────────────────────────────
const RECETAS_DEMO: Receta[] = [
  {
    id: "r1", nombre: "Avena con frutas",
    imagen: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400",
    calorias: 320, proteinas: 12, carbohidratos: 55, grasas: 6,
    tiempo: 10, dificultad: "fácil", tipo: ["desayuno"],
    ingredientes: [
      { nombre: "Avena", cantidad: 80, unidad: "g", precio: 800 },
      { nombre: "Leche", cantidad: 200, unidad: "ml", precio: 1200 },
      { nombre: "Banano", cantidad: 1, unidad: "unidad", precio: 500 },
    ],
  },
  {
    id: "r2", nombre: "Huevos revueltos",
    imagen: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400",
    calorias: 280, proteinas: 18, carbohidratos: 5, grasas: 20,
    tiempo: 15, dificultad: "fácil", tipo: ["desayuno"],
    ingredientes: [
      { nombre: "Huevos", cantidad: 3, unidad: "unidad", precio: 1500 },
      { nombre: "Mantequilla", cantidad: 10, unidad: "g", precio: 400 },
    ],
  },
  {
    id: "r3", nombre: "Arroz con pollo",
    imagen: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400",
    calorias: 520, proteinas: 38, carbohidratos: 62, grasas: 10,
    tiempo: 40, dificultad: "intermedio", tipo: ["almuerzo"],
    ingredientes: [
      { nombre: "Arroz", cantidad: 150, unidad: "g", precio: 1000 },
      { nombre: "Pechuga de pollo", cantidad: 200, unidad: "g", precio: 4000 },
      { nombre: "Zanahoria", cantidad: 1, unidad: "unidad", precio: 600 },
    ],
  },
  {
    id: "r4", nombre: "Ensalada César",
    imagen: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    calorias: 310, proteinas: 14, carbohidratos: 18, grasas: 22,
    tiempo: 15, dificultad: "fácil", tipo: ["almuerzo", "cena"],
    ingredientes: [
      { nombre: "Lechuga romana", cantidad: 150, unidad: "g", precio: 2000 },
      { nombre: "Pollo", cantidad: 100, unidad: "g", precio: 2500 },
      { nombre: "Aderezo César", cantidad: 30, unidad: "ml", precio: 1500 },
    ],
  },
  {
    id: "r5", nombre: "Salmón al horno",
    imagen: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
    calorias: 420, proteinas: 42, carbohidratos: 8, grasas: 24,
    tiempo: 30, dificultad: "intermedio", tipo: ["cena"],
    ingredientes: [
      { nombre: "Salmón", cantidad: 200, unidad: "g", precio: 12000 },
      { nombre: "Limón", cantidad: 1, unidad: "unidad", precio: 500 },
      { nombre: "Aceite de oliva", cantidad: 15, unidad: "ml", precio: 800 },
    ],
  },
  {
    id: "r6", nombre: "Pasta boloñesa",
    imagen: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400",
    calorias: 580, proteinas: 28, carbohidratos: 72, grasas: 18,
    tiempo: 45, dificultad: "intermedio", tipo: ["almuerzo", "cena"],
    ingredientes: [
      { nombre: "Pasta", cantidad: 200, unidad: "g", precio: 2000 },
      { nombre: "Carne molida", cantidad: 150, unidad: "g", precio: 4500 },
      { nombre: "Tomate", cantidad: 200, unidad: "g", precio: 1000 },
    ],
  },
  {
    id: "r7", nombre: "Yogur con granola",
    imagen: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400",
    calorias: 210, proteinas: 10, carbohidratos: 32, grasas: 5,
    tiempo: 5, dificultad: "fácil", tipo: ["snack", "desayuno"],
    ingredientes: [
      { nombre: "Yogur griego", cantidad: 150, unidad: "g", precio: 3000 },
      { nombre: "Granola", cantidad: 40, unidad: "g", precio: 1500 },
    ],
  },
  {
    id: "r8", nombre: "Batido proteico",
    imagen: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400",
    calorias: 180, proteinas: 24, carbohidratos: 15, grasas: 3,
    tiempo: 5, dificultad: "fácil", tipo: ["snack", "desayuno"],
    ingredientes: [
      { nombre: "Proteína en polvo", cantidad: 30, unidad: "g", precio: 4000 },
      { nombre: "Leche", cantidad: 250, unidad: "ml", precio: 1500 },
      { nombre: "Banano", cantidad: 1, unidad: "unidad", precio: 500 },
    ],
  },
];

const MEAL_LABELS: Record<string, string> = {
  desayuno: "Desayuno", almuerzo: "Almuerzo", cena: "Cena", snack: "Snack",
};

// ─── Componente Card de receta ────────────────────────────────────────────────
function RecetaCard({ receta, onPress }: { receta: Receta; onPress: () => void }) {
  return (
    <TouchableOpacity style={cardStyles.container} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: receta.imagen }} style={cardStyles.imagen} resizeMode="cover" />
      <View style={cardStyles.overlay} />
      <View style={cardStyles.info}>
        <View style={cardStyles.tags}>
          {receta.tipo.map((t) => (
            <View key={t} style={cardStyles.tag}>
              <Text style={cardStyles.tagText}>{MEAL_LABELS[t]}</Text>
            </View>
          ))}
        </View>
        <Text style={cardStyles.nombre} numberOfLines={2}>{receta.nombre}</Text>
        <View style={cardStyles.meta}>
          <View style={cardStyles.metaItem}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={cardStyles.metaText}>{receta.tiempo} min</Text>
          </View>
          <View style={cardStyles.metaItem}>
            <Ionicons name="flame-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={cardStyles.metaText}>{receta.calorias} kcal</Text>
          </View>
          <View style={cardStyles.metaItem}>
            <Ionicons name="bar-chart-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={cardStyles.metaText}>{receta.dificultad}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = (width - 48) / 2;

const cardStyles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  imagen: { width: "100%", height: "100%", position: "absolute" },
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  info: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
  tag: {
    backgroundColor: "rgba(196,145,138,0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { fontSize: 9, color: "#fff", fontWeight: "600" },
  nombre: { fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 6, lineHeight: 17 },
>>>>>>> Stashed changes
  meta: { flexDirection: "row", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 10, color: "rgba(255,255,255,0.85)" },
});

<<<<<<< Updated upstream
// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  addBtn: { backgroundColor: COLORS.card, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },

  tabsRow: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#E8E0DC", borderRadius: 12, padding: 4, marginBottom: 12 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
=======
// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function RecetasScreen() {
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const userId = auth.currentUser?.uid;

  const [activeTab, setActiveTab] = useState<TabType>("Explorar");
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<MealType | "todas">("todas");
  const [filtroDif, setFiltroDif] = useState<Dificultad | "todas">("todas");

  // Mis recetas
  const [misRecetas, setMisRecetas] = useState<RecetaUsuario[]>([]);
  const [loadingMisRecetas, setLoadingMisRecetas] = useState(false);

  // Modal publicar
  const [modalPublicar, setModalPublicar] = useState(false);
  const [tipoPublicacion, setTipoPublicacion] = useState<"custom" | "library">("custom");
  const [recetaLibSeleccionada, setRecetaLibSeleccionada] = useState<Receta | null>(null);
  const [busquedaLib, setBusquedaLib] = useState("");
  const [saving, setSaving] = useState(false);

  // Formulario receta propia
  const [formTitulo, setFormTitulo] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCals, setFormCals] = useState("");
  const [formTiempo, setFormTiempo] = useState("");
  const [formDif, setFormDif] = useState<Dificultad>("fácil");
  const [formImagen, setFormImagen] = useState<string | null>(null);

  // Modal detalle
  const [recetaDetalle, setRecetaDetalle] = useState<Receta | null>(null);

  useEffect(() => {
    if (activeTab === "Mis recetas") cargarMisRecetas();
  }, [activeTab]);

  const cargarMisRecetas = async () => {
    if (!userId) return;
    setLoadingMisRecetas(true);
    try {
      const q = query(
        collection(db, "users", userId, "recipes"),
        orderBy("creadoEn", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecetaUsuario));
      setMisRecetas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMisRecetas(false);
    }
  };

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setFormImagen(result.assets[0].uri);
    }
  };

  const subirImagenStorage = async (uri: string): Promise<string> => {
    if (Platform.OS === "web") {
      // En web devuelve la URI directamente (base64)
      return uri;
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `recipes/${userId}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const publicarReceta = async () => {
    if (!userId) return;

    if (tipoPublicacion === "library") {
      if (!recetaLibSeleccionada) {
        Alert.alert("Error", "Selecciona una receta de la biblioteca.");
        return;
      }
      setSaving(true);
      try {
        await addDoc(collection(db, "users", userId, "recipes"), {
          tipo: "library",
          recetaId: recetaLibSeleccionada.id,
          titulo: recetaLibSeleccionada.nombre,
          descripcion: "",
          imagen: recetaLibSeleccionada.imagen,
          calorias: recetaLibSeleccionada.calorias,
          tiempo: recetaLibSeleccionada.tiempo,
          dificultad: recetaLibSeleccionada.dificultad,
          creadoEn: serverTimestamp(),
        });
        Alert.alert("✓ Publicada", "Receta agregada a tu perfil.");
        resetForm();
        setModalPublicar(false);
        cargarMisRecetas();
      } catch (e) {
        Alert.alert("Error", "No se pudo publicar.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Receta propia
    if (!formTitulo.trim()) {
      Alert.alert("Error", "El título es obligatorio.");
      return;
    }
    if (!formImagen) {
      Alert.alert("Error", "Agrega una foto a tu receta.");
      return;
    }

    setSaving(true);
    try {
      const imageUrl = await subirImagenStorage(formImagen);
      await addDoc(collection(db, "users", userId, "recipes"), {
        tipo: "custom",
        titulo: formTitulo.trim(),
        descripcion: formDesc.trim(),
        imagen: imageUrl,
        calorias: Number(formCals) || 0,
        tiempo: Number(formTiempo) || 0,
        dificultad: formDif,
        creadoEn: serverTimestamp(),
      });
      Alert.alert("✓ Publicada", "Tu receta fue publicada exitosamente.");
      resetForm();
      setModalPublicar(false);
      cargarMisRecetas();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo publicar la receta.");
    } finally {
      setSaving(false);
    }
  };

  const eliminarReceta = (id: string) => {
    Alert.alert("Eliminar", "¿Eliminar esta receta de tu perfil?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          if (!userId) return;
          await deleteDoc(doc(db, "users", userId, "recipes", id));
          setMisRecetas((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormTitulo(""); setFormDesc(""); setFormCals("");
    setFormTiempo(""); setFormDif("fácil"); setFormImagen(null);
    setRecetaLibSeleccionada(null); setBusquedaLib("");
    setTipoPublicacion("custom");
  };

  // Filtros explorar
  const recetasFiltradas = RECETAS_DEMO.filter((r) => {
    const matchBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === "todas" || r.tipo.includes(filtroTipo as MealType);
    const matchDif = filtroDif === "todas" || r.dificultad === filtroDif;
    return matchBusqueda && matchTipo && matchDif;
  });

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recetas</Text>
        {activeTab === "Mis recetas" && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { resetForm(); setModalPublicar(true); }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs internos */}
      <View style={styles.tabsRow}>
        {(["Explorar", "Mis recetas"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB EXPLORAR ── */}
      {activeTab === "Explorar" && (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Buscador */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar receta o ingrediente..."
              placeholderTextColor={COLORS.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtros tipo */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(["todas", "desayuno", "almuerzo", "cena", "snack"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filtroTipo === f && styles.filterChipActive]}
                onPress={() => setFiltroTipo(f)}
              >
                <Text style={[styles.filterChipText, filtroTipo === f && styles.filterChipTextActive]}>
                  {f === "todas" ? "Todas" : MEAL_LABELS[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Filtros dificultad */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: -4 }]}>
            {(["todas", "fácil", "intermedio", "difícil"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filtroDif === f && styles.filterChipActive]}
                onPress={() => setFiltroDif(f)}
              >
                <Text style={[styles.filterChipText, filtroDif === f && styles.filterChipTextActive]}>
                  {f === "todas" ? "Cualquier nivel" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Grid recetas */}
          <View style={styles.grid}>
            {recetasFiltradas.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={COLORS.card} />
                <Text style={styles.emptyText}>No hay recetas que coincidan</Text>
              </View>
            ) : (
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  {recetasFiltradas.filter((_, i) => i % 2 === 0).map((r) => (
                    <RecetaCard key={r.id} receta={r} onPress={() => setRecetaDetalle(r)} />
                  ))}
                </View>
                <View style={styles.gridCol}>
                  {recetasFiltradas.filter((_, i) => i % 2 !== 0).map((r) => (
                    <RecetaCard key={r.id} receta={r} onPress={() => setRecetaDetalle(r)} />
                  ))}
                </View>
              </View>
            )}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── TAB MIS RECETAS ── */}
      {activeTab === "Mis recetas" && (
        <View style={{ flex: 1 }}>
          {loadingMisRecetas ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.card} />
            </View>
          ) : misRecetas.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="restaurant-outline" size={56} color={COLORS.card} />
              <Text style={styles.emptyTitle}>Aún no tienes recetas</Text>
              <Text style={styles.emptySubtitle}>
                Publica recetas de la biblioteca o crea las tuyas propias
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => { resetForm(); setModalPublicar(true); }}
              >
                <Text style={styles.emptyBtnText}>+ Agregar receta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={misRecetas}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.misRecetaCard}>
                  <Image source={{ uri: item.imagen }} style={styles.misRecetaImg} resizeMode="cover" />
                  <View style={styles.misRecetaInfo}>
                    <View style={styles.misRecetaBadgeRow}>
                      <View style={[styles.badge, item.tipo === "custom" ? styles.badgeCustom : styles.badgeLib]}>
                        <Text style={styles.badgeText}>
                          {item.tipo === "custom" ? "Propia" : "Biblioteca"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.misRecetaNombre} numberOfLines={2}>{item.titulo}</Text>
                    <View style={styles.misRecetaMeta}>
                      <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.misRecetaMetaText}>{item.tiempo} min</Text>
                      <Ionicons name="flame-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.misRecetaMetaText}>{item.calorias} kcal</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => eliminarReceta(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ─── Modal detalle receta ─────────────────────────────────────────── */}
      <Modal visible={!!recetaDetalle} animationType="slide" statusBarTranslucent>
        {recetaDetalle && (
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: recetaDetalle.imagen }}
                  style={styles.detalleImagen}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.detalleBackBtn}
                  onPress={() => setRecetaDetalle(null)}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.detalleContent}>
                <View style={styles.detalleTags}>
                  {recetaDetalle.tipo.map((t) => (
                    <View key={t} style={styles.detalleTag}>
                      <Text style={styles.detalleTagText}>{MEAL_LABELS[t]}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.detalleNombre}>{recetaDetalle.nombre}</Text>

                {/* Stats rápidos */}
                <View style={styles.detalleMeta}>
                  {[
                    { icon: "time-outline", label: `${recetaDetalle.tiempo} min` },
                    { icon: "flame-outline", label: `${recetaDetalle.calorias} kcal` },
                    { icon: "bar-chart-outline", label: recetaDetalle.dificultad },
                  ].map((m) => (
                    <View key={m.label} style={styles.detalleMetaItem}>
                      <Ionicons name={m.icon as any} size={16} color={COLORS.card} />
                      <Text style={styles.detalleMetaText}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Macros */}
                <View style={styles.detalleMacros}>
                  {[
                    { label: "Proteínas", value: recetaDetalle.proteinas, unit: "g", color: "#4A90E2" },
                    { label: "Carbos", value: recetaDetalle.carbohidratos, unit: "g", color: "#7ED321" },
                    { label: "Grasas", value: recetaDetalle.grasas, unit: "g", color: "#F5A623" },
                  ].map((m) => (
                    <View key={m.label} style={styles.detalleMacroItem}>
                      <View style={[styles.detalleMacroDot, { backgroundColor: m.color }]} />
                      <Text style={styles.detalleMacroValue}>{m.value}{m.unit}</Text>
                      <Text style={styles.detalleMacroLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Ingredientes */}
                <Text style={styles.detalleSection}>Ingredientes</Text>
                {recetaDetalle.ingredientes.map((ing, i) => (
                  <View key={i} style={styles.detalleIngRow}>
                    <View style={styles.detalleBullet} />
                    <Text style={styles.detalleIngText}>
                      {ing.nombre} — {ing.cantidad} {ing.unidad}
                    </Text>
                    <Text style={styles.detalleIngPrecio}>
                      ${ing.precio.toLocaleString("es-CO")}
                    </Text>
                  </View>
                ))}

                {/* Botón publicar en mi perfil */}
                <TouchableOpacity
                  style={styles.detalleBtnPublicar}
                  onPress={() => {
                    setRecetaDetalle(null);
                    setTipoPublicacion("library");
                    setRecetaLibSeleccionada(recetaDetalle);
                    setModalPublicar(true);
                  }}
                >
                  <Ionicons name="share-outline" size={16} color="#fff" />
                  <Text style={styles.detalleBtnText}>Publicar en mi perfil</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ─── Modal Publicar ───────────────────────────────────────────────── */}
      <Modal visible={modalPublicar} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalPublicar(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Agregar receta</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Selector tipo */}
          <View style={styles.tipoSelector}>
            {(["custom", "library"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tipoChip, tipoPublicacion === t && styles.tipoChipActive]}
                onPress={() => setTipoPublicacion(t)}
              >
                <Ionicons
                  name={t === "custom" ? "create-outline" : "book-outline"}
                  size={16}
                  color={tipoPublicacion === t ? "#fff" : COLORS.textMuted}
                />
                <Text style={[styles.tipoChipText, tipoPublicacion === t && styles.tipoChipTextActive]}>
                  {t === "custom" ? "Receta propia" : "De la biblioteca"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>

            {/* ── Formulario receta propia ── */}
            {tipoPublicacion === "custom" && (
              <>
                {/* Foto */}
                <TouchableOpacity style={styles.fotoBtn} onPress={seleccionarImagen}>
                  {formImagen ? (
                    <Image source={{ uri: formImagen }} style={styles.fotoPrev} resizeMode="cover" />
                  ) : (
                    <View style={styles.fotoPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={COLORS.card} />
                      <Text style={styles.fotoPlaceholderText}>Toca para agregar foto</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Título *</Text>
                <TextInput
                  style={styles.input}
                  value={formTitulo}
                  onChangeText={setFormTitulo}
                  placeholder="Nombre de tu receta"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.fieldLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  placeholder="Describe brevemente tu receta..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Calorías</Text>
                    <TextInput
                      style={styles.input}
                      value={formCals}
                      onChangeText={setFormCals}
                      placeholder="kcal"
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Tiempo (min)</Text>
                    <TextInput
                      style={styles.input}
                      value={formTiempo}
                      onChangeText={setFormTiempo}
                      placeholder="min"
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Dificultad</Text>
                <View style={styles.chipRow}>
                  {(["fácil", "intermedio", "difícil"] as Dificultad[]).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, formDif === d && styles.chipActive]}
                      onPress={() => setFormDif(d)}
                    >
                      <Text style={[styles.chipText, formDif === d && styles.chipTextActive]}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── Selector biblioteca ── */}
            {tipoPublicacion === "library" && (
              <>
                <View style={styles.searchRow}>
                  <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar en biblioteca..."
                    placeholderTextColor={COLORS.textMuted}
                    value={busquedaLib}
                    onChangeText={setBusquedaLib}
                  />
                </View>

                {RECETAS_DEMO.filter((r) =>
                  r.nombre.toLowerCase().includes(busquedaLib.toLowerCase())
                ).map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.libCard,
                      recetaLibSeleccionada?.id === r.id && styles.libCardActive,
                    ]}
                    onPress={() => setRecetaLibSeleccionada(r)}
                  >
                    <Image source={{ uri: r.imagen }} style={styles.libCardImg} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.libCardNombre}>{r.nombre}</Text>
                      <Text style={styles.libCardMeta}>{r.calorias} kcal · {r.tiempo} min · {r.dificultad}</Text>
                    </View>
                    {recetaLibSeleccionada?.id === r.id && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.card} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Botón publicar */}
            <TouchableOpacity
              style={[styles.publishBtn, saving && { opacity: 0.7 }]}
              onPress={publicarReceta}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.publishBtnText}>Publicar receta</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  addBtn: {
    backgroundColor: COLORS.card,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  tabsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#E8E0DC",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
>>>>>>> Stashed changes
  tabItemActive: { backgroundColor: COLORS.surface },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text },

<<<<<<< Updated upstream
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  filterScroll: { paddingLeft: 16, marginBottom: 8, height: 44 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: 8, height: 34, justifyContent: "center" },
=======
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  filterScroll: { paddingLeft: 16, marginBottom: 8, height: 44 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    height: 34,
    justifyContent: "center",
  },
>>>>>>> Stashed changes
  filterChipActive: { backgroundColor: COLORS.card },
  filterChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
  filterChipTextActive: { color: "#fff", fontWeight: "600" },

<<<<<<< Updated upstream
  grid: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 8 },
  gridCol: { flex: 1 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: { backgroundColor: COLORS.card, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 24, marginTop: 6 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  misRecetaCard: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 14, overflow: "hidden", alignItems: "center" },
  misRecetaImg: { width: 80, height: 80 },
  misRecetaImgPlaceholder: { backgroundColor: "#F0EAE7", justifyContent: "center", alignItems: "center" },
  misRecetaInfo: { flex: 1, padding: 10, gap: 4 },
  misRecetaNombre: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  misRecetaMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  misRecetaMetaText: { fontSize: 11, color: COLORS.textMuted },
  badgesRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { alignSelf: "flex-start", backgroundColor: "#FDF3F0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgePublica: { backgroundColor: "#E8F5E9", flexDirection: "row", alignItems: "center", gap: 3 },
  badgePrivada: { backgroundColor: "#F5F0ED", flexDirection: "row", alignItems: "center", gap: 3 },
  badgeText: { fontSize: 10, fontWeight: "600", color: COLORS.card },
  badgeTextPublica: { color: "#2D6A4F" },
  badgeTextPrivada: { color: COLORS.textMuted },
  deleteBtn: { padding: 16 },

  detalleImagen: { width: "100%", height: 260 },
  detalleImagenPlaceholder: { backgroundColor: "#F0EAE7", justifyContent: "center", alignItems: "center" },
  detalleBackBtn: { position: "absolute", top: 16, left: 16, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20, padding: 6 },
  detalleContent: { padding: 20 },
  detalleNombre: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  detalleAutor: { fontSize: 13, color: COLORS.card, marginBottom: 10 },
  detalleDesc: { fontSize: 14, color: COLORS.textMuted, marginBottom: 14, lineHeight: 20 },
  detalleMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detalleMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detalleMetaText: { fontSize: 13, color: COLORS.textMuted },

  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  modalBody: { padding: 20 },

  fotoBtn: { width: "100%", height: 180, borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  fotoPrev: { width: "100%", height: "100%" },
  fotoPlaceholder: { flex: 1, backgroundColor: "#F0EAE7", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed" },
  fotoPlaceholderText: { fontSize: 14, color: COLORS.textMuted, fontWeight: "600" },
  fotoPlaceholderSub: { fontSize: 11, color: "#aaa" },
  uploadingOverlay: { position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadingText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  imgSuccessRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  imgSuccessText: { fontSize: 12, color: "#4CAF50", fontWeight: "600" },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  fieldHint: { fontSize: 10, color: "#aaa", marginBottom: 12 },
  hintRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -10, marginBottom: 12 },
  hintError: { fontSize: 10, color: COLORS.error, fontWeight: "600" },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, marginBottom: 4 },
  inputError: { borderColor: COLORS.error, backgroundColor: "#FFF5F5" },
  row2: { flexDirection: "row", gap: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
=======
  grid: { paddingHorizontal: 16, marginTop: 8 },
  gridRow: { flexDirection: "row", gap: 12 },
  gridCol: { flex: 1 },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Mis recetas list
  misRecetaCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
  },
  misRecetaImg: { width: 80, height: 80 },
  misRecetaInfo: { flex: 1, padding: 10 },
  misRecetaBadgeRow: { marginBottom: 4 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeCustom: { backgroundColor: "#E8F5E9" },
  badgeLib: { backgroundColor: "#FDF3F0" },
  badgeText: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted },
  misRecetaNombre: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  misRecetaMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  misRecetaMetaText: { fontSize: 11, color: COLORS.textMuted },
  deleteBtn: { padding: 16 },

  // Detalle
  detalleImagen: { width: "100%", height: 260 },
  detalleBackBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 6,
  },
  detalleContent: { padding: 20 },
  detalleTags: { flexDirection: "row", gap: 8, marginBottom: 8 },
  detalleTag: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detalleTagText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  detalleNombre: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  detalleMeta: { flexDirection: "row", gap: 16, marginBottom: 16 },
  detalleMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detalleMetaText: { fontSize: 13, color: COLORS.textMuted },
  detalleMacros: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FDF7F5",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  detalleMacroItem: { alignItems: "center", gap: 4 },
  detalleMacroDot: { width: 10, height: 10, borderRadius: 5 },
  detalleMacroValue: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  detalleMacroLabel: { fontSize: 11, color: COLORS.textMuted },
  detalleSection: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  detalleIngRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  detalleBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.card },
  detalleIngText: { flex: 1, fontSize: 13, color: COLORS.text },
  detalleIngPrecio: { fontSize: 12, color: COLORS.textMuted },
  detalleBtnPublicar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  detalleBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Modal publicar
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  modalBody: { padding: 16 },

  tipoSelector: {
    flexDirection: "row",
    margin: 16,
    gap: 10,
  },
  tipoChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tipoChipActive: { backgroundColor: COLORS.card, borderColor: COLORS.card },
  tipoChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  tipoChipTextActive: { color: "#fff" },

  fotoBtn: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  fotoPrev: { width: "100%", height: "100%" },
  fotoPlaceholder: {
    flex: 1,
    backgroundColor: "#F0EAE7",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  fotoPlaceholderText: { fontSize: 13, color: COLORS.textMuted },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 14,
  },
  row2: { flexDirection: "row", gap: 12 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
>>>>>>> Stashed changes
  chipActive: { backgroundColor: COLORS.card, borderColor: COLORS.card },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },

<<<<<<< Updated upstream
  privacidadRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  privacidadChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  privacidadChipActive: { backgroundColor: COLORS.card, borderColor: COLORS.card },
  privacidadChipTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  privacidadChipTitleActive: { color: "#fff" },
  privacidadChipSub: { fontSize: 10, color: "#aaa" },
  privacidadChipSubActive: { color: "rgba(255,255,255,0.8)" },

  publishBtn: { backgroundColor: COLORS.card, paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
=======
  libCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 10,
    paddingRight: 12,
  },
  libCardActive: { borderColor: COLORS.card },
  libCardImg: { width: 64, height: 64 },
  libCardNombre: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  libCardMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },

  publishBtn: {
    backgroundColor: COLORS.card,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
>>>>>>> Stashed changes
  publishBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});