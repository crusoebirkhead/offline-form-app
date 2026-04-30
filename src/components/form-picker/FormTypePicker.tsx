import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../app/navigation';
import type { CachedFormSchema } from '../../types';
import { useFormSchemas } from '../../hooks/useFormSchemas';
import { createEntry } from '../../db/entries';
import ScreenHeader from '../ui/ScreenHeader';

type FormTypePickerProps = NativeStackScreenProps<RootStackParamList, 'FormTypePicker'>;

function FormTypePicker({ navigation }: FormTypePickerProps) {
  const { schemas, loading, error, refresh } = useFormSchemas();
  const [creating, setCreating] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (schema: CachedFormSchema) => {
      if (creating) return;
      setCreating(schema.id);
      try {
        const entry = await createEntry(schema.form_path, schema.title);
        navigation.replace('FormEntry', { entryId: entry.id });
      } catch {
        setCreating(null);
      }
    },
    [creating, navigation],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="New Assessment" onBack={handleBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1894e1" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="New Assessment" onBack={handleBack} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (schemas.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="New Assessment" onBack={handleBack} />
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No forms available</Text>
          <Text style={styles.emptySubtitle}>Sync required to download form types</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="New Assessment" onBack={handleBack} />
      <Text style={styles.heading}>Select a form type</Text>
      <FlatList
        data={schemas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => handleSelect(item)}
            disabled={creating !== null}
            accessibilityRole="button"
            accessibilityLabel={`Start ${item.title} assessment`}
          >
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowPath}>{item.form_path}</Text>
            </View>
            {creating === item.id ? (
              <ActivityIndicator size="small" color="#1894e1" />
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  heading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5f6368',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowPressed: {
    backgroundColor: '#e8f0fe',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  rowPath: {
    fontSize: 13,
    color: '#80868b',
  },
  chevron: {
    fontSize: 22,
    color: '#80868b',
    marginLeft: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginLeft: 20,
  },
  errorText: {
    color: '#d93025',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1894e1',
    borderRadius: 96,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 64,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#5f6368',
    textAlign: 'center',
  },
});

export default FormTypePicker;
