import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  lastSavedAt?: Date | null;
}

const TICK_INTERVAL_MS = 30_000;

function formatSavedTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Last saved just now';
  if (diffMin < 60) return `Last saved ${diffMin}m ago`;

  return `Last saved at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function ScreenHeader({ title, onBack, lastSavedAt }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const [, setTick] = useState(0);

  // Re-render every 30s so the relative time label stays current
  useEffect(() => {
    if (!lastSavedAt) return;

    const id = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backArrow}>{'\u2190'}</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.trailing}>
          {lastSavedAt && <Text style={styles.lastSaved}>{formatSavedTime(lastSavedAt)}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
    gap: 4,
    padding: 8,
  },
  backArrow: {
    fontSize: 20,
    color: '#1894e1',
    lineHeight: 22,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1894e1',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  trailing: {
    minWidth: 70,
    alignItems: 'flex-end',
    padding: 8,
  },
  lastSaved: {
    fontSize: 12,
    color: '#80868b',
  },
});

export default ScreenHeader;
