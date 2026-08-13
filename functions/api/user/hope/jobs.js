import {requireUser} from '../../../lib/user-auth.js';
import {userToolContext} from '../../../lib/user-tool-context.js';
import {buildJob,jobProgress} from '../../../lib/hope5-jobs.js';
import {advanceJob,applyStepPayload,cancelJob,normalizeJob} from '../../../lib/hope5-runner.js';

const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const now=()=>new Date().toISOString();

async function ensure(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,objective TEXT NOT NULL,status TEXT NOT NULL,job TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
}

async function load(env,userId,id){
  const row=await env.DB.prepare(`SELECT id,objective,status,job,created_at,updated_at FROM user_hope_jobs WHERE id=? AND user_id=?`).bind(id,userId).first();
  if(!row)return null;
  let job;try{job=JSON.parse(row.job)}catch{job={objective:row.objective,status:row.status,steps:[]}}
  return {...row,job};
}

async function save(env,userId,id,objective,job,createdAt=null){
  const t=now(),body=JSON.stringify(job).slice(0,250000);
  if(createdAt){
    await env.DB.prepare(`INSERT INTO user_hope_jobs(id,user_id,objective,status,job,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).bind(id,userId,objective,job.status,body,createdAt,t).run();
  }else{
    await env.DB.prepare(`UPDATE user_hope_jobs SET objective=?,status=?,job=?,updated_at=? WHERE id=? AND user_id=?`).bind(objective,job.status,body,t,id,userId).run();
  }
}

function expose(id,job){return {id,status:job.status,objective:job.objective,progress:jobProgress(job),block:job.block||null,summary:job.summary||null,steps:job.steps||[],events:(job.events||[]).slice(-40),createdAt:job.createdAt,updatedAt:job.updatedAt}}

export async function onRequestGet({request,env}){
  const a=await requireUser(request,env);if(a.response)return a.response;await ensure(env);
  const u=new URL(request.url),id=u.searchParams.get('id');
  if(id){const row=await load(env,a.user.id,id);if(!row)return json({ok:false,error:'job not found'},404);return json({ok:true,version:'HOPE 5.0',job:expose(row.id,row.job)})}
  const r=await env.DB.prepare(`SELECT id,objective,status,job,created_at,updated_at FROM user_hope_jobs WHERE user_id=? ORDER BY updated_at DESC LIMIT 30`).bind(a.user.id).all();
  const jobs=(r.results||[]).map(row=>{let job;try{job=JSON.parse(row.job)}catch{job={objective:row.objective,status:row.status,steps:[]}}return expose(row.id,job)});
  return json({ok:true,version:'HOPE 5.0',jobs});
}

export async function onRequestPost({request,env}){
  const a=await requireUser(request,env);if(a.response)return a.response;await ensure(env);
  const b=await request.json().catch(()=>({})),objective=String(b.objective||b.message||'').trim().slice(0,30000);
  if(!objective)return json({ok:false,error:'objective required'},400);
  const ctx=await userToolContext(request,env),id=crypto.randomUUID(),createdAt=now();
  let job=normalizeJob(buildJob(objective,ctx.capabilities));
  job.id=id;job.events.push({at:createdAt,type:'job_created',steps:job.steps.length});
  if(job.steps.length&&b.autoRun!==false){const r=await advanceJob(request,env,job,ctx.capabilities,{maxSteps:8});job=r.job}
  await save(env,a.user.id,id,objective,job,createdAt);
  return json({ok:true,version:'HOPE 5.0',connectedCapabilities:ctx.capabilities,job:expose(id,job)});
}

export async function onRequestPatch({request,env}){
  const a=await requireUser(request,env);if(a.response)return a.response;await ensure(env);
  const b=await request.json().catch(()=>({})),id=String(b.id||'');if(!id)return json({ok:false,error:'id required'},400);
  const row=await load(env,a.user.id,id);if(!row)return json({ok:false,error:'job not found'},404);
  let job=normalizeJob(row.job);
  if(b.retryStepId){const step=job.steps.find(x=>x.id===b.retryStepId);if(!step)return json({ok:false,error:'step not found'},404);step.status='pending';delete step.error;delete step.failedAt;job.status='running';delete job.block;job.events.push({at:now(),type:'step_retry_requested',stepId:step.id})}
  if(b.stepId&&b.payload)job=applyStepPayload(job,String(b.stepId),b.payload);
  const confirmed=[];if(b.confirmStepId)confirmed.push(String(b.confirmStepId));
  const ctx=await userToolContext(request,env),r=await advanceJob(request,env,job,ctx.capabilities,{confirmedStepIds:confirmed,maxSteps:8});job=r.job;
  await save(env,a.user.id,id,row.objective,job);
  return json({ok:true,version:'HOPE 5.0',connectedCapabilities:ctx.capabilities,executed:r.executed||0,job:expose(id,job)});
}

export async function onRequestDelete({request,env}){
  const a=await requireUser(request,env);if(a.response)return a.response;await ensure(env);
  const u=new URL(request.url),id=u.searchParams.get('id');if(!id)return json({ok:false,error:'id required'},400);
  const row=await load(env,a.user.id,id);if(!row)return json({ok:false,error:'job not found'},404);
  const job=cancelJob(row.job,'Cancelled by user');await save(env,a.user.id,id,row.objective,job);
  return json({ok:true,version:'HOPE 5.0',job:expose(id,job)});
}
