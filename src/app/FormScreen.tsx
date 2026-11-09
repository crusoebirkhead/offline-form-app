import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getEntryById } from '../db';
import FormEntryScreen, {
  type FormEntryScreenRef,
} from '../components/form-webview/FormEntryScreen';
import ScreenHeader from '../components/ui/ScreenHeader';
import type { RootStackParamList } from './navigation';

type FormScreenProps = NativeStackScreenProps<RootStackParamList, 'FormEntry'>;

function FormScreen({ navigation, route }: FormScreenProps) {
  const { entryId } = route.params;
  const [headerTitle, setHeaderTitle] = useState('Assessment');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const formEntryRef = useRef<FormEntryScreenRef>(null);

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

  // Auto-save a draft when leaving via the header Back button. The WebView is
  // still mounted here, so we can round-trip for the freshest form data before
  // navigating. Swipe-back and Android hardware back are covered separately by
  // the unmount flush inside FormEntryScreen (native-stack's beforeRemove is
  // unreliable for the swipe gesture, so we don't depend on it). Either way the
  // user never has to remember to tap Save Draft first.
  const handleBack = useCallback(async () => {
    await formEntryRef.current?.saveDraft();
    navigation.goBack();
  }, [navigation]);

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
        ref={formEntryRef}
        entryId={entryId}
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
