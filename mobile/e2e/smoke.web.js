// Browser smoke test of the whole UI in offline mode (no backend needed; data is kept in the browser's storage).
//   1. npm run web:local           (keep it running, serves http://localhost:8081)
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

  await step('first launch is empty (offline, no server)', async () => {
    await p.goto(base + '/', { waitUntil: 'networkidle' });
    await text('Start by adding your first project.');
  });
  await step('seed the sample project (dev hook)', async () => {
    await p.evaluate(() => window.__techwizardApi.loadSampleData());
    await p.goto(base + '/', { waitUntil: 'networkidle' });
    await text('Total claimed'); await text(/126,664/);
  });
  for (const [route, marker] of [['/projects', 'East Legon Residential Complex'], ['/claims', 'New Claim'], ['/approvals', /Awaiting payment/], ['/settings', /Claim defaults/]]) {
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
  await step('data survives closing and reopening the app (page reload)', async () => {
    await p.reload({ waitUntil: 'networkidle' });
    await text('Airport Hills Villa'); await text(/Create Week 1 Claim/);
  });
  await step('create claim, add a row, live total', async () => {
    await p.getByText(/Create Week 1 Claim/).click();
    await p.getByText('Add row', { exact: true }).click();
    await p.getByPlaceholder('Description').first().fill('Cement (50kg)');
    await p.locator('input[placeholder="0"]').first().fill('10');   // qty
    await p.getByPlaceholder('0.00').first().fill('110');           // unit price
    await text(/GH₵ 1,177\.00/);                             // 1100 + 7%
  });
  await step('table view: add a lump-sum row and see the totals block', async () => {
    await p.getByText('Add lump sum').click();
    await p.getByPlaceholder('0.00').last().fill('900');   // lump-sum Amount
    await text(/2,140\.00/);                                 // (1100 + 900) x 1.07
    await text('Sub-Total'); await text('TOTAL'); await text(/\(Markup\)/);
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
    await text('GRAND TOTAL');
    await text(/GH₵ 2,140\.00/);
  });
  await step('claim, items and totals are saved offline too (reload while editing)', async () => {
    await p.waitForTimeout(2200);                                 // let autosave finish
    await p.reload({ waitUntil: 'networkidle' });
    await text(/GH₵ 2,140\.00/);
  });
  await step('settings autosave (no save button) survives reload', async () => {
    await p.goto(base + '/settings', { waitUntil: 'networkidle' });
    if (await p.getByText('Save settings').count()) throw new Error('Save settings button should be gone');
    if (await p.getByText(/Data & backup|COMPANY LOGO|SIGNATURE/).count()) throw new Error('removed sections still visible');
    const f = p.getByPlaceholder('Kwame Addae'); await f.fill('Ama Mensah'); await p.waitForTimeout(1600);
    await p.reload({ waitUntil: 'networkidle' });
    await text(/All changes saved/);
    const v = await p.getByPlaceholder('Kwame Addae').inputValue();
    if (v !== 'Ama Mensah') throw new Error('settings not autosaved: ' + v);
  });
  await step('approvals tab -> approval screen -> log final payment -> PAID', async () => {
    for (let i = 0; i < 5 && !(await p.getByText('Approvals', { exact: true }).last().isVisible()); i++) { await p.goBack(); await p.waitForTimeout(600); }
    await p.getByText('Approvals', { exact: true }).last().click(); await p.waitForTimeout(1200);
    await text(/Awaiting payment \(1\)/);
    await p.getByText('East Legon Residential Complex').first().click();
    await text('Approval & payment');
    await text(/PARTIALLY PAID/);
    await text(/GH₵ 26,664\.50/);                            // balance due
    // each payment keeps its own date, picked from the calendar
    await p.getByLabel('Date paid: choose date').click();
    await p.getByLabel('Previous month').click();
    await p.getByLabel(/^Pick 3 /).click();
    await p.getByText('Save payment', { exact: true }).click();
    await p.waitForFunction(() => ['PAYMENT 2', 'Still owed', 'GH₵ 0.00'].every((t) => document.body.innerText.includes(t)), null, { timeout: 8000 });
    const d = new Date(); const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    await text(new RegExp(`^3 ${M[(d.getMonth() + 11) % 12]} `));                 // the payment kept the date we picked
    await text(`${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`);            // and the form offers today's date for the next one
  });
  await step('approvals list refreshes after payment, dashboard reflects it', async () => {
    await p.mouse.click(26, 32); await p.waitForTimeout(1500);   // the app's own back arrow
    await p.waitForFunction(() => document.body.innerText.includes('All caught up'), null, { timeout: 8000 });
    await p.getByText('Home', { exact: true }).last().click();
    await p.waitForFunction(() => document.body.innerText.includes('Total claimed') && document.body.innerText.includes('126,664'), null, { timeout: 8000 });
  });
  await step('still-owed page lists unpaid and paid money', async () => {
    await p.goto(base + '/', { waitUntil: 'networkidle' });
    await p.getByText('Still owed', { exact: true }).first().click();
    await text('Payments & balance'); await text('Not paid yet');
    await p.getByText('Paid', { exact: true }).click();
    await text(/Includes GH₵ .* of old balance|Week 1/);
  });
  await step('Done sends a draft claim for approval', async () => {
    await p.goto(base + '/claims', { waitUntil: 'networkidle' });
    await p.getByText('Airport Hills Villa').first().click();
    await text('GRAND TOTAL');
    await p.getByText('Done', { exact: true }).click();
    await text(/Awaiting approval \(1\)/);
  });
  await b.close();
  if (errors.length) { console.log('PAGE ERRORS:', errors); process.exit(1); }
  console.log('ALL E2E STEPS PASSED, no page errors');
})().catch((e) => { console.error('E2E FAILED:', e.message.split('\n').slice(0,3).join(' / '), (e.stack.split('\n').find(l => l.includes('e2e.js')) || '')); process.exit(1); });
