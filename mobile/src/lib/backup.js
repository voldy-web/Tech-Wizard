import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../api/client';
import { todayIso } from './format';

/** Save all data to a .json file and open the share sheet (Drive, WhatsApp, email, Files...). */
export async function shareBackup() {
  const text = await api.exportBackup();
  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) {
    const blob = new Blob([text], { type: 'application/json' });       // browser fallback: download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TechWizard-backup-${todayIso()}.json`;
    a.click();
    return;
  }
  const uri = `${FileSystem.cacheDirectory}TechWizard-backup-${todayIso()}.json`;
  await FileSystem.writeAsStringAsync(uri, text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Save your Tech Wizard backup' });
}

/** Let the user pick a backup file and restore it. Returns { projects, claims } or null if cancelled. */
export async function pickAndRestoreBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  let text;
  if (Platform.OS === 'web') text = await (await fetch(asset.uri)).text();
  else text = await FileSystem.readAsStringAsync(asset.uri);
  return api.importBackup(text);
}
