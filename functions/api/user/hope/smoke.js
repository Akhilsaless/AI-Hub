import {requireUser} from '../../../lib/user-auth.js';
import {classifyIntent} from '../../../lib/hope3-orchestrator.js';
const json=(v,s=200)=>new Response(JSON.stringify(v,null,2),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){
 const a=await requireUser(request,env);if(a.response)return a.response;
 const checks=[];
 const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
 try{
  check('authenticated-user',!!a.user?.id,a.user?.isOwner?'owner uses universal HOPE':'customer uses universal HOPE');
  check('owner-role-compatible',a.user?.isOwner? a.user.plan==='teams':true,a.user?.plan||'');
  check('general-intent',classifyIntent('Explain why the sky is blue').primary.name!=='memory');
  check('research-intent',!!classifyIntent('Research current AI model news').primary.name);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_threads(id TEXT NOT NULL,user_id TEXT NOT NULL,title TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,id))`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,thread_id TEXT NOT NULL DEFAULT 'legacy',role TEXT NOT NULL,content TEXT NOT NULL,attachments TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_hope_memory(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,content TEXT NOT NULL,importance INTEGER NOT NULL DEFAULT 5,created_at TEXT NOT NULL)`).run();
  check('thread-storage',true);
  check('message-storage',true);
  check('memory-storage',true);
  const failed=checks.filter(x=>!x.ok);
  return json({ok:!failed.length,release:'HOPE Phase 1',userType:a.user?.isOwner?'admin':'customer',checks,manualProductionChecks:['Mood selector changes response tone','Microphone transcribes speech','Voice toggle speaks HOPE reply','Plus menu opens actions','Text attachment content reaches HOPE','Camera/file metadata is preserved','Create/reopen/rename/delete one conversation','Memory remains after deleting a conversation','Admin sees Admin control; customer does not','Mobile keyboard and composer remain usable'],failed:failed.map(x=>x.name)},failed.length?503:200);
 }catch(e){return json({ok:false,release:'HOPE Phase 1',checks,error:String(e?.message||e)},500)}
}
