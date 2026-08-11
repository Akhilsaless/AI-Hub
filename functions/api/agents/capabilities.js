import {requireOwner} from '../../lib/auth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 const integrations=await env.DB.prepare(`SELECT id,enabled,verified_free,model FROM integrations ORDER BY id`).all().catch(()=>({results:[]}));
 const connected=new Set((integrations.results||[]).filter(x=>x.enabled).map(x=>x.id));
 return json({ok:true,capabilities:[
  {id:'chat',label:'AI chat',ready:connected.size>0,requires:'AI provider'},
  {id:'memory',label:'Persistent memory',ready:true,requires:null},
  {id:'research',label:'Web research',ready:connected.has('openrouter'),requires:'OpenRouter tool-capable model'},
  {id:'files',label:'File intake',ready:true,requires:null,note:'Local selection and metadata are wired; document extraction connector is optional.'},
  {id:'vision',label:'Image/vision',ready:connected.has('openrouter'),requires:'vision-capable routed model'},
  {id:'github',label:'GitHub coding',ready:false,requires:'GitHub connector/token'},
  {id:'builder',label:'App builder',ready:false,requires:'GitHub or deployment connector'},
  {id:'automation',label:'Automation queue',ready:true,requires:'scheduler for timed execution'},
  {id:'gmail',label:'Gmail',ready:false,requires:'Google OAuth'},
  {id:'calendar',label:'Calendar',ready:false,requires:'Google OAuth'}
 ],providers:integrations.results||[]});
}
