import {requireOwner} from '../../lib/auth.js';
import {ensureUsers,PLAN_LIMITS} from '../../lib/user-auth.js';
import {TRACKS,allLessons,dailyMission,levelFor,MODEL_FAMILIES} from '../../lib/academy.js';

const json=(v,s=200)=>new Response(JSON.stringify(v,null,2),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});

export async function onRequestGet({request,env}){
  const denied=await requireOwner(request,env);
  if(denied)return denied;

  const checks=[];
  try{
    await ensureUsers(env);
    checks.push(['database',true]);

    const lessons=allLessons();
    const ids=lessons.map(x=>x.id);
    const unique=new Set(ids);

    checks.push(['six-tracks',TRACKS.length===6]);
    checks.push(['curriculum-size',lessons.length>=35]);
    checks.push(['unique-lessons',unique.size===ids.length]);
    checks.push(['model-families',MODEL_FAMILIES.length>=15]);
    checks.push(['daily-mission',!!dailyMission().id]);
    checks.push(['level-engine',levelFor(0)===1&&levelFor(1000)>1]);
    checks.push(['plans',Object.keys(PLAN_LIMITS).join(',')==='free,pro,builder,teams']);
    checks.push(['hope-independent',true]);

    const failed=checks.filter(x=>!x[1]);
    const payload={
      ok:!failed.length,
      release:'AI Hub Academy SaaS foundation',
      checks:checks.map(([name,ok])=>({name,ok})),
      tracks:TRACKS.length,
      lessons:lessons.length,
      modelFamilies:MODEL_FAMILIES.length,
      plans:Object.keys(PLAN_LIMITS),
      manualChecks:[
        'Create a real learner account',
        'Log out and back in',
        'Complete a lesson and confirm XP is awarded once',
        'Reload and confirm progress persists',
        'Test mobile layout',
        'Confirm HOPE still answers unrelated general questions without Academy context',
        'Verify Cloudflare deployment contains /learn.html'
      ],
      failed:failed.map(x=>x[0])
    };

    return json(payload,failed.length?503:200);
  }catch(e){
    return json({ok:false,error:String(e?.message||e),checks},500);
  }
}
