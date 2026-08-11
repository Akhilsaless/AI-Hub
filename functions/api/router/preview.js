import {requireOwner} from '../../lib/auth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 try{
  const body=await request.json().catch(()=>({}));
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_models(provider TEXT NOT NULL,model_id TEXT NOT NULL,name TEXT,qualified_free INTEGER NOT NULL DEFAULT 0,qualification_source TEXT,healthy INTEGER NOT NULL DEFAULT 1,discovered_at TEXT NOT NULL,PRIMARY KEY(provider,model_id))`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_health(provider TEXT PRIMARY KEY,healthy INTEGER NOT NULL,last_status INTEGER,latency_ms INTEGER,last_error TEXT,checked_at TEXT NOT NULL)`).run();
  const q=await env.DB.prepare(`SELECT pm.provider,pm.model_id,pm.name,pm.qualification_source,COALESCE(ph.healthy,0) provider_healthy,COALESCE(ph.latency_ms,999999) latency_ms FROM provider_models pm JOIN integrations i ON i.id=pm.provider LEFT JOIN provider_health ph ON ph.provider=pm.provider WHERE pm.qualified_free=1 AND pm.healthy=1 AND i.enabled=1 AND i.verified_free=1 ORDER BY provider_healthy DESC,latency_ms ASC,pm.provider,pm.model_id LIMIT 25`).all();
  const candidates=q.results||[];
  return json({ok:true,zeroCostMode:true,task:String(body.task||'general'),ready:candidates.length>0,candidates,selected:candidates[0]||null,note:candidates.length?'Selection is preview-only until live generation routing is activated.':'No enabled + owner-verified + provider-qualified free model is currently eligible.'});
 }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
