import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth } from "../config/firebase";

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setInitializing(false);
    });
    return subscriber;
  }, []);

  useEffect(() => {
  if (initializing) return;

  const inAuthGroup = segments[0] === "(auth)";
  const inVerify = segments[1] === "verificaremail";

  if (user) {
    // Usuario NO verificado
    if (!user.emailVerified) {
      // Solo bloquear acceso a la app (tabs)
      if (!inAuthGroup || (!inVerify && !inAuthGroup)) {
        router.replace("/(auth)/verificaremail");
      }
      return;
    }

    // Usuario verificado
    if (inAuthGroup) {
      router.replace("/(tabs)");
    }
  } else {
    // No logueado
    if (!inAuthGroup) {
      router.replace("/(auth)/welcome");
    }
  }
}, [user, initializing, segments]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}