import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { getAuth } from "firebase/auth";
import {
    collection,
    getDocs,
    getFirestore,
    limit,
    orderBy,
    query,
    where
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    ScrollView,
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
  primary: "#2C1810",
};

const { width } = Dimensions.get("window");
const CARD_W = (width - 48) / 2;

type FeedTab = "Siguiendo" | "Descubrir";

interface RecetaFeed {
  id: string;
  titulo: string;
  imagen: string;
  calorias: number;
  tiempo: number;
  dificultad: string;
  mealType: string;
  userId: string;
  username: string;
  creadoEn: any;
}

interface UserResult {
  uid: string;
  username: string;
  displayName: string;
  fotoPerfil?: string;
  recetasCount?: number;
}

export default function ComunidadScreen() {
  const auth = getAuth();
  const db = getFirestore();
  const userId = auth.currentUser?.uid;

  const [feedTab, setFeedTab] = useState<FeedTab>("Siguiendo");
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [siguiendoIds, setSiguiendoIds] = useState<string[]>([]);
  const [recetasSiguiendo, setRecetasSiguiendo] = useState<RecetaFeed[]>([]);
  const [recetasDescubrir, setRecetasDescubrir] = useState<RecetaFeed[]>([]);
  const [loadingSiguiendo, setLoadingSiguiendo] = useState(true);
  const [loadingDescubrir, setLoadingDescubrir] = useState(true);

  const [resultadosBusqueda, setResultadosBusqueda] = useState<UserResult[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  useEffect(() => {
    if (userId) cargarSiguiendo();
  }, [userId]);

  useEffect(() => {
    if (siguiendoIds.length >= 0) {
      cargarFeedSiguiendo();
      cargarDescubrir();
    }
  }, [siguiendoIds]);

  const cargarSiguiendo = async () => {
    if (!userId) return;
    try {
      const snap = await getDocs(collection(db, "users", userId, "following"));
      setSiguiendoIds(snap.docs.map((d) => d.id));
    } catch (e) {
      console.error(e);
    }
  };

  const cargarFeedSiguiendo = async () => {
    setLoadingSiguiendo(true);
    try {
      if (siguiendoIds.length === 0) {
        setRecetasSiguiendo([]);
        return;
      }
      // Firestore "in" acepta hasta 30 valores
      const chunks: string[][] = [];
      for (let i = 0; i < siguiendoIds.length; i += 30) {
        chunks.push(siguiendoIds.slice(i, i + 30));
      }
      let todas: RecetaFeed[] = [];
      for (const chunk of chunks) {
        const q = query(
          collection(db, "public_recipes"),
          where("userId", "in", chunk),
          orderBy("creadoEn", "desc"),
          limit(30)
        );
        const snap = await getDocs(q);
        todas = [...todas, ...snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecetaFeed))];
      }
      todas.sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0));
      setRecetasSiguiendo(todas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSiguiendo(false);
    }
  };

  const cargarDescubrir = async () => {
    setLoadingDescubrir(true);
    try {
      const q = query(
        collection(db, "public_recipes"),
        orderBy("creadoEn", "desc"),
        limit(40)
      );
      const snap = await getDocs(q);
      const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecetaFeed));
      // Filtra las de usuarios que ya sigue y las propias
      const excluir = new Set([...siguiendoIds, userId ?? ""]);
      setRecetasDescubrir(todas.filter((r) => !excluir.has(r.userId)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDescubrir(false);
    }
  };

  const buscarUsuarios = async (texto: string) => {
    if (texto.trim().length < 2) {
      setResultadosBusqueda([]);
      return;
    }
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
      const resultados: UserResult[] = snap.docs
        .filter((d) => d.id !== userId)
        .map((d) => ({
          uid: d.id,
          username: d.data().username || "",
          displayName: d.data().displayName || "",
          fotoPerfil: d.data().fotoPerfil || "",
        }));
      setResultadosBusqueda(resultados);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const onChangeBusqueda = (texto: string) => {
    setBusqueda(texto);
    if (texto.length > 0) {
      setBuscando(true);
      buscarUsuarios(texto);
    } else {
      setBuscando(false);
      setResultadosBusqueda([]);
    }
  };

  const irAlPerfil = (uid: string) => {
    router.push({ pathname: "/(tabs)/perfilPublico", params: { uid } } as any);
  };

  const irAReceta = (receta: RecetaFeed) => {
    router.push({ pathname: "/(tabs)/perfilPublico", params: { uid: receta.userId } } as any);
  };

  const recetasActuales = feedTab === "Siguiendo" ? recetasSiguiendo : recetasDescubrir;
  const loadingActual = feedTab === "Siguiendo" ? loadingSiguiendo : loadingDescubrir;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Comunidad</Text>
          <Text style={styles.headerSub}>Recetas de la comunidad</Text>
        </View>
        <Image source={require("../../Logo Chef.png")} style={styles.headerLogo} />
      </View>

      {/* Búsqueda */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar usuario por @username..."
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

      {/* Resultados de búsqueda */}
      {buscando ? (
        <View style={{ flex: 1 }}>
          {loadingBusqueda ? (
            <View style={styles.centered}><ActivityIndicator color={COLORS.card} /></View>
          ) : resultadosBusqueda.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={48} color={COLORS.card} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptySubtitle}>Intenta con otro nombre de usuario</Text>
            </View>
          ) : (
            <FlatList
              data={resultadosBusqueda}
              keyExtractor={(u) => u.uid}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userCard} onPress={() => irAlPerfil(item.uid)}>
                  {item.fotoPerfil ? (
                    <Image source={{ uri: item.fotoPerfil }} style={styles.userAvatar} />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <Ionicons name="person" size={22} color="#bbb" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userDisplayName}>{item.displayName || item.username}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
        <>
          {/* Tabs Siguiendo / Descubrir */}
          <View style={styles.feedTabs}>
            {(["Siguiendo", "Descubrir"] as FeedTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.feedTab, feedTab === tab && styles.feedTabActive]}
                onPress={() => setFeedTab(tab)}
              >
                <Text style={[styles.feedTabText, feedTab === tab && styles.feedTabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Feed */}
          {loadingActual ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.card} /></View>
          ) : recetasActuales.length === 0 ? (
            <View style={styles.centered}>
              {feedTab === "Siguiendo" ? (
                <>
                  <Ionicons name="people-outline" size={56} color={COLORS.card} style={{ opacity: 0.4 }} />
                  <Text style={styles.emptyTitle}>Aún no sigues a nadie</Text>
                  <Text style={styles.emptySubtitle}>Busca usuarios con el buscador de arriba y empieza a seguirlos</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => setFeedTab("Descubrir")}>
                    <Text style={styles.emptyBtnText}>Explorar recetas</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="restaurant-outline" size={56} color={COLORS.card} style={{ opacity: 0.4 }} />
                  <Text style={styles.emptyTitle}>Sin recetas por descubrir</Text>
                  <Text style={styles.emptySubtitle}>Cuando otros usuarios publiquen recetas aparecerán aquí</Text>
                </>
              )}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {feedTab === "Siguiendo" && (
                <Text style={styles.sectionLabel}>Recetas de personas que sigues</Text>
              )}
              {feedTab === "Descubrir" && (
                <Text style={styles.sectionLabel}>Recetas recomendadas para ti</Text>
              )}
              <View style={styles.grid}>
                <View style={styles.gridCol}>
                  {recetasActuales.filter((_, i) => i % 2 === 0).map((r) => (
                    <FeedCard key={r.id} receta={r} onPress={() => irAReceta(r)} onPressUser={() => irAlPerfil(r.userId)} />
                  ))}
                </View>
                <View style={styles.gridCol}>
                  {recetasActuales.filter((_, i) => i % 2 !== 0).map((r) => (
                    <FeedCard key={r.id} receta={r} onPress={() => irAReceta(r)} onPressUser={() => irAlPerfil(r.userId)} />
                  ))}
                </View>
              </View>
              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function FeedCard({ receta, onPress, onPressUser }: { receta: RecetaFeed; onPress: () => void; onPressUser: () => void }) {
  return (
    <TouchableOpacity style={cardStyles.container} onPress={onPress} activeOpacity={0.88}>
      {receta.imagen ? (
        <Image source={{ uri: receta.imagen }} style={cardStyles.imagen} resizeMode="cover" />
      ) : (
        <View style={[cardStyles.imagen, cardStyles.imagenPlaceholder]}>
          <Ionicons name="restaurant-outline" size={28} color={COLORS.card} />
        </View>
      )}
      <View style={cardStyles.overlay} />
      <View style={cardStyles.info}>
        <Text style={cardStyles.titulo} numberOfLines={2}>{receta.titulo}</Text>
        <TouchableOpacity onPress={onPressUser} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={cardStyles.autor}>@{receta.username}</Text>
        </TouchableOpacity>
        <View style={cardStyles.meta}>
          <View style={cardStyles.metaItem}>
            <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.85)" />
            <Text style={cardStyles.metaText}>{receta.tiempo} min</Text>
          </View>
          <View style={cardStyles.metaItem}>
            <Ionicons name="flame-outline" size={10} color="rgba(255,255,255,0.85)" />
            <Text style={cardStyles.metaText}>{receta.calorias} kcal</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: { width: CARD_W, height: 180, borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  imagen: { width: "100%", height: "100%", position: "absolute" },
  imagenPlaceholder: { backgroundColor: "#F0EAE7", justifyContent: "center", alignItems: "center" },
  overlay: { position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.32)" },
  info: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 },
  titulo: { fontSize: 12, fontWeight: "700", color: "#fff", marginBottom: 2, lineHeight: 16 },
  autor: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginBottom: 4, textDecorationLine: "underline" },
  meta: { flexDirection: "row", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 9, color: "rgba(255,255,255,0.85)" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },

  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  feedTabs: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#E8E0DC", borderRadius: 12, padding: 4, marginBottom: 12 },
  feedTab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  feedTabActive: { backgroundColor: COLORS.surface },
  feedTabText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  feedTabTextActive: { color: COLORS.text },

  sectionLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted, paddingHorizontal: 16, marginBottom: 8 },

  grid: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 4 },
  gridCol: { flex: 1 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: { backgroundColor: COLORS.card, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 24, marginTop: 6 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 12 },
  userAvatar: { width: 48, height: 48, borderRadius: 24 },
  userAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center" },
  userDisplayName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  userUsername: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});