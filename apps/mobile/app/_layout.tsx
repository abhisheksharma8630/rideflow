import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../store/auth';
import { Loading } from '../components/ui';
import { colors } from '../theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5000 },
  },
});

export default function RootLayout() {
  const restore = useAuth((s) => s.restore);
  const initialized = useAuth((s) => s.initialized);

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        {!initialized ? (
          <Loading label="Starting RideFlow…" />
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceMuted } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(driver)" />
          </Stack>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
