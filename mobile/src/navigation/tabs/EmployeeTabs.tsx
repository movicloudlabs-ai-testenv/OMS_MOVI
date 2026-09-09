import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Clock, CheckSquare, Calendar, FileText } from 'lucide-react-native';
import { EmployeeDashboardScreen } from '../../screens/employee/EmployeeDashboardScreen';
import { AttendanceScreen } from '../../screens/employee/AttendanceScreen';
import { TaskBoardScreen } from '../../screens/employee/TaskBoardScreen';
import { LeaveRequestScreen } from '../../screens/employee/LeaveRequestScreen';
import { EODReportScreen } from '../../screens/employee/EODReportScreen';
import { colors, typography } from '../../styles/theme';

const Tab = createBottomTabNavigator();

export const EmployeeTabs: React.FC = () => {
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
        name="Home"
        component={EmployeeDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskBoardScreen}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Leaves"
        component={LeaveRequestScreen}
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="EOD"
        component={EODReportScreen}
        options={{
          tabBarLabel: 'EOD',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
