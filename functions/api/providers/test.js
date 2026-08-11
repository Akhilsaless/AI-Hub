import {requireOwner} from '../../lib/auth.js';
import {decryptStoredKey} from '../../lib/vault.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 try{
  const {provider}=await request.json();const row=await env.DB.prepare('SELECT * FROM integrations WHERE id=?').bind(provider).first();if(!row)return json({ok:false,error:'Save this provider first'},404);
  const key=await decryptStoredKey(env,row);if(!key)return json({ok:false,error:'No API key stored'},400);
  let url,headers={Authorization:`Bearer ${key}`};
  if(provider==='openrouter')url='https://openrouter.ai/api/v1/models';
  else if(provider==='groq')url='https://api.groq.com/openai/v1/models';
  else if(provider==='gemini'){url=`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;headers={}}
  else if(provider==='deepseek')url=`${(row.endpoint||'https://api.deepseek.com').replace(/\/$/,'')}/models`;
  else return json({ok:false,error:'Automated test is not implemented for this provider yet'},400);
  const started=Date.now(),r=await fetch(url,{headers});let body={};try{body=await r.json()}catch{};const latency=Date.now()-started;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_health(provider TEXT PRIMARY KEY,healthy INTEGER NOT NULL,last_status INTEGER,latency_ms INTEGER,last_error TEXT,checked_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`INSERT INTO provider_health(provider,healthy,last_status,latency_ms,last_error,checked_at) VALUES(?,?,?,?,?,?) ON CONFLICT(provider) DO UPDATE SET healthy=excluded.healthy,last_status=excluded.last_status,latency_ms=excluded.latency_ms,last_error=excluded.last_error,checked_at=excluded.checked_at`).bind(provider,r.ok?1:0,r.status,latency,r.ok?null:String(body?.error?.message||body?.error||`HTTP ${r.status}`),new Date().toISOString()).run();
  return json({ok:r.ok,provider,status:r.status,latencyMs:latency,error:r.ok?null:(body?.error?.message||body?.error||`HTTP ${r.status}`)},r.ok?200:502);
 }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
}
