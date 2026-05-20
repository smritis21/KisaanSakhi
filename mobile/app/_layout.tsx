import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

const AgriTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#f1f5f1' },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={AgriTheme}>
        {Platform.OS === 'android' && (
          <View style={{ height: Constants.statusBarHeight, backgroundColor: '#1b5e20' }} />
        )}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" backgroundColor="#1b5e20" translucent={false} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}