import {requireUser,verifyPassword,clearUserCookie} from '../../lib/user-auth.js';
import {authRateStatus,recordAuthAttempt,requireJsonRequest} from '../../lib/auth-rate-limit.js';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});

export async function onRequestPost({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;
 if(auth.user.isOwner)return json({ok:false,error:'Owner access cannot be deactivated here'},403);
 if(!requireJsonRequest(request))return json({ok:false,error:'Content-Type must be application/json'},415);
 const limits={limit:3,windowSeconds:3600,blockSeconds:3600},gate=await authRateStatus(request,env,'account-deactivate',limits);
 if(!gate.ok)return json({ok:false,error:'Too many attempts. Try again later.'},429,{'retry-after':String(gate.retryAfter)});
 const body=await request.json().catch(()=>({})),password=String(body.password||''),confirmation=String(body.confirmation||'');
 if(confirmation!=='DEACTIVATE')return json({ok:false,error:'Type DEACTIVATE to confirm'},400);
 const stored=await env.DB.prepare(`SELECT password_hash,password_salt,session_version FROM app_users WHERE id=? AND status='active'`).bind(auth.user.id).first();
 if(password.length>256||!stored||!(await verifyPassword(password,stored.password_salt,stored.password_hash))){await recordAuthAttempt(env,'account-deactivate',gate.actor,limits);return json({ok:false,error:'Password is incorrect'},401)}
 await env.DB.prepare(`UPDATE app_users SET status='deactivated',session_version=session_version+1,updated_at=? WHERE id=?`).bind(new Date().toISOString(),auth.user.id).run();
 return json({ok:true,deactivated:true,dataRetained:true},200,{'set-cookie':clearUserCookie()});
}
