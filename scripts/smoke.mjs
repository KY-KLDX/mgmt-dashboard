// Browser smoke test: inline header search, period control, notifications and the governance update flow.
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
const nav = (name) => p.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name }).click();

await p.goto(BASE); await p.waitForTimeout(900);

// Pages render
for (const page of [/Finance/, /Investor Operations/, /Issuers/, /Technology/, /Governance/, /Executive Overview/]) {
  await nav(page); await p.waitForTimeout(250);
}
check('All six pages render', errors.length === 0);

// Inline search: no dialog opens; results drop down under the field
const box = p.getByRole('combobox', { name: /Search tranches/ });
await box.click();
check('Clicking search opens no dialog', (await p.locator('[role=dialog]').count()) === 0);
await box.fill('arus');
await p.waitForTimeout(150);
const opts = await p.getByRole('option').allInnerTexts();
check('Typing shows results under the field', opts.some((t) => t.includes('Arus Marine Note 2')), `(${opts.length} results)`);
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
const drawerTitle = await p.locator('[role=dialog] h2').first().innerText().catch(() => '');
check('Enter opens the first result', drawerTitle.length > 0, `(${drawerTitle})`);
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.keyboard.press('Control+k');
check('Ctrl+K focuses the search field', await box.evaluate((el) => el === document.activeElement));
await p.keyboard.press('Escape');

// Period control
await p.locator('#period').selectOption({ label: 'September 2026' }); await p.waitForTimeout(200);
check('Month pick sets dates', (await p.locator('#from').inputValue()) === '2026-09-01' && (await p.locator('#to').inputValue()) === '2026-09-30');
await p.locator('#from').fill('2026-09-10'); await p.waitForTimeout(200);
check('Editing a date makes a custom range', (await p.locator('#period').inputValue()) === 'CUSTOM');
await p.locator('#period').selectOption({ label: 'Year to date 2026' }); await p.waitForTimeout(200);
check('Year to date option', (await p.locator('#from').inputValue()) === '2026-01-01');
check('No demo settings button', (await p.getByRole('button', { name: /Demo settings/ }).count()) === 0);

// Investors page: activity feed and exceptions
await nav(/Investor Operations/); await p.waitForTimeout(300);
check('Investors page shows activity feed', await p.getByText('Recent investor activity').isVisible());
await p.getByRole('tab', { name: 'Profile updates' }).click(); await p.waitForTimeout(150);
check('Profile updates tab lists investor-type change', await p.evaluate(() => document.body.innerText.includes('Updated investor type')));
check('Account alerts card replaces Priority exceptions', await p.getByText('Account alerts').first().isVisible());
await p.getByRole('button', { name: /need manual review/ }).click(); await p.waitForTimeout(500);
const riskText = await p.locator('#investor-table').innerText();
check('Risk card "need review" filters the table to high-risk reviews', /High risk · awaiting review/.test(riskText) && /\b4 investors\b/.test(riskText), riskText.match(/\d+ investors/)?.[0] ?? '');
await p.getByRole('button', { name: /Recent bank-account change/ }).click(); await p.waitForTimeout(500);
const tableText = await p.locator('#investor-table').innerText();
check('Alert row filters the investor table', /Recent bank-account change/.test(tableText) && /\b2 investors\b/.test(tableText), tableText.match(/\d+ investors/)?.[0] ?? '');
check('Investor table shows IDs only', /INV-1001/.test(tableText) && !/INV-\d{4} · /.test(tableText));
const feedText = await p.locator('section', { hasText: 'Recent investor activity' }).first().innerText();
check('Activity feed shows ID and initials', /INV-\d{4} · [A-Z]{2,}/.test(feedText));
await p.locator('#investor-table').getByRole('button', { name: /Remove filter/ }).first().click(); await p.waitForTimeout(200);
check('Clearing the filter restores the full table', /\b36 investors\b/.test(await p.locator('#investor-table').innerText()));
await p.getByRole('button', { name: /View all activity/ }).click(); await p.waitForTimeout(300);
check('View all activity opens the full feed', (await p.locator('[role=dialog] h2').first().innerText()) === 'Investor activity');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);

// Overview subscription progress: hover shows detail, click goes to Investor Operations (no drawer)
await nav(/Executive Overview/); await p.waitForTimeout(400);
const ovRow = p.locator('[role=button][aria-label*="Open in Investor Operations"]').first();
const ovId = (await ovRow.getAttribute('aria-label')).split(' ')[0];
check('Overview progress shows verdicts, no recently closed', await p.evaluate(() => /Upcoming/i.test(document.body.innerText) && /At risk/.test(document.body.innerText) && /at close|on pace to fill/.test(document.body.innerText) && !/Recently closed/i.test(document.body.innerText)));
await ovRow.hover(); await p.waitForTimeout(200);
check('Hovering a tranche shows the detail card', await p.getByRole('tooltip').filter({ hasText: 'Investor Operations' }).isVisible());
await ovRow.click(); await p.waitForTimeout(700);
check('Clicking a tranche opens no drawer', (await p.locator('[role=dialog]').count()) === 0);
check('…and lands on Investor Operations with the row highlighted', await p.locator(`#sp-${ovId}`).evaluate((el) => el.className.includes('bg-accent-soft')), ovId);
check('Allocation & minting tracker renders', await p.evaluate(() => /Allocation & minting/i.test(document.body.innerText) && /Release funds/i.test(document.body.innerText)));

// Phone: Overview progress fits without sideways scrolling
{
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE); await m.waitForTimeout(900);
  check('Phone: no sideways overflow on Overview', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const fits = await m.locator('[role=button][aria-label*="Open in Investor Operations"]').evaluateAll((els) => els.every((el) => { const r = el.getBoundingClientRect(); const c = el.closest('section').getBoundingClientRect(); return r.left >= c.left - 1 && r.right <= c.right + 1; }));
  check('Phone: every tranche block fully visible in its card', fits);
  await m.close();
}

// Finance: money view with redemptions, no operational risk filter
await nav(/Finance/); await p.waitForTimeout(400);
const finText = await p.evaluate(() => document.body.innerText);
check('Finance shows Redemptions & payments with the shortfall', /Redemptions & payments/.test(finText) && /Shortfall RM\s?612,750/.test(finText));
check('Finance tranche table has no risk filter', (await p.locator('#tr-risk').count()) === 0);
check('Finance tranche table shows next payment due', /Next payment due/.test(finText));

// Notifications and governance close flow
const attention = async () => Number((await p.getByRole('button', { name: /Notifications:/ }).getAttribute('aria-label')).match(/\d+/)[0]);
await nav(/Executive Overview/); await p.waitForTimeout(300);
const before = await attention();
await p.getByRole('button', { name: /Open record: Internal audit/ }).click(); await p.waitForTimeout(300);
await p.getByRole('button', { name: 'Update', exact: true }).click(); await p.waitForTimeout(150);
await p.locator('#g-stage').selectOption('Closed'); await p.waitForTimeout(150);
await p.getByRole('button', { name: 'Set to Closed' }).click(); await p.waitForTimeout(300);
check('Toast shown after governance update', await p.evaluate(() => document.body.innerText.includes('Status set to Closed')));
await p.locator('summary', { hasText: 'Activity' }).click(); await p.waitForTimeout(150);
check('Activity history records change', await p.evaluate(() => document.body.innerText.includes('Status changed from Internal Review to Closed')));
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
check('Attention count drops after closing item', (await attention()) === before - 1, `${before} → ${await attention()}`);
await p.getByRole('button', { name: /Notifications:/ }).click(); await p.waitForTimeout(200);
check('Notifications panel groups items', await p.evaluate(() => /OVERDUE/i.test(document.body.innerText) && /THIS WEEK/i.test(document.body.innerText)));
check('No page errors', errors.length === 0, errors.join(' | '));
await b.close();
console.log(fails ? `\n${fails} failed` : '\nAll smoke checks passed');
process.exit(fails ? 1 : 0);
