import {requireUser} from '../../lib/user-auth.js';
import {executeHopeGateway} from '../../lib/hope-gateway.js';
import {ensureHyvoraMarketingSchema,id,now,parseJson} from '../../lib/hyvora-marketing.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const text=(v,max)=>String(v||'').trim().slice(0,max);

export async function onRequestGet({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;await ensureHyvoraMarketingSchema(env);
 const url=new URL(request.url),campaignId=text(url.searchParams.get('campaignId'),120);
 const stmt=campaignId?env.DB.prepare(`SELECT * FROM marketing_assets WHERE user_id=? AND campaign_id=? ORDER BY created_at DESC`).bind(auth.user.id,campaignId):env.DB.prepare(`SELECT * FROM marketing_assets WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).bind(auth.user.id);
 const rows=await stmt.all();
 return json({ok:true,assets:(rows.results||[]).map(r=>({...r,metadata:parseJson(r.metadata,{})}))});
}

export async function onRequestPost({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;if(!String(request.headers.get('content-type')||'').includes('application/json'))return json({ok:false,error:'Content-Type must be application/json'},415);
 await ensureHyvoraMarketingSchema(env);const body=await request.json().catch(()=>({})),campaignId=text(body.campaignId,120),platform=text(body.platform,40),assetType=text(body.assetType||'post',40);
 if(!campaignId||!platform)return json({ok:false,error:'campaignId and platform are required'},400);
 const campaign=await env.DB.prepare(`SELECT * FROM marketing_campaigns WHERE id=? AND user_id=?`).bind(campaignId,auth.user.id).first();if(!campaign)return json({ok:false,error:'Campaign not found'},404);
 const allowedPlatforms=parseJson(campaign.platforms,[]);if(!allowedPlatforms.includes(platform))return json({ok:false,error:'Platform is not enabled for this campaign'},400);
 const brand=await env.DB.prepare(`SELECT * FROM marketing_brand_profiles WHERE user_id=?`).bind(auth.user.id).first();
 const prompt=`Create one publish-ready ${assetType} draft for ${platform}. Return strict JSON with keys hook, body, cta, hashtags (array), notes. Brand=${JSON.stringify({name:brand?.brand_name,description:brand?.description,audience:brand?.audience,offer:brand?.offer,voice:brand?.voice,guardrails:parseJson(brand?.guardrails,[])})}. Objective=${campaign.objective}. Strategy=${campaign.strategy}. Do not fabricate testimonials, metrics, partnerships or results. Keep claims verifiable. This is a draft only; do not claim it was published.`;
 const ai=await executeHopeGateway(env,{user:auth.user,prompt,intent:'strategy',system:'You are HYVORA Content Studio. Produce strong platform-native drafts, grounded in the provided brand facts. Return strict JSON only.',messages:[{role:'user',content:prompt}]});
 let draft;try{const raw=String(ai.content||ai.text||ai.output||'').replace(/^```json\s*|\s*```$/g,'');draft=JSON.parse(raw)}catch{draft={hook:`${campaign.name}: ${campaign.objective}`,body:`A practical ${platform} post focused on ${campaign.objective}.`,cta:'Learn more or take the next relevant action.',hashtags:[],notes:'Deterministic fallback draft; review before publishing.'}}
 const assetId=id('asset'),stamp=now();await env.DB.prepare(`INSERT INTO marketing_assets(id,campaign_id,user_id,platform,asset_type,content,status,metadata,created_at,updated_at) VALUES(?,?,?,?,?,?,'draft',?,?,?)`).bind(assetId,campaignId,auth.user.id,platform,assetType,JSON.stringify(draft),JSON.stringify({aiUsed:Boolean(ai.ok),reasoning:ai.reasoning||null}),stamp,stamp).run();
 return json({ok:true,asset:{id:assetId,campaignId,platform,assetType,status:'draft',content:draft}},201);
}
