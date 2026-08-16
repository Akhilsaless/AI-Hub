import {requireUser} from '../../lib/user-auth.js';
import {requireJsonRequest} from '../../lib/auth-rate-limit.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});

export async function onRequestPatch({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;
 if(auth.user.isOwner)return json({ok:false,error:'Owner profile is managed through Cloudflare secrets'},403);
 if(!requireJsonRequest(request))return json({ok:false,error:'Content-Type must be application/json'},415);
 const body=await request.json().catch(()=>({})),name=String(body.name||'').trim().slice(0,80);
 if(name.length<2)return json({ok:false,error:'Name must be at least 2 characters'},400);
 const now=new Date().toISOString();
 await env.DB.prepare(`UPDATE app_users SET name=?,updated_at=? WHERE id=? AND status='active'`).bind(name,now,auth.user.id).run();
 return json({ok:true,user:{...auth.user,name,updated_at:now}});
}
