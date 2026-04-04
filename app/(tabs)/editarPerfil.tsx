import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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
  Sedentario: 1.2,
  Ligero: 1.375,
  Moderado: 1.55,
  Activo: 1.725,
  "Muy activo": 1.9,
};

const OBJETIVO_AJUSTE: Record<string, number> = {
  "Mantener peso": 0,
  "Perder peso": -500,
  "Ganar peso": 300,
  "Ganar masa muscular": 250,
};

const ALERGIAS_LISTA = [
  "Gluten",
  "Lácteos",
  "Huevos",
  "Mariscos",
  "Maní",
  "Frutos secos",
  "Soya",
  "Pescado",
];

// ─── Cálculo TDEE (Mifflin-St Jeor) ──────────────────────────────────────────
function calcularTDEE(
  edad: number,
  peso: number,
  altura: number,
  sexo: Sexo,
  actividad: Actividad,
  objetivo: Objetivo
): { tdee: number; proteinas: number; grasas: number; carbohidratos: number } | null {
  if (!edad || !peso || !altura || !sexo || !actividad || !objetivo) return null;

  const tmb =
    sexo === "Masculino"
      ? 10 * peso + 6.25 * altura - 5 * edad + 5
      : 10 * peso + 6.25 * altura - 5 * edad - 161;

  const factor = ACTIVIDAD_FACTORES[actividad] ?? 1.2;
  const ajuste = OBJETIVO_AJUSTE[objetivo] ?? 0;
  const tdee = Math.round(tmb * factor + ajuste);

  const proteinas = Math.round(peso * 2);
  const grasas = Math.round((tdee * 0.25) / 9);
  const carbohidratos = Math.round((tdee - proteinas * 4 - grasas * 9) / 4);

  return { tdee, proteinas, grasas, carbohidratos };
}

// ─── Chip selector ────────────────────────────────────────────────────────────
function SelectorChip({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: any) => void;
}) {
  return (
    <View style={chipStyles.row}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[chipStyles.chip, value === opt && chipStyles.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[chipStyles.chipText, value === opt && chipStyles.chipTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipActive: {
    borderColor: "#2D6A4F",
    backgroundColor: "#E8F5E9",
  },
  chipText: { fontSize: 13, color: "#666", fontWeight: "500" },
  chipTextActive: { color: "#2D6A4F", fontWeight: "700" },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function EditarPerfil() {
  const auth = getAuth();
  const db = getFirestore();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PerfilData>({
    displayName: "",
    username: "",
    edad: "",
    peso: "",
    altura: "",
    sexo: "",
    actividad: "",
    objetivo: "",
    alergias: {},
  });

  useEffect(() => {
    const cargarDatos = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
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
      } catch (e) {
        console.error("Error cargando datos:", e);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const calculo = calcularTDEE(
    Number(form.edad),
    Number(form.peso),
    Number(form.altura),
    form.sexo,
    form.actividad,
    form.objetivo
  );

  const guardar = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "No hay sesión activa.");
      return;
    }
    if (!form.displayName.trim() || form.displayName.trim().length < 2) {
      Alert.alert("Error", "El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (!form.username.trim() || form.username.trim().length < 3) {
      Alert.alert("Error", "El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...form,
          username: form.username.toLowerCase().replace(/\s/g, ""),
          edad: Number(form.edad) || null,
          peso: Number(form.peso) || null,
          altura: Number(form.altura) || null,
          tdee: calculo?.tdee || null,
          macros: calculo
            ? {
                proteinas: calculo.proteinas,
                grasas: calculo.grasas,
                carbohidratos: calculo.carbohidratos,
              }
            : null,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      Alert.alert("✓ Guardado", "Tu perfil se actualizó correctamente.");
      router.back();
    } catch (e) {
      console.error("Error guardando:", e);
      Alert.alert("Error", "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={48} color="#bbb" />
        </View>
        <TouchableOpacity>
          <Text style={styles.changePhoto}>Cambiar foto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>

        {/* Nombre completo */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            value={form.displayName}
            onChangeText={(v) => setForm({ ...form, displayName: v })}
            placeholder="Tu nombre completo"
            placeholderTextColor="#bbb"
          />
        </View>

        {/* Nombre de usuario */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre de usuario</Text>
          <View style={styles.usernameInputRow}>
            <View style={styles.atSign}>
              <Text style={styles.atText}>@</Text>
            </View>
            <TextInput
              style={styles.usernameInput}
              value={form.username}
              onChangeText={(v) =>
                setForm({ ...form, username: v.toLowerCase().replace(/\s/g, "") })
              }
              placeholder="tunombredeusuario"
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.fieldHint}>Solo letras, números y guiones bajos. Sin espacios.</Text>
        </View>

        {/* Edad + Peso */}
        <View style={styles.row2}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Edad</Text>
            <TextInput
              style={styles.input}
              value={form.edad}
              onChangeText={(v) => setForm({ ...form, edad: v })}
              placeholder="años"
              keyboardType="numeric"
              placeholderTextColor="#bbb"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput
              style={styles.input}
              value={form.peso}
              onChangeText={(v) => setForm({ ...form, peso: v })}
              placeholder="kg"
              keyboardType="numeric"
              placeholderTextColor="#bbb"
            />
          </View>
        </View>

        {/* Sexo + Altura */}
        <View style={styles.row2}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Sexo</Text>
            <SelectorChip
              options={["Masculino", "Femenino"]}
              value={form.sexo}
              onChange={(v: Sexo) => setForm({ ...form, sexo: v })}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Altura (cm)</Text>
            <TextInput
              style={styles.input}
              value={form.altura}
              onChangeText={(v) => setForm({ ...form, altura: v })}
              placeholder="cm"
              keyboardType="numeric"
              placeholderTextColor="#bbb"
            />
          </View>
        </View>

        {/* Nivel de actividad */}
        <View style={styles.field}>
          <Text style={styles.label}>Nivel de actividad física</Text>
          <SelectorChip
            options={["Sedentario", "Ligero", "Moderado", "Activo", "Muy activo"]}
            value={form.actividad}
            onChange={(v: Actividad) => setForm({ ...form, actividad: v })}
          />
        </View>

        {/* Objetivo nutricional */}
        <View style={styles.field}>
          <Text style={styles.label}>Objetivo Nutricional</Text>
          <SelectorChip
            options={["Mantener peso", "Perder peso", "Ganar peso", "Ganar masa muscular"]}
            value={form.objetivo}
            onChange={(v: Objetivo) => setForm({ ...form, objetivo: v })}
          />
        </View>

        {/* TDEE calculado */}
        {calculo && (
          <View style={styles.calcCard}>
            <View style={styles.calcHeader}>
              <Ionicons name="calculator-outline" size={16} color="#2D6A4F" />
              <Text style={styles.calcTitle}>Tu requerimiento diario (TDEE)</Text>
            </View>
            <Text style={styles.tdeeNumber}>{calculo.tdee} kcal/día</Text>
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
                <Text style={styles.macroLabel}>Proteínas</Text>
                <Text style={styles.macroValue}>{calculo.proteinas}g</Text>
              </View>
              <View style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
                <Text style={styles.macroLabel}>Grasas</Text>
                <Text style={styles.macroValue}>{calculo.grasas}g</Text>
              </View>
              <View style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
                <Text style={styles.macroLabel}>Carbos</Text>
                <Text style={styles.macroValue}>{calculo.carbohidratos}g</Text>
              </View>
            </View>
            <Text style={styles.calcNote}>
              Fórmula Mifflin-St Jeor · Proteínas 2g/kg · Grasas 25%
            </Text>
          </View>
        )}

        {/* Alergias */}
        <View style={styles.field}>
          <Text style={styles.label}>Alergias e intolerancias</Text>
          <Text style={styles.sublabel}>Selecciona las que apliquen</Text>
          <View style={styles.alergiasGrid}>
            {ALERGIAS_LISTA.map((alergia) => (
              <TouchableOpacity
                key={alergia}
                style={[
                  styles.alergiaChip,
                  form.alergias[alergia] && styles.alergiaChipActive,
                ]}
                onPress={() =>
                  setForm({
                    ...form,
                    alergias: {
                      ...form.alergias,
                      [alergia]: !form.alergias[alergia],
                    },
                  })
                }
              >
                <Text
                  style={[
                    styles.alergiaText,
                    form.alergias[alergia] && styles.alergiaTextActive,
                  ]}
                >
                  {form.alergias[alergia] ? "✓ " : ""}
                  {alergia}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={guardar}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  avatarSection: { alignItems: "center", paddingVertical: 20 },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e8e8e8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#2D6A4F",
  },
  changePhoto: { fontSize: 13, color: "#2D6A4F", fontWeight: "600" },
  form: { paddingHorizontal: 20, gap: 4 },
  field: { marginBottom: 16 },
  row2: { flexDirection: "row", gap: 12, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 6 },
  sublabel: { fontSize: 11, color: "#999", marginBottom: 8 },
  fieldHint: { fontSize: 11, color: "#aaa", marginTop: 4 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
  },
  usernameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    overflow: "hidden",
  },
  atSign: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
    borderRightWidth: 1.5,
    borderRightColor: "#e0e0e0",
  },
  atText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D6A4F",
  },
  usernameInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
  },
  calcCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    shadowColor: "#2D6A4F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  calcHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  calcTitle: { fontSize: 13, fontWeight: "600", color: "#2D6A4F" },
  tdeeNumber: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginBottom: 12 },
  macrosRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  macroItem: { alignItems: "center", gap: 4 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { fontSize: 11, color: "#888" },
  macroValue: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  calcNote: { fontSize: 10, color: "#aaa", textAlign: "center" },
  alergiasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alergiaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  alergiaChipActive: { borderColor: "#e53935", backgroundColor: "#FFEBEE" },
  alergiaText: { fontSize: 13, color: "#666", fontWeight: "500" },
  alergiaTextActive: { color: "#c62828", fontWeight: "700" },
  saveButton: {
    backgroundColor: "#2D6A4F",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});