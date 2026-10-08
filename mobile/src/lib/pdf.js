import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// A4 in points (what expo-print expects)
const A4 = { width: 595, height: 842 };

const safeName = (s) => String(s || 'certificate').replace(/[^A-Za-z0-9._-]+/g, '_');

/**
 * Render the certificate HTML to a PDF. Returns { uri, named }:
 *  - uri   : the file expo-print wrote (always shareable)
 *  - named : a copy called Certificate-<reference>.pdf for a friendlier file name, or null if copying failed.
 * Android can refuse to share the renamed copy ("Not allowed to read file under given URL"),
 * so sharePdf() falls back to `uri`.
 */
export async function createPdf(html, reference) {
  const { uri } = await Print.printToFileAsync({ html, ...A4 });
  let named = null;
  if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
    try {
      const dest = `${FileSystem.cacheDirectory}Certificate-${safeName(reference)}.pdf`;
      await FileSystem.deleteAsync(dest, { idempotent: true });
      await FileSystem.copyAsync({ from: uri, to: dest });
      named = dest;
    } catch {
      named = null; // renaming is cosmetic
    }
  }
  return { uri, named };
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

/** Native print dialog. */
export const printCertificate = (html) => Print.printAsync({ html, ...A4 });
