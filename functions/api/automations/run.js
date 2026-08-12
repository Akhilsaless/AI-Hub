import {executeTask} from '../../lib/task-executor.js';
import {ensureAutomationSchema,nextAfter} from '../../lib/automation-schedule.js';

const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const RUNNER_TOKEN_SHA256='8b274042a979f7c4b71d70ced23470cf1de21c594885f436ef0632c4a07d609d';

async function sha256Hex(value){
  const data=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function authorized(request,env){
  const expected=String(env.AUTOMATION_RUNNER_SECRET||'');
  const got=request.headers.get('authorization')||'';
  if(expected&&got===`Bearer ${expected}`)return true;

  const token=request.headers.get('x-hope-runner-token')||'';
  if(!token)return false;
  return (await sha256Hex(token))===RUNNER_TOKEN_SHA256;
}

async function executeOne(env,task){
  const started=new Date().toISOString();
  const rr=await env.DB.prepare(`INSERT INTO automation_runs(task_id,status,started_at) VALUES(?,'running',?)`).bind(task.id,started).run(),runId=rr.meta?.last_row_id;
  await env.DB.prepare(`UPDATE agent_tasks SET status='running',updated_at=? WHERE id=? AND status IN ('approved','pending')`).bind(started,task.id).run();
  try{
    const result=await executeTask(env,task),finished=new Date(),next=nextAfter(task.recurrence,finished),status=next?(task.requires_approval?'approved':'pending'):'completed';
    await env.DB.prepare(`UPDATE automation_runs SET status='completed',finished_at=?,result=?,verified=1 WHERE id=?`).bind(finished.toISOString(),JSON.stringify(result),runId).run();
    await env.DB.prepare(`UPDATE agent_tasks SET status=?,result=?,last_run_at=?,next_run_at=?,run_count=COALESCE(run_count,0)+1,updated_at=? WHERE id=?`).bind(status,JSON.stringify(result),finished.toISOString(),next,finished.toISOString(),task.id).run();
    return {id:task.id,ok:true,verified:true,nextRunAt:next};
  }catch(e){
    const finished=new Date().toISOString(),error=String(e?.message||e);
    await env.DB.prepare(`UPDATE automation_runs SET status='failed',finished_at=?,error=? WHERE id=?`).bind(finished,error,runId).run();
    await env.DB.prepare(`UPDATE agent_tasks SET status='failed',result=?,last_run_at=?,failure_count=COALESCE(failure_count,0)+1,updated_at=? WHERE id=?`).bind(JSON.stringify({verified:false,error}),finished,finished,task.id).run();
    return {id:task.id,ok:false,verified:false,error};
  }
}

export async function onRequestPost({request,env}){
  if(!(await authorized(request,env)))return json({ok:false,error:'Unauthorized runner'},401);
  try{
    await ensureAutomationSchema(env);
    const now=new Date().toISOString();
    const q=await env.DB.prepare(`SELECT * FROM agent_tasks WHERE enabled=1 AND next_run_at IS NOT NULL AND next_run_at<=? AND ((requires_approval=1 AND status='approved') OR (requires_approval=0 AND status='pending')) ORDER BY next_run_at ASC LIMIT 10`).bind(now).all();
    const results=[];
    for(const task of q.results||[])results.push(await executeOne(env,task));
    return json({ok:true,checkedAt:now,due:(q.results||[]).length,results});
  }catch(e){
    return json({ok:false,error:String(e?.message||e)},500);
  }
}
