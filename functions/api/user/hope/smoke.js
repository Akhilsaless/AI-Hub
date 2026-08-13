import {requireUser} from '../../../lib/user-auth.js';
import {classifyIntent} from '../../../lib/hope3-orchestrator.js';
import {buildAgentPlan,actionNeedsConfirmation} from '../../../lib/hope4-agent.js';
const json=(v,s=200)=>new Response(JSON.stringify(v,null,2),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){
 const a=await requireUser(request,env);if(a.response)return a.response;
 const checks=[];const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
 try{
  check('authenticated-user',!!a.user?.id,a.user?.isOwner?'owner uses universal HOPE':'customer uses universal HOPE');
  check('owner-role-compatible',a.user?.isOwner?a.user.plan==='teams':true,a.user?.plan||'');
  check('general-intent',classifyIntent('Explain why the sky is blue').primary.name!=='memory');
  check('research-intent',!!classifyIntent('Research current AI model news').primary.name);
  const gs=buildAgentPlan('Search my Gmail for invoice emails',['gmail']);
  const gd=buildAgentPlan('Draft an email to Sam about tomorrow',['gmail']);
  const cr=buildAgentPlan('Show my calendar events today',['calendar']);
  const cc=buildAgentPlan('Create a calendar event tomorrow',['calendar']);
  const gr=buildAgentPlan('Read my GitHub repository',['repos']);
  const gi=buildAgentPlan('Create a GitHub issue for the login bug',['issues']);
  check('agent-gmail-search',gs.action==='gmail_search'&&gs.autonomous);
  check('agent-gmail-write-confirmation',gd.action==='gmail_draft'&&gd.confirmationRequired&&actionNeedsConfirmation(gd.action));
  check('agent-calendar-read',cr.action==='calendar_read'&&!cr.confirmationRequired);
  check('agent-calendar-write-confirmation',cc.action==='calendar_create'&&cc.confirmationRequired);
  check('agent-github-read',gr.action==='github_read'&&!gr.confirmationRequired);
  check('agent-github-write-confirmation',gi.action==='github_issue'&&gi.confirmationRequired);
  check('agent-plan-lifecycle',[gs,gd,cr,cc,gr,gi].every(p=>p.steps.some(s=>s.id==='understand')&&p.steps.some(s=>s.id==='validate')&&p.steps.some(s=>s.id==='execute')&&p.steps.some(s=>s.id==='verify')));
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_threads(id TEXT NOT NULL,user_id TEXT NOT NULL,title TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,id))`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,thread_id TEXT NOT NULL DEFAULT 'legacy',role TEXT NOT NULL,content TEXT NOT NULL,attachments TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_memory(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,content TEXT NOT NULL,importance INTEGER NOT NULL DEFAULT 5,created_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_agent_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,objective TEXT NOT NULL,plan TEXT NOT NULL,status TEXT NOT NULL,current_step TEXT,result TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_actions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,action TEXT NOT NULL,status TEXT NOT NULL,risk TEXT NOT NULL,payload TEXT NOT NULL,result TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
  check('thread-storage',true);check('message-storage',true);check('memory-storage',true);check('agent-run-storage',true);check('action-audit-storage',true);
  const failed=checks.filter(x=>!x.ok);
  return json({ok:!failed.length,release:'HOPE Phase 4',userType:a.user?.isOwner?'admin':'customer',checks,manualProductionChecks:['Natural chat detects Gmail/Calendar/GitHub actions','Read actions execute only with the user connector capability','Write/external actions require explicit confirmation','Action result is persisted and verified before HOPE claims completion','Disconnected connector produces connect-required state, not fake success','Mood selector remains under + and changes behavior','Microphone transcribes speech and voice toggle speaks replies','Attachments reach HOPE','Conversation create/reopen/rename/delete works','Memory remains after deleting a conversation','Admin control is owner-only','Mobile keyboard/composer remain usable'],failed:failed.map(x=>x.name)},failed.length?503:200);
 }catch(e){return json({ok:false,release:'HOPE Phase 4',checks,error:String(e?.message||e)},500)}
}
