import { requireOwner } from '../../lib/auth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 try{
  const integrations=await env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN enabled=1 THEN 1 ELSE 0 END) enabled FROM integrations`).first().catch(()=>({total:0,enabled:0}));
  const healthy=await env.DB.prepare(`SELECT COUNT(*) n FROM provider_health WHERE healthy=1`).first().catch(()=>({n:0}));
  const tasks=await env.DB.prepare(`SELECT COUNT(*) n FROM agent_tasks WHERE status IN ('pending','running')`).first().catch(()=>({n:0}));
  const enabled=Number(integrations?.enabled||0),total=Number(integrations?.total||0),health=Number(healthy?.n||0),open=Number(tasks?.n||0);
  let message='I’m online and ready to coordinate your Hub.';
  const actions=[];
  if(total===0){message='I’m ready, but I don’t have an AI model connected yet. Connect one provider and I can start reasoning with you immediately.';actions.push({id:'connect-model',label:'Connect my first model',target:'providers'});}
  else if(enabled===0){message=`I can see ${total} saved AI connection${total===1?'':'s'}, but none is enabled for routing yet. Let’s test and qualify one before I start using it.`;actions.push({id:'qualify-model',label:'Test & qualify a model',target:'providers'});}
  else if(health===0){message=`I have ${enabled} enabled route${enabled===1?'':'s'}, but no healthy provider check yet. I recommend testing the connection before we chat through it.`;actions.push({id:'test-model',label:'Test provider health',target:'providers'});}
  else{message=`I’m ready. ${health} provider route${health===1?' is':'s are'} healthy${open?`, and I’m tracking ${open} open task${open===1?'':'s'}`:''}. Tell me the outcome you want; I’ll coordinate the right specialist.`;actions.push({id:'chat',label:'Start working with me',target:'agents'});}
  return json({ok:true,agent:'primary',message,actions,status:{savedProviders:total,enabledProviders:enabled,healthyProviders:health,openTasks:open}});
 }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
