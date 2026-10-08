import { toApiError } from '../src/api/client';

describe('friendly API errors', () => {
  test('no response = unreachable backend, with help text', () => {
    const e = toApiError(new Error('Network Error'));
    expect(e.isNetwork).toBe(true);
    expect(e.message).toMatch(/Can't reach the Tech Wizard server/);
    expect(e.message).toMatch(/same Wi-Fi/);
    expect(e.message).toMatch(/LAN IP/);
  });
  test('validation errors surface field messages', () => {
    const e = toApiError({ response: { status: 400, data: { fieldErrors: { name: 'must not be blank' } } } });
    expect(e.status).toBe(400);
    expect(e.message).toBe('must not be blank');
    expect(e.isNetwork).toBeUndefined();
  });
  test('server message is passed through', () => {
    expect(toApiError({ response: { status: 409, data: { message: 'locked' } } }).message).toBe('locked');
  });
  test('already-normalised errors are untouched', () => {
    const e = toApiError({ response: { status: 404, data: {} } });
    expect(toApiError(e)).toBe(e);
  });
});

describe('hosted backend errors', () => {
  test('401 explains the API key problem', () => {
    expect(toApiError({ response: { status: 401, data: {} } }).message).toMatch(/API key/);
  });
  test('network help mentions Render cold starts', () => {
    expect(toApiError(new Error('Network Error')).message).toMatch(/Render/);
  });
});
