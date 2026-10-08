// Tiny pub/sub: any successful write (create/update/delete/…) announces "data changed",
// so every mounted list or dashboard can quietly refetch. Independent of navigation focus events.
const listeners = new Set();

export const onDataChanged = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const emitDataChanged = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
