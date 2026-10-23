import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const p = await b.newPage({ viewport: { width: Number(process.argv[3] ?? 1600), height: 900 } });
for (const pg of process.argv[2].split(',')) {
  await p.goto(`http://127.0.0.1:5173/#/${pg}`); await p.reload(); await p.waitForTimeout(1000);
  console.log(pg, await p.evaluate(() => `${document.documentElement.scrollWidth} / ${document.documentElement.clientWidth}`));
}
await b.close();
