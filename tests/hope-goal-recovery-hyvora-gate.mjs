import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import {createGoal,goalStatus} from '../functions/lib/hope-goal-executor.js';

class Statement{constructor(db,sql){this.db=db;this.sql=sql;this.args=[]}bind(...args){this.args=args;return this}_run(){const s=this.db.prepare(this.sql);s.bind(this.args);return s}async run(){const s=this._run();try{while(s.step()){}return{meta:{changes:this.db.getRowsModified(),last_row_id:Number(this.db.exec('select last_insert_rowid() id')[0]?.values?.[0]?.[0]||0)}}}finally{s.free()}}async first(){const s=this._run();try{return s.step()?s.getAsObject():null}finally{s.free()}}async all(){const s=this._run(),results=[];try{while(s.step())results.push(s.getAsObject());return{results}}finally{s.free()}}}
class D1{constructor(db){this.db=db}prepare(sql){return new Statement(this.db,sql)}async batch(items){return Promise.all(items.map(x=>x.run()))}}

const SQL=await initSqlJs(),env={DB:new D1(new SQL.Database())},user={id:'user-a',plan:'free'};
const first=await createGoal(env,{user,objective:'create marketing campaign called "Launch Week" for awareness on instagram youtube',capabilities:['hyvora'],requestKey:'req-hyvora-1'});
assert.equal(first.stepCount,1);
assert.equal(first.steps[0].action,'hyvora_campaign_create');
assert.equal(first.steps[0].requiresConfirmation,false,'internal HYVORA draft creation must not masquerade as external publishing');
assert.equal(first.steps[0].status,'planned');
const duplicate=await createGoal(env,{user,objective:'create marketing campaign called "Launch Week" for awareness on instagram youtube',capabilities:['hyvora'],requestKey:'req-hyvora-1'});
assert.equal(duplicate.id,first.id,'same user request key must return the existing goal');
assert.equal((await goalStatus(env,first.id,user.id)).id,first.id);

const executor=fs.readFileSync('functions/lib/hope-goal-executor.js','utf8');
const agent=fs.readFileSync('functions/lib/hope4-agent.js','utf8');
const tools=fs.readFileSync('functions/lib/hope4-executor.js','utf8');
const hyvora=fs.readFileSync('functions/lib/hyvora-marketing.js','utf8');
const api=fs.readFileSync('functions/api/user/hope/goals.js','utf8');
const ui=fs.readFileSync('Public/hope-goals.html','utf8');
const campaignApi=fs.readFileSync('functions/api/marketing/campaigns.js','utf8');

for(const re of [/user_hope_goal_effects/,/idempotency_key/,/uncertain/,/needs_review/,/retry_authorized/,/ready_to_resume/,/maxSteps/,/resolveGoalStepReview/,/cancelGoal/])assert.match(executor,re);
assert.match(executor,/prior\?\.status==='completed'/,'completed side effects must be reused rather than repeated');
assert.match(executor,/\['running','uncertain'\]/,'ambiguous writes must pause instead of retrying automatically');
assert.match(agent,/hyvora_campaign_create/);assert.match(agent,/hyvora_campaign_list/);assert.match(agent,/hyvora_metrics_read/);
assert.match(tools,/connector:'internal'.*capability:'hyvora'/s);assert.match(tools,/createHyvoraCampaign/);assert.match(tools,/readHyvoraMetrics/);
assert.match(hyvora,/status:'draft'/);assert.match(hyvora,/before_publish/);assert.match(hyvora,/Publishing remains approval-gated|Publishing remains approval-gated until a platform connection is verified/);
assert.match(campaignApi,/createHyvoraCampaign/,'marketing API and HOPE goals must share the canonical HYVORA service');
assert.match(api,/Idempotency-Key/);assert.match(api,/op==='review'/);assert.match(api,/op==='cancel'/);assert.match(api,/maxSteps/);
assert.match(ui,/Ambiguous write failures are never silently retried/i);assert.match(ui,/Retry after checking/);assert.match(ui,/HYVORA/);assert.match(ui,/needs_review/);

console.log('PASS hope-goal-recovery-hyvora-gate: request idempotency, side-effect safety, resumability and HYVORA draft actions verified');
