import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Entry, EntryStatus } from '../../types';

interface EntryCardProps {
  entry: Entry;
  onPress: (id: string) => void;
  onLongPress?: () => void;
}

const STATUS_CONFIG: Record<EntryStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: '#fef4e1', text: '#e69500' },
  completed: { label: 'Completed', bg: '#e1f4e8', text: '#2e7d32' },
  sent: { label: 'Sent', bg: '#e1f4fe', text: '#1894e1' },
};

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffSeconds = Math.floor((now - then) / 1_000);

  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function EntryCard({ entry, onPress, onLongPress }: EntryCardProps) {
  const statusConfig = STATUS_CONFIG[entry.status];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(entry.id)}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessibilityRole="button"
      accessibilityLabel={`${entry.form_title}, ${statusConfig.label}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {entry.form_title}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.badgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
        </View>
      </View>
      <Text style={styles.timestamp}>{formatRelativeTime(entry.updated_at)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
  },
  cardPressed: {
    backgroundColor: '#f5f5f5',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    borderRadius: 96,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  timestamp: {
    fontSize: 13,
    color: '#5f6368',
  },
});

export default EntryCard;
