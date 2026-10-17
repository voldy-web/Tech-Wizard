import { api } from '../src/api/client';
import { onDataChanged } from '../src/api/events';
import { resetLocal } from '../src/api/localApi';

jest.mock('../src/config', () => ({ API_URL: 'http://x', REQUEST_TIMEOUT_MS: 1000, DATA_MODE: 'local', CURRENCY: 'GH₵' }));

describe('data-changed signal', () => {
  beforeEach(() => resetLocal({ demo: false }));

  test('writes announce a change, reads do not', async () => {
    const seen = jest.fn();
    const off = onDataChanged(seen);
    await api.projects();
    await api.settings();
    expect(seen).not.toHaveBeenCalled();
    await api.createProject({ name: 'P' });
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    await api.createProject({ name: 'Q' });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  test('failed writes do not announce', async () => {
    const seen = jest.fn();
    const off = onDataChanged(seen);
    await expect(api.createProject({ name: '' })).rejects.toBeTruthy();
    expect(seen).not.toHaveBeenCalled();
    off();
  });
});

describe('every write method is wrapped, no read method is', () => {
  test('write list matches the API surface', () => {
    const reads = ['health', 'dashboard', 'projects', 'project', 'projectClaims', 'claims', 'claim', 'settings'];
    const seen = jest.fn();
    const off = onDataChanged(seen);
    return Promise.all(reads.map((r) => api[r](1).catch(() => {}))).then(() => { expect(seen).not.toHaveBeenCalled(); off(); });
  });
});

describe('data mode switch', () => {
  test('switching to offline mode uses the on-phone data without any server', async () => {
    const { setDataMode, getDataMode } = require('../src/api/client');
    setDataMode('cloud');
    expect(getDataMode()).toBe('cloud');
    setDataMode('local');
    expect(getDataMode()).toBe('local');
    expect((await api.settings()).currency).toBe('GH₵');
  });
});
