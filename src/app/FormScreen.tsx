import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getEntryById } from '../db';
import FormEntryScreen from '../components/form-webview/FormEntryScreen';
import ScreenHeader from '../components/ui/ScreenHeader';
import type { RootStackParamList } from './navigation';

type FormScreenProps = NativeStackScreenProps<RootStackParamList, 'FormEntry'>;

function FormScreen({ navigation, route }: FormScreenProps) {
  const { entryId } = route.params;
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('Assessment');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;

  // Load entry title for the header
  useEffect(() => {
    let cancelled = false;

    async function loadTitle() {
      const entry = await getEntryById(entryId);
      if (!cancelled && entry) {
        setHeaderTitle(entry.form_title);
      }
    }

    loadTitle();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  // Intercept all forms of back navigation (swipe, header button, Android hardware back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChangesRef.current) return;
      e.preventDefault();
      Alert.alert('Save before leaving?', 'You have unsaved changes that will be lost.', [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(e.data.action),
        },
        { text: 'Stay', style: 'cancel' },
      ]);
    });
    return unsubscribe;
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleUnsavedChangesUpdate = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const handleLastSavedUpdate = useCallback((date: Date) => {
    setLastSavedAt(date);
  }, []);

  const handleSendSuccess = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={headerTitle} onBack={handleBack} lastSavedAt={lastSavedAt} />
      <FormEntryScreen
        entryId={entryId}
        onUnsavedChangesUpdate={handleUnsavedChangesUpdate}
        onLastSavedUpdate={handleLastSavedUpdate}
        onSendSuccess={handleSendSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default FormScreen;
