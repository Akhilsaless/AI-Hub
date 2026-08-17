import {credentialFor,ensureAIProviderSchema,providerDefinition} from './ai-provider-core.js';

const safeJson=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v??f}catch{return f}};
const timeout=ms=>AbortSignal.timeout?AbortSignal.timeout(ms):undefined;
const now=()=>new Date().toISOString();

function errorClass(status,message=''){
 const s=Number(status||0),m=String(message).toLowerCase();
 if(s===401||s===403||/auth|credential|token|api key/.test(m))return'authentication';
 if(s===429||/rate limit/.test(m))return'rate_limit';
 if(/quota|billing|budget/.test(m))return'quota';
 if(s===408||/timeout|timed out/.test(m))return'timeout';
 if(s===404||/model.*not.*found|unavailable/.test(m))return'model_unavailable';
 if(s>=500||/overload|capacity|unavailable/.test(m))return'provider_unavailable';
 return'provider_error';
}

function requiredCaps({feature='chat',prompt='',attachments=[]}={}){
 const q=String(prompt).toLowerCase(),caps=['chat'];
 if(feature==='coding'||/\b(code|debug|repository|sql|javascript|python)\b/.test(q))caps.push('code');
 if(feature==='analysis'||feature==='planning'||/\b(reason|analy|plan|strategy|architecture|audit)\b/.test(q))caps.push('reasoning');
 if(attachments.length||/\b(image|photo|screenshot|vision)\b/.test(q))caps.push('vision');
 if(feature==='agent'||/\btool call|function call|agent action\b/.test(q))caps.push('tools');
 return[...new Set(caps)];
}

async function policy(env,feature){
 await ensureAIProviderSchema(env);
 const specific=await env.DB.prepare(`SELECT * FROM ai_gateway_settings WHERE scope='feature' AND scope_id=?`).bind(feature).first().catch(()=>null);
 const global=await env.DB.prepare(`SELECT * FROM ai_gateway_settings WHERE scope='global' AND scope_id='default'`).first().catch(()=>null);
 const p=specific||global||{};
 return {mode:p.mode||'auto',provider:p.provider||null,modelId:p.model_id||null,freeOnly:p.free_only===undefined?true:Boolean(p.free_only),allowPaidFallback:Boolean(p.allow_paid_fallback),monthlyBudgetUsd:Number(p.monthly_budget_usd||0),warningPercent:Number(p.warning_percent||70),providerPriority:safeJson(p.provider_priority,[])};
}

async function monthSpend(env){
 const start=new Date().toISOString().slice(0,7)+'-01';
 const r=await env.DB.prepare(`SELECT COALESCE(SUM(estimated_cost_usd),0) n FROM ai_gateway_usage WHERE created_at>=? AND success=1`).bind(start).first().catch(()=>({n:0}));
 return Number(r?.n||0);
}

async function candidates(env,req,p){
 const caps=requiredCaps(req),rows=await env.DB.prepare(`SELECT m.*,i.enabled integration_enabled,i.verified_free,COALESCE(h.healthy,1) provider_healthy,h.latency_ms provider_latency FROM ai_model_registry m JOIN integrations i ON i.id=m.provider LEFT JOIN provider_health h ON h.provider=m.provider WHERE m.healthy=1 AND i.enabled=1 AND COALESCE(h.healthy,1)=1`).all().catch(()=>({results:[]}));
 let list=(rows.results||[]).map(x=>({...x,capabilities:safeJson(x.capabilities,[]),metadata:safeJson(x.metadata,{})})).filter(x=>caps.every(c=>x.capabilities.includes(c)||c==='chat'));
 if(p.freeOnly)list=list.filter(x=>x.free_capable&&x.verified_free);
 else if(!p.allowPaidFallback)list=list.filter(x=>x.free_capable&&x.verified_free);
 if(p.mode==='manual')list=list.filter(x=>x.provider===p.provider&&x.model_id===p.modelId);
 const priority=new Map((p.providerPriority||[]).map((id,i)=>[id,i]));
 const score=x=>{
  let s=50;
  if(x.free_capable&&x.verified_free)s+=30;
  if(caps.includes('reasoning')&&x.capabilities.includes('reasoning'))s+=16;
  if(caps.includes('code')&&x.capabilities.includes('code'))s+=12;
  if(caps.includes('vision')&&x.capabilities.includes('vision'))s+=12;
  const latency=Number(x.provider_latency||x.metadata?.first_token_latency_ms||0);if(latency)s+=Math.max(-15,15-latency/250);
  if(priority.has(x.provider))s+=Math.max(0,10-priority.get(x.provider));
  if(p.mode==='fastest'&&latency)s+=Math.max(0,30-latency/100);
  if(p.mode==='best-quality'){if(x.capabilities.includes('reasoning'))s+=20;if(/large|pro|reason|r1|70b|120b|gpt|gemini/.test(x.model_id.toLowerCase()))s+=12;}
  if(p.mode==='free-first'&&x.free_capable&&x.verified_free)s+=40;
  return s;
 };
 return list.map(x=>({...x,routeScore:score(x)})).sort((a,b)=>b.routeScore-a.routeScore);
}

function messagesToGemini(messages=[]){
 const system=messages.filter(x=>x.role==='system').map(x=>String(x.content||'')).join('\n');
 const contents=messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:String(x.content||'')}]}));
 return {systemInstruction:system?{parts:[{text:system}]}:undefined,contents};
}

async function invoke(env,route,messages,{stream=false}={}){
 const def=providerDefinition(route.provider);if(!def)throw Error('Unsupported provider');
 const cred=await credentialFor(env,route.provider);if(!cred?.secret)throw Error('Provider credential missing');
 if(route.provider==='cloudflare'){
  const c=safeJson(cred.secret,{}),accountId=String(c.accountId||''),apiToken=String(c.apiToken||'');if(!accountId||!apiToken)throw Error('Cloudflare Account ID or API Token missing');
  const last=[...messages].reverse().find(x=>x.role==='user'),prompt=String(last?.content||'');
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${route.model_id}`,{method:'POST',headers:{Authorization:`Bearer ${apiToken}`,'content-type':'application/json'},body:JSON.stringify({prompt}),signal:timeout(20000)});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Object.assign(Error(d?.errors?.[0]?.message||`HTTP ${r.status}`),{status:r.status});return {text:String(d?.result?.response||d?.result?.text||''),inputTokens:0,outputTokens:0,raw:d};
 }
 if(route.provider==='gemini'){
  const payload=messagesToGemini(messages),r=await fetch(`${def.endpoint}/v1beta/models/${encodeURIComponent(route.model_id)}:generateContent?key=${encodeURIComponent(cred.secret)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:timeout(20000)}),d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d?.error?.message||`HTTP ${r.status}`),{status:r.status});return {text:(d?.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('\n'),inputTokens:Number(d?.usageMetadata?.promptTokenCount||0),outputTokens:Number(d?.usageMetadata?.candidatesTokenCount||0),raw:d};
 }
 const endpoint=String(cred.endpoint||def.endpoint).replace(/\/$/,'');const headers={Authorization:`Bearer ${cred.secret}`,'content-type':'application/json'};if(route.provider==='openrouter'){headers['HTTP-Referer']='https://ai-hub-93x.pages.dev';headers['X-Title']='HOPE OS'};
 const body={model:route.model_id,messages,max_tokens:2048,stream:false};const r=await fetch(`${endpoint}/chat/completions`,{method:'POST',headers,body:JSON.stringify(body),signal:timeout(20000)}),d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d?.error?.message||d?.message||`HTTP ${r.status}`),{status:r.status});return {text:String(d?.choices?.[0]?.message?.content||d?.choices?.[0]?.text||''),inputTokens:Number(d?.usage?.prompt_tokens||d?.usage?.input_tokens||0),outputTokens:Number(d?.usage?.completion_tokens||d?.usage?.output_tokens||0),raw:d};
}

async function record(env,{userId,feature,route,ok,latency,inputTokens=0,outputTokens=0,cost=0,error=''}){
 const cls=ok?null:errorClass(error?.status,error?.message||error);await env.DB.prepare(`INSERT INTO ai_gateway_usage(user_id,feature,provider,model_id,success,latency_ms,input_tokens,output_tokens,estimated_cost_usd,error_class,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(userId||null,feature,route.provider,route.model_id,ok?1:0,latency,inputTokens,outputTokens,cost,cls,now()).run().catch(()=>{});
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_health(provider TEXT PRIMARY KEY,healthy INTEGER NOT NULL DEFAULT 1,last_checked_at TEXT,error TEXT)`).run().catch(()=>{});
 await env.DB.prepare(`INSERT INTO provider_health(provider,healthy,last_checked_at,error) VALUES(?,?,?,?) ON CONFLICT(provider) DO UPDATE SET healthy=excluded.healthy,last_checked_at=excluded.last_checked_at,error=excluded.error`).bind(route.provider,ok?1:(cls==='authentication'||cls==='provider_unavailable'?0:1),now(),ok?null:String(error?.message||error).slice(0,500)).run().catch(()=>{});
}

export async function executeCentralGateway(env,{user=null,feature='chat',prompt='',messages=[],attachments=[],modeOverride=null,provider=null,modelId=null,adminDebug=false}={}){
 await ensureAIProviderSchema(env);const p=await policy(env,feature);if(modeOverride)p.mode=modeOverride;if(provider){p.mode='manual';p.provider=provider;p.modelId=modelId}
 if(!p.freeOnly&&p.allowPaidFallback&&p.monthlyBudgetUsd>0){const spent=await monthSpend(env);if(spent>=p.monthlyBudgetUsd)return {ok:false,error:'Monthly AI budget limit reached.',errorClass:'budget_limit'};}
 const routes=await candidates(env,{feature,prompt,attachments},p);if(!routes.length)return {ok:false,error:p.freeOnly?'No verified free model is currently available for this request.':'No compatible configured AI model is currently available.',errorClass:'no_route'};
 const attempts=[];for(const route of routes.slice(0,6)){const started=Date.now();try{const out=await invoke(env,route,messages),latency=Date.now()-started;await record(env,{userId:user?.id,feature,route,ok:true,latency,inputTokens:out.inputTokens,outputTokens:out.outputTokens});return {ok:true,provider:route.provider,model:route.model_id,text:out.text,content:out.text,latencyMs:latency,usage:{inputTokens:out.inputTokens,outputTokens:out.outputTokens,estimatedCostUsd:0},routing:{mode:p.mode,freeOnly:p.freeOnly,allowPaidFallback:p.allowPaidFallback,candidates:routes.length,fallbackCount:attempts.length},attempts:adminDebug?attempts:undefined}}catch(e){const latency=Date.now()-started,cls=errorClass(e.status,e.message);await record(env,{userId:user?.id,feature,route,ok:false,latency,error:e});attempts.push({provider:route.provider,model:route.model_id,errorClass:cls,error:adminDebug?String(e.message||e):undefined});if(cls==='authentication')continue;if(cls==='rate_limit'||cls==='quota'||cls==='timeout'||cls==='provider_unavailable'||cls==='model_unavailable'||cls==='provider_error')continue;}}
 return {ok:false,error:'AI providers are temporarily unavailable. Please try again.',errorClass:'all_routes_failed',attempts:adminDebug?attempts:undefined,routing:{mode:p.mode,candidates:routes.length,fallbackCount:attempts.length}};
}
