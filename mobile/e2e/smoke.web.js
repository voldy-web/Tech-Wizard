// Browser smoke test of the whole UI against the built-in mock data (no backend needed).
//   1. npm run web:mock            (keep it running, serves http://localhost:8081)
//   2. npm i -D playwright && npx playwright install chromium     (one-time)
//   3. npm run test:e2e
// Optional: CHROME_PATH=/path/to/chrome  APP_URL=http://localhost:8081
const { chromium } = require('playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message)); 
  const base = process.env.APP_URL || 'http://localhost:8081';
  const text = async (re) => p.getByText(re).locator('visible=true').first().waitFor({ timeout: 8000 });
  const step = async (name, fn) => { try { await fn(); console.log('ok  -', name); } catch (e) { await p.screenshot({ path: 'e2e-failure.png' }); console.log('URL', p.url(), JSON.stringify((await p.locator('body').innerText()).replace(/[^\x20-\x7E\n]/g,'').slice(0,300))); throw e; } };

  await step('dashboard shows seeded totals', async () => {
    await p.goto(base + '/', { waitUntil: 'networkidle' });
    await text('Valuation Summary'); await text(/118,930/); await text('East Legon Residential Complex');
  });
  for (const [route, marker] of [['/projects', 'New Project'], ['/claims', 'New Claim'], ['/approvals', /Awaiting payment/], ['/settings', /Company profile/]]) {
    await step(`tab ${route}`, async () => { await p.goto(base + route, { waitUntil: 'networkidle' }); await text(marker); });
  }
  await step('project form validation', async () => {
    await p.goto(base + '/project/edit', { waitUntil: 'networkidle' });
    await p.getByText('Create project').click();
    await text('Project name is required');
  });
  await step('create a project through the form', async () => {
    await p.getByPlaceholder('e.g. East Legon Residential Complex').fill('Airport Hills Villa');
    await p.getByPlaceholder('e.g. Mr. Kofi Osei').fill('Dr. Nana Mensah');
    await p.getByText('Create project').click();
    await text('Airport Hills Villa'); await text(/Create Week 1 Claim/);
  });
  await step('create claim, quick-add item, live total', async () => {
    await p.getByText(/Create Week 1 Claim/).click();
    await text('Quick-insert item');
    await p.getByText('Cement (50kg)').click();
    await text(/GH₵ 117\.70/);                               // 1 x 110 + 7%
    await p.locator('input[placeholder="0"]').first().fill('10');   // qty -> 10
    await text(/GH₵ 1,177\.00/);                             // 1100 + 77
  });
  await step('table view: add a lump-sum row and see the totals block', async () => {
    await p.getByText('Add lump sum').click();
    await p.getByPlaceholder('0.00').last().fill('900');
    await text(/2,140\.00/);                                 // (1100 + 900) x 1.07
    await text('Sub-Total'); await text('TOTAL');
    await p.getByText('Cards (drag to reorder)').click();       // switch to the card view for the next steps
  });
  await step('card view shows the same rows', async () => {
    await text(/LUMP SUM/);
    await p.getByText('Lump sum', { exact: true }).first().waitFor();
  });
  await step('mismatch warning on a measured row', async () => {
    await p.getByText('Enter amount').first().click();
    await p.getByPlaceholder('0.00').nth(1).fill('5000');
    await text('AUDIT ALERT');
    await text('AUTO-RECALC');
    await p.getByText('AUTO-RECALC').click();
    await p.getByText('AUDIT ALERT').waitFor({ state: 'detached', timeout: 5000 });
  });
  await step('autosave indicator', async () => { await text(/auto-saved/); });
  await step('certificate preview renders the same totals', async () => {
    await p.getByText('Preview', { exact: true }).click();
    await text('Certificate preview');
    const frame = p.frameLocator('iframe');
    await frame.getByRole('heading', { name: 'CERTIFICATE OF CLAIM' }).waitFor({ timeout: 8000 });
    await frame.getByText(/2,140\.00/).first().waitFor();
  });
  await step('back to editor keeps the data', async () => {
    await p.goBack();
    await text('VALUATION SUMMARY');
    await text(/GH₵ 2,140\.00/);
  });
  await step('approvals tab -> approval screen -> log final payment -> PAID', async () => {
    for (let i = 0; i < 5 && !(await p.getByText('Approvals', { exact: true }).last().isVisible()); i++) { await p.goBack(); await p.waitForTimeout(600); }
    await p.getByText('Approvals', { exact: true }).last().click(); await p.waitForTimeout(1200);
    await text(/Awaiting payment \(1\)/);
    await p.getByText(/Claim #001/).first().click();
    await text('Approval & payment');
    await text(/PARTIALLY PAID/);
    await text(/GH₵ 26,664\.50/);                            // balance due
    await p.getByText('Log payment', { exact: true }).click();
    await p.waitForFunction(() => ['TRANCHE 2 RECEIVED', 'Settled: 100.0%', 'GH₵ 0.00'].every((t) => document.body.innerText.includes(t)), null, { timeout: 8000 });
  });
  await step('approvals list refreshes after payment, dashboard reflects it', async () => {
    await p.mouse.click(26, 32); await p.waitForTimeout(1500);   // the app's own back arrow
    await p.waitForFunction(() => document.body.innerText.includes('All caught up'), null, { timeout: 8000 });
    await p.getByText('Dashboard', { exact: true }).last().click();
    await p.waitForFunction(() => document.body.innerText.includes('Valuation Summary') && document.body.innerText.includes('126,664'), null, { timeout: 8000 });
  });
  await b.close();
  if (errors.length) { console.log('PAGE ERRORS:', errors); process.exit(1); }
  console.log('ALL E2E STEPS PASSED, no page errors');
})().catch((e) => { console.error('E2E FAILED:', e.message.split('\n').slice(0,3).join(' / '), (e.stack.split('\n').find(l => l.includes('e2e.js')) || '')); process.exit(1); });
