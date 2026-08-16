import {requireUser} from '../../lib/user-auth.js';
import {ensureHyvoraMarketingSchema,id,now,parseJson} from '../../lib/hyvora-marketing.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const text=(v,max)=>String(v||'').trim().slice(0,max);

export async function onRequestGet({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;await ensureHyvoraMarketingSchema(env);
 const rows=await env.DB.prepare(`SELECT p.*,a.content,a.asset_type FROM marketing_publication_jobs p JOIN marketing_assets a ON a.id=p.asset_id WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 100`).bind(auth.user.id).all();
 return json({ok:true,jobs:(rows.results||[]).map(r=>({...r,content:parseJson(r.content,{})}))});
}

export async function onRequestPost({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;if(!String(request.headers.get('content-type')||'').includes('application/json'))return json({ok:false,error:'Content-Type must be application/json'},415);
 await ensureHyvoraMarketingSchema(env);const body=await request.json().catch(()=>({})),assetId=text(body.assetId,120),scheduledFor=text(body.scheduledFor,40);
 const asset=await env.DB.prepare(`SELECT * FROM marketing_assets WHERE id=? AND user_id=?`).bind(assetId,auth.user.id).first();if(!asset)return json({ok:false,error:'Asset not found'},404);
 const campaign=await env.DB.prepare(`SELECT * FROM marketing_campaigns WHERE id=? AND user_id=?`).bind(asset.campaign_id,auth.user.id).first();if(!campaign)return json({ok:false,error:'Campaign not found'},404);
 const jobId=id('pub'),stamp=now();await env.DB.prepare(`INSERT INTO marketing_publication_jobs(id,campaign_id,asset_id,user_id,platform,status,scheduled_for,created_at,updated_at) VALUES(?,?,?,?,?,'awaiting_approval',?,?,?)`).bind(jobId,campaign.id,asset.id,auth.user.id,asset.platform,scheduledFor||null,stamp,stamp).run();
 await env.DB.prepare(`UPDATE marketing_assets SET status='awaiting_approval',updated_at=? WHERE id=? AND user_id=?`).bind(stamp,asset.id,auth.user.id).run();
 return json({ok:true,job:{id:jobId,status:'awaiting_approval',platform:asset.platform,scheduledFor:scheduledFor||null,publishingEnabled:false,message:'Approval recorded as pending. No external platform call has been made.'}},201);
}

export async function onRequestPatch({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;if(!String(request.headers.get('content-type')||'').includes('application/json'))return json({ok:false,error:'Content-Type must be application/json'},415);
 await ensureHyvoraMarketingSchema(env);const body=await request.json().catch(()=>({})),jobId=text(body.jobId,120),decision=text(body.decision,20);
 if(!['approve','reject'].includes(decision))return json({ok:false,error:'decision must be approve or reject'},400);
 const job=await env.DB.prepare(`SELECT * FROM marketing_publication_jobs WHERE id=? AND user_id=?`).bind(jobId,auth.user.id).first();if(!job)return json({ok:false,error:'Publication job not found'},404);
 const status=decision==='approve'?'approved_waiting_connection':'rejected',stamp=now();await env.DB.prepare(`UPDATE marketing_publication_jobs SET status=?,updated_at=? WHERE id=? AND user_id=?`).bind(status,stamp,jobId,auth.user.id).run();await env.DB.prepare(`UPDATE marketing_assets SET status=?,updated_at=? WHERE id=? AND user_id=?`).bind(status,stamp,job.asset_id,auth.user.id).run();
 return json({ok:true,status,publishingEnabled:false,message:decision==='approve'?'Approved safely. It will remain queued until a verified platform publishing adapter is connected.':'Draft rejected. Nothing was published.'});
}
