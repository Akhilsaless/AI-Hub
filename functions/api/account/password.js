import {requireUser,verifyPassword,hashPassword,createUserSession,userCookie} from '../../lib/user-auth.js';
import {authRateStatus,recordAuthAttempt,clearAuthAttempts,requireJsonRequest} from '../../lib/auth-rate-limit.js';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});

export async function onRequestPut({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;
 if(auth.user.isOwner)return json({ok:false,error:'Owner password is managed through Cloudflare secrets'},403);
 if(!requireJsonRequest(request))return json({ok:false,error:'Content-Type must be application/json'},415);
 const limits={limit:5,windowSeconds:3600,blockSeconds:3600},gate=await authRateStatus(request,env,'password-change',limits);
 if(!gate.ok)return json({ok:false,error:'Too many password attempts. Try again later.'},429,{'retry-after':String(gate.retryAfter)});
 const body=await request.json().catch(()=>({})),currentPassword=String(body.currentPassword||''),newPassword=String(body.newPassword||'');
 if(newPassword.length<12||newPassword.length>256)return json({ok:false,error:'New password must be 12 to 256 characters'},400);
 if(currentPassword.length>256){await recordAuthAttempt(env,'password-change',gate.actor,limits);return json({ok:false,error:'Current password is incorrect'},401)}
 const stored=await env.DB.prepare(`SELECT password_hash,password_salt,session_version FROM app_users WHERE id=? AND status='active'`).bind(auth.user.id).first();
 if(!stored||!(await verifyPassword(currentPassword,stored.password_salt,stored.password_hash))){await recordAuthAttempt(env,'password-change',gate.actor,limits);return json({ok:false,error:'Current password is incorrect'},401)}
 const next=await hashPassword(newPassword),sessionVersion=Number(stored.session_version||0)+1,now=new Date().toISOString();
 await env.DB.prepare(`UPDATE app_users SET password_hash=?,password_salt=?,session_version=?,updated_at=? WHERE id=?`).bind(next.hash,next.salt,sessionVersion,now,auth.user.id).run();
 await clearAuthAttempts(env,'password-change',gate.actor);
 const token=await createUserSession(env,{...auth.user,session_version:sessionVersion});
 return json({ok:true,sessionsRevoked:true},200,{'set-cookie':userCookie(token)});
}
