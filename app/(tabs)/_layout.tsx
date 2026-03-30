import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import CustomTabs from "@/componentes/CustomTabs";
import { HeaderShownContext } from "@react-navigation/elements";


const _layout = () => {
    return (
        <Tabs tabBar={CustomTabs} screenOptions={{ headerShown: true }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="recetas" />
            <Tabs.Screen name="planificador" />
            <Tabs.Screen name="inventario" />
        </Tabs>
    );
};

export default _layout;

const styles = StyleSheet.create({});