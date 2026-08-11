import {requireOwner} from '../../lib/auth.js';
import {decryptStoredKey} from '../../lib/vault.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
function base(row,fallback=''){return String(row.endpoint||fallback).replace(/\/$/,'')}
export async function onRequestPost({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 try{
  const {provider}=await request.json();const row=await env.DB.prepare('SELECT * FROM integrations WHERE id=?').bind(provider).first();if(!row)return json({ok:false,error:'Save this provider first'},404);
  const key=await decryptStoredKey(env,row);
  let url,headers={};
  if(provider==='openrouter'){if(!key)return json({ok:false,error:'No API key stored'},400);url='https://openrouter.ai/api/v1/models';headers={Authorization:`Bearer ${key}`};}
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
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_health(provider TEXT PRIMARY KEY,healthy INTEGER NOT NULL,last_status INTEGER,latency_ms INTEGER,last_error TEXT,checked_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`INSERT INTO provider_health(provider,healthy,last_status,latency_ms,last_error,checked_at) VALUES(?,?,?,?,?,?) ON CONFLICT(provider) DO UPDATE SET healthy=excluded.healthy,last_status=excluded.last_status,latency_ms=excluded.latency_ms,last_error=excluded.last_error,checked_at=excluded.checked_at`).bind(provider,r.ok?1:0,r.status,latency,r.ok?null:String(body?.error?.message||body?.error||`HTTP ${r.status}`),new Date().toISOString()).run();
  return json({ok:r.ok,provider,status:r.status,latencyMs:latency,error:r.ok?null:(body?.error?.message||body?.error||`HTTP ${r.status}`)},r.ok?200:502);
 }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
}
