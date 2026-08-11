import {requireOwner} from '../../lib/auth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
  const denied=await requireOwner(request,env);if(denied)return denied;
  try{
    const {provider}=await request.json();
    if(!provider)return json({ok:false,error:'provider is required'},400);
    const row=await env.DB.prepare(`SELECT model_id FROM provider_models WHERE provider=? AND qualified_free=1 AND healthy=1 ORDER BY model_id LIMIT 1`).bind(provider).first();
    if(!row)return json({ok:false,error:'No provider-qualified free model found. Run Discover Models first.'},400);
    await env.DB.prepare(`UPDATE integrations SET verified_free=1, enabled=1, model=?, updated_at=? WHERE id=?`).bind(row.model_id,new Date().toISOString(),provider).run();
    return json({ok:true,provider,model:row.model_id,enabled:true,verifiedFree:true});
  }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
