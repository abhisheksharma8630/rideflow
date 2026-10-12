import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Field, Screen } from '../../components/ui';
import { colors, radii, spacing, typography } from '../../theme';
import { useAuth } from '../../store/auth';
import { api } from '../../services/api';
import { getApiBaseUrl } from '../../services/api';

export default function Profile() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name, email });
      setUser(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function doLogout() {
    await logout();
    router.replace('/(auth)/welcome');
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 30 }}>👤</Text>
          </View>
          <Text style={typography.h2}>{user?.name}</Text>
          <Text style={typography.caption}>{user?.phone}</Text>
        </View>

        <Card>
          <Field label="Name" value={name} onChangeText={setName} />
          <Field
            label="Email (optional)"
            value={email ?? ''}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title="Save changes" onPress={save} loading={saving} />
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <Text style={typography.label}>CONNECTED BACKEND</Text>
          <Text style={typography.caption}>{getApiBaseUrl()}</Text>
          <Text style={[typography.label, { marginTop: spacing.md }]}>SESSION</Text>
          <Text style={typography.caption}>Demo authentication (development only)</Text>
        </Card>

        <Button
          title="Log out"
          variant="danger"
          onPress={doLogout}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
