// In-memory fake of the backend, used when EXPO_PUBLIC_USE_MOCK=true.
// Lets you run and test the whole UI without Java. Same method names and response shapes as client.js.
// Data resets whenever the app reloads. Calculations reuse src/lib/calc.js (the same rules as the server).
import { computeTotals, measuredAmount, toPesewas } from '../lib/calc';
import { todayIso } from '../lib/format';

const DELAY_MS = 120;
const wait = (v) => new Promise((r) => setTimeout(() => r(JSON.parse(JSON.stringify(v ?? null))), DELAY_MS));
const fail = (status, message) => { const e = new Error(message); e.isApiError = true; e.status = status; return e; };
const num = (p) => p / 100;

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
};

let seq = 100;
const nextId = () => ++seq;

const initials = (name) => {
  const s = (name || '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  return s || 'PRJ';
};

function freshState() {
  return {
    settings: {
      companyName: '', tin: '', address: '', phone: '', email: '', bankDetails: '', logoUrl: null, signatureUrl: null,
      preparerName: '', preparerTitle: '', defaultLevyPercent: 7, currency: 'GH₵', autoBalanceForward: true,
      units: ['Item', 'Bags', 'Loads', 'm³', 'm²', 'm', 'Tons', 'Days', 'No.', 'Lot'],
      commonItems: [
        { description: 'General Labour', unit: 'Days', defaultRate: 80, note: 'Daily site crew unit' },
        { description: 'Cement (50kg)', unit: 'Bags', defaultRate: 110, note: 'Grade 42.5R' },
        { description: 'Sand', unit: 'Loads', defaultRate: 3000, note: 'Double-axle tipper' },
        { description: 'Stone (20mm)', unit: 'Loads', defaultRate: 4000, note: 'Quarry washed' },
      ],
    },
    projects: [], claims: [],
  };
}
let db = freshState();

/** Test helper / reset button. */
export function resetMock({ demo = true } = {}) {
  db = freshState();
  seq = 100;
  if (demo) seed();
}

const totalsOf = (c) => computeTotals(
  c.items.map((i) => ({ type: i.type, qty: i.qty, rate: i.rate, amount: i.amount })), c.levyPercent, c.balanceBroughtForward);

function view(c, withItems) {
  const p = db.projects.find((x) => x.id === c.projectId);
  const t = totalsOf(c);
  const paid = toPesewas(c.amountPaid);
  const out = {
    id: c.id, projectId: c.projectId, projectName: p.name, client: p.client, scopeOfWork: p.scopeOfWork, location: p.location,
    reference: `TW-${initials(p.name)}-${String(c.weekNumber).padStart(3, '0')}`,
    weekNumber: c.weekNumber, periodFrom: c.periodFrom, periodTo: c.periodTo, preparedBy: c.preparedBy, datePrepared: c.datePrepared,
    status: c.status, levyPercent: c.levyPercent, balanceBroughtForward: c.balanceBroughtForward,
    approvedBy: c.approvedBy, approvedDate: c.approvedDate, amountPaid: c.amountPaid, paymentDate: c.paymentDate,
    paymentReference: c.paymentReference, notes: c.notes,
    subTotal: num(t.subTotal), levy: num(t.levy), total: num(t.total), grandTotal: num(t.grandTotal), outstanding: num(t.grandTotal - paid),
    items: null, payments: null,
  };
  if (withItems) {
    out.items = c.items.map((i, idx) => ({ ...i, sortOrder: idx, amountMismatch: i.enteredAmount != null }));
    out.payments = c.payments;
  }
  return out;
}

function projectView(p) {
  const cs = db.claims.filter((c) => c.projectId === p.id).sort((a, b) => b.weekNumber - a.weekNumber);
  let claimed = 0; let paid = 0;
  cs.forEach((c) => { if (c.status !== 'DRAFT') claimed += totalsOf(c).total; paid += toPesewas(c.amountPaid); });
  const latest = cs.find((c) => c.status !== 'DRAFT');
  const outstanding = latest ? totalsOf(latest).grandTotal - toPesewas(latest.amountPaid) : 0;
  return { ...p, claimCount: cs.length, totalClaimed: num(claimed), totalPaid: num(paid), outstanding: num(outstanding) };
}

const find = (id) => {
  const c = db.claims.find((x) => x.id === Number(id));
  if (!c) throw fail(404, `Claim ${id} not found`);
  return c;
};
const editable = (c) => {
  if (c.status === 'APPROVED' || c.status === 'PAID') throw fail(409, 'An approved or paid claim is locked. Move it back to DRAFT to edit.');
  return c;
};
const carry = (projectId) => {
  const last = db.claims.filter((c) => c.projectId === projectId).sort((a, b) => b.weekNumber - a.weekNumber)[0];
  if (!last || !db.settings.autoBalanceForward) return { last, bf: 0 };
  return { last, bf: Math.max(0, num(totalsOf(last).grandTotal - toPesewas(last.amountPaid))) };
};
const syncPaid = (c) => {
  const grand = totalsOf(c).grandTotal;
  if (c.status === 'APPROVED' && grand > 0 && toPesewas(c.amountPaid) >= grand) c.status = 'PAID';
};
const recomputePaid = (c) => {
  c.amountPaid = num(c.payments.reduce((s, p) => s + toPesewas(p.amount), 0));
  const last = c.payments[c.payments.length - 1];
  c.paymentDate = last ? last.paymentDate : null;
  c.paymentReference = last ? last.reference : null;
};
const pay = (c, amount, date, reference, note) => {
  c.payments.push({ id: nextId(), amount: num(toPesewas(amount)), paymentDate: date || todayIso(), reference: reference || '', note: note || '' });
  recomputePaid(c);
};

function newClaim(projectId, from) {
  const p = db.projects.find((x) => x.id === Number(projectId));
  if (!p) throw fail(404, `Project ${projectId} not found`);
  const { last, bf } = carry(p.id);
  const week = db.claims.filter((c) => c.projectId === p.id).reduce((m, c) => Math.max(m, c.weekNumber), 0) + 1;
  const start = last?.periodTo ? addDays(last.periodTo, 1) : todayIso();
  const c = {
    id: nextId(), projectId: p.id, weekNumber: week, periodFrom: start, periodTo: addDays(start, 6), datePrepared: todayIso(),
    preparedBy: from?.preparedBy ?? db.settings.preparerName, status: 'DRAFT',
    levyPercent: from?.levyPercent ?? p.levyPercent ?? db.settings.defaultLevyPercent, balanceBroughtForward: bf,
    approvedBy: null, approvedDate: null, amountPaid: 0, paymentDate: null, paymentReference: null, notes: from?.notes ?? '',
    items: (from?.items || []).map((i) => ({ ...i, id: nextId() })), payments: [],
  };
  db.claims.push(c);
  return c;
}

export const mockApi = {
  health: async () => wait({ status: 'UP' }),

  dashboard: async () => {
    let claimed = 0; let approved = 0; let paid = 0; let submitted = 0;
    db.claims.forEach((c) => {
      const t = totalsOf(c).total;
      paid += toPesewas(c.amountPaid);
      if (c.status !== 'DRAFT') { claimed += t; submitted += 1; }
      if (c.status === 'APPROVED' || c.status === 'PAID') approved += t;
    });
    return wait({
      claimed: num(claimed), approved: num(approved), paid: num(paid), outstanding: num(claimed - paid),
      claimCount: db.claims.length, submittedCount: submitted, projectCount: db.projects.length,
      projects: db.projects.map(projectView).reverse(),
      recentClaims: [...db.claims].sort((a, b) => b.id - a.id).slice(0, 5).map((c) => view(c, false)),
    });
  },

  projects: async () => wait(db.projects.map(projectView).reverse()),
  project: async (id) => {
    const p = db.projects.find((x) => x.id === Number(id));
    if (!p) throw fail(404, `Project ${id} not found`);
    return wait(projectView(p));
  },
  createProject: async (b) => {
    if (!b.name || !b.name.trim()) throw fail(400, 'name: must not be blank');
    const p = { id: nextId(), createdAt: new Date().toISOString(), ...b, levyPercent: b.levyPercent ?? db.settings.defaultLevyPercent };
    db.projects.push(p);
    return wait(projectView(p));
  },
  updateProject: async (id, b) => {
    const p = db.projects.find((x) => x.id === Number(id));
    if (!p) throw fail(404, `Project ${id} not found`);
    Object.assign(p, b);
    return wait(projectView(p));
  },
  deleteProject: async (id) => {
    db.projects = db.projects.filter((p) => p.id !== Number(id));
    db.claims = db.claims.filter((c) => c.projectId !== Number(id));
    return wait(null);
  },
  projectClaims: async (id) => wait(db.claims.filter((c) => c.projectId === Number(id)).sort((a, b) => b.weekNumber - a.weekNumber).map((c) => view(c, false))),
  createClaim: async (projectId) => wait(view(newClaim(projectId), true)),

  claims: async (statuses) => wait([...db.claims].sort((a, b) => b.id - a.id)
    .filter((c) => !statuses || statuses.includes(c.status)).map((c) => view(c, false))),
  claim: async (id) => wait(view(find(id), true)),
  updateClaim: async (id, b) => {
    const c = editable(find(id));
    if (b.periodFrom && b.periodTo && b.periodTo < b.periodFrom) throw fail(400, 'periodTo must not be before periodFrom');
    if (b.weekNumber != null) c.weekNumber = b.weekNumber;
    ['periodFrom', 'periodTo', 'preparedBy', 'datePrepared', 'notes'].forEach((k) => { if (b[k] !== undefined) c[k] = b[k]; });
    if (b.levyPercent != null) c.levyPercent = b.levyPercent;
    if (b.balanceBroughtForward != null) c.balanceBroughtForward = num(toPesewas(b.balanceBroughtForward));
    return wait(view(c, true));
  },
  deleteClaim: async (id) => {
    const c = find(id);
    if (c.status === 'PAID') throw fail(409, 'A paid claim cannot be deleted.');
    db.claims = db.claims.filter((x) => x.id !== c.id);
    return wait(null);
  },
  saveItems: async (id, items) => {
    const c = editable(find(id));
    c.items = items.map((d) => {
      if (d.type === 'LUMP_SUM') {
        return { id: nextId(), type: 'LUMP_SUM', description: d.description, qty: 1, unit: 'Item', rate: null, amount: num(toPesewas(d.amount)), enteredAmount: null, remarks: d.remarks };
      }
      const calc = measuredAmount({ qty: d.qty, rate: d.rate });
      const entered = d.enteredAmount ?? d.amount;
      return {
        id: nextId(), type: 'MEASURED', description: d.description, qty: Number(d.qty) || 0, unit: d.unit, rate: num(toPesewas(d.rate)),
        amount: num(calc), enteredAmount: entered != null && entered !== '' && toPesewas(entered) !== calc ? num(toPesewas(entered)) : null, remarks: d.remarks,
      };
    });
    return wait(view(c, true));
  },
  duplicateClaim: async (id) => wait(view(newClaim(find(id).projectId, find(id)), true)),
  setStatus: async (id, b) => {
    const c = find(id);
    c.status = b.status;
    if (b.status === 'APPROVED' || b.status === 'PAID') {
      if (b.approvedBy) c.approvedBy = b.approvedBy;
      if (b.approvedDate) c.approvedDate = b.approvedDate;
      if (!c.approvedDate) c.approvedDate = todayIso();
      const grand = totalsOf(c).grandTotal;
      const paid = toPesewas(c.amountPaid);
      const target = b.amountPaid != null ? toPesewas(b.amountPaid) : (b.status === 'PAID' ? grand : paid);
      if (target < paid) throw fail(400, 'amountPaid cannot be lower than what is already logged; remove a payment instead.');
      if (target > paid) pay(c, num(target - paid), b.paymentDate, b.paymentReference, b.paymentNote);
    } else { c.approvedBy = null; c.approvedDate = null; }
    syncPaid(c);
    return wait(view(c, true));
  },
  addPayment: async (id, b) => {
    const c = find(id);
    if (c.status !== 'APPROVED' && c.status !== 'PAID') throw fail(409, 'Payments can only be logged against an approved claim.');
    pay(c, b.amount, b.paymentDate, b.reference, b.note);
    syncPaid(c);
    return wait(view(c, true));
  },
  removePayment: async (id, paymentId) => {
    const c = find(id);
    c.payments = c.payments.filter((p) => p.id !== Number(paymentId));
    recomputePaid(c);
    if (c.status === 'PAID' && toPesewas(c.amountPaid) < totalsOf(c).grandTotal) c.status = 'APPROVED';
    return wait(view(c, true));
  },

  settings: async () => wait(db.settings),
  saveSettings: async (b) => { db.settings = { ...db.settings, ...b }; return wait(db.settings); },
};

function seed() {
  db.settings.companyName = 'Addae & Associates Engineering';
  db.settings.preparerName = 'Kwame Addae';
  db.settings.preparerTitle = 'Lead Quantity Surveyor';
  db.settings.address = 'Plot 14, Ring Road Central, Accra, Ghana';
  db.settings.tin = 'C00349281X';
  const p = { id: nextId(), name: 'East Legon Residential Complex', client: 'Mr. Kofi Osei',
    scopeOfWork: '4-Storey Reinforced Concrete Framing, Masonry and Structural Finishes',
    location: 'Plot 42, Ambassadorial Enclave, East Legon', levyPercent: 7, contractSum: 1250000, createdAt: new Date().toISOString() };
  db.projects.push(p);
  const c = newClaim(p.id);
  c.balanceBroughtForward = 7734;
  c.preparedBy = 'Kwame Addae';
  const L = (d, a) => ({ type: 'LUMP_SUM', description: d, amount: a });
  const M = (d, q, u, r) => ({ type: 'MEASURED', description: d, qty: q, unit: u, rate: r });
  c.items = [L('General Labour', 16050), M('Portland Cement (Grade 42.5R)', 450, 'Bags', 120), M('Sharp Sand', 1, 'Load', 3000),
    M('Quarry Dust', 1, 'Load', 5600), M('Stone (20mm)', 4, 'Loads', 4000), L('Electricals', 7000), L('Plumbing', 1500), L('Steel Labour', 8000)]
    .map((d) => (d.type === 'LUMP_SUM'
      ? { id: nextId(), type: 'LUMP_SUM', description: d.description, qty: 1, unit: 'Item', rate: null, amount: d.amount, enteredAmount: null, remarks: '' }
      : { id: nextId(), type: 'MEASURED', description: d.description, qty: d.qty, unit: d.unit, rate: d.rate, amount: num(measuredAmount(d)), enteredAmount: null, remarks: '' }));
  c.status = 'APPROVED'; c.approvedBy = 'Kofi Osei'; c.approvedDate = todayIso();
  pay(c, 100000, todayIso(), 'TXN-GH-992140', 'First instalment');
  newClaim(p.id);
}

seed();
