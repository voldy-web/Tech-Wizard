import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// A4 in points (what expo-print expects)
const A4 = { width: 595, height: 842 };

const safeName = (s) => String(s || 'certificate').replace(/[^A-Za-z0-9._-]+/g, '_');

/**
 * Render the certificate HTML to a PDF.
 *
 * Android (and Expo Go) can refuse to share/copy the file expo-print writes ("Not allowed to read file
 * under given URL"), so we ask expo-print for the PDF *as base64 data* and write the file ourselves into
 * the app's own cache folder, where sharing is always allowed. Returns { uri, named }:
 *   named : Certificate-<reference>.pdf that we wrote (preferred for sharing), or null if writing failed
 *   uri   : the file expo-print wrote (fallback)
 */
export async function createPdf(html, reference) {
  const result = await Print.printToFileAsync({ html, ...A4, base64: true });
  let named = null;
  if (Platform.OS !== 'web' && FileSystem.cacheDirectory && result.base64) {
    try {
      const dest = `${FileSystem.cacheDirectory}Certificate-${safeName(reference)}.pdf`;
      await FileSystem.writeAsStringAsync(dest, result.base64, { encoding: FileSystem.EncodingType.Base64 });
      named = dest;
    } catch {
      named = null;
    }
  }
  return { uri: result.uri, named };
}

/** Open the share sheet (WhatsApp, email, Files…) for a PDF made by createPdf(). */
export async function sharePdf(pdf, title = 'Certificate of Claim') {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  const options = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title };
  const candidates = [pdf.named, pdf.uri].filter(Boolean);
  let lastError;
  for (const target of candidates) {
    try {
      await Sharing.shareAsync(target, options);
      return;
    } catch (e) {
      lastError = e; // try the next candidate
    }
  }
  throw lastError || new Error('Could not share the PDF.');
}

/** Native print dialog (it also offers "Save as PDF"). */
export const printCertificate = (html) => Print.printAsync({ html, ...A4 });
