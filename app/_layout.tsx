import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { useEffect } from 'react';
import { initDatabase } from '@/lib/database';

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack screenOptions={{
          headerShown: false,
        }} />
      </>
    </QueryClientProvider>
  );
}
