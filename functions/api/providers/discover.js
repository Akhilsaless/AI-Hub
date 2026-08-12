import {requireOwner} from '../../lib/auth.js';
import {decryptStoredKey} from '../../lib/vault.js';
import {providerById} from '../../lib/provider-catalog.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
async function fetchJson(url,init={}){const r=await fetch(url,init);let body={};try{body=await r.json()}catch{};if(!r.ok)throw new Error(body?.error?.message||body?.error||`Provider HTTP ${r.status}`);return body}
function openRouterFree(m){const p=m?.pricing||{};return ['prompt','completion','request','image','web_search','internal_reasoning'].every(k=>p[k]===undefined||Number(p[k])===0)}
function base(row,fallback=''){return String(row.endpoint||fallback).replace(/\/$/,'')}
function normalizeModels(body,source='discovered-only'){return (body.data||body.models||[]).map(m=>({id:String(m.id||m.name||'').replace(/^models\//,''),name:m.display_name||m.displayName||m.name||m.id,qualifiedFree:false,source})).filter(m=>m.id)}
export async function onRequestPost({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 try{
  const {provider}=await request.json(),catalog=providerById(provider);
  const row=await env.DB.prepare('SELECT * FROM integrations WHERE id=?').bind(provider).first();
  if(!row)return json({ok:false,error:'Connect/save this provider first'},404);
  const key=await decryptStoredKey(env,row);let models=[];
  if(provider==='openrouter'){
   if(!key)return json({ok:false,error:'No API credential stored'},400);const b=await fetchJson('https://openrouter.ai/api/v1/models',{headers:{Authorization:`Bearer ${key}`}});models=(b.data||[]).map(m=>({id:m.id,name:m.name||m.id,qualifiedFree:openRouterFree(m),source:openRouterFree(m)?'provider-pricing-zero':'provider-pricing'}));
  }else if(provider==='gemini'){
   if(!key)return json({ok:false,error:'No API credential stored'},400);const b=await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);models=(b.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>({id:String(m.name||'').replace(/^models\//,''),name:m.displayName||m.name,qualifiedFree:false,source:'discovered-free-status-unverified'}));
  }else{
   if(!catalog?.discoverable&&provider!=='omniroute')return json({ok:false,error:'Automatic model discovery is not available for this provider yet'},400);
   const endpoint=base(row,catalog?.endpoint||'');if(!endpoint||!/^https:\/\//i.test(endpoint))return json({ok:false,error:'A public HTTPS API endpoint is required'},400);
   if(provider!=='omniroute'&&!key)return json({ok:false,error:'This provider requires an API credential'},400);
   const headers=key?{Authorization:`Bearer ${key}`}:{},b=await fetchJson(`${endpoint}/models`,{headers});models=normalizeModels(b,/credit|promo|trial/.test(catalog?.offerKind||'')?'promotional-or-trial-unqualified':'discovered-only');
  }
  const now=new Date().toISOString();await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_models(provider TEXT NOT NULL,model_id TEXT NOT NULL,name TEXT,qualified_free INTEGER NOT NULL DEFAULT 0,qualification_source TEXT,healthy INTEGER NOT NULL DEFAULT 1,discovered_at TEXT NOT NULL,PRIMARY KEY(provider,model_id))`).run();
  for(const m of models.slice(0,500))await env.DB.prepare(`INSERT INTO provider_models(provider,model_id,name,qualified_free,qualification_source,healthy,discovered_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(provider,model_id) DO UPDATE SET name=excluded.name,qualified_free=excluded.qualified_free,qualification_source=excluded.qualification_source,healthy=1,discovered_at=excluded.discovered_at`).bind(provider,m.id,m.name,m.qualifiedFree?1:0,m.source,now).run();
  return json({ok:true,provider,count:models.length,qualifiedFree:models.filter(m=>m.qualifiedFree).length,offerKind:catalog?.offerKind||'unknown',models:models.slice(0,150)});
 }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
}
