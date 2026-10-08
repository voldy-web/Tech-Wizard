import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// A4 in points (what expo-print expects)
const A4 = { width: 595, height: 842 };

const safeName = (s) => String(s || 'certificate').replace(/[^A-Za-z0-9._-]+/g, '_');

/** Render the certificate HTML to a PDF file and return its uri (named after the claim reference). */
export async function createPdf(html, reference) {
  const { uri } = await Print.printToFileAsync({ html, ...A4 });
  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) return uri;
  const dest = `${FileSystem.cacheDirectory}Certificate-${safeName(reference)}.pdf`;
  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri; // renaming is cosmetic; fall back to the generated file
  }
}

/** Open the share sheet (WhatsApp, email, Files…) for a PDF. */
export async function sharePdf(uri, title = 'Certificate of Claim') {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}

/** Native print dialog. */
export const printCertificate = (html) => Print.printAsync({ html, ...A4 });
