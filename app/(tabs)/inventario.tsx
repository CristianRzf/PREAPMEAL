import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { auth, db } from "../../config/firebase";

const CLOUDINARY_CLOUD_NAME = "dbbsgfsr6";
const CLOUDINARY_UPLOAD_PRESET = "mealprep_uploads";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const MAX_ITEM_PHOTO_SIZE = 5 * 1024 * 1024;

async function validarImagenItem(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  if (blob.size > MAX_ITEM_PHOTO_SIZE) {
    throw new Error("La imagen supera el límite de 5 MB.");
  }

  if (blob.type && !blob.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen válida.");
  }
}

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

type Item = {
  id: string;
  name: string;
  quantity: string;
  location: "Nevera" | "Despensa" | "Congelador";
  expirationDays: number;
  expirationDate?: string;
  notificationIds?: string[];
  category?: string;
  notes?: string;
  photoUrl?: string;
};

export default function Inventario() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "todos" | "Nevera" | "Despensa" | "Congelador"
  >("todos");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [items, setItems] = useState<Item[]>([]);

  const [expandedSections, setExpandedSections] = useState({
    Nevera: true,
    Despensa: true,
    Congelador: true,
  });

  const [newName, setNewName] = useState("");

  const [newQtyNumber, setNewQtyNumber] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [newLocation, setNewLocation] = useState<
    "Nevera" | "Despensa" | "Congelador"
  >("Nevera");
  const [newDays, setNewDays] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const calculateDays = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const isExpoGo = Constants.appOwnership === "expo";
    if (isExpoGo) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = collection(db, "users", user.uid, "pantry_inventory");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
    const data: Item[] = snapshot.docs.map((doc) => {
      const item = doc.data() as Omit<Item, "id">;

      let expirationDays = 0;
      if (item.expirationDate) {
        const today = new Date();
        const expiration = new Date(item.expirationDate);
        const diffTime = 
          expiration.getTime() - today.getTime();
        expirationDays = Math.ceil(
          diffTime / (1000 * 60 * 60 * 24)
        );
      }
      return {
        id: doc.id,
        ...item,
        expirationDays,
      };  
      });

      // ORDENAR POR URGENCIA
      data.sort((a, b) => a.expirationDays - b.expirationDays);

      setItems(data);
    });

    return unsubscribe;
  }, []);

  const scheduleNotifications = async (
    itemName: string,
    date: Date,
  ): Promise<string[]> => {
    const isExpoGo = Constants.appOwnership === "expo";
    if (isExpoGo) return [];

    const ids: string[] = [];
    const now = new Date();

    const before = new Date(date);
    before.setDate(before.getDate() - 1);

    const secondBefore = Math.max(
      Math.floor((before.getTime() - now.getTime()) / 1000),
      1,
    );

    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Producto por vencer",
        body: `${itemName} vence mañana`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: before,
      },
    });

    const secondsExact = Math.max(
      Math.floor((date.getTime() - now.getTime()) / 1000),
      1,
    );

    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: "❌ Producto vencido",
        body: `${itemName} ya venció`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });

    ids.push(id1, id2);
    return ids;
  };

  const cancelNotifications = async (ids?: string[]) => {
    if (!ids) return;
    for (let id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setNewName(item.name);

    const parts = item.quantity.split(" ");
    setNewQtyNumber(parts[0] || "");
    setNewUnit(parts[1] || "");
    setNewCategory(item.category || "");
    setNewNotes(item.notes || "");
    setNewPhotoUrl(item.photoUrl || "");
    setNewLocation(item.location);
    setNewDays(item.expirationDays.toString());

    if (item.expirationDate) {
      setExpirationDate(new Date(item.expirationDate));
    }

    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setNewName("");
    setNewQtyNumber("");
    setNewUnit("");
    setNewCategory("");
    setNewNotes("");
    setNewPhotoUrl("");
    setNewLocation("Nevera");
    setNewDays("");
    setExpirationDate(null);
    setModalVisible(true);
  };

  const uploadItemPhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      await validarImagenItem(uri);
      const uploadedUrl = await subirImagenCloudinary(uri);
      setNewPhotoUrl(uploadedUrl);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo subir la foto del item.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeItemPhoto = () => {
    setNewPhotoUrl("");
  };

  const pickItemPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tu galería para elegir la foto.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    await uploadItemPhoto(uri);
  };

  const takeItemPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tu cámara para tomar la foto.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    await uploadItemPhoto(uri);
  };

  const openPhotoOptions = () => {
    if (uploadingPhoto) return;

    Alert.alert("Foto del item", "¿Cómo quieres agregar la foto?", [
      { text: "Cámara", onPress: takeItemPhoto },
      { text: "Galería", onPress: pickItemPhoto },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleSaveItem = async () => {
    if (!newName || !newQtyNumber || !newUnit || !newDays) return;
    if (uploadingPhoto) {
      Alert.alert("Espera", "La foto del item aún se está subiendo.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const ref = collection(db, "users", user.uid, "pantry_inventory");

    let notificationIds: string[] = [];

    if (expirationDate) {
      const ids = await scheduleNotifications(newName, expirationDate);
      notificationIds = ids || [];
    }

    if (editingItem) {
      await cancelNotifications(editingItem.notificationIds);

      const docRef = doc(
        db,
        "users",
        user.uid,
        "pantry_inventory",
        editingItem.id,
      );

      await updateDoc(docRef, {
        name: newName,
        quantity: `${newQtyNumber} ${newUnit}`,
        location: newLocation,
        category: newCategory,
        notes: newNotes,
        photoUrl: newPhotoUrl || "",
        expirationDate: expirationDate?.toISOString(),
        notificationIds,
      });
    } else {
      await addDoc(ref, {
        name: newName,
        quantity: `${newQtyNumber} ${newUnit}`,
        location: newLocation,
        category: newCategory,
        notes: newNotes,
        photoUrl: newPhotoUrl || "",
        expirationDate: expirationDate?.toISOString(),
        notificationIds,
      });
    }

    setNewName("");
    setNewQtyNumber("");
    setNewUnit("");
    setNewCategory("");
    setNewNotes("");
    setNewPhotoUrl("");
    setNewDays("");
    setExpirationDate(null);
    setNewLocation("Nevera");
    setEditingItem(null);
    setModalVisible(false);
  };

  const handleDeleteWithReason = (item: Item) => {
    Alert.alert("Eliminar producto", "¿Por qué deseas eliminarlo?", [
      { text: "Lo usé", onPress: () => eliminarItem(item, "usado") },
      { text: "Se venció", onPress: () => eliminarItem(item, "vencido") },
      { text: "Otro", onPress: () => eliminarItem(item, "otro") },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const eliminarItem = async (item: Item, razon: string) => {
    const user = auth.currentUser;
    if (!user) return;

    await cancelNotifications(item.notificationIds || []);

    // (opcional) guardar historial
    await addDoc(collection(db, "users", user.uid, "inventory_logs"), {
      ...item,
      eliminadoEn: new Date(),
      razon,
    });

    // 🔥 AQUÍ VA TU CÓDIGO ORIGINAL
    const docRef = doc(db, "users", user.uid, "pantry_inventory", item.id);
    await deleteDoc(docRef);
  };

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "todos" ? true : item.location === filter;

    return matchSearch && matchFilter;
  });

  const urgentItems = items.filter(
    (i) => i.expirationDays <= 2 && i.expirationDays > 0,
  );

  const groupedItems = {
    Nevera: filteredItems.filter((i) => i.location === "Nevera"),
    Despensa: filteredItems.filter((i) => i.location === "Despensa"),
    Congelador: filteredItems.filter((i) => i.location === "Congelador"),
  };

  const getColor = (days: number) => {
    if (days <= 0) return "#E63946";
    if (days <= 2) return "#E63946";
    if (days <= 7) return "#E9C46A";
    return "#2D6A4F";
  };

  const getText = (days: number) => {
    if (days <= 0) return "Caducado";
    if (days <= 2) return `Vence en ${days} días`;
    if (days <= 7) return "Por caducar";
    return "Fresco";
  };
  const toggleSection = (section: "Nevera" | "Despensa" | "Congelador") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemPhotoContainer}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.itemPhoto} />
        ) : (
          <View style={styles.itemPhotoPlaceholder} />
        )}
      </View>

      <View>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQty}>{item.quantity}</Text>
        {item.category && (
          <Text style={{ fontSize: 11, color: "#888" }}>{item.category}</Text>
        )}

        {item.notes && (
          <Text style={{ fontSize: 11, color: "#aaa" }}>{item.notes}</Text>
        )}

        <Text style={styles.location}>
          {item.location === "Nevera"
            ? "Nevera"
            : item.location === "Despensa"
              ? "Despensa"
              : "Congelador"}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.status, { color: getColor(item.expirationDays) }]}>
          {getText(item.expirationDays)}
        </Text>

        <View style={{ flexDirection: "row", marginTop: 5 }}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Text style={styles.edit}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDeleteWithReason(item)}>
            <Text style={styles.delete}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* ── HEADER (igual al Home) ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mi Inventario</Text>
            <Text style={styles.headerSub}>Tu despensa y nevera</Text>
          </View>
          <Image
            source={require("../../Logo Chef.png")}
            style={styles.headerLogo}
          />
          {urgentItems.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{urgentItems.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.7}
          onPress={openAddModal}
        >
          <Text style={styles.addText}>+ Agregar item</Text>
        </TouchableOpacity>

        {/* RESUMEN */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{items.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: "#E6F4EA" }]}>
            <Text style={[styles.summaryNumber, { color: "#2D6A4F" }]}>
              {items.filter((i) => i.expirationDays > 7).length}
            </Text>
            <Text style={styles.summaryLabel}>En estado</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: "#FFF4CC" }]}>
            <Text style={[styles.summaryNumber, { color: "#E9C46A" }]}>
              {
                items.filter(
                  (i) => i.expirationDays > 0 && i.expirationDays <= 7,
                ).length
              }
            </Text>
            <Text style={styles.summaryLabel}>Por caducar</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: "#FFE5E5" }]}>
            <Text style={[styles.summaryNumber, { color: "#E63946" }]}>
              {items.filter((i) => i.expirationDays <= 0).length}
            </Text>
            <Text style={styles.summaryLabel}>Caducados</Text>
          </View>
        </View>

        {/* ALERTA */}
        {urgentItems.length > 0 && (
          <View style={styles.alert}>
            <Text style={styles.alertText}>
              ⚠️ {urgentItems.length} productos vencen pronto
            </Text>
          </View>
        )}

        <TextInput
          placeholder="Busca en tu cocina..."
          placeholderTextColor="#888"
          style={styles.search}
          value={search}
          onChangeText={setSearch}
        />

        {/* FILTROS */}
        <View style={styles.filters}>
          {["todos", "Nevera", "Despensa", "Congelador"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.activeFilter]}
              onPress={() => setFilter(f as any)}
            >
              <Text
                style={filter === f ? styles.activeText : styles.filterText}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.entries(groupedItems).map(([section, data]) => {
            if (data.length === 0) return null;

            const isOpen =
              expandedSections[section as keyof typeof expandedSections];

            return (
              <View key={section}>
                <TouchableOpacity onPress={() => toggleSection(section as any)}>
                  <Text style={styles.sectionTitle}>
                    {isOpen ? "▼" : "►"} {section}
                  </Text>
                </TouchableOpacity>

                {isOpen &&
                  data.map((item) => (
                    <View key={item.id}>{renderItem({ item })}</View>
                  ))}
              </View>
            );
          })}
        </ScrollView>

        {/* MODAL */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
           <ScrollView
              contentContainerStyle={{ 
                flexGrow: 1, 
                justifyContent: "center" 
              }}
              showsVerticalScrollIndicator={false}
            >
            
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingItem ? "Editar Item" : "Nuevo Item"}
              </Text>

              <Text style={styles.label}>Nombre del producto</Text>
              <TextInput
                placeholder="Ej: Leche"
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.label}>Foto del item</Text>
              <TouchableOpacity
                style={styles.photoPickerBtn}
                onPress={openPhotoOptions}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.photoPickerText}>
                    {newPhotoUrl ? "Cambiar foto" : "Tomar o elegir foto"}
                  </Text>
                )}
              </TouchableOpacity>

              {newPhotoUrl ? (
                <Image
                  source={{ uri: newPhotoUrl }}
                  style={styles.photoPreview}
                />
              ) : null}

              {newPhotoUrl ? (
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={removeItemPhoto}
                  disabled={uploadingPhoto}
                >
                  <Text style={styles.photoRemoveText}>Quitar foto</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.label}>Cantidad</Text>
              <TextInput
                placeholder="Cantidad"
                style={styles.input}
                keyboardType="numeric"
                value={newQtyNumber}
                onChangeText={setNewQtyNumber}
              />

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                {["L", "g", "kg", "ml", "unidad"].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitBtn,
                      newUnit === unit && styles.unitActive,
                    ]}
                    onPress={() => setNewUnit(unit)}
                  >
                    <Text
                      style={
                        newUnit === unit
                          ? styles.unitTextActive
                          : styles.unitText
                      }
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Ubicación</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.locationBtn,
                    newLocation === "Nevera" && styles.locationActive,
                  ]}
                  onPress={() => setNewLocation("Nevera")}
                >
                  <Text>Nevera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationBtn,
                    newLocation === "Despensa" && styles.locationActive,
                  ]}
                  onPress={() => setNewLocation("Despensa")}
                >
                  <Text>Despensa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationBtn,
                    newLocation === "Congelador" && styles.locationActive,
                  ]}
                  onPress={() => setNewLocation("Congelador")}
                >
                  <Text> Congelador </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Categoría</Text>
              <TextInput
                placeholder="Ej: Lácteos, Verduras, Frutas"
                style={styles.input}
                value={newCategory}
                onChangeText={setNewCategory}
              />

              <Text style={styles.label}>Notas</Text>
              <TextInput
                placeholder="Ej: Marca, Organico"
                style={[styles.input, { height: 80 }]}
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
              />

              <Text style={styles.label}>Días para vencimiento</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text>
                  {expirationDate
                    ? expirationDate.toLocaleDateString()
                    : " Selecciona fecha de vencimiento"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={expirationDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);

                    if (selectedDate) {
                      setExpirationDate(selectedDate);
                      const days = calculateDays(selectedDate);
                      setNewDays(days.toString());
                    }
                  }}
                />
              )}

              {expirationDate && (
                <Text style={{ marginBottom: 10, color: "#888" }}>
                  Vence en {newDays} días
                </Text>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditingItem(null);
                  setNewPhotoUrl("");
                  setExpirationDate(null);
                }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
           </ScrollView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  container: { flex: 1, padding: 16 },

  // Header (igual al Home)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2c1810",
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },
  headerLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#E63946",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },

  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  addButton: {
    backgroundColor: "#C4918A",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 15,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  addText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: "#eee",
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },

  summaryLabel: {
    fontSize: 10,
    color: "#555",
  },

  alert: {
    backgroundColor: "#FFF4CC",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  alertText: {
    color: "#7A5C00",
    fontWeight: "600",
  },

  search: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 25,
    color: "#000",
  },

  filters: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#eee",
    alignItems: "center",
  },

  activeFilter: {
    backgroundColor: "#C4918A",
  },

  filterText: {
    color: "#555",
    fontSize: 12,
  },

  activeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  itemCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  itemPhotoContainer: {
    marginRight: 12,
  },

  itemPhoto: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#f3f3f3",
  },

  itemPhotoPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#F6F1F1",
    alignItems: "center",
    justifyContent: "center",
  },

  itemPhotoPlaceholderText: {
    fontSize: 22,
  },

  itemName: { fontSize: 16, fontWeight: "bold" },
  itemQty: { fontSize: 12, color: "#666" },

  unitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eee",
    borderRadius: 10,
    alignItems: "center",
    marginRight: 6,
    marginBottom: 6,
  },

  unitActive: {
    backgroundColor: "#C4918A",
  },

  unitText: {
    color: "#555",
  },

  unitTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },

  location: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 5,
    color: "#2c1810",
  },

  status: { fontSize: 12, fontWeight: "600" },

  edit: { fontSize: 12, color: "#2D6A4F", marginRight: 10 },
  delete: { fontSize: 12, color: "#E63946" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },

  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  photoPickerBtn: {
    backgroundColor: "#2c1810",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  photoPickerText: {
    color: "#fff",
    fontWeight: "700",
  },

  photoRemoveBtn: {
    backgroundColor: "#FDECEC",
    borderWidth: 1,
    borderColor: "#F4B3B3",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  photoRemoveText: {
    color: "#B00020",
    fontWeight: "700",
  },

  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 14,
    marginBottom: 12,
    alignSelf: "center",
  },

  locationBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 10,
    alignItems: "center",
    marginRight: 5,
  },

  locationActive: {
    backgroundColor: "#CDE8D5",
  },

  saveBtn: {
    backgroundColor: "#C4918A",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "bold",
  },

  cancelText: {
    textAlign: "center",
    marginTop: 10,
    color: "#888",
  },
});
