import { useWindowDimensions } from 'react-native';

/** Widest the content ever gets; on tablets / wide windows it stays a centred column instead of stretching. */
export const MAX_CONTENT = 720;

/** Screen size helpers so layouts adapt to small phones, big phones and tablets. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width, height,
    compact: width < 350,          // small phones (e.g. 320-wide)
    tablet: width >= 600,
    content: Math.min(width, MAX_CONTENT),
  };
}

/** Table column widths for a given table width (px): Description takes whatever is left. */
export function tableColumns(w) {
  if (!w || w >= 330) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    return { item: 32, qty: clamp(Math.round((w || 358) * 0.17), 60, 96), price: clamp(Math.round((w || 358) * 0.22), 78, 130), amount: clamp(Math.round((w || 358) * 0.23), 82, 130) };
  }
  return { item: 28, qty: 52, price: 66, amount: 72 };    // compact
}
