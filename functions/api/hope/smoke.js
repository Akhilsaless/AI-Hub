import {requireOwner} from '../../lib/auth.js';
import {eligibleRoutes} from '../../lib/router-execute.js';
import {loadGitHubConnector,installationToken} from '../../lib/github-app.js';
import {googleGet} from '../../lib/google-oauth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v,null,2),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
async function table(env,name){try{await env.DB.prepare(`SELECT 1 FROM ${name} LIMIT 1`).first();return true}catch{return false}}
async function count(env,name,where='1=1'){try{const r=await env.DB.prepare(`SELECT COUNT(*) n FROM ${name} WHERE ${where}`).first();return Number(r?.n||0)}catch{return 0}}
async function githubLive(env){try{const gh=await loadGitHubConnector(env);if(!(gh?.row&&gh?.app&&gh?.meta?.installation_id))return {ok:false,detail:'GitHub not fully connected'};const issued=await installationToken(gh.app,gh.meta.installation_id),r=await fetch('https://api.github.com/installation/repositories?per_page=1',{headers:{Authorization:`Bearer ${issued.token}`,Accept:'application/vnd.github+json','User-Agent':'HOPE-Smoke','X-GitHub-Api-Version':'2022-11-28'}});return {ok:r.ok,detail:r.ok?'Live GitHub installation read succeeded':`GitHub live read HTTP ${r.status}`}}catch(e){return {ok:false,detail:String(e?.message||e)}}}
async function googleLive(env){try{const j=await googleGet(env,'https://www.googleapis.com/oauth2/v2/userinfo');return {ok:!!j?.email,detail:j?.email?'Live Google OAuth read succeeded':'Google returned no account identity'}}catch(e){return {ok:false,detail:String(e?.message||e)}}}
export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;const checks=[];
 try{
  checks.push({name:'runtime-db-binding',ok:!!env.DB,detail:env.DB?'D1 DB binding available':'D1 DB binding missing'});
  checks.push({name:'runtime-master-key',ok:!!env.HUB_MASTER_KEY,detail:env.HUB_MASTER_KEY?'HUB_MASTER_KEY configured':'HUB_MASTER_KEY missing'});
  checks.push({name:'runtime-owner-password',ok:!!env.OWNER_PASSWORD,detail:env.OWNER_PASSWORD?'OWNER_PASSWORD configured':'OWNER_PASSWORD missing'});
  const routes=await eligibleRoutes(env);
  checks.push({name:'model-routing',ok:routes.length>0,detail:`${routes.length} healthy zero-cost route(s)`});
  checks.push({name:'provider-fallback-depth',ok:routes.length>=2,required:false,detail:`${routes.length} eligible route(s); 2+ recommended for fallback resilience`});
  checks.push({name:'multimodal-route',ok:routes.some(r=>r.provider==='gemini'),required:false,detail:routes.some(r=>r.provider==='gemini')?'Gemini multimodal route available':'Optional: connect a healthy Gemini route for image/PDF vision'});
  const gh=await githubLive(env);checks.push({name:'github-live-read',ok:gh.ok,detail:gh.detail});
  const google=await googleLive(env);checks.push({name:'google-live-read',ok:google.ok,required:false,detail:google.detail});
  for(const [name,t] of [['memory-store','hope_memories'],['automation-store','agent_tasks'],['chat-store','agent_messages'],['goal-store','hope_goals'],['mission-store','hope_missions']])checks.push({name,ok:await table(env,t),detail:`D1 ${t} table`});
  const memories=await count(env,'hope_memories','enabled=1'),tasks=await count(env,'agent_tasks'),messages=await count(env,'agent_messages');
  checks.push({name:'persistent-memory-data',ok:memories>0,required:false,detail:`${memories} active memories`});
  checks.push({name:'automation-data',ok:tasks>0,required:false,detail:`${tasks} task(s) stored`});
  checks.push({name:'chat-history-data',ok:messages>0,required:false,detail:`${messages} message(s) stored`});
  const requiredFailed=checks.filter(x=>x.required!==false&&!x.ok);
  return json({ok:requiredFailed.length===0,version:'HOPE 3.0',phase:'consolidation-smoke',productionReady:requiredFailed.length===0,checks,failed:requiredFailed.map(x=>x.name),manualChecks:['General knowledge prompt does not leak project memory','Explicit personal/project prompt recalls relevant memory','Research prompt does not claim live research unless a research tool ran','Image attachment reaches a multimodal model as a valid data URL','PDF/document path is handled by a compatible parser/model','Gmail/Calendar/Drive reads work with granted scopes','Consequential Gmail/Calendar actions require approval','Automation executes once and records outcome','Provider outage falls back to another eligible route','Mobile microphone/camera/file picker and keyboard layout work on target device'],note:'Server checks are non-destructive. productionReady here means server prerequisites passed; HOPE 3.0 is release-ready only after the listed manual end-to-end checks also pass.'},requiredFailed.length?503:200)
 }catch(e){return json({ok:false,version:'HOPE 3.0',phase:'consolidation-smoke',productionReady:false,error:String(e?.message||e),checks},500)}
}
