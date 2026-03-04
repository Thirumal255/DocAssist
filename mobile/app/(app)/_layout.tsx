import { Tabs, router } from 'expo-router'; // Added 'router' import
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';

export default function AppLayout() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0A7B6E',
        tabBarInactiveTintColor: '#6B7C93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#DCE4ED',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* VISIBLE TABS - Only these 5 appear in bottom bar */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      
      {/* UPDATED PATIENTS TAB */}
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          // This listener forces the tab to reset to the main list every time it's clicked
          listeners: {
            tabPress: (e) => {
              e.preventDefault(); // Stop default behavior (preserving history)
              router.replace('/(app)/patients'); // Reset to the list view
            },
          },
        }}
      />

      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />

      {/* HIDDEN FROM TAB BAR - These routes exist but don't show as tabs */}
      <Tabs.Screen
        name="admin"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{ href: null }}
      />
    </Tabs>
  );
}