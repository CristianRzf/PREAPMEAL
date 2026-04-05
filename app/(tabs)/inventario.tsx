import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Item = {
  id: string;
  name: string;
  quantity: string;
  location: "Nevera" | "Despensa";
  expirationDays: number;
};

export default function Inventario() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "Nevera" | "Despensa">("todos");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [items, setItems] = useState<Item[]>([]);

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newLocation, setNewLocation] = useState<"Nevera" | "Despensa">("Nevera");
  const [newDays, setNewDays] = useState("");

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    checkExpirations();
  }, [items]);

  const checkExpirations = async () => {
    for (let item of items) {
      if (item.expirationDays <= 2 && item.expirationDays > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚠️ Producto por vencer",
            body: `${item.name} vence en ${item.expirationDays} días`,
          },
          trigger: null,
        });
      }
    }
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setNewName(item.name);
    setNewQty(item.quantity);
    setNewLocation(item.location);
    setNewDays(item.expirationDays.toString());
    setModalVisible(true);
  };

  const handleSaveItem = () => {
    if (!newName || !newQty || !newDays) return;

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: newName,
                quantity: newQty,
                location: newLocation,
                expirationDays: Number(newDays),
              }
            : item
        )
      );
    } else {
      const newItem: Item = {
        id: Date.now().toString(),
        name: newName,
        quantity: newQty,
        location: newLocation,
        expirationDays: Number(newDays),
      };

      setItems((prev) => [...prev, newItem]);
    }

    setNewName("");
    setNewQty("");
    setNewDays("");
    setNewLocation("Nevera");
    setEditingItem(null);
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "todos" ? true : item.location === filter;

    return matchSearch && matchFilter;
  });

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

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.itemCard}>
      <View>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQty}>{item.quantity}</Text>
        <Text style={styles.location}>
          {item.location === "Nevera" ? "❄️ Nevera" : "🥫 Despensa"}
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

          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Text style={styles.delete}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("../../Logo Chef.png")}
            style={styles.logo}
          />
          <Text style={styles.title}> Mi inventario </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
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
              {items.filter(i => i.expirationDays > 7).length}
            </Text>
            <Text style={styles.summaryLabel}>En estado</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: "#FFF4CC" }]}>
            <Text style={[styles.summaryNumber, { color: "#E9C46A" }]}>
              {items.filter(i => i.expirationDays > 0 && i.expirationDays <= 7).length}
            </Text>
            <Text style={styles.summaryLabel}>Por caducar</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: "#FFE5E5" }]}>
            <Text style={[styles.summaryNumber, { color: "#E63946" }]}>
              {items.filter(i => i.expirationDays <= 0).length}
            </Text>
            <Text style={styles.summaryLabel}>Caducados</Text>
          </View>
        </View>

        {/* ALERTA */}
        {items.filter(i => i.expirationDays <= 2 && i.expirationDays > 0).length > 0 && (
          <View style={styles.alert}>
            <Text style={styles.alertText}>
              ⚠️ {items.filter(i => i.expirationDays <= 2 && i.expirationDays > 0).length} productos vencen pronto
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
          {["todos", "Nevera", "Despensa"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.activeFilter]}
              onPress={() => setFilter(f as any)}
            >
              <Text style={filter === f ? styles.activeText : styles.filterText}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />

        {/* MODAL */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
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

              <Text style={styles.label}>Cantidad</Text>
              <TextInput
                placeholder="Ej: 1L o 500g"
                style={styles.input}
                value={newQty}
                onChangeText={setNewQty}
              />

              <Text style={styles.label}>Ubicación</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.locationBtn,
                    newLocation === "Nevera" && styles.locationActive,
                  ]}
                  onPress={() => setNewLocation("Nevera")}
                >
                  <Text>❄️ Nevera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationBtn,
                    newLocation === "Despensa" && styles.locationActive,
                  ]}
                  onPress={() => setNewLocation("Despensa")}
                >
                  <Text>🥫 Despensa</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Días para vencimiento</Text>
              <TextInput
                placeholder="Ej: 3"
                style={styles.input}
                keyboardType="numeric"
                value={newDays}
                onChangeText={setNewDays}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditingItem(null);
                }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F1F1" },
  container: { flex: 1, padding: 16 },

  title: { fontSize: 20, fontWeight: "700", color: "#2c1810", letterSpacing: 0.3, includeFontPadding: false },

  header: {
  paddingHorizontal: 20,
  paddingTop: 16,
  paddingBottom: 8,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
},

logo: {
  width: 60,
  height: 60,
  borderRadius: 5,
  marginRight: 4,
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

  addText: { color: "#fff", fontWeight: "600", fontSize: 15, letterSpacing: 0.3 },

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
    padding: 10,
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
  },

  activeText: {
    color: "#fff",
    fontWeight: "bold",
  },

  itemCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  itemName: { fontSize: 16, fontWeight: "bold" },
  itemQty: { fontSize: 12, color: "#666" },

  location: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
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