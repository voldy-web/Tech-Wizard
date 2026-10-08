import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/hooks/useApi';
import { Button, ErrorState, Icon, LoadingState } from '../../../src/components/ui';
import HtmlPreview from '../../../src/components/HtmlPreview';
import { buildCertificateHtml } from '../../../src/lib/certificateHtml';
import { createPdf, printCertificate, sharePdf } from '../../../src/lib/pdf';
import { colors, space } from '../../../src/theme';

export default function CertificatePreview() {
  const { id } = useLocalSearchParams();
  const { data, error, loading, reload } = useApi(async () => {
    const [claim, settings] = await Promise.all([api.claim(id), api.settings()]);
    return { claim, settings };
  }, [id]);
  const [busy, setBusy] = useState(null);

  const html = useMemo(() => (data ? buildCertificateHtml(data.claim, data.settings) : ''), [data]);

  const run = (kind, fn) => async () => {
    setBusy(kind);
    try { await fn(); } catch (e) {
      Alert.alert('Could not share the PDF', `${e?.message || String(e)}\n\nTip: tap "Print", then choose "Save as PDF" in the print window.`);
    } finally { setBusy(null); }
  };

  const exportPdf = run('export', async () => { const pdf = await createPdf(html, data.claim.reference); await sharePdf(pdf, 'Save or send certificate'); });
  const share = run('share', async () => { const pdf = await createPdf(html, data.claim.reference); await sharePdf(pdf, `Certificate ${data.claim.reference}`); });
  const print = run('print', async () => { await printCertificate(html); });

  return (
    <>
      <Stack.Screen options={{ title: 'Certificate preview' }} />
      {loading ? <LoadingState label="Preparing certificate…" /> : error ? (
        <View style={{ padding: space.lg }}><ErrorState error={error} onRetry={reload} /></View>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', gap: 8, padding: space.md, alignItems: 'center' }}>
            <Button title="Print" icon="printer-outline" variant="soft" compact loading={busy === 'print'} onPress={print} style={{ flex: 1 }} />
            <Button title="Export PDF" icon="download-outline" compact loading={busy === 'export'} onPress={exportPdf} style={{ flex: 1.3 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg, paddingBottom: 8 }}>
            <Icon name="file-document-outline" size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 12, flex: 1 }}>A4 preview · pinch to zoom · what you see is what the PDF contains</Text>
          </View>
          <HtmlPreview html={html} style={{ flex: 1 }} />
          <View style={{ padding: space.md, backgroundColor: '#FBFAFF', borderTopWidth: 1, borderTopColor: colors.containerHigh }}>
            <Button title="Share (WhatsApp, email…)" icon="share-variant-outline" loading={busy === 'share'} onPress={share} />
          </View>
        </View>
      )}
    </>
  );
}
