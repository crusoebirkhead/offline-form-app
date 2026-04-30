import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Button from './Button';

interface ActionItem {
  key: string;
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'filled' | 'outlined' | 'success';
  accessibilityLabel?: string;
}

interface FloatingActionMenuProps {
  actions: ActionItem[];
}

const PRIMARY = '#1894e1';
const PRIMARY_PRESSED = '#1278b8';

export default function FloatingActionMenu({ actions }: FloatingActionMenuProps) {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animation, {
      toValue: open ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [open, animation]);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const handleAction = useCallback(
    (onPress: () => void) => {
      close();
      onPress();
    },
    [close],
  );

  const fabRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const panelTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const panelOpacity = animation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  // Keep panel mounted so closing animation plays; use pointerEvents to ignore taps when closed
  const panelPointerEvents = open ? 'auto' : 'none';

  return (
    <>
      {/* Invisible full-screen tap target to close — no darkening */}
      {open && <Pressable style={styles.backdrop} onPress={close} />}

      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{ translateY: panelTranslateY }],
              opacity: panelOpacity,
            },
          ]}
          pointerEvents={panelPointerEvents}
        >
          {actions.map((action) => (
            <Button
              key={action.key}
              title={action.title}
              variant={action.variant}
              onPress={() => handleAction(action.onPress)}
              disabled={action.disabled}
              loading={action.loading}
              accessibilityLabel={action.accessibilityLabel ?? action.title}
            />
          ))}
        </Animated.View>

        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={toggle}
          accessibilityLabel={open ? 'Close actions menu' : 'Open actions menu'}
          accessibilityRole="button"
        >
          <Animated.Text style={[styles.fabIcon, { transform: [{ rotate: fabRotation }] }]}>
            +
          </Animated.Text>
        </Pressable>
      </View>
    </>
  );
}

const SHADOW = {
  shadowColor: 'rgba(8, 10, 12, 1)',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 6,
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },
  anchor: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  panel: {
    marginBottom: 12,
    gap: 10,
    width: 220,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  fabPressed: {
    backgroundColor: PRIMARY_PRESSED,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 30,
  },
});
