import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/Login';
import DashboardScreen from '../screens/Dashboard';
import HistoryScreen from '../screens/History';
import PendingCertificationScreen from '../screens/PendingCertification';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  History: undefined;
  PendingCertification: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: '#0f172a',
  },
  headerTintColor: '#f8fafc',
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
  contentStyle: {
    backgroundColor: '#0f172a',
  },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function MainStack() {
  const { pendingCertification } = useAuth();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {pendingCertification ? (
        <Stack.Screen
          name="PendingCertification"
          component={PendingCertificationScreen}
          options={{
            headerShown: false,
            gestureEnabled: false
          }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: 'Timekeep' }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: 'History' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      {token ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
