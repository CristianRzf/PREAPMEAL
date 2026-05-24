import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import {
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
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  bg: "#F5F0ED",
  card: "#C4918A",
  surface: "#FFFFFF",
  text: "#2C1810",
  textMuted: "#7A5C56",
  border: "#EDE8E4",
};

const { width, height } = Dimensions.get("window");
const GRID_SIZE = (width - 4) / 3;

interface PerfilData {
  displayName: string;
  username: string;
  fotoPerfil?: string;
  objetivo?: string;
  actividad?: string;
}

interface RecetaItem {
  id: string;
  titulo: string;
  imagen: string;
  calorias: number;
  tiempo: number;
  dificultad: string;
}

interface UserListItem {
  uid: string;
  username: string;
  displayName: string;
  fotoPerfil?: string;
}

export default function PerfilPublicoScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const auth = getAuth();
  const db = getFirestore();
  const myId = auth.currentUser?.uid;

  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [recetas, setRecetas] = useState<RecetaItem[]>([]);
  const [seguidores, setSeguidores] = useState(0);
  const [siguiendo, setSiguiendo] = useState(0);
  const [leSigo, setLeSigo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // ── Nuevos estados ────────────────────────────────────────────────────────
  const [fotoModalVisible, setFotoModalVisible] = useState(false);
  const [listaModalVisible, setListaModalVisible] = useState(false);
  const [tipoLista, setTipoLista] = useState<"seguidores" | "siguiendo">("seguidores");
  const [listaUsuarios, setListaUsuarios] = useState<UserListItem[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);

  const esPropioPerfil = myId === uid;

  useEffect(() => {
    if (uid) cargarPerfil();
  }, [uid]);

  const cargarPerfil = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists()) {
        const d = userSnap.data();
        setPerfil({
          displayName: d.displayName || "Usuario",
          username: d.username || "",
          fotoPerfil: d.fotoPerfil || "",
          objetivo: d.objetivo || "",
          actividad: d.actividad || "",
        });
      }

      const q = query(collection(db, "public_recipes"), orderBy("creadoEn", "desc"));
      const recSnap = await getDocs(q);
      setRecetas(recSnap.docs.filter((d) => d.data().userId === uid).map((d) => ({ id: d.id, ...d.data() } as RecetaItem)));

      const followersSnap = await getDocs(collection(db, "users", uid, "followers"));
      setSeguidores(followersSnap.size);

      const followingSnap = await getDocs(collection(db, "users", uid, "following"));
      setSiguiendo(followingSnap.size);

      if (myId && myId !== uid) {
        const myFollowSnap = await getDoc(doc(db, "users", myId, "following", uid));
        setLeSigo(myFollowSnap.exists());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleFollow = async () => {
    if (!myId || !uid || myId === uid) return;
    setLoadingFollow(true);
    try {
      if (leSigo) {
        await deleteDoc(doc(db, "users", myId, "following", uid));
        await deleteDoc(doc(db, "users", uid, "followers", myId));
        setLeSigo(false);
        setSeguidores((s) => Math.max(0, s - 1));
      } else {
        const mySnap = await getDoc(doc(db, "users", myId));
        const myData = mySnap.exists() ? mySnap.data() : {};
        await setDoc(doc(db, "users", myId, "following", uid), {
          username: perfil?.username || "", displayName: perfil?.displayName || "",
          fotoPerfil: perfil?.fotoPerfil || "", creadoEn: serverTimestamp(),
        });
        await setDoc(doc(db, "users", uid, "followers", myId), {
          username: myData.username || "", displayName: myData.displayName || "",
          fotoPerfil: myData.fotoPerfil || "", creadoEn: serverTimestamp(),
        });
        setLeSigo(true);
        setSeguidores((s) => s + 1);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingFollow(false); }
  };

  // ── Abre modal de lista de seguidores/siguiendo ───────────────────────────
  const abrirLista = async (tipo: "seguidores" | "siguiendo") => {
    if (!uid) return;
    setTipoLista(tipo);
    setListaModalVisible(true);
    setLoadingLista(true);
    try {
      const colRef = tipo === "seguidores"
        ? collection(db, "users", uid, "followers")
        : collection(db, "users", uid, "following");
      const snap = await getDocs(colRef);
      const lista: UserListItem[] = [];
      for (const d of snap.docs) {
        // Intenta leer el perfil completo de cada usuario
        try {
          const userSnap = await getDoc(doc(db, "users", d.id));
          if (userSnap.exists()) {
            lista.push({
              uid: d.id,
              username: userSnap.data().username || d.data().username || "",
              displayName: userSnap.data().displayName || d.data().displayName || "",
              fotoPerfil: userSnap.data().fotoPerfil || d.data().fotoPerfil || "",
            });
          } else {
            lista.push({
              uid: d.id,
              username: d.data().username || "",
              displayName: d.data().displayName || "",
              fotoPerfil: d.data().fotoPerfil || "",
            });
          }
        } catch { /* omite si falla */ }
      }
      setListaUsuarios(lista);
    } catch (e) { console.error(e); }
    finally { setLoadingLista(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.card} /></View>
      </SafeAreaView>
    );
  }

  if (!perfil) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Usuario no encontrado</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>@{perfil.username}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar — tap abre preview */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={() => perfil.fotoPerfil && setFotoModalVisible(true)} activeOpacity={0.85}>
            {perfil.fotoPerfil ? (
              <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={44} color="#bbb" />
              </View>
            )}
            {perfil.fotoPerfil && (
              <View style={styles.avatarOverlayHint}>
                <Ionicons name="expand-outline" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.displayName}>{perfil.displayName}</Text>
          <Text style={styles.username}>@{perfil.username}</Text>
          {(perfil.objetivo || perfil.actividad) && (
            <View style={styles.tagsRow}>
              {perfil.objetivo ? (
                <View style={styles.tag}>
                  <Ionicons name="flame-outline" size={11} color={COLORS.card} />
                  <Text style={styles.tagText}>{perfil.objetivo}</Text>
                </View>
              ) : null}
              {perfil.actividad ? (
                <View style={styles.tag}>
                  <Ionicons name="barbell-outline" size={11} color={COLORS.card} />
                  <Text style={styles.tagText}>{perfil.actividad}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Stats — seguidores/siguiendo son tappables */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{recetas.length}</Text>
            <Text style={styles.statLabel}>Recetas</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => abrirLista("seguidores")}>
            <Text style={styles.statNumber}>{seguidores}</Text>
            <Text style={[styles.statLabel, { color: COLORS.card }]}>Seguidores</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => abrirLista("siguiendo")}>
            <Text style={styles.statNumber}>{siguiendo}</Text>
            <Text style={[styles.statLabel, { color: COLORS.card }]}>Siguiendo</Text>
          </TouchableOpacity>
        </View>

        {/* Botón seguir */}
        {!esPropioPerfil && (
          <TouchableOpacity
            style={[styles.followBtn, leSigo && styles.followBtnActive]}
            onPress={toggleFollow}
            disabled={loadingFollow}
          >
            {loadingFollow ? (
              <ActivityIndicator size="small" color={leSigo ? COLORS.card : "#fff"} />
            ) : (
              <>
                <Ionicons name={leSigo ? "person-remove-outline" : "person-add-outline"} size={16} color={leSigo ? COLORS.card : "#fff"} />
                <Text style={[styles.followBtnText, leSigo && styles.followBtnTextActive]}>
                  {leSigo ? "Siguiendo" : "Seguir"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {esPropioPerfil && (
          <TouchableOpacity style={styles.editOwnBtn} onPress={() => router.push("/(tabs)/Perfil" as any)}>
            <Ionicons name="create-outline" size={16} color={COLORS.text} />
            <Text style={styles.editOwnBtnText}>Editar mi perfil</Text>
          </TouchableOpacity>
        )}

        <View style={styles.separator} />

        {/* Grid recetas */}
        {recetas.length === 0 ? (
          <View style={styles.emptyGrid}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.card} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>Aún no hay recetas publicadas</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {recetas.map((receta) => (
              <View key={receta.id} style={styles.gridItem}>
                {receta.imagen ? (
                  <Image source={{ uri: receta.imagen }} style={styles.gridImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
                    <Ionicons name="restaurant-outline" size={24} color={COLORS.card} />
                  </View>
                )}
                <View style={styles.gridOverlay} />
                <Text style={styles.gridTitle} numberOfLines={2}>{receta.titulo}</Text>
                <Text style={styles.gridKcal}>{receta.calorias} kcal</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal foto de perfil a pantalla completa ──────────────────────── */}
      <Modal visible={fotoModalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.fotoModalBg}>
          <TouchableOpacity style={styles.fotoModalClose} onPress={() => setFotoModalVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {perfil.fotoPerfil ? (
            <Image source={{ uri: perfil.fotoPerfil }} style={styles.fotoModalImg} resizeMode="contain" />
          ) : null}
          <Text style={styles.fotoModalNombre}>{perfil.displayName}</Text>
        </View>
      </Modal>

      {/* ── Modal lista seguidores / siguiendo ────────────────────────────── */}
      <Modal visible={listaModalVisible} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <View style={styles.listaHeader}>
            <TouchableOpacity onPress={() => setListaModalVisible(false)} style={styles.backIcon}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.listaTitle}>
              {tipoLista === "seguidores" ? `Seguidores (${seguidores})` : `Siguiendo (${siguiendo})`}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {loadingLista ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.card} /></View>
          ) : listaUsuarios.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={48} color={COLORS.card} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>
                {tipoLista === "seguidores" ? "Sin seguidores aún" : "No sigue a nadie aún"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={listaUsuarios}
              keyExtractor={(u) => u.uid}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listaUserCard}
                  onPress={() => {
                    setListaModalVisible(false);
                    setTimeout(() => {
                      router.push({ pathname: "/(tabs)/perfilPublico", params: { uid: item.uid } } as any);
                    }, 300);
                  }}
                >
                  {item.fotoPerfil ? (
                    <Image source={{ uri: item.fotoPerfil }} style={styles.listaAvatar} />
                  ) : (
                    <View style={styles.listaAvatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#bbb" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listaDisplayName}>{item.displayName || item.username}</Text>
                    <Text style={styles.listaUsername}>@{item.username}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  topBarTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },

  profileSection: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, borderColor: COLORS.card, marginBottom: 12 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center", borderWidth: 2.5, borderColor: COLORS.card, marginBottom: 12 },
  avatarOverlayHint: { position: "absolute", bottom: 14, right: 0, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, padding: 3 },
  displayName: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  username: { fontSize: 14, color: COLORS.textMuted, marginBottom: 10 },
  tagsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FDF3F0", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  tagText: { fontSize: 11, color: COLORS.card, fontWeight: "600" },

  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 14 },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "700", color: COLORS.card },
  statLabel: { fontSize: 11, color: "#999", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  followBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.card, marginHorizontal: 20, paddingVertical: 13, borderRadius: 14, marginBottom: 14 },
  followBtnActive: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.card },
  followBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  followBtnTextActive: { color: COLORS.card },

  editOwnBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.surface, marginHorizontal: 20, paddingVertical: 13, borderRadius: 14, marginBottom: 14, borderWidth: 1.5, borderColor: COLORS.border },
  editOwnBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 15 },

  separator: { height: 1, backgroundColor: COLORS.border, marginBottom: 2 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE, position: "relative" },
  gridImage: { width: "100%", height: "100%" },
  gridImagePlaceholder: { backgroundColor: "#F0EAE7", justifyContent: "center", alignItems: "center" },
  gridOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", backgroundColor: "rgba(0,0,0,0.3)" },
  gridTitle: { position: "absolute", bottom: 14, left: 4, right: 4, fontSize: 9, color: "#fff", fontWeight: "700" },
  gridKcal: { position: "absolute", bottom: 4, left: 4, fontSize: 8, color: "rgba(255,255,255,0.8)" },

  emptyGrid: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  backBtn: { backgroundColor: COLORS.card, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  backBtnText: { color: "#fff", fontWeight: "700" },

  // Foto modal
  fotoModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  fotoModalClose: { position: "absolute", top: 56, right: 20, zIndex: 10, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 8 },
  fotoModalImg: { width: width, height: width, borderRadius: 0 },
  fotoModalNombre: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 20 },

  // Lista modal
  listaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listaTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  listaUserCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, gap: 12 },
  listaAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: COLORS.card },
  listaAvatarPlaceholder: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center" },
  listaDisplayName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  listaUsername: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
});