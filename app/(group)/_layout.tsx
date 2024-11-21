import { Stack } from "expo-router";
import { useAuth } from "../context/auth";
import { Redirect } from "expo-router";

export default function GroupLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/add-expense"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/add-task"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/expense/[expenseId]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
