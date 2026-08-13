import {ACTIONS,executeHopeAction,summarizeActionResult} from './hope4-executor.js';
import {jobProgress,nextJobStep,safeToAutoRun} from './hope5-jobs.js';

const now=()=>new Date().toISOString();
const terminal=s=>['completed','cancelled'].includes(s);
const pathGet=(value,path='')=>String(path||'').split('.').filter(Boolean).reduce((v,k)=>v==null?undefined:v[k],value);
const stringify=v=>typeof v==='string'?v:JSON.stringify(v??'');

export function normalizeJob(job){
  const copy=structuredClone(job||{});
  copy.steps=Array.isArray(copy.steps)?copy.steps:[];
  copy.events=Array.isArray(copy.events)?copy.events:[];
  copy.context=copy.context&&typeof copy.context==='object'?copy.context:{};
  copy.updatedAt=now();
  return copy;
}

export function jobContext(job){
  const ctx={};
  for(const step of job?.steps||[]){
    if(step.status!=='completed')continue;
    ctx[step.id]={action:step.action,objective:step.objective,summary:step.summary||'',result:step.result??null};
  }
  return ctx;
}

export function resolveStepPayload(job,step){
  const ctx=jobContext(job),previous=(job.steps||[]).filter(x=>x.status==='completed').at(-1)||null;
  const replace=s=>String(s).replace(/\{\{\s*([^}]+)\s*\}\}/g,(_,expr)=>{
    const key=String(expr).trim();
    if(key==='previous.summary')return previous?.summary||'';
    if(key==='previous.result')return stringify(previous?.result);
    if(key.startsWith('previous.result.'))return stringify(pathGet(previous?.result,key.slice('previous.result.'.length)));
    const [stepId,...rest]=key.split('.'),root=ctx[stepId];
    if(!root)return '';
    return stringify(pathGet(root,rest.join('.')));
  });
  const walk=v=>Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):typeof v==='string'?replace(v):v;
  return walk(step?.payload||{});
}

export function applyStepPayload(job,stepId,payload={}){
  const j=normalizeJob(job),step=j.steps.find(x=>x.id===stepId);
  if(!step)return j;
  step.payload={...(step.payload||{}),...(payload||{})};
  if(Array.isArray(step.missingFields)) step.missingFields=step.missingFields.filter(k=>step.payload[k]===undefined||step.payload[k]===null||step.payload[k]==='');
  return j;
}

export function cancelJob(job,reason='Cancelled by user'){
  const j=normalizeJob(job);
  j.status='cancelled';
  for(const step of j.steps) if(!terminal(step.status)) step.status='cancelled';
  j.events.push({at:now(),type:'job_cancelled',reason});
  return j;
}

export async function advanceJob(request,env,job,capabilities=[],options={}){
  const j=normalizeJob(job),confirmed=new Set(options.confirmedStepIds||[]),maxSteps=Math.min(8,Math.max(1,Number(options.maxSteps||8)));
  let executed=0;
  if(terminal(j.status)) return {job:j,progress:jobProgress(j)};
  j.status='running';
  while(executed<maxSteps){
    const step=nextJobStep(j);
    if(!step){j.status='completed';break}
    if(step.status==='failed'){j.status='failed';break}
    const spec=ACTIONS[step.action];
    if(!spec){step.status='failed';step.error='Unsupported action';j.status='failed';j.events.push({at:now(),type:'step_failed',stepId:step.id,error:step.error});break}
    if(!capabilities.includes(spec.capability)){
      step.status='blocked';j.status='blocked';j.block={type:'connector',stepId:step.id,connector:spec.connector,capability:spec.capability};j.events.push({at:now(),type:'connector_required',stepId:step.id,connector:spec.connector});break
    }
    if(step.missingFields?.length){
      step.status='needs_input';j.status='needs_input';j.block={type:'input',stepId:step.id,missingFields:step.missingFields};break
    }
    const resolvedPayload=resolveStepPayload(j,step);step.resolvedPayload=resolvedPayload;
    if(step.confirmationRequired&&!confirmed.has(step.id)){
      step.status='awaiting_confirmation';j.status='awaiting_confirmation';j.block={type:'confirmation',stepId:step.id,action:step.action,preview:resolvedPayload};break
    }
    if(!safeToAutoRun(step)&&!confirmed.has(step.id)){
      j.status='awaiting_confirmation';j.block={type:'confirmation',stepId:step.id,action:step.action,preview:resolvedPayload};break
    }
    try{
      step.status='executing';step.startedAt=now();j.events.push({at:step.startedAt,type:'step_started',stepId:step.id,action:step.action});
      const result=await executeHopeAction(request,env,step.action,resolvedPayload);
      step.status='completed';step.completedAt=now();step.summary=summarizeActionResult(step.action,result);step.result=result;
      j.context=jobContext(j);
      j.events.push({at:step.completedAt,type:'step_completed',stepId:step.id,summary:step.summary});executed++;
    }catch(e){
      step.status='failed';step.failedAt=now();step.error=String(e?.message||e);j.status='failed';j.events.push({at:step.failedAt,type:'step_failed',stepId:step.id,error:step.error});break
    }
  }
  const progress=jobProgress(j);
  if(progress.complete)j.status='completed';
  j.updatedAt=now();
  return {job:j,progress,executed};
}
