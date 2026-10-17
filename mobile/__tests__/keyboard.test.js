import { scrollDeltaForField } from '../src/hooks/useKeyboard';

describe('keyboard: how far to scroll so the typed field is not covered', () => {
  test('a field hidden behind the keyboard moves up above it, with a margin', () => {
    // screen 800px tall, keyboard top at 500, field spans 560-610
    expect(scrollDeltaForField({ fieldBottom: 610, keyboardTop: 500, margin: 24 })).toBe(134);   // 610 - (500 - 24)
  });
  test('a field already above the keyboard does not move', () => {
    expect(scrollDeltaForField({ fieldBottom: 300, keyboardTop: 500 })).toBe(0);
  });
  test('a field just touching the keyboard still gets breathing room', () => {
    expect(scrollDeltaForField({ fieldBottom: 500, keyboardTop: 500, margin: 24 })).toBe(24);
  });
  test('bad measurements never scroll', () => {
    expect(scrollDeltaForField({ fieldBottom: NaN, keyboardTop: 500 })).toBe(0);
    expect(scrollDeltaForField({ fieldBottom: 500, keyboardTop: undefined })).toBe(0);
  });
});
