import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token storage. Uses Expo SecureStore on native; falls back to an in-memory
 * store on web (SecureStore is unavailable there) so the demo still works.
 */
const TOKEN_KEY = 'rideflow_token';
let memoryToken: string | null = null;

const isWeb = Platform.OS === 'web';

export async function saveToken(token: string): Promise<void> {
  if (isWeb) {
    memoryToken = token;
    try {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (isWeb) {
    if (memoryToken) return memoryToken;
    try {
      return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (isWeb) {
    memoryToken = null;
    try {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
