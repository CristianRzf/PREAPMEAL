import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { collection, onSnapshot } from 'firebase/firestore';
import * as Icons from 'phosphor-react-native';
import * as React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';

const PRIMARY = '#2c1810';
const INACTIVE = '#AAAAAA';
const SPRING = { damping: 15, stiffness: 200, mass: 0.8 };
const SLIDER_SPRING = { damping: 22, stiffness: 180, mass: 0.9 };

const TAB_CONFIG: Record<string, { icon: string; label: string }> = {
  index:          { icon: 'House',                label: 'Inicio' },
  recetas:        { icon: 'BowlFood',             label: 'Recetas' },
  planificador:   { icon: 'CalendarCheck',        label: 'Plan' },
  inventario:     { icon: 'List',                 label: 'Inventario' },
  listadeCompras: { icon: 'ShoppingCartSimple',   label: 'Lista' },
  Perfil:         { icon: 'UserCircle',           label: 'Perfil' },
};

function TabItem({ route, isFocused, onPress, urgentCount }: {
  route: any; isFocused: boolean; onPress: () => void; urgentCount: number
}) {
  const scale = useSharedValue(1);
  const config = TAB_CONFIG[route.name];
  if (!config) return null; // oculta tabs sin config (comunidad, perfilPublico, etc.)
  const IconComp = (Icons as any)[`${config.icon}Icon`];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.82, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[styles.iconWrapper, animatedStyle]}>
        <View style={{ position: 'relative' }}>
          {IconComp && (
            <IconComp
              size={24}
              weight={isFocused ? 'fill' : 'regular'}
              color={isFocused ? PRIMARY : INACTIVE}
            />
          )}
          {route.name === 'inventario' && urgentCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{urgentCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, { color: isFocused ? PRIMARY : INACTIVE }]}>
          {config?.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function CustomTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Solo tabs visibles (los que tienen config en TAB_CONFIG)
  const visibleRoutes = state.routes.filter((r) => TAB_CONFIG[r.name]);
  const tabCount = visibleRoutes.length;

  const sliderX = useSharedValue(0);
  const [tabWidth, setTabWidth] = React.useState(0);

  const [urgentCount, setUrgentCount] = React.useState(0);
  React.useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'pantry_inventory');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const urgent = snapshot.docs.filter((doc) => {
        const data = doc.data();
        if (!data.expirationDate) return false;
        const today = new Date();
        const expiration = new Date(data.expirationDate);
        const diffTime = expiration.getTime() - today.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return days <= 2 && days >= 0;
      });
      setUrgentCount(urgent.length);
    });
    return unsubscribe;
  }, []);

  // Índice visible actual
  const visibleIndex = visibleRoutes.findIndex((r) => r.key === state.routes[state.index]?.key);

  React.useEffect(() => {
    if (tabWidth > 0 && visibleIndex >= 0) {
      sliderX.value = withSpring(visibleIndex * tabWidth, SLIDER_SPRING);
    }
  }, [visibleIndex, tabWidth]);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10 },
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width / tabCount;
        setTabWidth(w);
        if (visibleIndex >= 0) sliderX.value = visibleIndex * w;
      }}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[styles.slider, { width: tabWidth }, sliderStyle]}
          pointerEvents="none"
        />
      )}

      {visibleRoutes.map((route) => {
        const isFocused = state.routes[state.index]?.key === route.key;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
            urgentCount={urgentCount}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    top: 0,
    height: 2.5,
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    zIndex: 1,
  },
  iconWrapper: {
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#E63946',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});