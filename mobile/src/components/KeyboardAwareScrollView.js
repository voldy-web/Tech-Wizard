import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useKeyboardScroll } from '../hooks/useKeyboard';

/**
 * A ScrollView that never lets the keyboard cover the field you are typing in:
 * it adds room at the bottom while the keyboard is open and scrolls the focused field into view.
 */
const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView({ contentContainerStyle, onScroll, children, ...rest }, ref) {
  const inner = useRef(null);
  const scrollTo = useCallback((y) => inner.current?.scrollTo?.({ y, animated: true }), []);
  const { kb, onScroll: track } = useKeyboardScroll(scrollTo);
  useImperativeHandle(ref, () => ({
    scrollTo: (o) => inner.current?.scrollTo?.(o),
    scrollToEnd: (o) => inner.current?.scrollToEnd?.(o),
  }), []);

  const flat = StyleSheet.flatten(contentContainerStyle) || {};
  return (
    <ScrollView
      ref={inner}
      keyboardShouldPersistTaps="handled"
      {...rest}
      scrollEventThrottle={16}
      onScroll={(e) => { track(e); if (onScroll) onScroll(e); }}
      contentContainerStyle={[flat, { paddingBottom: (flat.paddingBottom || 0) + kb.height }]}
    >
      {children}
    </ScrollView>
  );
});

export default KeyboardAwareScrollView;
