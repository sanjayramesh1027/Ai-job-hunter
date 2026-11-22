// n8n Code node: Run Once for All Items. No silent fabrication on API failure.
const source = $('Prepare Candidate and Alerts').first().json;
const response = $input.first()?.json || {};
const warnings = [...(source.warnings || [])];
if (response.error || (response.statusCode && response.statusCode >= 400))
  warnings.push('OpenAI request failed: ' + String(response.error?.message || response.message || response.statusCode).slice(0, 180));
let parsed = { jobs: [] };
try {
  const raw = response.choices?.[0]?.message?.content;
  if (!raw) { warnings.push('No structured AI response received.'); }
  else parsed = JSON.parse(String(raw).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/g, ''));
} catch (_) { warnings.push('AI response was invalid JSON. No jobs were accepted.'); }
const validUrls = new Set((source.alerts || []).flatMap(a => a.urls || []));
const jobs = [];
const seenThisRun = new Set();
const store = $getWorkflowStaticData('global');
const old = store.sentJobKeys || {};
const now = Date.now();
function str(s) { return String(s ?? '').replace(/[<>\x00-\x1f]/g, ' ').slice(0, 500); }
for (const x of (Array.isArray(parsed.jobs) ? parsed.jobs : [])) {
  if (!x || !x.company || !x.title || !x.url || !validUrls.has(x.url)) continue;
  const yrs = x.requiredYears;
  if (typeof yrs === 'number' && yrs > 1) continue;
  const key = (str(x.company) + '|' + str(x.title) + '|' + str(x.url)).toLowerCase();
  if (seenThisRun.has(key) || (old[key] && now - old[key] < 45 * 86400000)) continue;
  seenThisRun.add(key);
  jobs.push({key,title:str(x.title),company:str(x.company),location:str(x.location),workMode:str(x.workMode),
    score:Math.max(0, Math.min(100, Math.round(Number(x.score)||0))),url:x.url,
    whyFit:str(x.whyFit),eligibilityNote:str(x.eligibilityNote),verificationNote:str(x.verificationNote),
    gaps:(Array.isArray(x.gaps)?x.gaps:[]).slice(0,4).map(str),
    resumeSuggestions:(Array.isArray(x.resumeSuggestions)?x.resumeSuggestions:[]).slice(0,3).map(str)});
}
jobs.sort((a,b) => b.score - a.score);
const lines = ['AI Job Hunter | CALIFORNIA',
  `Source emails: ${(source.alerts||[]).length} | New, not previously emailed matches: ${jobs.length}`,
  'Scores are estimated resume fit, not hiring probabilities. Verify every job is open and check eligibility.', ''];
for (const [i,j] of jobs.entries()) {
  lines.push(`${i+1}. ${j.title} | ${j.company} | Fit ${j.score}/100`,
    `Location / mode: ${j.location} / ${j.workMode}`, `Job link: ${j.url}`,
    `Why it fits: ${j.whyFit}`, `Eligibility: ${j.eligibilityNote || 'Needs review'}`,
    `Posting status: ${j.verificationNote || 'Not independently verified'}`);
  if (j.gaps.length) lines.push('Check: ' + j.gaps.join('; '));
  if (j.resumeSuggestions.length) lines.push('Resume suggestions to review:\n- ' + j.resumeSuggestions.join('\n- '));
  lines.push('');
}
if (!jobs.length) lines.push('No new validated matches. Your alerts may have no qualifying listings or this run may need troubleshooting.');
if (warnings.length) lines.push('ISSUES / WARNINGS:\n- ' + warnings.join('\n- '));
return [{json:{recipient:source.recipient,subject:`AI Job Hunter | ${jobs.length} new matches${warnings.length?' | check warnings':''}`,
  message:lines.join('\n'),newKeys:jobs.map(j=>j.key),jobs,warnings}}];
