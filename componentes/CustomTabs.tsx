import { View, Pressable, StyleSheet, Text, Platform } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verticalScale } from 'react-native-size-matters';
import * as Icons from 'phosphor-react-native';
import * as React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const PRIMARY_COLOR = '#000000';
const INACTIVE_COLOR = '#AAAAAA';

const SPRING_CONFIG = { damping: 15, stiffness: 200, mass: 0.8 };
const SLIDER_SPRING = { damping: 22, stiffness: 180, mass: 0.9 };

const tabbarIcons: Record<string, (focused: boolean) => React.ReactElement> = {
  index: (focused) => (
    <Icons.HouseIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
  recetas: (focused) => (
    <Icons.BowlFoodIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
  planificador: (focused) => (
    <Icons.CalendarCheckIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
  inventario: (focused) => (
    <Icons.ListIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
  Perfil: (focused) => (
    <Icons.UserCircleIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
  listadeCompras: (focused) => (
    <Icons.ShoppingCartSimpleIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
  dashboardFinanciero: (focused) => (
    <Icons.ChartLineIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
  dashboradNutricional: (focused) => (
    <Icons.ChartDonutIcon
      size={verticalScale(24)}
      weight={focused ? 'fill' : 'regular'}
      color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
    />
  ),
};

function TabItem({
  route,
  isFocused,
  onPress,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.82, SPRING_CONFIG); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={animatedStyle}>
        {tabbarIcons[route.name]?.(isFocused)}
      </Animated.View>
    </Pressable>
  );
}

export default function CustomTabs({ state, descriptors, navigation }: BottomTabBarProps) {
  const { buildHref } = useLinkBuilder();
  const insets = useSafeAreaInsets();

  const tabCount = state.routes.length;
  const sliderX = useSharedValue(0);
  const [tabWidth, setTabWidth] = React.useState(0);

  React.useEffect(() => {
    if (tabWidth > 0) {
      sliderX.value = withSpring(state.index * tabWidth, SLIDER_SPRING);
    }
  }, [state.index, tabWidth]);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 8,
        },
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width / tabCount;
        setTabWidth(w);
        // Posición inicial sin animación
        sliderX.value = state.index * w;
      }}
    >
      {/* Slider indicator */}
      {tabWidth > 0 && (
        <Animated.View
          style={[styles.slider, { width: tabWidth }, sliderStyle]}
          pointerEvents="none"
        />
      )}

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
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
    top: 4,
    height: 3,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    zIndex: 1,
  },
});