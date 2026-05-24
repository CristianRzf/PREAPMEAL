import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
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
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
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

const CLOUDINARY_CLOUD_NAME = "dbbsgfsr6";
const CLOUDINARY_UPLOAD_PRESET = "mealprep_uploads";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const COLORS = {
  bg: "#F5F0ED",
  card: "#C4918A",
  surface: "#FFFFFF",
  text: "#2C1810",
  textMuted: "#7A5C56",
  textLight: "#FFFFFF",
  border: "#EDE8E4",
  error: "#FF6B6B",
  like: "#E05050",
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type TabType = "Explorar" | "Mis recetas";
type Dificultad = "fácil" | "intermedio" | "difícil";
type MealType = "desayuno" | "almuerzo" | "cena" | "snack";

interface RecetaUsuario {
  id: string;
  tipo: "custom";
  titulo: string;
  descripcion: string;
  imagen: string;
  calorias: number;
  tiempo: number;
  dificultad: string;
  mealType: string;
  userId: string;
  username: string;
  creadoEn: any;
  publica: boolean;
  globalId?: string;
}

const MEAL_LABELS: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  snack: "Snack",
  todas: "Todas",
};

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
  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData,
  });
  if (!response.ok)
    throw new Error(`Cloudinary error: ${await response.text()}`);
  const data = await response.json();
  return data.secure_url;
}

export default function RecetasScreen() {
  const auth = getAuth();
  const db = getFirestore();
  const userId = auth.currentUser?.uid;

  const [activeTab, setActiveTab] = useState<TabType>("Explorar");
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<MealType | "todas">("todas");
  const [filtroDif, setFiltroDif] = useState<Dificultad | "todas">("todas");
  const [recetasExplorar, setRecetasExplorar] = useState<RecetaUsuario[]>([]);
  const [loadingExplorar, setLoadingExplorar] = useState(true);
  const [errorExplorar, setErrorExplorar] = useState<string | null>(null);
  const [misRecetas, setMisRecetas] = useState<RecetaUsuario[]>([]);
  const [loadingMisRecetas, setLoadingMisRecetas] = useState(false);

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
  const [recetaDetalle, setRecetaDetalle] = useState<RecetaUsuario | null>(
    null,
  );

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargarExplorar();
  }, []);
  useEffect(() => {
    if (activeTab === "Mis recetas") cargarMisRecetas();
  }, [activeTab]);
  useEffect(() => {
    if (userId) {
      cargarLiked();
      cargarSaved();
    }
  }, [userId]);

  const cargarExplorar = async () => {
    setLoadingExplorar(true);
    setErrorExplorar(null);
    try {
      const q = query(
        collection(db, "public_recipes"),
        orderBy("creadoEn", "desc"),
      );
      const snap = await getDocs(q);
      setRecetasExplorar(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecetaUsuario),
      );
    } catch (e: any) {
      console.error("ERROR Explorar:", e);
      setErrorExplorar(e?.message || "Error al cargar recetas");
    } finally {
      setLoadingExplorar(false);
    }
  };

  const cargarMisRecetas = async () => {
    if (!userId) return;
    setLoadingMisRecetas(true);
    try {
      const q = query(
        collection(db, "users", userId, "recipes"),
        orderBy("creadoEn", "desc"),
      );
      const snap = await getDocs(q);
      setMisRecetas(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecetaUsuario),
      );
    } catch (e) {
      console.error("ERROR MisRecetas:", e);
    } finally {
      setLoadingMisRecetas(false);
    }
  };

  const cargarLiked = async () => {
    if (!userId) return;
    try {
      const snap = await getDocs(collection(db, "users", userId, "liked"));
      setLikedIds(new Set(snap.docs.map((d) => d.id)));
    } catch (e) {
      console.error(e);
    }
  };

  const cargarSaved = async () => {
    if (!userId) return;
    try {
      const snap = await getDocs(collection(db, "users", userId, "saved"));
      setSavedIds(new Set(snap.docs.map((d) => d.id)));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLike = async (receta: RecetaUsuario) => {
    if (!userId) return;
    const ref = doc(db, "users", userId, "liked", receta.id);
    if (likedIds.has(receta.id)) {
      await deleteDoc(ref);
      setLikedIds((prev) => {
        const s = new Set(prev);
        s.delete(receta.id);
        return s;
      });
    } else {
      await setDoc(ref, {
        titulo: receta.titulo,
        imagen: receta.imagen,
        calorias: receta.calorias,
        tiempo: receta.tiempo,
        dificultad: receta.dificultad,
        mealType: receta.mealType,
        userId: receta.userId,
        username: receta.username,
        creadoEn: serverTimestamp(),
      });
      setLikedIds((prev) => new Set(prev).add(receta.id));
    }
  };

  const toggleSave = async (receta: RecetaUsuario) => {
    if (!userId) return;
    const ref = doc(db, "users", userId, "saved", receta.id);
    if (savedIds.has(receta.id)) {
      await deleteDoc(ref);
      setSavedIds((prev) => {
        const s = new Set(prev);
        s.delete(receta.id);
        return s;
      });
    } else {
      await setDoc(ref, {
        titulo: receta.titulo,
        imagen: receta.imagen,
        calorias: receta.calorias,
        tiempo: receta.tiempo,
        dificultad: receta.dificultad,
        mealType: receta.mealType,
        userId: receta.userId,
        username: receta.username,
        creadoEn: serverTimestamp(),
      });
      setSavedIds((prev) => new Set(prev).add(receta.id));
    }
  };

  const resetForm = () => {
    setFormTitulo("");
    setFormDesc("");
    setFormCals("");
    setFormTiempo("");
    setFormDif("fácil");
    setFormMeal("almuerzo");
    setFormImagenUri(null);
    setFormImagenUrl(null);
    setFormPublica(true);
  };

  const seleccionarImagen = () => {
    Alert.alert("Agregar foto", "¿Cómo quieres agregar la imagen?", [
      { text: "Galería", onPress: () => abrirGaleria() },
      { text: "Cámara", onPress: () => abrirCamara() },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const abrirGaleria = async () => {
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
    if (!result.canceled) await procesarImagen(result.assets[0].uri);
  };

  const abrirCamara = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
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
    } finally {
      setUploadingImg(false);
    }
  };

  const publicarReceta = async () => {
    if (!userId) return;
    if (!formTitulo.trim()) {
      Alert.alert("Error", "El título es obligatorio.");
      return;
    }
    if (!formImagenUrl) {
      Alert.alert("Error", "Agrega una foto a tu receta.");
      return;
    }
    if (uploadingImg) {
      Alert.alert("Espera", "La imagen aún se está subiendo.");
      return;
    }

    const titulo = formTitulo.trim();
    const cals = Number(formCals);
    const tiempo = Number(formTiempo);

    if (titulo.length < 3) {
      Alert.alert(
        "Título muy corto",
        "El título debe tener al menos 3 caracteres.",
      );
      return;
    }
    if (titulo.length > 60) {
      Alert.alert(
        "Título muy largo",
        "El título no puede superar los 60 caracteres.",
      );
      return;
    }
    if (!formCals || isNaN(cals) || cals < 50 || cals > 3000) {
      Alert.alert(
        "Calorías inválidas",
        "Las calorías deben estar entre 50 y 3000 kcal.",
      );
      return;
    }
    if (!formTiempo || isNaN(tiempo) || tiempo < 1 || tiempo > 720) {
      Alert.alert(
        "Tiempo inválido",
        "El tiempo debe estar entre 1 y 720 minutos.",
      );
      return;
    }

    setSaving(true);
    try {
      const userSnap = await getDoc(doc(db, "users", userId));
      const username = userSnap.exists()
        ? userSnap.data().username || "usuario"
        : "usuario";

      const recetaData = {
        tipo: "custom",
        titulo,
        descripcion: formDesc.trim(),
        imagen: formImagenUrl,
        calorias: cals,
        tiempo,
        dificultad: formDif,
        mealType: formMeal,
        proteinas: 0,
        carbohidratos: 0,
        grasas: 0,
        ingredientes: [],
        userId,
        username,
        creadoEn: serverTimestamp(),
        publica: formPublica,
      };

      let globalId: string | null = null;
      if (formPublica) {
        const globalRef = await addDoc(
          collection(db, "public_recipes"),
          recetaData,
        );
        globalId = globalRef.id;
      }
      await addDoc(collection(db, "users", userId, "recipes"), {
        ...recetaData,
        globalId,
      });

      Alert.alert(
        "✓ Publicada",
        formPublica
          ? "Tu receta ya es visible para todos."
          : "Receta guardada como privada.",
      );
      resetForm();
      setModalSubir(false);
      cargarExplorar();
      cargarMisRecetas();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo publicar la receta.");
    } finally {
      setSaving(false);
    }
  };

  const eliminarReceta = (receta: RecetaUsuario) => {
    Alert.alert("Eliminar", "¿Eliminar esta receta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          if (!userId) return;
          try {
            await deleteDoc(doc(db, "users", userId, "recipes", receta.id));
            if (receta.publica && receta.globalId) {
              await deleteDoc(doc(db, "public_recipes", receta.globalId));
            } else if (receta.publica) {
              const q = query(
                collection(db, "public_recipes"),
                where("userId", "==", userId),
                where("titulo", "==", receta.titulo),
              );
              const snap = await getDocs(q);
              for (const d of snap.docs)
                await deleteDoc(doc(db, "public_recipes", d.id));
            }
            setMisRecetas((p) => p.filter((r) => r.id !== receta.id));
            setRecetasExplorar((p) =>
              p.filter(
                (r) => r.userId !== userId || r.titulo !== receta.titulo,
              ),
            );
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar.");
          }
        },
      },
    ]);
  };

  const recetasFiltradas = useMemo(() => {
    return recetasExplorar.filter((r) => {
      const matchBusqueda = r.titulo
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      const matchTipo = filtroTipo === "todas" || r.mealType === filtroTipo;
      const matchDif = filtroDif === "todas" || r.dificultad === filtroDif;
      return matchBusqueda && matchTipo && matchDif;
    });
  }, [recetasExplorar, busqueda, filtroTipo, filtroDif]);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Recetas</Text>
          <Text style={styles.headerSub}>Explora y cocina</Text>
        </View>
        <View style={styles.headerRight}>
          <Image
            source={require("../../Logo Chef.png")}
            style={styles.headerLogo}
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              resetForm();
              setModalSubir(true);
            }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {(["Explorar", "Mis recetas"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "Explorar" && (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <Ionicons
              name="search-outline"
              size={18}
              color={COLORS.textMuted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar receta..."
              placeholderTextColor={COLORS.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {(["todas", "desayuno", "almuerzo", "cena", "snack"] as const).map(
              (f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    filtroTipo === f && styles.filterChipActive,
                  ]}
                  onPress={() => setFiltroTipo(f)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filtroTipo === f && styles.filterChipTextActive,
                    ]}
                  >
                    {MEAL_LABELS[f]}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.filterScroll, { marginTop: -4 }]}
          >
            {(["todas", "fácil", "intermedio", "difícil"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  filtroDif === f && styles.filterChipActive,
                ]}
                onPress={() => setFiltroDif(f)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filtroDif === f && styles.filterChipTextActive,
                  ]}
                >
                  {f === "todas"
                    ? "Cualquier nivel"
                    : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {errorExplorar ? (
            <View style={styles.centered}>
              <Ionicons
                name="warning-outline"
                size={40}
                color={COLORS.error}
                style={{ opacity: 0.7 }}
              />
              <Text style={[styles.emptyTitle, { color: COLORS.error }]}>
                Error al cargar
              </Text>
              <Text style={styles.emptySubtitle}>{errorExplorar}</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={cargarExplorar}
              >
                <Text style={styles.emptyBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : loadingExplorar ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.card} />
            </View>
          ) : recetasFiltradas.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons
                name="restaurant-outline"
                size={56}
                color={COLORS.card}
                style={{ opacity: 0.4 }}
              />
              <Text style={styles.emptyTitle}>
                {busqueda || filtroTipo !== "todas" || filtroDif !== "todas"
                  ? "No hay recetas que coincidan"
                  : "Aún no hay recetas"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {busqueda || filtroTipo !== "todas" || filtroDif !== "todas"
                  ? "Intenta con otros filtros"
                  : "¡Sé el primero en publicar una receta!"}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => {
                  resetForm();
                  setModalSubir(true);
                }}
              >
                <Text style={styles.emptyBtnText}>+ Publicar receta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              <View style={styles.gridCol}>
                {recetasFiltradas
                  .filter((_, i) => i % 2 === 0)
                  .map((r) => (
                    <RecetaCard
                      key={r.id}
                      receta={r}
                      onPress={() => setRecetaDetalle(r)}
                    />
                  ))}
              </View>
              <View style={styles.gridCol}>
                {recetasFiltradas
                  .filter((_, i) => i % 2 !== 0)
                  .map((r) => (
                    <RecetaCard
                      key={r.id}
                      receta={r}
                      onPress={() => setRecetaDetalle(r)}
                    />
                  ))}
              </View>
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {activeTab === "Mis recetas" && (
        <View style={{ flex: 1 }}>
          {loadingMisRecetas ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.card} />
            </View>
          ) : misRecetas.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons
                name="restaurant-outline"
                size={56}
                color={COLORS.card}
                style={{ opacity: 0.4 }}
              />
              <Text style={styles.emptyTitle}>Aún no tienes recetas</Text>
              <Text style={styles.emptySubtitle}>
                Publica tu primera receta
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => {
                  resetForm();
                  setModalSubir(true);
                }}
              >
                <Text style={styles.emptyBtnText}>+ Publicar receta</Text>
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
                    <Image
                      source={{ uri: item.imagen }}
                      style={styles.misRecetaImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.misRecetaImg,
                        styles.misRecetaImgPlaceholder,
                      ]}
                    >
                      <Ionicons
                        name="image-outline"
                        size={24}
                        color={COLORS.card}
                      />
                    </View>
                  )}
                  <View style={styles.misRecetaInfo}>
                    <Text style={styles.misRecetaNombre} numberOfLines={2}>
                      {item.titulo}
                    </Text>
                    <Text style={styles.misRecetaAutor}>@{item.username}</Text>
                    <View style={styles.misRecetaMeta}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={COLORS.textMuted}
                      />
                      <Text style={styles.misRecetaMetaText}>
                        {item.tiempo} min
                      </Text>
                      <Ionicons
                        name="flame-outline"
                        size={12}
                        color={COLORS.textMuted}
                      />
                      <Text style={styles.misRecetaMetaText}>
                        {item.calorias} kcal
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.dificultad}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => eliminarReceta(item)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={COLORS.card}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ─── Modal Detalle ─────────────────────────────────────────────────── */}
      <Modal
        visible={!!recetaDetalle}
        animationType="slide"
        statusBarTranslucent
      >
        {recetaDetalle && (
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Imagen con solo el botón volver */}
              <View>
                {recetaDetalle.imagen ? (
                  <Image
                    source={{ uri: recetaDetalle.imagen }}
                    style={styles.detalleImagen}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.detalleImagen,
                      styles.detalleImagenPlaceholder,
                    ]}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={56}
                      color={COLORS.card}
                    />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.detalleBackBtn}
                  onPress={() => setRecetaDetalle(null)}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Área blanca con info + botones estilo red social */}
              <View style={styles.detalleContent}>
                {/* Fila superior: título + botones */}
                <View style={styles.detalleTituloRow}>
                  <Text style={styles.detalleNombre}>
                    {recetaDetalle.titulo}
                  </Text>
                  <View style={styles.detalleAcciones}>
                    {/* Me gusta */}
                    <TouchableOpacity
                      style={styles.accionBtn}
                      onPress={() => toggleLike(recetaDetalle)}
                    >
                      <Ionicons
                        name={
                          likedIds.has(recetaDetalle.id)
                            ? "heart"
                            : "heart-outline"
                        }
                        size={26}
                        color={
                          likedIds.has(recetaDetalle.id)
                            ? COLORS.like
                            : COLORS.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.accionLabel,
                          likedIds.has(recetaDetalle.id) && {
                            color: COLORS.like,
                          },
                        ]}
                      >
                        Me gusta
                      </Text>
                    </TouchableOpacity>
                    {/* Guardar */}
                    <TouchableOpacity
                      style={styles.accionBtn}
                      onPress={() => toggleSave(recetaDetalle)}
                    >
                      <Ionicons
                        name={
                          savedIds.has(recetaDetalle.id)
                            ? "bookmark"
                            : "bookmark-outline"
                        }
                        size={26}
                        color={
                          savedIds.has(recetaDetalle.id)
                            ? COLORS.card
                            : COLORS.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.accionLabel,
                          savedIds.has(recetaDetalle.id) && {
                            color: COLORS.card,
                          },
                        ]}
                      >
                        Guardar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.detalleAutor}>
                  por @{recetaDetalle.username}
                </Text>

                {/* Separador */}
                <View style={styles.detalleSeparador} />

                {recetaDetalle.descripcion ? (
                  <Text style={styles.detalleDesc}>
                    {recetaDetalle.descripcion}
                  </Text>
                ) : null}

                {/* Métricas */}
                <View style={styles.detalleMeta}>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={COLORS.card}
                    />
                    <Text style={styles.detalleMetaText}>
                      {recetaDetalle.tiempo} min
                    </Text>
                  </View>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons
                      name="flame-outline"
                      size={16}
                      color={COLORS.card}
                    />
                    <Text style={styles.detalleMetaText}>
                      {recetaDetalle.calorias} kcal
                    </Text>
                  </View>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons
                      name="bar-chart-outline"
                      size={16}
                      color={COLORS.card}
                    />
                    <Text style={styles.detalleMetaText}>
                      {recetaDetalle.dificultad}
                    </Text>
                  </View>
                  <View style={styles.detalleMetaItem}>
                    <Ionicons
                      name="restaurant-outline"
                      size={16}
                      color={COLORS.card}
                    />
                    <Text style={styles.detalleMetaText}>
                      {MEAL_LABELS[recetaDetalle.mealType] ||
                        recetaDetalle.mealType}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ─── Modal Nueva Receta ──────────────────────────────────────────── */}
      <Modal visible={modalSubir} animationType="slide">
        <SafeAreaView
          style={{ flex: 1, backgroundColor: COLORS.bg }}
          edges={["top", "left", "right"]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalSubir(false)}>
              <Ionicons name="chevron-down" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nueva receta</Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.fotoBtn}
              onPress={seleccionarImagen}
              disabled={uploadingImg}
            >
              {formImagenUri ? (
                <View style={{ width: "100%", height: "100%" }}>
                  <Image
                    source={{ uri: formImagenUri }}
                    style={styles.fotoPrev}
                    resizeMode="cover"
                  />
                  {uploadingImg && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.uploadingText}>
                        Subiendo imagen...
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <Ionicons
                    name="camera-outline"
                    size={36}
                    color={COLORS.card}
                  />
                  <Text style={styles.fotoPlaceholderText}>
                    Toca para agregar foto
                  </Text>
                  <Text style={styles.fotoPlaceholderSub}>
                    Galería o cámara
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {formImagenUrl && !uploadingImg && (
              <View style={styles.imgSuccessRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.imgSuccessText}>
                  Imagen subida correctamente
                </Text>
              </View>
            )}

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

            <Text style={styles.fieldLabel}>Tipo de comida</Text>
            <View style={styles.chipRow}>
              {(["desayuno", "almuerzo", "cena", "snack"] as MealType[]).map(
                (m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, formMeal === m && styles.chipActive]}
                    onPress={() => setFormMeal(m)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formMeal === m && styles.chipTextActive,
                      ]}
                    >
                      {MEAL_LABELS[m]}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <Text style={styles.fieldLabel}>Dificultad</Text>
            <View style={styles.chipRow}>
              {(["fácil", "intermedio", "difícil"] as Dificultad[]).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, formDif === d && styles.chipActive]}
                  onPress={() => setFormDif(d)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      formDif === d && styles.chipTextActive,
                    ]}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.publishBtn,
                (saving || uploadingImg) && { opacity: 0.7 },
              ]}
              onPress={publicarReceta}
              disabled={saving || uploadingImg}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.publishBtnText}>Publicar receta</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function RecetaCard({
  receta,
  onPress,
}: {
  receta: RecetaUsuario;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={cardStyles.container}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {receta.imagen ? (
        <Image
          source={{ uri: receta.imagen }}
          style={cardStyles.imagen}
          resizeMode="cover"
        />
      ) : (
        <View style={[cardStyles.imagen, cardStyles.imagenPlaceholder]}>
          <Ionicons name="restaurant-outline" size={32} color={COLORS.card} />
        </View>
      )}
      <View style={cardStyles.overlay} />
      <View style={cardStyles.info}>
        <Text style={cardStyles.nombre} numberOfLines={2}>
          {receta.titulo}
        </Text>
        <Text style={cardStyles.autor}>@{receta.username}</Text>
        <View style={cardStyles.meta}>
          <View style={cardStyles.metaItem}>
            <Ionicons
              name="time-outline"
              size={11}
              color="rgba(255,255,255,0.85)"
            />
            <Text style={cardStyles.metaText}>{receta.tiempo} min</Text>
          </View>
          <View style={cardStyles.metaItem}>
            <Ionicons
              name="flame-outline"
              size={11}
              color="rgba(255,255,255,0.85)"
            />
            <Text style={cardStyles.metaText}>{receta.calorias} kcal</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 170,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  imagen: { width: "100%", height: "100%", position: "absolute" },
  imagenPlaceholder: {
    backgroundColor: "#F0EAE7",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  info: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 },
  nombre: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
    lineHeight: 17,
  },
  autor: { fontSize: 10, color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  meta: { flexDirection: "row", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 10, color: "rgba(255,255,255,0.85)" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
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
    color: COLORS.text,
    marginTop: 2,
  },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  addBtn: {
    backgroundColor: COLORS.card,
    width: 38,
    height: 38,
    borderRadius: 19,
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
  tabItemActive: { backgroundColor: COLORS.surface },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text },

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
  filterChipActive: { backgroundColor: COLORS.card },
  filterChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
  filterChipTextActive: { color: "#fff", fontWeight: "600" },

  grid: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 8 },
  gridCol: { flex: 1 },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyBtn: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 24,
    marginTop: 6,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  misRecetaCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
  },
  misRecetaImg: { width: 80, height: 80 },
  misRecetaImgPlaceholder: {
    backgroundColor: "#F0EAE7",
    justifyContent: "center",
    alignItems: "center",
  },
  misRecetaInfo: { flex: 1, padding: 10, gap: 3 },
  misRecetaNombre: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  misRecetaAutor: { fontSize: 11, color: COLORS.card },
  misRecetaMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  misRecetaMetaText: { fontSize: 11, color: COLORS.textMuted },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FDF3F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "600", color: COLORS.card },
  deleteBtn: { padding: 16 },

  // Detalle
  detalleImagen: { width: "100%", height: 280 },
  detalleImagenPlaceholder: {
    backgroundColor: "#F0EAE7",
    justifyContent: "center",
    alignItems: "center",
  },
  detalleBackBtn: {
    position: "absolute",
    top: 56,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 6,
  },

  detalleContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 20,
  },

  detalleTituloRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  detalleNombre: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  detalleAcciones: { flexDirection: "row", gap: 16, paddingTop: 4 },
  accionBtn: { alignItems: "center", gap: 3 },
  accionLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },

  detalleAutor: {
    fontSize: 13,
    color: COLORS.card,
    marginTop: 4,
    marginBottom: 12,
  },
  detalleSeparador: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  detalleDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 14,
    lineHeight: 20,
  },
  detalleMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  detalleMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detalleMetaText: { fontSize: 13, color: COLORS.textMuted },

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
  modalBody: { padding: 20 },

  fotoBtn: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  fotoPrev: { width: "100%", height: "100%" },
  fotoPlaceholder: {
    flex: 1,
    backgroundColor: "#F0EAE7",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  fotoPlaceholderText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  fotoPlaceholderSub: { fontSize: 11, color: "#aaa" },
  uploadingOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadingText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  imgSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  imgSuccessText: { fontSize: 12, color: "#4CAF50", fontWeight: "600" },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.card, borderColor: COLORS.card },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  publishBtn: {
    backgroundColor: COLORS.card,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  publishBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
