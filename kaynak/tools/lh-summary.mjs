// Prints scores, metrics and failing audits from a Lighthouse JSON report.
// Usage: node tools/lh-summary.mjs <lighthouse.json>
import { readFileSync } from 'node:fs';

const lhr = JSON.parse(readFileSync(process.argv[2], 'utf8'));
console.log(Object.values(lhr.categories).map((c) => `${c.title}: ${Math.round(c.score * 100)}`).join(' | '));
for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']) {
  const a = lhr.audits[id];
  if (a) console.log(`${a.title}: ${a.displayValue}`);
}
console.log('--- failing / partial audits');
for (const a of Object.values(lhr.audits)) {
  if (a.score === null || a.score >= 0.9 || ['informative', 'notApplicable', 'manual'].includes(a.scoreDisplayMode)) continue;
  console.log(`[${a.score}] ${a.id} — ${a.title} ${a.displayValue || ''}`);
  for (const it of (a.details?.items || []).slice(0, 5)) {
    const what = it.url || it.source?.url || it.node?.snippet || it.reason || '';
    if (what) console.log(`   - ${String(what).slice(0, 130)}`);
  }
}
