// Simulates the phone's storage with an in-memory "file" and "restarts the app" by loading localApi afresh.
let mockDisk;

jest.mock('../src/api/storage', () => ({
  readData: jest.fn(async () => mockDisk.text),
  writeData: jest.fn(async (t) => { mockDisk.text = t; mockDisk.writes += 1; }),
  clearData: jest.fn(async () => { mockDisk.text = null; }),
}));

function startApp() {            // a fresh app launch: module state is new, only `mockDisk` survives
  let api;
  jest.isolateModules(() => { api = require('../src/api/localApi').localApi; });
  return api;
}

beforeEach(() => { mockDisk = { text: null, writes: 0 }; });

describe('offline: data survives closing and reopening the app', () => {
  test('first launch is empty and does not need any server', async () => {
    const api = startApp();
    expect((await api.dashboard()).projectCount).toBe(0);
    expect(await api.projects()).toEqual([]);
  });

  test('projects, claims, items and settings are still there after a restart', async () => {
    let api = startApp();
    const p = await api.createProject({ name: 'East Legon Residential', client: 'Mr Osei' });
    const c = await api.createClaim(p.id);
    await api.saveItems(c.id, [
      { type: 'LUMP_SUM', description: 'Labour', amount: '16050' },
      { type: 'MEASURED', description: 'Cement', qty: '450', unit: 'Bags', rate: '120' },
    ]);
    await api.saveSettings({ ...(await api.settings()), companyName: 'Addae & Co' });
    expect(mockDisk.writes).toBeGreaterThan(0);

    api = startApp();                                   // <- app closed and reopened
    const projects = await api.projects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('East Legon Residential');
    const claim = await api.claim(c.id);
    expect(claim.subTotal).toBe(70050);                 // 16,050 + 450 x 120
    expect(claim.items).toHaveLength(2);
    expect((await api.settings()).companyName).toBe('Addae & Co');
  });

  test('ids keep counting up after a restart (no clashes)', async () => {
    let api = startApp();
    const p = await api.createProject({ name: 'A' });
    api = startApp();
    const q = await api.createProject({ name: 'B' });
    expect(q.id).toBeGreaterThan(p.id);
  });

  test('week numbers and Balance B/F carry forward across restarts', async () => {
    let api = startApp();
    const p = await api.createProject({ name: 'Annex' });
    const c1 = await api.createClaim(p.id);
    await api.saveItems(c1.id, [{ type: 'LUMP_SUM', description: 'x', amount: '1000' }]);
    await api.setStatus(c1.id, { status: 'APPROVED', approvedBy: 'K', amountPaid: 400 });
    api = startApp();
    const c2 = await api.createClaim(p.id);
    expect(c2.weekNumber).toBe(2);
    expect(c2.balanceBroughtForward).toBe(670);         // 1,070 certified - 400 paid
  });

  test('a failed change is not saved', async () => {
    const api = startApp();
    const p = await api.createProject({ name: 'A' });
    const c = await api.createClaim(p.id);
    await api.setStatus(c.id, { status: 'APPROVED', approvedBy: 'K' });
    const before = mockDisk.writes;
    await expect(api.saveItems(c.id, [])).rejects.toMatchObject({ status: 409 });   // locked claim
    expect(mockDisk.writes).toBe(before);
  });

  test('a corrupted file does not crash the app', async () => {
    mockDisk.text = '{ this is not json';
    const api = startApp();
    expect(await api.projects()).toEqual([]);
  });

  test('an old/partial file is repaired, not rejected', async () => {
    mockDisk.text = JSON.stringify({ projects: [{ id: 1, name: 'Old', levyPercent: 7 }], claims: [], settings: { companyName: 'X' } });
    const api = startApp();
    expect((await api.projects())[0].name).toBe('Old');
    const s = await api.settings();
    expect(s.companyName).toBe('X');
    expect(s.units.length).toBeGreaterThan(0);          // defaults filled in
    expect(s.currency).toBe('GH₵');
  });
});

describe('offline: backup, restore, erase, sample data', () => {
  test('export then restore on a "new phone" brings everything back', async () => {
    const api = startApp();
    const p = await api.createProject({ name: 'Airport Hills Villa', client: 'Dr Mensah' });
    const c = await api.createClaim(p.id);
    await api.saveItems(c.id, [{ type: 'MEASURED', description: 'Stone', qty: '4', unit: 'Loads', rate: '4000' }]);
    const backup = await api.exportBackup();
    expect(JSON.parse(backup).app).toBe('tech-wizard');

    mockDisk = { text: null, writes: 0 };                   // brand-new phone
    const phone2 = startApp();
    expect(await phone2.projects()).toEqual([]);
    const result = await phone2.importBackup(backup);
    expect(result).toEqual({ projects: 1, claims: 1 });
    expect((await phone2.claim(c.id)).subTotal).toBe(16000);
    expect(mockDisk.text).toContain('Airport Hills Villa');  // and it was saved to the new phone's storage
  });

  test('restoring something that is not a backup is refused and changes nothing', async () => {
    const api = startApp();
    await api.createProject({ name: 'Keep me' });
    await expect(api.importBackup('hello')).rejects.toMatchObject({ status: 400 });
    await expect(api.importBackup('{"foo":1}')).rejects.toMatchObject({ status: 400 });
    expect(await api.projects()).toHaveLength(1);
  });

  test('erase all data empties the app and the file', async () => {
    const api = startApp();
    await api.createProject({ name: 'Gone soon' });
    await api.eraseAll();
    expect(await api.projects()).toEqual([]);
    expect(mockDisk.text).toBeNull();
    expect(await startApp().projects()).toEqual([]);     // still empty after a restart
  });

  test('sample data adds the example project and keeps your own company details', async () => {
    const api = startApp();
    await api.saveSettings({ ...(await api.settings()), companyName: 'My Real Company' });
    await api.loadSampleData();
    expect((await api.projects())[0].name).toBe('East Legon Residential Complex');
    expect((await api.settings()).companyName).toBe('My Real Company');
  });
});
