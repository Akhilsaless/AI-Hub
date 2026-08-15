import {executeOpenAIPrimary,executeZeroCost} from './router-execute.js';

const COMPLEX=/\b(analy[sz]e|architecture|audit|compare|debug|diagnose|evaluate|investigate|plan|research|strategy|trade-?off|why|build|code|implement|security|financial|legal|medical)\b/i;
const SIMPLE=/^(hi+|hey+|hello+|thanks|thank you|ok+|okay|cool|nice|rewrite|rephrase|summari[sz]e)\b/i;

async function ensure(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_gateway_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    thread_id TEXT,
    intent TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    success INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL
  )`).run();
}

function requirement({prompt='',intent='answer',attachments=[]}={}){
  if(attachments.length)return 'strong';
  if(['research','build','coding','analysis','strategy'].includes(intent))return 'strong';
  if(COMPLEX.test(prompt)||String(prompt).length>1200)return 'strong';
  if(SIMPLE.test(String(prompt).trim())&&String(prompt).length<180)return 'fast';
  return 'balanced';
}

async function record(env,event){
  try{
    await ensure(env);
    await env.DB.prepare(`INSERT INTO hope_gateway_events(user_id,thread_id,intent,reasoning,provider,model,success,latency_ms,error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .bind(event.userId,event.threadId||null,event.intent,event.reasoning,event.provider||null,event.model||null,event.success?1:0,event.latencyMs||0,String(event.error||'').slice(0,1000)||null,new Date().toISOString()).run();
  }catch{}
}

export async function executeHopeGateway(env,{user,threadId=null,prompt='',intent='answer',system='',messages=[],attachments=[]}={}){
  const reasoning=requirement({prompt,intent,attachments}),started=Date.now();
  const stopped=await env.DB.prepare(`SELECT emergency_stop FROM provider_settings WHERE provider='global'`).first().catch(()=>null);
  if(stopped?.emergency_stop)return {ok:false,error:'HOPE AI is temporarily paused by the Owner.',reasoning};
  const mode=reasoning==='strong'?'hard':reasoning==='fast'?'fast':'normal',requestMessages=[{role:'system',content:system},...messages];
  const primary=await executeOpenAIPrimary(env,requestMessages,mode,{attachments});
  const result=primary.ok?primary:await executeZeroCost(env,requestMessages,mode==='hard'?'hard':'normal',{attachments});
  if(!primary.ok&&result.ok)result.fallbackFrom=primary.skipped?null:'openai';
  await record(env,{userId:user?.id||'unknown',threadId,intent,reasoning,provider:result.provider,model:result.model,success:result.ok,latencyMs:Date.now()-started,error:result.error});
  return {...result,reasoning};
}
