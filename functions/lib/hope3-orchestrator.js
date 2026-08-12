import {planningContext} from './hope21-router.js';
import {operatingContext,capabilitySnapshot} from './hope21-intelligence.js';

const text=v=>String(v||'').trim();
const lower=v=>text(v).toLowerCase();

export function classifyIntent(input){
  const s=lower(input);
  const intents=[];
  const add=(name,score,reason)=>intents.push({name,score,reason});
  if(/\b(research|latest|current|today|news|search the web|look up|find sources|compare sources|competitors?)\b/.test(s))add('research',.96,'Request depends on external/current information or source discovery.');
  if(/\b(my|our|we|remember|last time|continue|project|goal|mission|preference|previous|earlier)\b/.test(s))add('memory',.82,'Request may depend on owner-specific history or active work.');
  if(/\b(build|fix|debug|code|implement|upgrade|refactor|deploy|repository|repo|app|website|api)\b/.test(s))add('engineering',.9,'Request is an engineering/build task.');
  if(/\b(plan|strategy|roadmap|steps|break down|organize|prioritize)\b/.test(s))add('planning',.86,'Request asks for structured planning or decomposition.');
  if(/\b(send|email|schedule|calendar|create event|publish|delete|change|update|execute|run this)\b/.test(s))add('action',.91,'Request may cause an external or consequential action.');
  if(/\b(image|photo|screenshot|pdf|document|file|camera|voice|audio|microphone)\b/.test(s))add('multimodal',.84,'Request involves non-text input or output.');
  if(!intents.length)add('answer',.88,'Ordinary general-purpose question or conversation.');
  intents.sort((a,b)=>b.score-a.score);
  return {primary:intents[0],secondary:intents.slice(1,4)};
}

function stageFor(intent){
  switch(intent){
    case 'research': return ['understand','research','verify-sources','synthesize','answer'];
    case 'engineering': return ['understand','inspect','plan','implement','test','verify','report'];
    case 'planning': return ['understand','context','decompose','prioritize','answer'];
    case 'action': return ['understand','validate','preview','approval-if-needed','execute','verify','report'];
    case 'multimodal': return ['ingest','understand','route-compatible-model','analyze','answer'];
    case 'memory': return ['understand','retrieve-relevant-context','reason','answer'];
    default: return ['understand','answer'];
  }
}

export async function orchestrate(env,{message,mode='AUTO',attachments=[]}={}){
  const objective=text(message);
  if(!objective)throw new Error('message is required');
  const intent=classifyIntent(objective);
  const [planContext,operating,capabilities]=await Promise.all([
    planningContext(env,objective),
    operatingContext(env,8),
    capabilitySnapshot(env)
  ]);
  const stages=stageFor(intent.primary.name);
  const needs={
    liveResearch:intent.primary.name==='research',
    memory:intent.primary.name==='memory'||intent.secondary.some(x=>x.name==='memory'),
    engineering:intent.primary.name==='engineering',
    approval:intent.primary.name==='action',
    multimodal:attachments.length>0||intent.primary.name==='multimodal',
    verification:['research','engineering','action'].includes(intent.primary.name)
  };
  const constraints={
    zeroCostPreferred:true,
    noUnverifiedSuccessClaims:true,
    consequentialActionsNeedApproval:true,
    memoryOnlyWhenRelevant:true,
    externalContentUntrusted:true
  };
  return {
    version:'HOPE 3.0',
    mode,
    objective,
    intent,
    stages,
    needs,
    constraints,
    context:{
      relevantSkills:planContext.relevantSkills||[],
      activeGoals:(operating.goals||[]).slice(0,5),
      activeProjects:(operating.projects||[]).slice(0,5),
      openLoops:(operating.openLoops||[]).slice(0,5)
    },
    capabilities,
    status:'planned'
  };
}
