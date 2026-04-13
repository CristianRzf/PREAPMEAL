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
const GRID_SIZE = (MOBILE_WIDTH - 6) / 3;

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
      if (!user) {
        setLoading(false);
        return;
      }
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Mi cuenta</Text>
            <Text style={styles.headerTitle}>Perfil</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color="#C4918A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* TARJETA DE PERFIL */}
        <View style={styles.card}>
          {/* Avatar + nombre */}
          <View style={styles.profileTop}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#C4918A" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text
                style={[
                  styles.username,
                  !usernameIsSet && styles.usernameEmpty,
                ]}
              >
                {username}
              </Text>
              {userData?.ciudad && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="#888" />
                  <Text style={styles.locationText}>{userData.ciudad}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Tags objetivo */}
          {userData?.objetivo && (
            <View style={styles.tagsRow}>
              <View style={styles.tag}>
                <Ionicons name="flame-outline" size={12} color="#C4918A" />
                <Text style={styles.tagText}>{userData.objetivo}</Text>
              </View>
            </View>
          )}

          {/* Botón editar */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/editarPerfil")}
          >
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Recetas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#EEF4EE" }]}>
            <Text style={[styles.statNumber, { color: "#2D6A4F" }]}>630</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF4EE" }]}>
            <Text style={styles.statNumber}>220</Text>
            <Text style={styles.statLabel}>Siguiendo</Text>
          </View>
        </View>

        {/* TABS + GRID */}
        <View style={styles.card}>
          <View style={styles.tabsRow}>
            {(["Recetas", "Guardadas", "Me gusta"] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={styles.tabItem}
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
                {activeTab === tab && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.grid}>
            {PLACEHOLDER_IMAGES.map((uri, index) => (
              <TouchableOpacity key={index} style={styles.gridItem}>
                <Image
                  source={{ uri }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
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

  // HEADER — igual al Home
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLabel: { fontSize: 14, color: "#888", fontWeight: "400" },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2c1810",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    elevation: 2,
  },

  // CARD — igual al Home
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },

  // PERFIL
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#C4918A",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF4EE",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileInfo: { flex: 1 },
  displayName: { fontSize: 17, fontWeight: "700", color: "#2c1810" },
  username: { fontSize: 13, color: "#888", marginTop: 2 },
  usernameEmpty: { fontSize: 12, color: "#bbb", fontStyle: "italic" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  locationText: { fontSize: 11, color: "#888" },

  tagsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
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

  editButton: {
    backgroundColor: "#C4918A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  editButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // STATS — igual al Home
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

  // TABS
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0EBE8",
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabText: { fontSize: 13, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#2c1810" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2,
    backgroundColor: "#C4918A",
    borderRadius: 2,
  },

  // GRID
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE },
  gridImage: { width: "100%", height: "100%", borderRadius: 6 },
});
