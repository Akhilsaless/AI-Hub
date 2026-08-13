const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const tokens=s=>new Set(norm(s).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>3));
const similarity=(a,b)=>{const A=tokens(a),B=tokens(b);if(!A.size&&!B.size)return 1;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.max(A.size,B.size,1)};
const completedSummary=job=>(job?.steps||[]).filter(x=>x.status==='completed').map(x=>x.summary).filter(Boolean).slice(-5).join(' ');

export function assessMissionAttention(job,priorMemory=[]){
  if(job?.status==='awaiting_confirmation')return {notify:true,type:'approval_required',priority:10,reason:'A protected external action needs approval.'};
  if(job?.status==='failed')return {notify:true,type:'mission_failed',priority:9,reason:'The mission failed and may need intervention.'};
  if(job?.status==='blocked'||job?.status==='needs_input')return {notify:true,type:'mission_blocked',priority:8,reason:'The mission cannot continue without attention.'};
  if(job?.status!=='completed')return {notify:false,type:'routine',priority:1,reason:'No completed or actionable outcome.'};
  const current=completedSummary(job);if(!current)return {notify:false,type:'routine',priority:1,reason:'No meaningful completed result.'};
  const previous=priorMemory?.[0]?.content||'';if(!previous)return {notify:true,type:'mission_completed',priority:4,reason:'First completed outcome for this mission.'};
  const sim=similarity(current,previous),important=/\b(urgent|overdue|failed|failure|error|deadline|cancelled|canceled|declined|rejected|security|payment|invoice|approval|required|action needed|attention)\b/i.test(current);
  if(important)return {notify:true,type:'mission_completed',priority:7,reason:'The completed result contains an attention-worthy signal.',similarity:sim};
  if(sim>=0.72)return {notify:false,type:'routine_no_change',priority:1,reason:'Result is substantially similar to the previous mission outcome.',similarity:sim};
  return {notify:true,type:'mission_completed',priority:4,reason:'The mission outcome materially changed from prior context.',similarity:sim};
}

export function missionAttentionSummary(job){return completedSummary(job)||'Mission completed.'}
