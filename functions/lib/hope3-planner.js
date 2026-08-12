import {executeZeroCost} from './router-execute.js';
const clean=v=>String(v||'').trim();
const specialistRules=[
  ['research',/\b(research|latest|current|sources?|competitors?|market|news)\b/i],
  ['engineer',/\b(code|build|fix|debug|implement|refactor|api|repo|repository|deploy|website|app)\b/i],
  ['analyst',/\b(analy[sz]e|compare|evaluate|metrics?|data|financial|trade-?off)\b/i],
  ['writer',/\b(write|rewrite|draft|email|copy|script|article|proposal)\b/i],
  ['planner',/\b(plan|roadmap|strategy|steps?|prioriti[sz]e|organize)\b/i],
  ['reviewer',/\b(review|audit|verify|test|check|qa|security|regression)\b/i]
];
export function selectSpecialists(objective,intent='answer'){
  const text=clean(objective),selected=[];
  for(const [name,re] of specialistRules)if(re.test(text))selected.push(name);
  if(intent==='research'&&!selected.includes('research'))selected.unshift('research');
  if(intent==='engineering'&&!selected.includes('engineer'))selected.unshift('engineer');
  if(['research','engineering','action'].includes(intent)&&!selected.includes('reviewer'))selected.push('reviewer');
  return [...new Set(selected)].slice(0,4);
}
function fallbackSteps(objective,intent){
  if(intent==='engineering')return ['Inspect the relevant implementation and constraints','Identify the smallest safe change','Implement the change without disturbing unrelated structure','Run focused tests and regression checks','Verify the requested outcome and report evidence'];
  if(intent==='research')return ['Define the exact research question','Discover independent relevant sources','Extract evidence from the strongest sources','Cross-check important claims and disagreements','Synthesize a sourced answer'];
  if(intent==='action')return ['Validate the requested action and required inputs','Prepare a non-destructive preview','Request approval if the action is consequential','Execute through the permitted tool','Verify the external result'];
  return ['Understand the requested outcome','Gather only relevant context','Produce the result','Check it against the request'];
}
export async function createExecutionPlan(env,{objective,intent='answer',context={}}={}){
  const goal=clean(objective);if(!goal)throw new Error('objective is required');
  const specialists=selectSpecialists(goal,intent);
  const prompt=`Create a compact execution plan for HOPE 3. Return ONLY valid JSON with keys summary,steps,successCriteria,risks. steps must be an array of 3-7 objects with id,title,specialist,requiresVerification,requiresApproval. Do not claim any step has run. Objective: ${goal}\nIntent: ${intent}\nAvailable specialists: ${specialists.join(', ')||'general'}\nRelevant context: ${JSON.stringify(context).slice(0,5000)}`;
  const r=await executeZeroCost(env,[{role:'system',content:'You are HOPE 3 Planner. Plan work; never pretend to execute it. Prefer minimal safe steps and explicit verification.'},{role:'user',content:prompt}],'hard');
  if(r.ok){try{const raw=clean(r.text).replace(/^```json\s*/i,'').replace(/```$/,'').trim(),parsed=JSON.parse(raw);if(Array.isArray(parsed.steps)&&parsed.steps.length)return {...parsed,specialists,generatedBy:{provider:r.provider,model:r.model}}}catch{}}
  return {summary:`Execution plan for: ${goal}`,steps:fallbackSteps(goal,intent).map((title,i)=>({id:i+1,title,specialist:specialists[Math.min(i,specialists.length-1)]||'general',requiresVerification:i>1,requiresApproval:intent==='action'&&i===2})),successCriteria:['Requested outcome is satisfied','No success is claimed without verification'],risks:['Tool or model failure','Insufficient context'],specialists,generatedBy:{provider:'hope',model:'deterministic-fallback'}};
}
