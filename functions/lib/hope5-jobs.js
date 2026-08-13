import {buildAgentPlan,missingActionFields} from './hope4-agent.js';
export const JOB_VERSION='HOPE 5.2';
const splitObjective=s=>String(s||'').split(/\s+(?:then|and then|after that|next)\s+|\s*;\s*/i).map(x=>x.trim()).filter(Boolean).slice(0,8);
const refersBack=s=>/\b(it|that|those|them|the result|the email|the message|the sender|their|reply|respond)\b/i.test(String(s||''));
const wantsReply=s=>/\b(reply|respond|write back|answer (?:it|them|that|the email|the message))\b/i.test(String(s||''));
function inferPayload(step,previous){
  if(!previous||!refersBack(step.objective))return step.payload||{};
  const p={...(step.payload||{})};
  if((step.action==='gmail_draft'||step.action==='gmail_send')&&!p.to&&previous.action==='gmail_search')p.to=`{{${previous.id}.result.messages.0.from}}`;
  if((step.action==='gmail_draft'||step.action==='gmail_send')&&!p.subject&&previous.action==='gmail_search')p.subject=`Re: {{${previous.id}.result.messages.0.subject}}`;
  if((step.action==='gmail_draft'||step.action==='gmail_send')&&!p.body&&previous.action==='gmail_search')p.body=`Regarding your message: {{${previous.id}.result.messages.0.snippet}}`;
  if(step.action==='github_issue'&&!p.repo&&previous.action==='github_read')p.repo=`{{${previous.id}.result.full_name}}`;
  return p;
}
function addReasoningSteps(steps){
  const out=[];
  for(const step of steps){
    const previous=out.at(-1);
    if(previous?.action==='gmail_search'&&(step.action==='gmail_draft'||step.action==='gmail_send')&&wantsReply(step.objective)){
      const reason={id:`reason_${step.id}`,index:step.index-.1,objective:`Compose an appropriate reply for: ${step.objective}`,action:'reason_compose_reply',local:true,confirmationRequired:false,status:'pending',dependsOn:[previous.id],payload:{source:`{{${previous.id}.result.messages.0.snippet}}`,sourceSubject:`{{${previous.id}.result.messages.0.subject}}`,instruction:step.objective},missingFields:[]};
      out.push(reason);
      step.payload={...(step.payload||{}),body:`{{${reason.id}.result.text}}`};
      step.dependsOn=[...(step.dependsOn||[]),reason.id];
      step.missingFields=missingActionFields(step.action,step.payload).filter(k=>!String(step.payload[k]||'').includes('{{'));
    }
    out.push(step);
  }
  return out.map((s,i)=>({...s,index:i}));
}
export function buildJob(objective,capabilities=[]){
  const parts=splitObjective(objective),plans=parts.map((text,index)=>({index,text,...buildAgentPlan(text,capabilities)})),actionable=plans.filter(x=>x.autonomous);let previous=null;
  const baseSteps=actionable.map((p,i)=>{const base={id:`step_${i+1}`,index:i,objective:p.text,action:p.action,payload:p.payload||{},confirmationRequired:!!p.confirmationRequired,status:'pending'},payload=inferPayload(base,previous),step={...base,payload,dependsOn:previous&&refersBack(p.text)?[previous.id]:[]};step.missingFields=missingActionFields(step.action,payload).filter(k=>!String(payload[k]||'').includes('{{'));previous=step;return step});
  const steps=addReasoningSteps(baseSteps);
  return {version:JOB_VERSION,objective:String(objective||''),status:steps.length?'planned':'needs_assistant',steps,createdAt:new Date().toISOString(),summary:{segments:parts.length,actionable:steps.length,confirmations:steps.filter(x=>x.confirmationRequired).length,dependencies:steps.filter(x=>x.dependsOn?.length).length,reasoning:steps.filter(x=>x.local).length}}
}
export function nextJobStep(job){return job.steps.find(x=>!['completed','cancelled'].includes(x.status))||null}
export function jobProgress(job){const total=job.steps.length,done=job.steps.filter(x=>x.status==='completed').length,failed=job.steps.filter(x=>x.status==='failed').length;return {total,done,failed,percent:total?Math.round(done/total*100):0,complete:total>0&&done===total}}
export function safeToAutoRun(step){return !!step&&!step.confirmationRequired&&!step.missingFields?.length}
