import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="users" />
      <Stack.Screen name="add-user" />
      <Stack.Screen name="edit-user" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="manage-availability" />
    </Stack>
  );
}
