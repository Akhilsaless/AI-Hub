import {currentUser,clearUserCookie} from '../../lib/user-auth.js';
const json=(v,s=200,h={})=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store',...h}});
export async function onRequestGet({request,env}){const user=await currentUser(request,env);return json({ok:true,authenticated:!!user,user:user||null})}
export async function onRequestDelete(){return json({ok:true},200,{'set-cookie':clearUserCookie()})}