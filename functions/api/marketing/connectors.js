import {requireUser} from '../../lib/user-auth.js';import {allPlatformStatuses} from '../../lib/hyvora-social.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){const auth=await requireUser(request,env);if(auth.response)return auth.response;return json({ok:true,platforms:allPlatformStatuses(env).map(x=>({...x,missing:x.missing.map(k=>k.replace(/_ACCESS_TOKEN|_ACCOUNT_ID|_PAGE_ID/g,' credential'))}))})}
