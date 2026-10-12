import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../store/auth';

/** Entry point: route based on authenticated role. */
export default function Index() {
  const user = useAuth((s) => s.user);
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.role === 'DRIVER') return <Redirect href="/(driver)/home" />;
  return <Redirect href="/(customer)/home" />;
}
