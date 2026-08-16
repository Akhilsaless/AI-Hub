import {requireUser} from '../../lib/user-auth.js';
import {executeHopeGateway} from '../../lib/hope-gateway.js';
import {ensureHyvoraMarketingSchema,cleanList,parseJson,id,now,fallbackStrategy} from '../../lib/hyvora-marketing.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const text=(value,max)=>String(value||'').trim().slice(0,max);

export async function onRequestGet({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;await ensureHyvoraMarketingSchema(env);
 const rows=await env.DB.prepare(`SELECT id,name,objective,platforms,status,approval_mode,strategy,schedule,created_at,updated_at FROM marketing_campaigns WHERE user_id=? ORDER BY updated_at DESC LIMIT 50`).bind(auth.user.id).all();
 return json({ok:true,campaigns:(rows.results||[]).map(r=>({...r,platforms:parseJson(r.platforms),strategy:parseJson(r.strategy,{}),schedule:parseJson(r.schedule,{})}))});
}

export async function onRequestPost({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;if(!String(request.headers.get('content-type')||'').includes('application/json'))return json({ok:false,error:'Content-Type must be application/json'},415);
 const body=await request.json().catch(()=>({})),name=text(body.name,120),objective=text(body.objective,1000),platforms=cleanList(body.platforms);
 if(!name||!objective||!platforms.length)return json({ok:false,error:'Campaign name, objective and at least one platform are required'},400);
 await ensureHyvoraMarketingSchema(env);const brandRow=await env.DB.prepare(`SELECT * FROM marketing_brand_profiles WHERE user_id=?`).bind(auth.user.id).first();
 if(!brandRow)return json({ok:false,error:'Create your Brand Brain before starting a campaign'},409);
 const brand={brandName:brandRow.brand_name,description:brandRow.description,audience:brandRow.audience,offer:brandRow.offer,voice:brandRow.voice,goals:parseJson(brandRow.goals),guardrails:parseJson(brandRow.guardrails)};
 const prompt=`Create a concise social marketing campaign strategy as strict JSON with keys positioning, pillars (array), cadence (object), experiment, safety. Brand: ${JSON.stringify(brand)}. Objective: ${objective}. Platforms: ${platforms.join(', ')}. Do not claim real publishing, live analytics, or connected accounts. Respect the brand guardrails.`;
 const ai=await executeHopeGateway(env,{user:auth.user,prompt,intent:'strategy',system:'You are HYVORA Marketing Strategy. Return useful, grounded strategy. Never fabricate metrics, platform connections, publishing success, or customer results.',messages:[{role:'user',content:prompt}]});
 let strategy;try{const raw=String(ai.content||ai.text||ai.output||'').replace(/^```json\s*|\s*```$/g,'');strategy=JSON.parse(raw)}catch{strategy=fallbackStrategy({brand,objective,platforms})}
 const campaignId=id('camp'),stamp=now();await env.DB.prepare(`INSERT INTO marketing_campaigns(id,user_id,name,objective,platforms,status,approval_mode,strategy,schedule,created_at,updated_at) VALUES(?,?,?,?,?,'draft','before_publish',?,'{}',?,?)`).bind(campaignId,auth.user.id,name,objective,JSON.stringify(platforms),JSON.stringify(strategy),stamp,stamp).run();
 return json({ok:true,campaign:{id:campaignId,name,objective,platforms,status:'draft',approvalMode:'before_publish',strategy},ai:{used:Boolean(ai.ok),reasoning:ai.reasoning||null,fallback:!ai.ok}} ,201);
}
