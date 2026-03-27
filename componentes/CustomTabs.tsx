import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS = [
  {
    name: "index",
    label: "Recetas",
    icon: (active: boolean) => (
      <Text style={{ fontSize: 22 }}>{active ? "" : ""}</Text>
    ),
  },
  {
    name: "planificador",
    label: "Mi Semana",
    icon: (active: boolean) => (
      <Text style={{ fontSize: 22 }}>{active ? "" : ""}</Text>
    ),
  },
  {
    name: "listadeCompras",
    label: "Compras",
    icon: (active: boolean) => (
      <Text style={{ fontSize: 22 }}>{active ? "" : ""}</Text>
    ),
  },
  {
    name: "inventario",
    label: "Inventario",
    icon: (active: boolean) => (
      <Text style={{ fontSize: 22 }}>{active ? "" : ""}</Text>
    ),
  },
  {
    name: "Perfil",
    label: "Perfil",
    icon: (active: boolean) => (
      <Text style={{ fontSize: 22 }}>{active ? "" : ""}</Text>
    ),
  },
];

export default function CustomTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 10 }]}>
      {TABS.map((tab, index) => {
        const isActive = state.index === index;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            {/* Indicador activo arriba */}
            <View style={[styles.indicator, isActive && styles.indicatorActive]} />

            {/* Icono con fondo activo */}
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              {tab.icon(isActive)}
            </View>

            {/* Label */}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0EDED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    gap: 3,
  },

  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginBottom: 4,
  },

  indicatorActive: {
    backgroundColor: "#2D6A4F",
  },

  iconContainer: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  iconContainerActive: {
    backgroundColor: "#EAF4EF",
  },

  label: {
    fontSize: 10,
    color: "#AAAAAA",
    fontWeight: "500",
  },

  labelActive: {
    color: "#2D6A4F",
    fontWeight: "700",
  },
});
