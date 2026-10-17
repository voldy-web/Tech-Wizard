import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, TextInput } from 'react-native';

/**
 * How far a field must move up so it sits clear above the keyboard (0 = already visible).
 * fieldBottom and keyboardTop are both in window coordinates (y grows downward).
 */
export function scrollDeltaForField({ fieldBottom, keyboardTop, margin = 24 }) {
  if (!Number.isFinite(fieldBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, Math.round(fieldBottom - (keyboardTop - margin)));
}

/** Current on-screen keyboard: { height, top } (both 0 / null when hidden). */
export function useKeyboard() {
  const [kb, setKb] = useState({ height: 0, top: null });
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      const height = e.endCoordinates?.height || 0;
      const top = e.endCoordinates?.screenY ?? Dimensions.get('window').height - height;
      setKb({ height, top });
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb({ height: 0, top: null }));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return kb;
}

/**
 * Keeps the field you are typing in visible above the keyboard.
 * Give it a function that scrolls your list/scroll view to a y offset; wire `onScroll` (or call
 * `setOffset` with the current offset) so it knows where the list currently is.
 */
export function useKeyboardScroll(scrollTo) {
  const kb = useKeyboard();
  const offset = useRef(0);
  const setOffset = useCallback((y) => { offset.current = y; }, []);
  const onScroll = useCallback((e) => { offset.current = e.nativeEvent.contentOffset.y; }, []);

  // The field we already scrolled into view. We scroll once per focused field, so the user is free to
  // scroll away (e.g. up to read something) while the keyboard stays open without being yanked back.
  const handled = useRef(null);

  useEffect(() => {
    if (!kb.height) { handled.current = null; return undefined; }
    const check = () => {
      const input = TextInput.State?.currentlyFocusedInput?.();
      if (!input || !input.measureInWindow || input === handled.current) return;
      input.measureInWindow((x, y, w, h) => {
        handled.current = input;
        const delta = scrollDeltaForField({ fieldBottom: y + h, keyboardTop: kb.top, margin: 24 });
        if (delta > 1) scrollTo(offset.current + delta);
      });
    };
    const first = setTimeout(check, 150);
    const poll = setInterval(check, 500);   // picks up tapping a different field while the keyboard stays open
    return () => { clearTimeout(first); clearInterval(poll); };
  }, [kb.height, kb.top, scrollTo]);

  return { kb, onScroll, setOffset };
}
