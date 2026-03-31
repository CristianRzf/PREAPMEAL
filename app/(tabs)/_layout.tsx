import { StyleSheet } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import CustomTabs from "@/componentes/CustomTabs";

const _layout = () => {
return (
    <Tabs
    tabBar={(props) => <CustomTabs {...props} />} 
    screenOptions={{ headerShown: true }}
    >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="recetas" />
        <Tabs.Screen name="planificador" />
        <Tabs.Screen name="inventario" />
        <Tabs.Screen name="Perfil" />
        <Tabs.Screen name="listadeCompras" />
        <Tabs.Screen name="dashboardFinanciero" />
        <Tabs.Screen name="dashboradNutricional" />
    </Tabs>
);
};

export default _layout;

const styles = StyleSheet.create({});