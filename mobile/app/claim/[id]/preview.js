import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/hooks/useApi';
import { Button, ErrorState, LoadingState } from '../../../src/components/ui';
import HtmlPreview from '../../../src/components/HtmlPreview';
import { buildCertificateHtml } from '../../../src/lib/certificateHtml';
import { createPdf, sharePdf } from '../../../src/lib/pdf';
import { colors, space } from '../../../src/theme';

export default function CertificatePreview() {
  const { id } = useLocalSearchParams();
  const { data, error, loading, reload } = useApi(async () => {
    const [claim, settings] = await Promise.all([api.claim(id), api.settings()]);
    const project = await api.project(claim.projectId);
    return { claim: { ...claim, contractSum: project.contractSum }, settings };
  }, [id]);
  const [busy, setBusy] = useState(null);

  const html = useMemo(() => (data ? buildCertificateHtml(data.claim, data.settings) : ''), [data]);

  const run = (kind, fn) => async () => {
    setBusy(kind);
    try { await fn(); } catch (e) {
      Alert.alert('Could not share the PDF', e?.message || String(e));
    } finally { setBusy(null); }
  };

  const share = run('share', async () => { const pdf = await createPdf(html, data.claim.reference); await sharePdf(pdf, `Certificate ${data.claim.reference}`); });

  return (
    <>
      <Stack.Screen options={{ title: 'Certificate preview' }} />
      {loading ? <LoadingState label="Preparing certificate…" /> : error ? (
        <View style={{ padding: space.lg }}><ErrorState error={error} onRetry={reload} /></View>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <HtmlPreview html={html} style={{ flex: 1 }} />
          <View style={{ padding: space.md, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
            <Button title="Share" icon="share-variant-outline" loading={busy === 'share'} onPress={share} />
          </View>
        </View>
      )}
    </>
  );
}
