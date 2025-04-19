import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';


// Prevent the splash screen from auto-hiding before asset loading is complete.

export default function ToursLayout() {
  return (
      <Stack screenOptions={{
        headerShown:false
      }}>
        <Stack.Screen name='tours' options={{
          title: "Tours",
          headerShown: false
        }} />
      </Stack>
  );
}
