import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

// ─── Paleta ───────────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#F5F0ED",
  card: "#C4918A",
  surface: "#FFFFFF",
  text: "#2C1810",
  textMuted: "#7A5C56",
  textLight: "#FFFFFF",
  border: "#EDE8E4",
  accent: "#2D6A4F",
  danger: "#E05050",
};

const { width } = Dimensions.get("window");
const MOBILE_WIDTH = Platform.OS === "web" ? 390 : width;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Sexo = "Masculino" | "Femenino" | "";
type Actividad = "Sedentario" | "Ligero" | "Moderado" | "Activo" | "Muy activo" | "";
type Objetivo = "Mantener peso" | "Perder peso" | "Ganar peso" | "Ganar masa muscular" | "";

interface PerfilData {
  displayName: string;
  username: string;
  edad: string;
  peso: string;
  altura: string;
  sexo: Sexo;
  actividad: Actividad;
  objetivo: Objetivo;
  alergias: Record<string, boolean>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const ACTIVIDAD_FACTORES: Record<string, number> = {
  Sedentario: 1.2, Ligero: 1.375, Moderado: 1.55, Activo: 1.725, "Muy activo": 1.9,
};
const OBJETIVO_AJUSTE: Record<string, number> = {
  "Mantener peso": 0, "Perder peso": -500, "Ganar peso": 300, "Ganar masa muscular": 250,
};
const ALERGIAS_LISTA = ["Gluten", "Lácteos", "Huevos", "Mariscos", "Maní", "Frutos secos", "Soya", "Pescado"];

// ─── TDEE ─────────────────────────────────────────────────────────────────────
function calcularTDEE(edad: number, peso: number, altura: number, sexo: Sexo, actividad: Actividad, objetivo: Objetivo) {
  if (!edad || !peso || !altura || !sexo || !actividad || !objetivo) return null;
  const tmb = sexo === "Masculino"
    ? 10 * peso + 6.25 * altura - 5 * edad + 5
    : 10 * peso + 6.25 * altura - 5 * edad - 161;
  const tdee = Math.round(tmb * (ACTIVIDAD_FACTORES[actividad] ?? 1.2) + (OBJETIVO_AJUSTE[objetivo] ?? 0));
  const proteinas = Math.round(peso * 2);
  const grasas = Math.round((tdee * 0.25) / 9);
  const carbohidratos = Math.round((tdee - proteinas * 4 - grasas * 9) / 4);
  return { tdee, proteinas, grasas, carbohidratos };
}

// ─── Chip selector ────────────────────────────────────────────────────────────
function SelectorChip({ options, value, onChange }: { options: string[]; value: string; onChange: (v: any) => void }) {
  return (
    <View style={chipStyles.row}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[chipStyles.chip, value === opt && chipStyles.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[chipStyles.chipText, value === opt && chipStyles.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipActive: { borderColor: COLORS.card, backgroundColor: "#FDF3F0" },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  chipTextActive: { color: COLORS.card, fontWeight: "700" },
});

type TabType = "Recetas" | "Guardadas" | "Me gusta";

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function Perfil() {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("Recetas");
  const [modalEditar, setModalEditar] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<PerfilData>({
    displayName: "", username: "", edad: "", peso: "",
    altura: "", sexo: "", actividad: "", objetivo: "", alergias: {},
  });

  useEffect(() => { fetchUser(); }, []);

  const fetchUser = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserData(d);
        setForm({
          displayName: d.displayName || "",
          username: d.username || "",
          edad: d.edad?.toString() || "",
          peso: d.peso?.toString() || "",
          altura: d.altura?.toString() || "",
          sexo: d.sexo || "",
          actividad: d.actividad || "",
          objetivo: d.objetivo || "",
          alergias: d.alergias || {},
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("/(auth)/login");
  };

  const guardar = async () => {
    const u = auth.currentUser;
    if (!u) { Alert.alert("Error", "No hay sesión activa."); return; }
    if (!form.displayName.trim() || form.displayName.trim().length < 2) {
      Alert.alert("Error", "El nombre debe tener al menos 2 caracteres."); return;
    }
    if (!form.username.trim() || form.username.trim().length < 3) {
      Alert.alert("Error", "El nombre de usuario debe tener al menos 3 caracteres."); return;
    }
    const calculo = calcularTDEE(Number(form.edad), Number(form.peso), Number(form.altura), form.sexo, form.actividad, form.objetivo);
    setSaving(true);
    try {
      await setDoc(doc(db, "users", u.uid), {
        ...form,
        username: form.username.toLowerCase().replace(/\s/g, ""),
        edad: Number(form.edad) || null,
        peso: Number(form.peso) || null,
        altura: Number(form.altura) || null,
        tdee: calculo?.tdee || null,
        macros: calculo ? { proteinas: calculo.proteinas, grasas: calculo.grasas, carbohidratos: calculo.carbohidratos } : null,
        updatedAt: new Date(),
      }, { merge: true });
      await fetchUser();
      setModalEditar(false);
      Alert.alert("✓ Guardado", "Tu perfil se actualizó correctamente.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo guardar.");
    } finally { setSaving(false); }
  };

  const calculo = calcularTDEE(Number(form.edad), Number(form.peso), Number(form.altura), form.sexo, form.actividad, form.objetivo);

  const displayName = userData?.displayName || user?.displayName || "Usuario";
  const username = userData?.username ? "@" + userData.username : null;
  const usernameIsSet = !!userData?.username;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.card} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Perfil</Text>
            <Text style={styles.headerSub}>Mi cuenta</Text>
          </View>
          <View style={styles.headerRight}>
            <Image source={require("../../Logo Chef.png")} style={styles.headerLogo} />
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar + info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={44} color="#bbb" />
            </View>
          </View>

          {usernameIsSet
            ? <Text style={styles.username}>{username}</Text>
            : <Text style={styles.usernameEmpty}>Sin usuario · Edita tu perfil</Text>
          }
          <Text style={styles.displayName}>{displayName}</Text>

          {userData?.ciudad && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.locationText}>{userData.ciudad}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Recetas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Siguiendo</Text>
          </View>
        </View>

        {/* Botón editar */}
        <TouchableOpacity style={styles.editButton} onPress={() => setModalEditar(true)}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.editButtonText}>Editar perfil</Text>
        </TouchableOpacity>

        {/* Tags */}
        {userData?.objetivo && (
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Ionicons name="flame-outline" size={12} color={COLORS.card} />
              <Text style={styles.tagText}>{userData.objetivo}</Text>
            </View>
            {userData?.actividad && (
              <View style={styles.tag}>
                <Ionicons name="barbell-outline" size={12} color={COLORS.card} />
                <Text style={styles.tagText}>{userData.actividad}</Text>
              </View>
            )}
          </View>
        )}

        {/* TDEE card si tiene datos */}
        {userData?.tdee && (
          <View style={styles.tdeeCard}>
            <View style={styles.tdeeHeader}>
              <Ionicons name="nutrition-outline" size={16} color={COLORS.card} />
              <Text style={styles.tdeeTitle}>Tu requerimiento diario</Text>
            </View>
            <Text style={styles.tdeeNumber}>{userData.tdee} kcal/día</Text>
            {userData.macros && (
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
                  <Text style={styles.macroLabel}>Proteínas</Text>
                  <Text style={styles.macroValue}>{userData.macros.proteinas}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
                  <Text style={styles.macroLabel}>Grasas</Text>
                  <Text style={styles.macroValue}>{userData.macros.grasas}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
                  <Text style={styles.macroLabel}>Carbos</Text>
                  <Text style={styles.macroValue}>{userData.macros.carbohidratos}g</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Alergias */}
        {userData?.alergias && Object.values(userData.alergias).some(Boolean) && (
          <View style={styles.alergiasCard}>
            <Text style={styles.alergiasTitle}>Alergias e intolerancias</Text>
            <View style={styles.alergiasRow}>
              {Object.entries(userData.alergias)
                .filter(([_, v]) => v)
                .map(([k]) => (
                  <View key={k} style={styles.alergiaChip}>
                    <Text style={styles.alergiaText}>{k}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(["Recetas", "Guardadas", "Me gusta"] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid vacío */}
        <View style={styles.emptyGrid}>
          <Ionicons name="restaurant-outline" size={48} color={COLORS.card} style={{ opacity: 0.4 }} />
          <Text style={styles.emptyText}>
            {activeTab === "Recetas" && "Aún no has publicado recetas"}
            {activeTab === "Guardadas" && "No tienes recetas guardadas"}
            {activeTab === "Me gusta" && "No has dado me gusta a ninguna receta"}
          </Text>
          {activeTab === "Recetas" && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/(tabs)/recetas")}>
              <Text style={styles.emptyBtnText}>Explorar recetas</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Modal Editar Perfil ──────────────────────────────────────────── */}
      <Modal visible={modalEditar} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          {/* Header modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalEditar(false)}>
              <Ionicons name="chevron-down" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <TouchableOpacity onPress={guardar} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={COLORS.card} />
                : <Text style={styles.modalSaveBtn}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>

            {/* Avatar */}
            <View style={styles.modalAvatarSection}>
              <View style={styles.modalAvatar}>
                <Ionicons name="person" size={44} color="#bbb" />
              </View>
              <Text style={styles.changePhoto}>Cambiar foto</Text>
            </View>

            {/* Nombre */}
            <Text style={styles.fieldLabel}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              value={form.displayName}
              onChangeText={(v) => setForm({ ...form, displayName: v })}
              placeholder="Tu nombre completo"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Username */}
            <Text style={styles.fieldLabel}>Nombre de usuario</Text>
            <View style={styles.usernameInputRow}>
              <View style={styles.atSign}><Text style={styles.atText}>@</Text></View>
              <TextInput
                style={styles.usernameInput}
                value={form.username}
                onChangeText={(v) => setForm({ ...form, username: v.toLowerCase().replace(/\s/g, "") })}
                placeholder="tunombredeusuario"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.fieldHint}>Solo letras, números y guiones bajos.</Text>

            {/* Edad + Peso */}
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Edad</Text>
                <TextInput style={styles.input} value={form.edad} onChangeText={(v) => setForm({ ...form, edad: v })} placeholder="años" keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Peso (kg)</Text>
                <TextInput style={styles.input} value={form.peso} onChangeText={(v) => setForm({ ...form, peso: v })} placeholder="kg" keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
              </View>
            </View>

            {/* Sexo + Altura */}
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Sexo</Text>
                <SelectorChip options={["Masculino", "Femenino"]} value={form.sexo} onChange={(v: Sexo) => setForm({ ...form, sexo: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Altura (cm)</Text>
                <TextInput style={styles.input} value={form.altura} onChangeText={(v) => setForm({ ...form, altura: v })} placeholder="cm" keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
              </View>
            </View>

            {/* Actividad */}
            <Text style={styles.fieldLabel}>Nivel de actividad física</Text>
            <SelectorChip options={["Sedentario", "Ligero", "Moderado", "Activo", "Muy activo"]} value={form.actividad} onChange={(v: Actividad) => setForm({ ...form, actividad: v })} />

            {/* Objetivo */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Objetivo Nutricional</Text>
            <SelectorChip options={["Mantener peso", "Perder peso", "Ganar peso", "Ganar masa muscular"]} value={form.objetivo} onChange={(v: Objetivo) => setForm({ ...form, objetivo: v })} />

            {/* TDEE */}
            {calculo && (
              <View style={styles.calcCard}>
                <View style={styles.calcHeader}>
                  <Ionicons name="calculator-outline" size={15} color={COLORS.card} />
                  <Text style={styles.calcTitle}>Tu requerimiento diario (TDEE)</Text>
                </View>
                <Text style={styles.tdeeNum}>{calculo.tdee} kcal/día</Text>
                <View style={styles.macrosRow}>
                  {[
                    { label: "Proteínas", value: calculo.proteinas, color: "#4A90E2" },
                    { label: "Grasas", value: calculo.grasas, color: "#F5A623" },
                    { label: "Carbos", value: calculo.carbohidratos, color: "#7ED321" },
                  ].map((m) => (
                    <View key={m.label} style={styles.macroItem}>
                      <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                      <Text style={styles.macroLabel}>{m.label}</Text>
                      <Text style={styles.macroValue}>{m.value}g</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.calcNote}>Fórmula Mifflin-St Jeor · Proteínas 2g/kg · Grasas 25%</Text>
              </View>
            )}

            {/* Alergias */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Alergias e intolerancias</Text>
            <Text style={styles.fieldHint}>Selecciona las que apliquen</Text>
            <View style={styles.alergiasGridForm}>
              {ALERGIAS_LISTA.map((alergia) => (
                <TouchableOpacity
                  key={alergia}
                  style={[styles.alergiaChipForm, form.alergias[alergia] && styles.alergiaChipFormActive]}
                  onPress={() => setForm({ ...form, alergias: { ...form.alergias, [alergia]: !form.alergias[alergia] } })}
                >
                  <Text style={[styles.alergiaChipText, form.alergias[alergia] && styles.alergiaChipTextActive]}>
                    {form.alergias[alergia] ? "✓ " : ""}{alergia}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Botón guardar */}
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={guardar}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveButtonText}>Guardar cambios</Text>
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
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  logoutBtn: { padding: 6, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },

  profileSection: { alignItems: "center", paddingBottom: 16 },
  avatarRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, borderColor: COLORS.card, padding: 3, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  username: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  usernameEmpty: { fontSize: 13, color: "#aaa", fontStyle: "italic", marginBottom: 2 },
  displayName: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12, color: COLORS.textMuted },

  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 14 },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "700", color: COLORS.card },
  statLabel: { fontSize: 11, color: "#999", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.card, paddingVertical: 12, borderRadius: 14, marginBottom: 12 },
  editButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  tagsRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FDF3F0", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  tagText: { fontSize: 11, color: COLORS.card, fontWeight: "600" },

  tdeeCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: "#F0E4E2" },
  tdeeHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  tdeeTitle: { fontSize: 13, fontWeight: "600", color: COLORS.card },
  tdeeNumber: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginBottom: 10 },

  alergiasCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 12 },
  alergiasTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  alergiasRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  alergiaChip: { backgroundColor: "#FFEBEE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  alergiaText: { fontSize: 11, color: "#c62828", fontWeight: "600" },

  macrosRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  macroItem: { alignItems: "center", gap: 3 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 10, color: COLORS.textMuted },
  macroValue: { fontSize: 13, fontWeight: "700", color: COLORS.text },

  tabsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, position: "relative" },
  tabText: { fontSize: 13, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: COLORS.text },
  tabUnderline: { position: "absolute", bottom: 0, width: "50%", height: 2, backgroundColor: COLORS.card, borderRadius: 2 },

  emptyGrid: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: "center" },
  emptyBtn: { backgroundColor: COLORS.card, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Modal
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  modalSaveBtn: { fontSize: 15, fontWeight: "700", color: COLORS.card },
  modalBody: { padding: 20 },
  modalAvatarSection: { alignItems: "center", marginBottom: 20 },
  modalAvatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center", marginBottom: 8, borderWidth: 2, borderColor: COLORS.card },
  changePhoto: { fontSize: 13, color: COLORS.card, fontWeight: "600" },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  fieldHint: { fontSize: 11, color: "#aaa", marginBottom: 10 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, marginBottom: 14 },
  row2: { flexDirection: "row", gap: 12 },

  usernameInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, overflow: "hidden", marginBottom: 4 },
  atSign: { paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#f5f5f5", borderRightWidth: 1.5, borderRightColor: COLORS.border },
  atText: { fontSize: 15, fontWeight: "700", color: COLORS.card },
  usernameInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: COLORS.text },

  calcCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1.5, borderColor: "#F0E4E2" },
  calcHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  calcTitle: { fontSize: 13, fontWeight: "600", color: COLORS.card },
  tdeeNum: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  calcNote: { fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 4 },

  alergiasGridForm: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  alergiaChipForm: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  alergiaChipFormActive: { borderColor: "#e53935", backgroundColor: "#FFEBEE" },
  alergiaChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  alergiaChipTextActive: { color: "#c62828", fontWeight: "700" },

  saveButton: { backgroundColor: COLORS.card, paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 16 },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});