import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../api/client';

/**
 * "New claim" flow shared by Dashboard, Claims tab and Projects:
 *   - creates the next week's claim for a project (server auto-numbers it and pre-fills Balance B/F)
 *   - with several projects, lets the user pick one first
 */
export function useNewClaim(projects) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const createFor = useCallback(async (projectId) => {
    setPickerOpen(false);
    setBusy(true);
    try {
      const claim = await api.createClaim(projectId);
      router.push(`/claim/${claim.id}`);
    } catch (e) {
      Alert.alert('Could not create claim', e.message);
    } finally {
      setBusy(false);
    }
  }, [router]);

  const start = useCallback(() => {
    const list = projects || [];
    if (list.length === 0) {
      Alert.alert('Create a project first', 'A claim belongs to a project. Add your first project, then create a claim.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New project', onPress: () => router.push('/project/edit') },
      ]);
    } else if (list.length === 1) {
      createFor(list[0].id);
    } else {
      setPickerOpen(true);
    }
  }, [projects, createFor, router]);

  return { start, createFor, busy, pickerOpen, closePicker: () => setPickerOpen(false) };
}
