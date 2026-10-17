// Where the app's data lives on the phone: ONE JSON file in the app's private documents folder
// (localStorage when running in a browser). Writes are queued so two saves never overlap, and go
// through a temp file so a crash mid-write cannot corrupt the existing data.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const NAME = 'techwizard-data.json';
const KEY = 'techwizard-data';

const filePath = () => (FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${NAME}` : null);
const useBrowserStorage = () => Platform.OS === 'web' || !filePath();

function browserStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** Returns the saved text, or null when nothing has been saved yet. */
export async function readData() {
  if (useBrowserStorage()) {
    const ls = browserStorage();
    try { return ls ? ls.getItem(KEY) : null; } catch { return null; }
  }
  const main = filePath();
  for (const candidate of [main, `${main}.tmp`]) {   // .tmp = a write that was interrupted just before the swap
    try {
      const info = await FileSystem.getInfoAsync(candidate);
      if (info.exists) return await FileSystem.readAsStringAsync(candidate);
    } catch { /* try the next one */ }
  }
  return null;
}

async function writeNow(text) {
  if (useBrowserStorage()) {
    const ls = browserStorage();
    try { if (ls) ls.setItem(KEY, text); } catch { /* storage full / blocked */ }
    return;
  }
  const main = filePath();
  const tmp = `${main}.tmp`;
  await FileSystem.writeAsStringAsync(tmp, text);
  await FileSystem.deleteAsync(main, { idempotent: true });
  await FileSystem.moveAsync({ from: tmp, to: main });
}

let queue = Promise.resolve();

/** Save text. Resolves when it is on disk. Never rejects (a failed save must not crash the app). */
export function writeData(text) {
  queue = queue.then(() => writeNow(text)).catch(() => {});
  return queue;
}

/** Remove everything saved (used by "Erase all data"). */
export function clearData() {
  queue = queue.then(async () => {
    if (useBrowserStorage()) { try { browserStorage()?.removeItem(KEY); } catch { /* ignore */ } return; }
    await FileSystem.deleteAsync(filePath(), { idempotent: true });
    await FileSystem.deleteAsync(`${filePath()}.tmp`, { idempotent: true });
  }).catch(() => {});
  return queue;
}
