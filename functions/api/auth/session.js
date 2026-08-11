import {isOwner,clearOwnerCookie} from '../../lib/auth.js';
function json(v,s=200,h={}){return new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store',...h}})}
export async function onRequestGet({request,env}){return json({ok:true,authenticated:await isOwner(request,env),ownerConfigured:Boolean(env.OWNER_PASSWORD)});}
export async function onRequestDelete(){return json({ok:true},200,{'set-cookie':clearOwnerCookie()});}
