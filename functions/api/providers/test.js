import {requireOwner} from '../../lib/auth.js';
import {decryptStoredKey} from '../../lib/vault.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
function base(row,fallback=''){return String(row.endpoint||fallback).replace(/\/$/,'')}
function openRouterFree(m){const p=m?.pricing||{};return ['prompt','completion','request','image','web_search','internal_reasoning'].every(k=>p[k]===undefined||Number(p[k])===0)}
async function ensureHealth(env){await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_health(provider TEXT PRIMARY KEY,healthy INTEGER NOT NULL DEFAULT 1,last_checked_at TEXT,error TEXT)`).run();for(const sql of [`ALTER TABLE provider_health ADD COLUMN last_status INTEGER`,`ALTER TABLE provider_health ADD COLUMN latency_ms INTEGER`,`ALTER TABLE provider_health ADD COLUMN last_error TEXT`,`ALTER TABLE provider_health ADD COLUMN checked_at TEXT`]){try{await env.DB.prepare(sql).run()}catch{}}}
export async function onRequestPost({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 try{
  const {provider}=await request.json();const row=await env.DB.prepare('SELECT * FROM integrations WHERE id=?').bind(provider).first();if(!row)return json({ok:false,error:'Save this provider first'},404);
  const key=await decryptStoredKey(env,row);
  let url,headers={};
  if(provider==='openai'){if(!key)return json({ok:false,error:'No API key stored'},400);url='https://api.openai.com/v1/models';headers={Authorization:`Bearer ${key}`};}
  else if(provider==='openrouter'){if(!key)return json({ok:false,error:'No API key stored'},400);url='https://openrouter.ai/api/v1/models';headers={Authorization:`Bearer ${key}`};}
  else if(provider==='groq'){if(!key)return json({ok:false,error:'No API key stored'},400);url='https://api.groq.com/openai/v1/models';headers={Authorization:`Bearer ${key}`};}
  else if(provider==='gemini'){if(!key)return json({ok:false,error:'No API key stored'},400);url=`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;}
  else if(provider==='deepseek'){if(!key)return json({ok:false,error:'No API key stored'},400);url=`${base(row,'https://api.deepseek.com')}/models`;headers={Authorization:`Bearer ${key}`};}
  else if(provider==='omniroute'){
    const b=base(row);if(!b||!/^https:\/\//i.test(b))return json({ok:false,error:'OmniRoute requires a publicly reachable HTTPS endpoint, for example https://your-omniroute.example/v1'},400);
    url=`${b}/models`;if(key)headers={Authorization:`Bearer ${key}`};
  }
  else if(provider==='agentrouter'){
    if(!key)return json({ok:false,error:'No AgentRouter API key stored'},400);url=`${base(row,'https://agentrouter.org/v1')}/models`;headers={Authorization:`Bearer ${key}`};
  }
  else return json({ok:false,error:'Automated test is not implemented for this provider yet'},400);
  const started=Date.now(),r=await fetch(url,{headers});let body={};try{body=await r.json()}catch{};const latency=Date.now()-started;
  await ensureHealth(env);
  await env.DB.prepare(`INSERT INTO provider_health(provider,healthy,last_status,latency_ms,last_error,checked_at) VALUES(?,?,?,?,?,?) ON CONFLICT(provider) DO UPDATE SET healthy=excluded.healthy,last_status=excluded.last_status,latency_ms=excluded.latency_ms,last_error=excluded.last_error,checked_at=excluded.checked_at`).bind(provider,r.ok?1:0,r.status,latency,r.ok?null:String(body?.error?.message||body?.error||`HTTP ${r.status}`),new Date().toISOString()).run();
  if(!r.ok)return json({ok:false,provider,status:r.status,latencyMs:latency,error:body?.error?.message||body?.error||`HTTP ${r.status}`},502);

  let activatedModel=null,qualifiedFree=0;
  if(provider==='openrouter'){
    const models=(body.data||[]).map(m=>({id:m.id,name:m.name||m.id,qualifiedFree:openRouterFree(m)}));
    const free=models.filter(m=>m.qualifiedFree);
    qualifiedFree=free.length;
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_models(provider TEXT NOT NULL,model_id TEXT NOT NULL,name TEXT,qualified_free INTEGER NOT NULL DEFAULT 0,qualification_source TEXT,healthy INTEGER NOT NULL DEFAULT 1,discovered_at TEXT NOT NULL,PRIMARY KEY(provider,model_id))`).run();
    const now=new Date().toISOString();
    for(const m of models.slice(0,500)) await env.DB.prepare(`INSERT INTO provider_models(provider,model_id,name,qualified_free,qualification_source,healthy,discovered_at) VALUES('openrouter',?,?,?,?,1,?) ON CONFLICT(provider,model_id) DO UPDATE SET name=excluded.name,qualified_free=excluded.qualified_free,qualification_source=excluded.qualification_source,healthy=1,discovered_at=excluded.discovered_at`).bind(m.id,m.name,m.qualifiedFree?1:0,'provider-pricing',now).run();
    const selected=free.find(m=>m.id==='openrouter/free')||free.find(m=>/:free$/i.test(m.id))||free[0];
    if(selected){activatedModel=selected.id;await env.DB.prepare(`UPDATE integrations SET model=?,verified_free=1,enabled=1,updated_at=? WHERE id='openrouter'`).bind(selected.id,now).run();}
  }
  if(provider==='openai'){
    const ids=new Set((body.data||[]).map(m=>m.id));
    const selected=['gpt-5.6-terra','gpt-5.6-luna','gpt-5.4-mini','gpt-5-mini'].find(id=>ids.has(id))||null;
    const now=new Date().toISOString();
    if(selected)await env.DB.prepare(`UPDATE integrations SET model='',enabled=0,updated_at=? WHERE id='openai'`).bind(now).run();
    try{await env.DB.prepare(`INSERT INTO provider_settings(provider,enabled,warning_percent,daily_budget_usd,monthly_budget_usd,emergency_stop,last_success_at,last_error,updated_at) VALUES('openai',0,80,0,0,0,?,NULL,?) ON CONFLICT(provider) DO UPDATE SET last_success_at=excluded.last_success_at,last_error=NULL,updated_at=excluded.updated_at`).bind(now,now).run()}catch{}
    activatedModel=selected;
  }
  return json({ok:true,provider,status:r.status,latencyMs:latency,qualifiedFree,activatedModel,autoActivated:provider==='openrouter'&&!!activatedModel,enabled:provider==='openai'?false:!!activatedModel,message:provider==='openai'?'Credential verified. Automatic OpenAI routing is ready but remains disabled until the Owner sets budgets and enables it.':undefined});
 }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
}
