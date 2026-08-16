import {createOwnerSession,passwordMatches,ownerCookie} from '../../lib/auth.js';
import {authRateStatus,recordAuthAttempt,clearAuthAttempts,requireJsonRequest} from '../../lib/auth-rate-limit.js';
function json(v,s=200,h={}){return new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store',...h}})}
export async function onRequestPost({request,env}){
  if(!env.OWNER_PASSWORD) return json({ok:false,error:'OWNER_PASSWORD is not configured'},503);
  if(!env.HUB_MASTER_KEY) return json({ok:false,error:'HUB_MASTER_KEY is not configured'},503);
  if(!requireJsonRequest(request)) return json({ok:false,error:'Content-Type must be application/json'},415);
  const limits={limit:6,windowSeconds:900,blockSeconds:1800};
  const gate=await authRateStatus(request,env,'owner-login',limits);
  if(!gate.ok) return json({ok:false,error:'Too many owner sign-in attempts. Try again later.'},429,{'retry-after':String(gate.retryAfter)});
  let body={}; try{body=await request.json()}catch{}
  const password=String(body.password||'');
  if(password.length>256||!(await passwordMatches(password,env))){await recordAuthAttempt(env,'owner-login',gate.actor,limits);return json({ok:false,error:'invalid owner password'},401)}
  await clearAuthAttempts(env,'owner-login',gate.actor);
  const token=await createOwnerSession(env);
  return json({ok:true,role:'owner'},200,{'set-cookie':ownerCookie(token)});
}
