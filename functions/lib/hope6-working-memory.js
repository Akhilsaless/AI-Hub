const now=()=>new Date().toISOString();
const words=s=>[...new Set(String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>3))].slice(0,24);

export async function ensureWorkingMemory(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_working_memory(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,scope TEXT NOT NULL,scope_id TEXT,kind TEXT NOT NULL,content TEXT NOT NULL,importance INTEGER NOT NULL DEFAULT 5,source_run_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hope_working_memory_user ON user_hope_working_memory(user_id,scope,scope_id,updated_at)`).run();
}

export async function missionMemory(env,userId,missionId,objective,limit=8){
  await ensureWorkingMemory(env);const q=words(objective),r=await env.DB.prepare(`SELECT id,kind,content,importance,source_run_id,updated_at FROM user_hope_working_memory WHERE user_id=? AND (scope='mission' AND scope_id=? OR scope='global') ORDER BY importance DESC,updated_at DESC LIMIT 60`).bind(userId,missionId).all();
  const ranked=(r.results||[]).map(x=>({...x,score:q.filter(w=>String(x.content).toLowerCase().includes(w)).length+Number(x.importance||0)/10})).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(Number(limit||8),12)));
  return ranked;
}

function summarizeJob(job){
  const done=(job?.steps||[]).filter(x=>x.status==='completed').map(x=>x.summary).filter(Boolean).slice(-6),block=job?.block;
  const parts=[];if(done.length)parts.push(done.join(' '));if(block)parts.push(`Paused because ${block.type}${block.action?` on ${block.action}`:''}.`);if(job?.status==='failed'){const f=(job.steps||[]).find(x=>x.status==='failed');if(f?.error)parts.push(`Failure: ${f.error}`)}return parts.join(' ').slice(0,8000);
}

export async function rememberMissionRun(env,{userId,missionId,runId,objective,job}){
  await ensureWorkingMemory(env);const content=summarizeJob(job);if(!content)return null;const t=now(),importance=job.status==='failed'||job.status==='awaiting_confirmation'?8:6,id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO user_hope_working_memory(id,user_id,scope,scope_id,kind,content,importance,source_run_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,userId,'mission',missionId,'run_summary',`Objective: ${String(objective||'').slice(0,1200)}\nOutcome: ${content}`,importance,runId||null,t,t).run();
  return {id,content,importance};
}

export function memoryContext(items=[]){
  if(!items.length)return 'No relevant prior mission context.';
  return items.map((x,i)=>`[${i+1}] ${x.content}`).join('\n');
}
