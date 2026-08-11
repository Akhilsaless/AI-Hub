import {decryptStoredKey} from './vault.js';

const defaults={openrouter:'https://openrouter.ai/api/v1',groq:'https://api.groq.com/openai/v1',deepseek:'https://api.deepseek.com',agentrouter:'https://agentrouter.org/v1'};
const clean=v=>String(v||'').replace(/\/$/,'');

export async function eligibleRoutes(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_models(provider TEXT NOT NULL,model_id TEXT NOT NULL,name TEXT,qualified_free INTEGER NOT NULL DEFAULT 0,qualification_source TEXT,healthy INTEGER NOT NULL DEFAULT 1,discovered_at TEXT NOT NULL,PRIMARY KEY(provider,model_id))`).run();
  const r=await env.DB.prepare(`SELECT pm.provider,pm.model_id,i.endpoint,i.key_cipher,i.iv FROM provider_models pm JOIN integrations i ON i.id=pm.provider LEFT JOIN provider_health ph ON ph.provider=pm.provider WHERE pm.qualified_free=1 AND pm.healthy=1 AND i.enabled=1 AND i.verified_free=1 AND COALESCE(ph.healthy,1)=1 LIMIT 20`).all();
  return r.results||[];
}

async function invoke(env,route,messages,mode){
  const key=await decryptStoredKey(env,route);
  if(route.provider==='gemini'){
    if(!key) throw new Error('Gemini credential missing');
    const contents=messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:String(m.content||'')}]}));
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(route.model_id)}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents})});
    const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data?.error?.message||`HTTP ${res.status}`);
    return (data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('\n');
  }
  const base=clean(route.endpoint||defaults[route.provider]); if(!base) throw new Error('Provider endpoint missing');
  const headers={'content-type':'application/json'}; if(key) headers.Authorization=`Bearer ${key}`;
  const body={model:route.model_id,messages,temperature:mode==='hard'?0.2:0.6};
  const res=await fetch(`${base}/chat/completions`,{method:'POST',headers,body:JSON.stringify(body)});
  const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data?.error?.message||data?.error||`HTTP ${res.status}`);
  return data?.choices?.[0]?.message?.content||data?.choices?.[0]?.text||'';
}

export async function executeZeroCost(env,messages,mode='normal'){
  const routes=await eligibleRoutes(env),attempts=[];
  for(const route of routes){
    try{return {ok:true,provider:route.provider,model:route.model_id,text:await invoke(env,route,messages,mode),attempts}}
    catch(e){attempts.push({provider:route.provider,model:route.model_id,error:String(e?.message||e)})}
  }
  return {ok:false,error:'No qualified zero-cost route could complete this request.',attempts};
}
