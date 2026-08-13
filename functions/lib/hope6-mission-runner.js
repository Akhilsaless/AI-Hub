import {buildJob,jobProgress,nextJobStep} from './hope5-jobs.js';
import {normalizeJob,resolveStepPayload,jobContext} from './hope5-runner.js';
import {LOCAL_ACTIONS,executeHopeLocalAction,summarizeLocalAction} from './hope5-reasoning.js';
import {ACTIONS} from './hope4-executor.js';
import {executeBackgroundRead,isBackgroundReadAction,summarizeBackgroundRead} from './hope6-background-read.js';
import {userToolContextForUser} from './user-tool-context.js';

const now=()=>new Date().toISOString();

export async function runMission(env,mission){
  const ctx=await userToolContextForUser(env,mission.user_id);if(!ctx.user)throw new Error('Mission user is unavailable');
  let job=normalizeJob(buildJob(mission.objective,ctx.capabilities));job.id=crypto.randomUUID();job.missionId=mission.id;job.status='running';job.events.push({at:now(),type:'mission_job_started',missionId:mission.id});
  let executed=0;
  while(executed<8){
    const step=nextJobStep(job);if(!step){job.status='completed';break}
    const local=LOCAL_ACTIONS[step.action],spec=local||ACTIONS[step.action];if(!spec){step.status='failed';step.error='Unsupported action';job.status='failed';break}
    const unresolved=(step.dependsOn||[]).filter(id=>job.steps.find(x=>x.id===id)?.status!=='completed');if(unresolved.length){job.status='blocked';job.block={type:'dependency',stepId:step.id,dependsOn:unresolved};break}
    if(step.missingFields?.length){step.status='needs_input';job.status='needs_input';job.block={type:'input',stepId:step.id,missingFields:step.missingFields};break}
    const payload=resolveStepPayload(job,step);step.resolvedPayload=payload;
    if(!local&&step.confirmationRequired){step.status='awaiting_confirmation';job.status='awaiting_confirmation';job.block={type:'confirmation',stepId:step.id,action:step.action,preview:payload};job.events.push({at:now(),type:'mission_approval_required',stepId:step.id,action:step.action});break}
    if(!local&&!isBackgroundReadAction(step.action)){step.status='awaiting_confirmation';job.status='awaiting_confirmation';job.block={type:'confirmation',stepId:step.id,action:step.action,preview:payload};break}
    if(!local&&!ctx.capabilities.includes(spec.capability)){step.status='blocked';job.status='blocked';job.block={type:'connector',stepId:step.id,connector:spec.connector,capability:spec.capability};break}
    try{
      step.status='executing';step.startedAt=now();
      const result=local?await executeHopeLocalAction(env,step.action,payload):await executeBackgroundRead(env,mission.user_id,step.action,payload);
      step.status='completed';step.completedAt=now();step.result=result;step.summary=local?summarizeLocalAction(step.action,result):summarizeBackgroundRead(step.action,result);job.context=jobContext(job);job.events.push({at:step.completedAt,type:'mission_step_completed',stepId:step.id,summary:step.summary});executed++;
    }catch(e){step.status='failed';step.error=String(e?.message||e);step.failedAt=now();job.status='failed';job.events.push({at:step.failedAt,type:'mission_step_failed',stepId:step.id,error:step.error});break}
  }
  const progress=jobProgress(job);if(progress.complete)job.status='completed';job.updatedAt=now();return {job,progress,executed};
}
