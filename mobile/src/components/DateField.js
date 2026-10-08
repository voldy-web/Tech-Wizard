import React, { useEffect, useState } from 'react';
import { Field } from './ui';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Simple date input (YYYY-MM-DD) that only commits valid dates. Pure JS, works in Expo Go. */
export default function DateField({ label, value, onChange, editable = true, style }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  const change = (t) => {
    setText(t);
    if (ISO.test(t) && !Number.isNaN(Date.parse(t))) onChange(t);
  };
  const valid = text === '' || ISO.test(text);
  return (
    <Field label={label} value={text} onChangeText={change} placeholder="YYYY-MM-DD" editable={editable} style={style}
      keyboardType="numbers-and-punctuation" inputStyle={!valid ? { color: '#BA1A1A' } : undefined} />
  );
}
