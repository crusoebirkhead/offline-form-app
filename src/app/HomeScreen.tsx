import React, { useCallback, useEffect } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useEntries } from '../hooks/useEntries';
import { createEntry, deleteEntry, updateEntry } from '../db';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSync } from '../hooks/useSync';
import { submitAssessment } from '../services/periscope';
import { useAuthGuard } from '../auth/AuthGuardProvider';
import EntryList from '../components/entry-list/EntryList';
import SyncBanner from '../components/sync-status/SyncBanner';
import type { Entry } from '../types';
import type { RootStackParamList } from './navigation';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({ navigation }: HomeScreenProps) {
  const { entries, loading, error, refresh } = useEntries();
  const { signOut } = useAuthGuard();
  const { isInternetReachable, isConnected } = useNetworkStatus();
  const { syncing, lastSyncTime, result, error: syncError, triggerSync } = useSync();
  const insets = useSafeAreaInsets();

  // Re-fetch entries when the screen gains focus (e.g. coming back from FormScreen)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Auto-sync on mount
  useEffect(() => {
    triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh entry list after sync completes
  useEffect(() => {
    if (!syncing && (result || syncError)) {
      refresh();
    }
  }, [syncing, result, syncError, refresh]);

  const handleRefresh = useCallback(async () => {
    await triggerSync();
  }, [triggerSync]);

  const handleEntryPress = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (entry?.status === 'sent') return;
      navigation.navigate('FormEntry', { entryId: id });
    },
    [navigation, entries],
  );

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      await deleteEntry(id);
      refresh();
    },
    [refresh],
  );

  const handleNewAssessment = useCallback(() => {
    navigation.navigate('FormTypePicker');
  }, [navigation]);

  const handleDuplicate = useCallback(
    async (entry: Entry) => {
      const newEntry = await createEntry(entry.form_type, entry.form_title);
      await updateEntry(newEntry.id, { data_json: entry.data_json });
      navigation.navigate('FormEntry', { entryId: newEntry.id });
    },
    [navigation],
  );

  const handleMarkComplete = useCallback(
    async (entry: Entry) => {
      await updateEntry(entry.id, { status: 'completed' });
      refresh();
    },
    [refresh],
  );

  const handleSendToPortal = useCallback(
    async (entry: Entry) => {
      if (!isInternetReachable) {
        Alert.alert('Offline', 'You must be online to send to Periscope Portal.');
        return;
      }

      const dataJson = entry.data_json ? JSON.parse(entry.data_json) : {};
      const result = await submitAssessment({
        dataJson: dataJson as object,
        formType: entry.form_type,
      });

      if (!result.success) {
        Alert.alert('Send Failed', result.error ?? 'Submission failed.');
        return;
      }

      const now = new Date().toISOString();
      await updateEntry(entry.id, { status: 'sent', sent_at: now, data_json: '{}' });
      Alert.alert('Sent', 'Assessment submitted to Periscope Portal.');
      refresh();
    },
    [isInternetReachable, refresh],
  );

  const showContextMenuIOS = useCallback(
    (entry: Entry) => {
      const options: string[] = ['Duplicate'];
      const actions: Array<(e: Entry) => void> = [handleDuplicate];

      if (entry.status === 'draft') {
        options.push('Mark as Complete');
        actions.push(handleMarkComplete);
      }

      if (entry.status !== 'sent') {
        const label = isInternetReachable ? 'Send to Portal' : 'Send to Portal (Offline)';
        options.push(label);
        actions.push(handleSendToPortal);
      }

      options.push('Cancel');

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          disabledButtonIndices: !isInternetReachable
            ? [options.findIndex((o) => o.startsWith('Send to Portal'))]
            : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex !== options.length - 1) {
            actions[buttonIndex](entry);
          }
        },
      );
    },
    [handleDuplicate, handleMarkComplete, handleSendToPortal, isInternetReachable],
  );

  const showContextMenuAndroid = useCallback(
    (entry: Entry) => {
      const buttons: Array<{ text: string; onPress: () => void }> = [
        { text: 'Duplicate', onPress: () => handleDuplicate(entry) },
      ];

      if (entry.status === 'draft') {
        buttons.push({ text: 'Mark as Complete', onPress: () => handleMarkComplete(entry) });
      }

      if (entry.status !== 'sent' && isInternetReachable) {
        buttons.push({ text: 'Send to Portal', onPress: () => handleSendToPortal(entry) });
      }

      buttons.push({ text: 'Cancel', onPress: () => {} });

      Alert.alert(entry.form_title, undefined, buttons, { cancelable: true });
    },
    [handleDuplicate, handleMarkComplete, handleSendToPortal, isInternetReachable],
  );

  const handleLongPressEntry = useCallback(
    (entry: Entry) => {
      if (entry.status === 'sent') return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (Platform.OS === 'ios') {
        showContextMenuIOS(entry);
      } else {
        showContextMenuAndroid(entry);
      }
    },
    [showContextMenuIOS, showContextMenuAndroid],
  );

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
      <SyncBanner
        syncing={syncing}
        lastSyncTime={lastSyncTime}
        result={result}
        error={syncError}
        onSyncPress={triggerSync}
        isConnected={isConnected}
      />

      <EntryList
        entries={entries}
        onEntryPress={handleEntryPress}
        onDeleteEntry={handleDeleteEntry}
        onLongPressEntry={handleLongPressEntry}
        onRefresh={handleRefresh}
        refreshing={syncing}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  signOutButton: {},
  signOutText: {
    color: '#1894e1',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
