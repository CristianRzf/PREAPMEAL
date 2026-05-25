import { Tabs, router } from 'expo-router';
import CustomTabs from '../../componentes/CustomTabs';
import * as notifications from 'expo-notifications';
import { useEffect } from 'react';


export default function TabsLayout() {
  useEffect(() => {
    const subscription = notifications.addNotificationResponseReceivedListener(() => {
      router.push('/inventario');
    });

    return () => {
      subscription.remove();
    };
  }, []);

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