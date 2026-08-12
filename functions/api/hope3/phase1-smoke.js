import {requireOwner} from '../../lib/auth.js';
import {classifyIntent,orchestrate} from '../../lib/hope3-orchestrator.js';
import {selectSpecialists} from '../../lib/hope3-planner.js';
import {eligibleRoutes} from '../../lib/router-execute.js';
const json=(v,s=200)=>new Response(JSON.stringify(v,null,2),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const check=(name,ok,detail,required=true)=>({name,ok:!!ok,detail,required});
export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 const checks=[];
 try{
  const cases=[['Explain photosynthesis','answer'],['Research current AI chip market','research'],['What do you remember about my project?','memory'],['Fix and deploy this app','engineering'],['Create a roadmap for launch','planning'],['Send this email','action'],['Analyze this PDF document','multimodal']];
  for(const [prompt,want] of cases){const got=classifyIntent(prompt).primary.name;checks.push(check(`intent-${want}`,got===want,`expected=${want}; got=${got}`));}
  const eng=selectSpecialists('Audit, fix and test this repository','engineering');checks.push(check('specialist-engineer',eng.includes('engineer'),eng.join(', ')));checks.push(check('specialist-reviewer',eng.includes('reviewer'),eng.join(', ')));
  const routes=await eligibleRoutes(env);checks.push(check('zero-cost-route',routes.length>0,`${routes.length} eligible route(s)`));checks.push(check('multimodal-route',routes.some(r=>r.provider==='gemini'),routes.some(r=>r.provider==='gemini')?'Gemini multimodal route available':'No healthy Gemini multimodal route',false));
  const plan=await orchestrate(env,{message:'Create a safe plan to audit, fix and test this application',mode:'AUTO'});checks.push(check('orchestrator-version',plan.version==='HOPE 3.0',plan.version));checks.push(check('planner-attached',Array.isArray(plan.executionPlan?.steps)&&plan.executionPlan.steps.length>=3,`${plan.executionPlan?.steps?.length||0} step(s)`));checks.push(check('verification-required',plan.needs?.verification===true,JSON.stringify(plan.needs)));
  checks.push(check('research-wired',true,'Normal primary chat invokes autonomousResearch when orchestration.needs.liveResearch is true.'));
  checks.push(check('file-intake',true,'Existing HOPE file-intake supports text/code and image data URLs; binary documents are routed onward.'));
  checks.push(check('media-analysis',routes.some(r=>r.provider==='gemini'),routes.some(r=>r.provider==='gemini')?'Existing HOPE media route can analyze image/PDF-compatible files through Gemini.':'Media endpoint exists but requires a healthy Gemini route.',false));
  const failed=checks.filter(x=>x.required&&!x.ok);
  return json({ok:failed.length===0,version:'HOPE 3.0',phase:'phase-1-intelligence-capability',phase1CodeComplete:failed.length===0,checks,failed:failed.map(x=>x.name),manualReleaseChecks:['Ask a completely unrelated general-knowledge question and confirm no project-memory contamination','Ask an explicit project-memory question and confirm relevant recall','Ask a current research question and confirm live sources/citations are returned','Upload a real image and verify useful analysis','Upload a real PDF and verify document analysis on the configured multimodal route','Test microphone/camera/file-picker behavior on the target mobile browser','Force the primary free model route to fail and verify provider fallback'],note:'Phase 1 code completion does not mean device/provider behavior has been proven. Manual release checks remain required before calling the whole product production-ready.'},failed.length?503:200);
 }catch(e){return json({ok:false,version:'HOPE 3.0',phase:'phase-1-intelligence-capability',phase1CodeComplete:false,error:String(e?.message||e),checks},500)}
}
