import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FolderKanban, CheckSquare, Clock, User } from 'lucide-react-native';
import { PmoDashboardScreen } from '../../screens/pmo/PmoDashboardScreen';
import { TaskBoardScreen } from '../../screens/employee/TaskBoardScreen';
import { AttendanceScreen } from '../../screens/employee/AttendanceScreen';
import { ProfileScreen } from '../../screens/shared/ProfileScreen';
import { colors, typography } from '../../styles/theme';

const Tab = createBottomTabNavigator();

export const PmoTabs: React.FC = () => {
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
        name="PmoHome"
        component={PmoDashboardScreen}
        options={{
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color, size }) => <FolderKanban color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PmoTasks"
        component={TaskBoardScreen}
        options={{
          tabBarLabel: 'Task Board',
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PmoAttendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PmoProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
