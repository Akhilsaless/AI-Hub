import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const jobsApi=read('functions/api/user/hope/jobs.js');
const jobsUi=read('Public/hope-jobs.html');
const runner=read('functions/lib/hope5-runner.js');
const planner=read('functions/lib/hope5-jobs.js');
const redirects=read('Public/_redirects');

assert.match(jobsApi,/requireUser/,'HOPE 5 jobs must require an authenticated user');
assert.match(jobsApi,/WHERE id=\? AND user_id=\?/,'job reads must be user scoped');
assert.match(jobsApi,/WHERE user_id=\?/,'job listings must be user scoped');
assert.match(jobsApi,/advanceJob\(/,'job API must invoke the resumable runner');
assert.match(jobsApi,/confirmStepId/,'job API must support confirmation continuation');
assert.match(jobsApi,/retryStepId/,'job API must support failed-step retry');
assert.match(jobsApi,/applyStepPayload/,'job API must support missing-input continuation');
assert.match(jobsApi,/cancelJob/,'job API must support cancellation');
assert.match(planner,/slice\(0,8\)/,'planner must cap job fan-out');
assert.match(runner,/confirmationRequired/,'runner must enforce write confirmation');
assert.match(runner,/capabilities\.includes/,'runner must enforce connector capability access');
assert.match(runner,/missingFields/,'runner must block incomplete actions');
assert.match(runner,/step_failed/,'runner must retain failure activity');
assert.match(jobsUi,/\/api\/user\/hope\/jobs/,'job UI must use authenticated HOPE 5 API');
assert.match(jobsUi,/Confirm & continue/,'job UI must expose approval continuation');
assert.match(jobsUi,/Retry failed step/,'job UI must expose retry');
assert.match(jobsUi,/Cancel/,'job UI must expose cancellation');
assert.match(jobsUi,/Connect/,'job UI must expose connector recovery');
assert.match(redirects,/\/hope/,'HOPE route must remain defined');

console.log('PASS hope5-production-gate: tenancy, safety gates, resume/retry/cancel and job UI structurally verified');
