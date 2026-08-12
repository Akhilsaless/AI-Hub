import {requireOwner} from '../../lib/auth.js';
import {eligibleRoutes} from '../../lib/router-execute.js';
import {loadGitHubConnector} from '../../lib/github-app.js';
const json=(v,s=200)=>new Response(JSON.stringify(v,null,2),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
async function table(env,name){try{await env.DB.prepare(`SELECT 1 FROM ${name} LIMIT 1`).first();return true}catch{return false}}
async function count(env,name,where='1=1'){try{const r=await env.DB.prepare(`SELECT COUNT(*) n FROM ${name} WHERE ${where}`).first();return Number(r?.n||0)}catch{return 0}}
export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;const checks=[];
 try{
  const routes=await eligibleRoutes(env);
  checks.push({name:'model-routing',ok:routes.length>0,detail:`${routes.length} healthy zero-cost route(s)`});
  checks.push({name:'multimodal-route',ok:routes.some(r=>r.provider==='gemini'),required:false,detail:routes.some(r=>r.provider==='gemini')?'Gemini multimodal route available':'Optional: connect a healthy Gemini route for image/PDF vision'});
  const gh=await loadGitHubConnector(env);checks.push({name:'github-connector',ok:!!(gh?.row&&gh?.app&&gh?.meta?.installation_id),detail:gh?.meta?.installation_id?'GitHub App installation available':'GitHub not fully connected'});
  for(const [name,t] of [['memory-store','hope_memories'],['automation-store','agent_tasks'],['chat-store','agent_messages']])checks.push({name,ok:await table(env,t),detail:`D1 ${t} table`});
  const memories=await count(env,'hope_memories','enabled=1'),tasks=await count(env,'agent_tasks'),messages=await count(env,'agent_messages');
  checks.push({name:'persistent-memory-data',ok:memories>0,required:false,detail:`${memories} active memories`});
  checks.push({name:'automation-data',ok:tasks>0,required:false,detail:`${tasks} task(s) stored`});
  checks.push({name:'chat-history-data',ok:messages>0,required:false,detail:`${messages} message(s) stored`});
  const requiredFailed=checks.filter(x=>x.required!==false&&!x.ok);
  return json({ok:requiredFailed.length===0,phase:3,productionReady:requiredFailed.length===0,checks,failed:requiredFailed.map(x=>x.name),note:'Phase 3 server audit is non-destructive. Browser microphone, camera and file-picker support are client capabilities and remain device-dependent.'},requiredFailed.length?503:200)
 }catch(e){return json({ok:false,phase:3,productionReady:false,error:String(e?.message||e),checks},500)}
}
