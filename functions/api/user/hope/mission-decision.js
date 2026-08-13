import {requireUser} from '../../../lib/user-auth.js';
import {userToolContext} from '../../../lib/user-tool-context.js';
import {advanceJob,applyStepPayload,cancelJob} from '../../../lib/hope5-runner.js';
import {nextAfter} from '../../../lib/automation-schedule.js';

const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const now=()=>new Date().toISOString();

async function ensure(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_mission_runs(id TEXT PRIMARY KEY,mission_id TEXT NOT NULL,user_id TEXT NOT NULL,status TEXT NOT NULL,job TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,FOREIGN KEY(mission_id) REFERENCES user_hope_missions(id))`).run();
}
function parse(v,fallback={}){try{return JSON.parse(v||'')}catch{return fallback}}

export async function onRequestPost({request,env}){
  const a=await requireUser(request,env);if(a.response)return a.response;await ensure(env);
  const b=await request.json().catch(()=>({})),missionId=String(b.missionId||''),decision=String(b.decision||'');
  if(!missionId||!['approve','edit','reject'].includes(decision))return json({ok:false,error:'missionId and valid decision required'},400);
  const mission=await env.DB.prepare(`SELECT * FROM user_hope_missions WHERE id=? AND user_id=?`).bind(missionId,a.user.id).first();if(!mission)return json({ok:false,error:'mission not found'},404);
  const last=parse(mission.last_result),runId=String(b.runId||last.runId||'');if(!runId)return json({ok:false,error:'no paused mission run found'},409);
  const run=await env.DB.prepare(`SELECT * FROM user_hope_mission_runs WHERE id=? AND mission_id=? AND user_id=?`).bind(runId,missionId,a.user.id).first();if(!run)return json({ok:false,error:'mission run not found'},404);
  let job=parse(run.job);if(job.status!=='awaiting_confirmation')return json({ok:false,error:'mission run is not awaiting confirmation'},409);
  const stepId=String(b.stepId||job.block?.stepId||'');if(!stepId)return json({ok:false,error:'paused step not found'},409);
  const t=now();
  if(decision==='reject'){
    job=cancelJob(job,'Protected action rejected by user');
    const next=nextAfter(mission.recurrence,new Date(t)),status=next?'active':'completed';
    await env.DB.prepare(`UPDATE user_hope_mission_runs SET status='rejected',job=?,finished_at=? WHERE id=? AND user_id=?`).bind(JSON.stringify(job).slice(0,250000),t,runId,a.user.id).run();
    await env.DB.prepare(`UPDATE user_hope_missions SET status=?,next_run_at=?,last_result=?,updated_at=? WHERE id=? AND user_id=?`).bind(status,next,JSON.stringify({runId,status:'rejected',decision:'reject'}),t,missionId,a.user.id).run();
    return json({ok:true,version:'HOPE 6.1',decision:'reject',status,nextRunAt:next});
  }
  if(decision==='edit'){
    const payload=b.payload&&typeof b.payload==='object'?b.payload:null;if(!payload)return json({ok:false,error:'payload required for edit'},400);
    job=applyStepPayload(job,stepId,payload);
  }
  const ctx=await userToolContext(request,env),r=await advanceJob(request,env,job,ctx.capabilities,{confirmedStepIds:[stepId],maxSteps:8});job=r.job;
  let missionStatus=job.status,next=mission.next_run_at;
  if(job.status==='completed'){next=nextAfter(mission.recurrence,new Date(t));missionStatus=next?'active':'completed'}
  else if(job.status==='awaiting_confirmation')missionStatus='awaiting_confirmation';
  else if(job.status==='failed')missionStatus='failed';
  else if(['blocked','needs_input'].includes(job.status))missionStatus=job.status;
  await env.DB.prepare(`UPDATE user_hope_mission_runs SET status=?,job=?,finished_at=? WHERE id=? AND user_id=?`).bind(job.status,JSON.stringify(job).slice(0,250000),job.status==='awaiting_confirmation'?null:t,runId,a.user.id).run();
  const result={runId,status:job.status,progress:r.progress,block:job.block||null,decision,nextRunAt:next};
  await env.DB.prepare(`UPDATE user_hope_missions SET status=?,next_run_at=?,last_result=?,updated_at=? WHERE id=? AND user_id=?`).bind(missionStatus,next,JSON.stringify(result).slice(0,50000),t,missionId,a.user.id).run();
  return json({ok:true,version:'HOPE 6.1',missionStatus,nextRunAt:next,job:{status:job.status,progress:r.progress,block:job.block||null,steps:job.steps}});
}
