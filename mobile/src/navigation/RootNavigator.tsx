import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { EmployeeTabs } from './tabs/EmployeeTabs';
import { InternTabs } from './tabs/InternTabs';
import { PmoTabs } from './tabs/PmoTabs';
import { HrTabs } from './tabs/HrTabs';
import { AdminTabs } from './tabs/AdminTabs';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { AttendanceScreen } from '../screens/employee/AttendanceScreen';
import { TaskDetailScreen } from '../screens/employee/TaskDetailScreen';
import { EmployeeDirectoryScreen } from '../screens/hr/EmployeeDirectoryScreen';
import { OnboardingChecklistScreen } from '../screens/hr/OnboardingChecklistScreen';
import { ProjectDetailScreen } from '../screens/pmo/ProjectDetailScreen';
import { LearningResourcesScreen } from '../screens/intern/LearningResourcesScreen';
import { DailyTrackerScreen } from '../screens/intern/DailyTrackerScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { colors } from '../styles/theme';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, roleSlug } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
      </View>
    );
  }

  const getRoleMainComponent = () => {
    switch (roleSlug) {
      case 'super-admin':
      case 'admin':
        return AdminTabs;
      case 'hr-manager':
        return HrTabs;
      case 'pmo-lead':
        return PmoTabs;
      case 'intern':
        return InternTabs;
      case 'employee':
      default:
        return EmployeeTabs;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.dark.bg },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={getRoleMainComponent()} />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
            <Stack.Screen name="OnboardingChecklist" component={OnboardingChecklistScreen} />
            <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
            <Stack.Screen name="LearningResources" component={LearningResourcesScreen} />
            <Stack.Screen name="DailyTracker" component={DailyTrackerScreen} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
