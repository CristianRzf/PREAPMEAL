import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
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

interface UserCard {
  uid: string;
  username: string;
  displayName: string;
  fotoPerfil?: string;
  recetasCount?: number;
  seguidoresCount?: number;
  siguiendoComun?: string; // nombre de un seguidor en común
  leSigo?: boolean;
}

export default function ComunidadScreen() {
  const auth = getAuth();
  const db = getFirestore();
  const userId = auth.currentUser?.uid;

  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<UserCard[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  const [usuariosSugeridos, setUsuariosSugeridos] = useState<UserCard[]>([]);
  const [loadingSugeridos, setLoadingSugeridos] = useState(true);

  // IDs de usuarios que ya sigo
  const [siguiendoIds, setSiguiendoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      cargarSiguiendo().then(() => cargarSugeridos());
    }
  }, [userId]);

  const cargarSiguiendo = async () => {
    if (!userId) return;
    try {
      const snap = await getDocs(collection(db, "users", userId, "following"));
      setSiguiendoIds(new Set(snap.docs.map((d) => d.id)));
    } catch (e) { console.error(e); }
  };

  const cargarSugeridos = async () => {
    if (!userId) return;
    setLoadingSugeridos(true);
    try {
      // Trae usuarios recientes, excluye el propio
      const snap = await getDocs(query(collection(db, "users"), limit(30)));
      const todos = snap.docs
        .filter((d) => d.id !== userId)
        .map((d) => ({
          uid: d.id,
          username: d.data().username || "",
          displayName: d.data().displayName || "",
          fotoPerfil: d.data().fotoPerfil || "",
          leSigo: siguiendoIds.has(d.id),
        }));
      setUsuariosSugeridos(todos);
    } catch (e) { console.error(e); }
    finally { setLoadingSugeridos(false); }
  };

  const toggleFollow = async (user: UserCard) => {
    if (!userId) return;
    const ref = doc(db, "users", userId, "following", user.uid);
    if (siguiendoIds.has(user.uid)) {
      await deleteDoc(ref);
      await deleteDoc(doc(db, "users", user.uid, "followers", userId));
      setSiguiendoIds((prev) => { const s = new Set(prev); s.delete(user.uid); return s; });
      setUsuariosSugeridos((prev) => prev.map((u) => u.uid === user.uid ? { ...u, leSigo: false } : u));
      setResultadosBusqueda((prev) => prev.map((u) => u.uid === user.uid ? { ...u, leSigo: false } : u));
    } else {
      await setDoc(ref, {
        username: user.username, displayName: user.displayName,
        fotoPerfil: user.fotoPerfil || "", creadoEn: serverTimestamp(),
      });
      await setDoc(doc(db, "users", user.uid, "followers", userId), {
        creadoEn: serverTimestamp(),
      });
      setSiguiendoIds((prev) => new Set(prev).add(user.uid));
      setUsuariosSugeridos((prev) => prev.map((u) => u.uid === user.uid ? { ...u, leSigo: true } : u));
      setResultadosBusqueda((prev) => prev.map((u) => u.uid === user.uid ? { ...u, leSigo: true } : u));
    }
  };

  const buscarUsuarios = async (texto: string) => {
    if (texto.trim().length < 2) { setResultadosBusqueda([]); return; }
    setLoadingBusqueda(true);
    try {
      const textLower = texto.toLowerCase().replace(/^@/, "");
      const q = query(
        collection(db, "users"),
        where("username", ">=", textLower),
        where("username", "<=", textLower + "\uf8ff"),
        limit(10)
      );
      const snap = await getDocs(q);
      setResultadosBusqueda(snap.docs
        .filter((d) => d.id !== userId)
        .map((d) => ({
          uid: d.id,
          username: d.data().username || "",
          displayName: d.data().displayName || "",
          fotoPerfil: d.data().fotoPerfil || "",
          leSigo: siguiendoIds.has(d.id),
        }))
      );
    } catch (e) { console.error(e); }
    finally { setLoadingBusqueda(false); }
  };

  const onChangeBusqueda = (texto: string) => {
    setBusqueda(texto);
    if (texto.length > 0) { setBuscando(true); buscarUsuarios(texto); }
    else { setBuscando(false); setResultadosBusqueda([]); }
  };

  const listaVisible = buscando ? resultadosBusqueda : usuariosSugeridos;
  const loadingVisible = buscando ? loadingBusqueda : loadingSugeridos;

  const renderUserCard = ({ item }: { item: UserCard }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => router.push({ pathname: "/(tabs)/perfilPublico", params: { uid: item.uid } } as any)}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/(tabs)/perfilPublico", params: { uid: item.uid } } as any)}
      >
        {item.fotoPerfil ? (
          <Image source={{ uri: item.fotoPerfil }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Ionicons name="person" size={26} color="#bbb" />
          </View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userDisplayName} numberOfLines={1}>
          {item.displayName || item.username}
        </Text>
        <Text style={styles.userUsername}>@{item.username}</Text>
        <Text style={styles.userContexto}>
          {item.leSigo ? "Ya lo sigues" : "Sugerido para ti"}
        </Text>
      </View>

      {/* Botón seguir */}
      <TouchableOpacity
        style={[styles.followBtn, item.leSigo && styles.followBtnActive]}
        onPress={() => toggleFollow(item)}
      >
        <Text style={[styles.followBtnText, item.leSigo && styles.followBtnTextActive]}>
          {item.leSigo ? "Siguiendo" : "Seguir"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Comunidad</Text>
          <Text style={styles.headerSub}>Descubre personas</Text>
        </View>
        <Image source={require("../../Logo Chef.png")} style={styles.headerLogo} />
      </View>

      {/* Buscador */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por @username..."
          placeholderTextColor={COLORS.textMuted}
          value={busqueda}
          onChangeText={onChangeBusqueda}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => { setBusqueda(""); setBuscando(false); setResultadosBusqueda([]); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sección label */}
      <Text style={styles.sectionLabel}>
        {buscando ? "Resultados de búsqueda" : "Personas que quizás conoces"}
      </Text>

      {/* Lista */}
      {loadingVisible ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.card} />
        </View>
      ) : listaVisible.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={56} color={COLORS.card} style={{ opacity: 0.4 }} />
          <Text style={styles.emptyTitle}>
            {buscando ? "Sin resultados" : "Aún no hay usuarios"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {buscando ? "Intenta con otro nombre de usuario" : "Invita a tus amigos a unirse"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listaVisible}
          keyExtractor={(u) => u.uid}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderUserCard}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },

  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  sectionLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted, paddingHorizontal: 20, marginBottom: 4, marginTop: 4 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 32 },

  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  userAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: COLORS.card },
  userAvatarPlaceholder: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.border },
  userInfo: { flex: 1, gap: 2 },
  userDisplayName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  userUsername: { fontSize: 12, color: COLORS.textMuted },
  userContexto: { fontSize: 11, color: "#bbb", marginTop: 2 },

  followBtn: { backgroundColor: COLORS.card, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  followBtnActive: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.card },
  followBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  followBtnTextActive: { color: COLORS.card },
});