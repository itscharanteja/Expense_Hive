import { Stack } from "expo-router";
import { useAuth } from "../context/auth";
import { Redirect } from "expo-router";

export default function AuthLayout() {
  const { user } = useAuth();

  // Redirect to home if user is already authenticated
  if (user) {
    return <Redirect href="/home" />;
  }

  return <Stack />;
}
