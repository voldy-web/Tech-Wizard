import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Let the user choose a photo, shrink it, and return a small base64 data URI
 * (so the logo / signature live in the database and render in the PDF without extra files).
 * Returns null if cancelled. Throws Error('permission') if photo access is denied.
 */
export async function pickImageAsDataUri({ maxWidth = 480, png = false, aspect } = {}) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo access was denied. Allow it in your phone settings to choose an image.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1,
  });
  if (res.canceled || !res.assets?.length) return null;
  const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: maxWidth } }], {
    compress: 0.8,
    format: png ? SaveFormat.PNG : SaveFormat.JPEG,
    base64: true,
  });
  return `data:image/${png ? 'png' : 'jpeg'};base64,${out.base64}`;
}
