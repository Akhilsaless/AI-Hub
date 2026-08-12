import {requireOwner} from '../../lib/auth.js';
import {orchestrate} from '../../lib/hope3-orchestrator.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
  const denied=await requireOwner(request,env);if(denied)return denied;
  try{
    const b=await request.json();
    const result=await orchestrate(env,{message:b.message,mode:b.mode||'AUTO',attachments:Array.isArray(b.attachments)?b.attachments:[]});
    return json({ok:true,...result});
  }catch(e){return json({ok:false,error:String(e?.message||e)},400)}
}
