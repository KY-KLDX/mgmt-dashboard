// Browser smoke test: role masking across pages and modals, and the governance close flow.
// Usage: start `npm run dev`, then `node scripts/smoke.mjs [baseUrl]`.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] ?? 'http://127.0.0.1:5173/';
const exe = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
let fails = 0;
const check = (name, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${d}`); if (!ok) fails++; };

await p.goto(BASE); await p.waitForTimeout(900);
// Collect investor names while in CEO view, from the Investors page (all tabs).
await p.getByRole('button', { name: 'Investors', exact: true }).first().click();
await p.waitForTimeout(400);
const grab = () => p.evaluate(() => [...document.querySelectorAll('tbody tr td:first-child span')].map((s) => s.childNodes[0]?.textContent?.trim()).filter((t) => t && !t.startsWith('INV-')));
const names = [...await grab()];
for (const t of ['Highest total deposited', 'Onboarding & exceptions']) { await p.getByRole('tab', { name: t }).click(); await p.waitForTimeout(150); names.push(...await grab()); }
await p.getByRole('tab', { name: 'Largest current subscriptions' }).click();
check('CEO View shows investor names', new Set(names).size > 40, `(${new Set(names).size})`);

await p.getByRole('radio', { name: 'Management View' }).click();
await p.waitForTimeout(300);
const leaks = async (where) => {
  const text = await p.evaluate(() => document.body.innerText);
  const found = names.filter((n) => text.includes(n));
  check(`No names visible: ${where}`, found.length === 0, found.slice(0, 3).join(', '));
};
for (const page of ['Executive Overview', 'Finance & Tranches', 'Investors', 'Issuers & Obligations', 'Technology & Cyber Risk', 'Governance & Actions']) {
  await p.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: new RegExp(page.replace('&', '&')) }).click();
  await p.waitForTimeout(300);
  await leaks(page);
}
// Investor rankings tabs, drawer, tranche drawer, search, export, notifications
await p.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /Investors/ }).click();
for (const t of ['Highest total deposited', 'Highest wallet balance', 'Onboarding & exceptions']) { await p.getByRole('tab', { name: t }).click(); await p.waitForTimeout(150); await leaks(`tab ${t}`); }
await p.locator('tbody tr').first().click(); await p.waitForTimeout(300); await leaks('investor drawer');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /Finance/ }).click(); await p.waitForTimeout(300);
await p.locator('tbody tr').first().click(); await p.waitForTimeout(300); await leaks('tranche drawer');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.keyboard.press('Control+k'); await p.waitForTimeout(200);
await p.keyboard.type(names[0].split(' ')[0]); await p.waitForTimeout(200);
await leaks('search by name');
const noRes = await p.evaluate(() => document.body.innerText.includes('No synthetic records match') || !document.body.innerText.includes('Investors\n'));
check('Name search returns no investor in Management View', noRes);
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.getByRole('button', { name: 'Export' }).click(); await p.getByText(/Record level/).click(); await p.waitForTimeout(200); await leaks('export preview');
await p.keyboard.press('Escape');
await p.getByRole('button', { name: /Notifications/ }).click(); await p.waitForTimeout(200); await leaks('notifications');
await p.keyboard.press('Escape');

// Governance: closing a critical overdue item drops the critical count.
await p.getByRole('radio', { name: 'CEO View' }).click();
await p.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /Executive Overview/ }).click(); await p.waitForTimeout(300);
const critBefore = Number(await p.locator('text=Critical items requiring action').locator('xpath=ancestor::button').locator('.font-display').innerText());
await p.getByRole('button', { name: /Open record: Internal audit/ }).click(); await p.waitForTimeout(300);
await p.locator('#g-stage').selectOption('Closed'); await p.waitForTimeout(150);
await p.getByRole('button', { name: 'Set to Closed' }).click(); await p.waitForTimeout(300);
const toast = await p.evaluate(() => document.body.innerText.includes('Status set to Closed'));
check('Toast shown after governance update', toast);
const hist = await p.evaluate(() => document.body.innerText.includes('Status changed from Internal Review to Closed'));
check('Activity history records change', hist);
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /Executive Overview/ }).click(); await p.waitForTimeout(300);
const critAfter = Number(await p.locator('text=Critical items requiring action').locator('xpath=ancestor::button').locator('.font-display').innerText());
check('Critical count drops after closing item', critAfter === critBefore - 1, `${critBefore} → ${critAfter}`);
check('No page errors', errors.length === 0, errors.join(' | '));
await b.close();
console.log(fails ? `\n${fails} failed` : '\nAll smoke checks passed');
process.exit(fails ? 1 : 0);
