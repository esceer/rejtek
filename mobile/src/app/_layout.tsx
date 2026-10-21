import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { useVault, VaultProvider } from '../vault/VaultProvider';

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <VaultProvider>
          <RootStack />
        </VaultProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { unlocked } = useVault();
  const theme = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.bg);
  }, [theme]);

  return (
    <>
      {!__DEV__ && <PreventScreenCapture />}
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={unlocked !== null}>
          <Stack.Screen name="index" />
          <Stack.Screen name="item/[id]" />
          <Stack.Screen name="edit/[id]" options={{ animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Protected guard={unlocked === null}>
          <Stack.Screen name="unlock" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/**
 * Keeps passwords out of screenshots, screen recordings and the recent-apps preview.
 * Release builds only, so development screenshots keep working.
 */
function PreventScreenCapture() {
  usePreventScreenCapture();
  return null;
}
