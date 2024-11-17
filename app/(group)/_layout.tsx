import { Stack } from "expo-router";
import { useAuth } from "../context/auth";
import { Redirect } from "expo-router";

export default function GroupLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Stack />;
}
