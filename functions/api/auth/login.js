import {createOwnerSession,passwordMatches,ownerCookie} from '../../lib/auth.js';
function json(v,s=200,h={}){return new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store',...h}})}
export async function onRequestPost({request,env}){
  if(!env.OWNER_PASSWORD) return json({ok:false,error:'OWNER_PASSWORD is not configured'},503);
  if(!env.HUB_MASTER_KEY) return json({ok:false,error:'HUB_MASTER_KEY is not configured'},503);
  let body={}; try{body=await request.json()}catch{}
  if(!(await passwordMatches(body.password,env))) return json({ok:false,error:'invalid owner password'},401);
  const token=await createOwnerSession(env);
  return json({ok:true,role:'owner'},200,{'set-cookie':ownerCookie(token)});
}
