import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Auth0Provider } from 'react-native-auth0';
import { auth0Config } from './src/auth';
import { AuthGuardProvider, useAuthGuard } from './src/auth/AuthGuardProvider';
import LoginScreen from './src/app/LoginScreen';
import HomeScreen from './src/app/HomeScreen';
import FormScreen from './src/app/FormScreen';
import FormTypePicker from './src/components/form-picker/FormTypePicker';
import type { RootStackParamList } from './src/app/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Text style={styles.splashTitle}>Periscope</Text>
      <Text style={styles.splashSubtitle}>Offline-first field assessments</Text>
      <ActivityIndicator size="large" color="#1894e1" style={styles.splashSpinner} />
    </View>
  );
}

function RootNavigator() {
  const { phase } = useAuthGuard();

  if (phase === 'loading') {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerShadowVisible: false,
          headerTintColor: '#1a1a2e',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        {phase === 'authenticated' ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="FormTypePicker"
              component={FormTypePicker}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FormEntry"
              component={FormScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Auth0Provider domain={auth0Config.domain} clientId={auth0Config.clientId}>
      <AuthGuardProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthGuardProvider>
    </Auth0Provider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: 1,
  },
  splashSubtitle: {
    fontSize: 16,
    color: '#5f6368',
    marginTop: 8,
  },
  splashSpinner: {
    marginTop: 32,
  },
});
