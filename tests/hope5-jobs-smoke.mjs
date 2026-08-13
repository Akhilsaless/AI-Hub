import assert from 'node:assert/strict';
import {buildJob,jobProgress,safeToAutoRun} from '../functions/lib/hope5-jobs.js';
import {applyStepPayload,cancelJob,normalizeJob} from '../functions/lib/hope5-runner.js';

const job=buildJob('Search my Gmail for invoice emails then create a calendar event called Review 2026-08-14T10:00:00Z 2026-08-14T10:30:00Z',['gmail','calendar']);
assert.equal(job.version,'HOPE 5.0');
assert.equal(job.steps.length,2,'multi-step objective should produce two actionable steps');
assert.equal(job.steps[0].action,'gmail_search');
assert.equal(job.steps[1].action,'calendar_create');
assert.equal(job.steps[0].confirmationRequired,false);
assert.equal(job.steps[1].confirmationRequired,true);
assert.equal(safeToAutoRun(job.steps[0]),true);
assert.equal(safeToAutoRun(job.steps[1]),false);
assert.deepEqual(jobProgress(job),{total:2,done:0,failed:0,percent:0,complete:false});

let mutable=normalizeJob(job);mutable.steps[0].status='completed';
assert.equal(jobProgress(mutable).percent,50);
mutable=applyStepPayload(mutable,'step_2',{description:'Prepared by HOPE'});
assert.equal(mutable.steps[1].payload.description,'Prepared by HOPE');
mutable=cancelJob(mutable);
assert.equal(mutable.status,'cancelled');
assert.equal(mutable.steps[1].status,'cancelled');
assert.ok(mutable.events.some(x=>x.type==='job_cancelled'));

const incomplete=buildJob('Send an email then read my GitHub repository Akhilsaless/AI-Hub',['gmail','repos']);
assert.ok(incomplete.steps[0].missingFields.length>0,'incomplete write action must block for missing input');
assert.equal(incomplete.steps[1].action,'github_read');

console.log('PASS hope5-jobs-smoke: planning, progress, safety gates, payload continuation and cancellation verified');
