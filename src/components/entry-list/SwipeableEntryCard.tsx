import React, { useCallback, useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { Entry } from '../../types';
import EntryCard from './EntryCard';

interface SwipeableEntryCardProps {
  entry: Entry;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  onLongPress: (entry: Entry) => void;
}

function SwipeableEntryCard({ entry, onPress, onDelete, onLongPress }: SwipeableEntryCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete draft?', 'This assessment will be permanently removed.', [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(entry.id),
      },
    ]);
  }, [entry.id, onDelete]);

  const renderRightActions = useCallback(
    (
      _progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>,
    ) => {
      const scale = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0.5],
        extrapolate: 'clamp',
      });

      return (
        <Pressable
          style={styles.deleteAction}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
            Delete
          </Animated.Text>
        </Pressable>
      );
    },
    [handleDelete],
  );

  const handleLongPress = useCallback(() => {
    onLongPress(entry);
  }, [entry, onLongPress]);

  if (entry.status !== 'draft') {
    return <EntryCard entry={entry} onPress={onPress} onLongPress={handleLongPress} />;
  }

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      <EntryCard entry={entry} onPress={onPress} onLongPress={handleLongPress} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    backgroundColor: '#d93025',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    marginRight: 16,
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SwipeableEntryCard;
