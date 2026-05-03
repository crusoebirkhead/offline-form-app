import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { Entry } from '../../types';
import SwipeableEntryCard from './SwipeableEntryCard';

interface EntryListProps {
  entries: readonly Entry[];
  onEntryPress: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onLongPressEntry: (entry: Entry) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function EntryList({
  entries,
  onEntryPress,
  onDeleteEntry,
  onLongPressEntry,
  onRefresh,
  refreshing = false,
}: EntryListProps) {
  const renderItem = useCallback(
    ({ item }: { item: Entry }) => (
      <SwipeableEntryCard
        entry={item}
        onPress={onEntryPress}
        onDelete={onDeleteEntry}
        onLongPress={onLongPressEntry}
      />
    ),
    [onEntryPress, onDeleteEntry, onLongPressEntry],
  );

  const keyExtractor = useCallback((item: Entry) => item.id, []);

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No saved assessments</Text>
        <Text style={styles.emptySubtitle}>Tap "New Assessment" to get started</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries as Entry[]}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#1894e1"
          colors={['#1894e1']}
          progressBackgroundColor="#e8f4fd"
          title="Syncing..."
          titleColor="#1894e1"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#5f6368',
    textAlign: 'center',
  },
});

export default EntryList;
