// Runs ONLY after the Gmail send node returns successfully.
const report = $('Validate Matches and Prepare Digest').first().json;
const store = $getWorkflowStaticData('global');
if (!store.sentJobKeys) store.sentJobKeys = {};
const now = Date.now();
for (const [key, ts] of Object.entries(store.sentJobKeys)) {
  if (now - ts > 45 * 86400000) delete store.sentJobKeys[key];
}
for (const key of (report.newKeys || [])) store.sentJobKeys[key] = now;
return [{json:{status:'Digest sent; job keys recorded for published runs',count:(report.newKeys||[]).length}}];
