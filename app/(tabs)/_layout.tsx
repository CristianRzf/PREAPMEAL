import { Tabs } from 'expo-router';
import CustomTabs from '../../componentes/CustomTabs';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabs {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="recetas" />
      <Tabs.Screen name="planificador" />
      <Tabs.Screen name="inventario" />
      <Tabs.Screen name="listadeCompras" />
      <Tabs.Screen name="Perfil" />
      {/* Pantallas sin tab visible */}
      <Tabs.Screen name="comunidad" options={{ href: null }} />
      <Tabs.Screen name="perfilPublico" options={{ href: null }} />
    </Tabs>
  );
}