import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const MOBILE_WIDTH = Platform.OS === "web" ? 390 : width;
const GRID_SIZE = (MOBILE_WIDTH - 4) / 3;

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=300",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=300",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300",
];

type TabType = "Recetas" | "Guardadas" | "Me gusta";

export default function Perfil() {
  const [activeTab, setActiveTab] = useState<TabType>("Recetas");
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const logout = async () => {
    await signOut(auth);
    router.replace("/(auth)/login");
  };

  const displayName = userData?.displayName || user?.displayName || "Usuario";

  // Usa username guardado; si no existe aún, muestra vacío con hint
  const username = userData?.username
    ? "@" + userData.username
    : "Sin usuario · Edita tu perfil";

  const usernameIsSet = !!userData?.username;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C4918A" />
      </View>
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header (igual al Home) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Perfil</Text>
          <Text style={styles.headerSub}>Mi cuenta</Text>
        </View>
        <Image
          source={require("../../Logo Chef.png")}
          style={styles.headerLogo}
        />
      </View>

      {/* Avatar + Info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#aaa" />
            </View>
          </View>
        </View>

        {/* Username */}
        <Text style={[styles.username, !usernameIsSet && styles.usernameEmpty]}>
          {username}
        </Text>

        {/* Nombre completo */}
        <Text style={styles.displayName}>{displayName}</Text>

        {/* Ubicación */}
        {userData?.ciudad && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.locationText}>{userData.ciudad}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Recetas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>630</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>220</Text>
            <Text style={styles.statLabel}>Siguiendo</Text>
          </View>
        </View>

        {/* Botón editar */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push("/editarPerfil")}
        >
          <Text style={styles.editButtonText}>Editar perfil</Text>
        </TouchableOpacity>

        {/* Tags objetivo */}
        {userData?.objetivo && (
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Ionicons name="flame-outline" size={12} color="#2D6A4F" />
              <Text style={styles.tagText}>{userData.objetivo}</Text>
            </View>
            <View style={styles.tag}>
              <Ionicons name="location-outline" size={12} color="#2D6A4F" />
              <Text style={styles.tagText}>Cali, Colombia</Text>
            </View>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(["Recetas", "Guardadas", "Me gusta"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid de imágenes */}
      <View style={styles.grid}>
        {PLACEHOLDER_IMAGES.map((uri, index) => (
          <TouchableOpacity key={index} style={styles.gridItem}>
            <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerSub: { fontSize: 14, color: "#888", fontWeight: "400" },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#2c1810", marginTop: 2 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  avatarContainer: { marginBottom: 12 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: "#C4918A",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#e8e8e8",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  usernameEmpty: {
    fontSize: 13,
    fontWeight: "400",
    color: "#aaa",
    fontStyle: "italic",
  },
  displayName: { fontSize: 13, color: "#666", marginBottom: 6 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  locationText: { fontSize: 12, color: "#888" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "700", color: "#C4918A" },
  statLabel: { fontSize: 11, color: "#999", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#eee" },
  editButton: {
    backgroundColor: "#C4918A",
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  editButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  tagsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4EE",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tagText: { fontSize: 11, color: "#C4918A", fontWeight: "600" },
  tabsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabText: { fontSize: 13, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#1a1a1a" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2,
    backgroundColor: "#C4918A",
    borderRadius: 2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2, padding: 1 },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE },
  gridImage: { width: "100%", height: "100%" },
});