import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ShieldAlert, Users, Clock, User } from 'lucide-react-native';
import { AdminDashboardScreen } from '../../screens/admin/AdminDashboardScreen';
import { AttendanceScreen } from '../../screens/employee/AttendanceScreen';
import { ProfileScreen } from '../../screens/shared/ProfileScreen';
import { colors, typography } from '../../styles/theme';

const Tab = createBottomTabNavigator();

export const AdminTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.dark.surface,
          borderTopColor: colors.dark.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.dark.textMuted,
        tabBarLabelStyle: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
        },
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'System',
          tabBarIcon: ({ color, size }) => <ShieldAlert color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AdminAttendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
