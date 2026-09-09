import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Clock, CheckSquare, BookOpen, Calendar } from 'lucide-react-native';
import { InternDashboardScreen } from '../../screens/intern/InternDashboardScreen';
import { AttendanceScreen } from '../../screens/employee/AttendanceScreen';
import { TaskBoardScreen } from '../../screens/employee/TaskBoardScreen';
import { LeaveRequestScreen } from '../../screens/employee/LeaveRequestScreen';
import { colors, typography } from '../../styles/theme';

const Tab = createBottomTabNavigator();

export const InternTabs: React.FC = () => {
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
        name="InternHome"
        component={InternDashboardScreen}
        options={{
          tabBarLabel: 'Learning',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="InternTasks"
        component={TaskBoardScreen}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="InternAttendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="InternLeaves"
        component={LeaveRequestScreen}
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
