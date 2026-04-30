import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useEntries } from '../hooks/useEntries';
import { useAuthGuard } from '../auth/AuthGuardProvider';
import EntryList from '../components/entry-list/EntryList';
import SyncBanner from '../components/sync-status/SyncBanner';
import type { RootStackParamList } from './navigation';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({ navigation }: HomeScreenProps) {
  const { entries, loading, error, refresh } = useEntries();
  const { signOut } = useAuthGuard();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  // Re-fetch entries when the screen gains focus (e.g. coming back from FormScreen)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleEntryPress = useCallback(
    (id: string) => {
      navigation.navigate('FormEntry', { entryId: id });
    },
    [navigation],
  );

  const handleNewAssessment = useCallback(() => {
    navigation.navigate('FormTypePicker');
  }, [navigation]);

  const headerBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerCenter}>
        <Image source={require('../assets/logo_icon.png')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Periscope</Text>
      </View>
      <Pressable
        onPress={signOut}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Sign Out"
        style={styles.signOutButton}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {headerBar}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1894e1" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {headerBar}
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {headerBar}
      <SyncBanner autoSync />

      <EntryList
        entries={entries}
        onEntryPress={handleEntryPress}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleNewAssessment}
        accessibilityRole="button"
        accessibilityLabel="New Assessment"
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>New Assessment</Text>
      </Pressable>
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    left: 20,
    backgroundColor: '#1894e1',
    borderRadius: 96,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(8, 10, 12, 1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
  },
  fabPressed: {
    backgroundColor: '#1278b8',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  fabText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  headerBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 22,
    backgroundColor: '#f8f9fa',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  signOutButton: {
    position: 'absolute',
    right: 30,
    bottom: 28,
  },
  signOutText: {
    color: '#1894e1',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
