import { Stack } from "expo-router";
import { AuthProvider } from "./context/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(group)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
