import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { Button, ErrorState, Field, LoadingState } from '../../src/components/ui';
import { colors, space } from '../../src/theme';

const EMPTY = { name: '', client: '', scopeOfWork: '', location: '', levyPercent: '', contractSum: '' };

export default function ProjectEdit() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [settings, p] = await Promise.all([api.settings(), id ? api.project(id) : null]);
        if (!alive) return;
        if (p) {
          setForm({
            name: p.name || '', client: p.client || '', scopeOfWork: p.scopeOfWork || '', location: p.location || '',
            levyPercent: p.levyPercent != null ? String(p.levyPercent) : '', contractSum: p.contractSum != null ? String(p.contractSum) : '',
          });
        } else {
          setForm((f) => ({ ...f, levyPercent: String(settings.defaultLevyPercent ?? 7) }));
        }
      } catch (e) { if (alive) setError(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    const levy = form.levyPercent === '' ? null : Number(form.levyPercent);
    if (levy !== null && (Number.isNaN(levy) || levy < 0 || levy > 100)) errs.levy = 'Levy must be between 0 and 100';
    const sum = form.contractSum === '' ? null : Number(String(form.contractSum).replace(/,/g, ''));
    if (sum !== null && (Number.isNaN(sum) || sum < 0)) errs.sum = 'Enter a valid amount';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const body = {
      name: form.name.trim(), client: form.client.trim(), scopeOfWork: form.scopeOfWork.trim(), location: form.location.trim(),
      levyPercent: levy, contractSum: sum,
    };
    try {
      const saved = id ? await api.updateProject(id, body) : await api.createProject(body);
      if (id) router.back(); else router.replace(`/project/${saved.id}`);
    } catch (e) {
      Alert.alert('Could not save project', e.message);
    } finally { setSaving(false); }
  };

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit project' : 'New project' }} />
      {loading ? <LoadingState /> : error ? <View style={{ padding: space.lg }}><ErrorState error={error} /></View> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <Field label="Project name *" value={form.name} onChangeText={set('name')} placeholder="e.g. East Legon Residential Complex" />
            {errors.name ? <ErrText text={errors.name} /> : null}
            <Field label="Client / employer" value={form.client} onChangeText={set('client')} placeholder="e.g. Mr. Kofi Osei" />
            <Field label="Scope of work" value={form.scopeOfWork} onChangeText={set('scopeOfWork')} multiline placeholder="Short description of the works" />
            <Field label="Site location" value={form.location} onChangeText={set('location')} placeholder="Plot 42, Ambassadorial Enclave" />
            <Field label="Default levy / retention %" value={form.levyPercent} onChangeText={set('levyPercent')} keyboardType="decimal-pad" suffix="%" />
            {errors.levy ? <ErrText text={errors.levy} /> : null}
            <Field label="Contract sum (optional)" value={form.contractSum} onChangeText={set('contractSum')} keyboardType="decimal-pad" suffix="GH₵" />
            {errors.sum ? <ErrText text={errors.sum} /> : null}
            <Button title={id ? 'Save changes' : 'Create project'} icon="content-save-outline" onPress={save} loading={saving} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

function ErrText({ text }) {
  return <Text style={{ color: colors.error, marginTop: -8 }}>{text}</Text>;
}
