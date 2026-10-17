import { localApi as api, resetLocal } from '../src/api/localApi';

beforeEach(() => resetLocal({ demo: false }));

const ITEMS = [
  { type: 'LUMP_SUM', description: 'General Labour', amount: '16050' },
  { type: 'MEASURED', description: 'Cement', qty: '450', unit: 'Bags', rate: '120.00' },
  { type: 'MEASURED', description: 'Sand', qty: '1', unit: 'Load', rate: '3000' },
  { type: 'MEASURED', description: 'Dust', qty: '1', unit: 'Load', rate: '5600' },
  { type: 'MEASURED', description: 'Stone', qty: '4', unit: 'Loads', rate: '4000' },
  { type: 'LUMP_SUM', description: 'Electricals', amount: '7000' },
  { type: 'LUMP_SUM', description: 'Plumbing', amount: '1500' },
  { type: 'LUMP_SUM', description: 'Steel Labour', amount: '8000' },
];

async function setup() {
  const p = await api.createProject({ name: 'East Legon Residential', client: 'Mr Osei' });
  const c = await api.createClaim(p.id);
  return { p, c };
}

describe('mock API behaves like the backend', () => {
  test('reference case totals', async () => {
    const { c } = await setup();
    await api.updateClaim(c.id, { levyPercent: 7, balanceBroughtForward: 7734 });
    const r = await api.saveItems(c.id, ITEMS);
    expect([r.subTotal, r.levy, r.total, r.grandTotal]).toEqual([111150, 7780.5, 118930.5, 126664.5]);
  });

  test('new claim: week auto-increments, reference built from project initials', async () => {
    const { p, c } = await setup();
    expect(c.weekNumber).toBe(1);
    expect(c.reference).toBe('TW-ELR-001');
    expect((await api.createClaim(p.id)).weekNumber).toBe(2);
  });

  test('measured amount ignores typed amount but flags the mismatch', async () => {
    const { c } = await setup();
    const r = await api.saveItems(c.id, [{ type: 'MEASURED', description: 'Pump', qty: '2', unit: 'Days', rate: '1500', enteredAmount: '3800' }]);
    expect(r.subTotal).toBe(3000);
    expect(r.items[0].amountMismatch).toBe(true);
    expect(r.items[0].enteredAmount).toBe(3800);
  });

  test('approve + partial payment, B/F carries into the next claim, then PAID automatically', async () => {
    const { p, c } = await setup();
    await api.updateClaim(c.id, { levyPercent: 7, balanceBroughtForward: 7734 });
    await api.saveItems(c.id, ITEMS);
    await api.setStatus(c.id, { status: 'SUBMITTED' });
    const a = await api.setStatus(c.id, { status: 'APPROVED', approvedBy: 'Kofi', amountPaid: 100000 });
    expect(a.status).toBe('APPROVED');
    expect(a.outstanding).toBe(26664.5);
    expect((await api.createClaim(p.id)).balanceBroughtForward).toBe(26664.5);
    const settled = await api.addPayment(c.id, { amount: 26664.5 });
    expect(settled.status).toBe('PAID');
    expect(settled.outstanding).toBe(0);
  });

  test('approved claims are locked until reopened', async () => {
    const { c } = await setup();
    await api.setStatus(c.id, { status: 'APPROVED', approvedBy: 'Kofi' });
    await expect(api.saveItems(c.id, ITEMS)).rejects.toMatchObject({ status: 409 });
    await api.setStatus(c.id, { status: 'DRAFT' });
    await expect(api.saveItems(c.id, ITEMS)).resolves.toBeTruthy();
  });

  test('payments need an approved claim; removing one reopens a PAID claim', async () => {
    const { c } = await setup();
    await api.saveItems(c.id, [{ type: 'LUMP_SUM', description: 'x', amount: '1000' }]);
    await expect(api.addPayment(c.id, { amount: 10 })).rejects.toMatchObject({ status: 409 });
    const paid = await api.setStatus(c.id, { status: 'PAID', approvedBy: 'Kofi' });
    expect(paid.status).toBe('PAID');
    const back = await api.removePayment(c.id, paid.payments[0].id);
    expect(back.status).toBe('APPROVED');
    expect(back.amountPaid).toBe(0);
  });

  test('duplicate copies items into the next week as a draft', async () => {
    const { c } = await setup();
    await api.saveItems(c.id, ITEMS);
    const d = await api.duplicateClaim(c.id);
    expect(d.weekNumber).toBe(2);
    expect(d.status).toBe('DRAFT');
    expect(d.items).toHaveLength(8);
  });

  test('dashboard totals: claimed / approved / paid / outstanding', async () => {
    const { c } = await setup();
    await api.saveItems(c.id, [{ type: 'LUMP_SUM', description: 'x', amount: '1000' }]);
    await api.setStatus(c.id, { status: 'APPROVED', approvedBy: 'K', amountPaid: 400 });
    const d = await api.dashboard();
    expect([d.claimed, d.approved, d.paid, d.outstanding]).toEqual([1070, 1070, 400, 670]);
  });

  test('validation and not-found errors', async () => {
    await expect(api.createProject({ name: ' ' })).rejects.toMatchObject({ status: 400 });
    await expect(api.claim(99999)).rejects.toMatchObject({ status: 404 });
  });

  test('settings round trip', async () => {
    const s = await api.settings();
    await api.saveSettings({ ...s, companyName: 'ACME' });
    expect((await api.settings()).companyName).toBe('ACME');
  });
});

describe('paying old money (Balance B/F)', () => {
  test('payment on the next claim clears the old balance and counts as paid, never negative', async () => {
    const { localApi, resetLocal } = require('../src/api/localApi');
    await resetLocal({ demo: false });
    const p = await localApi.createProject({ name: 'Ledger Test', client: 'X', levyPercent: 0 });
    const c1 = await localApi.createClaim(p.id);
    await localApi.saveItems(c1.id, [{ type: 'LUMP_SUM', description: 'Work', amount: '100' }]);
    await localApi.setStatus(c1.id, { status: 'APPROVED', approvedBy: 'A' });
    await localApi.addPayment(c1.id, { amount: '60' });                       // 40 left unpaid
    const c2 = await localApi.createClaim(p.id);
    expect(Number(c2.balanceBroughtForward)).toBe(40);                         // old money carried forward
    await localApi.saveItems(c2.id, [{ type: 'LUMP_SUM', description: 'More', amount: '50' }]);
    await localApi.setStatus(c2.id, { status: 'APPROVED', approvedBy: 'A' });
    expect(Number((await localApi.dashboard()).outstanding)).toBe(90);         // 40 old + 50 new
    await localApi.addPayment(c2.id, { amount: '90' });
    const d = await localApi.dashboard();
    expect(Number(d.outstanding)).toBe(0);
    expect(Number(d.paid)).toBe(150);
    expect(Number(d.claimed)).toBe(150);
    const first = await localApi.claim(c1.id);
    expect(Number(first.outstanding)).toBe(0);                                 // old money no longer "still owed"
    expect(first.status).toBe('PAID');
    expect(Number(first.settledLater)).toBe(40);
  });
});
