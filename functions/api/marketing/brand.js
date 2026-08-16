import {requireUser} from '../../lib/user-auth.js';
import {ensureHyvoraMarketingSchema,cleanList,parseJson,now} from '../../lib/hyvora-marketing.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const text=(value,max)=>String(value||'').trim().slice(0,max);

export async function onRequestGet({request,env}){
  const auth=await requireUser(request,env);if(auth.response)return auth.response;
  await ensureHyvoraMarketingSchema(env);
  const row=await env.DB.prepare(`SELECT * FROM marketing_brand_profiles WHERE user_id=?`).bind(auth.user.id).first();
  if(!row)return json({ok:true,brand:null});
  return json({ok:true,brand:{brandName:row.brand_name,description:row.description,audience:row.audience,offer:row.offer,voice:row.voice,goals:parseJson(row.goals),platforms:parseJson(row.platforms),guardrails:parseJson(row.guardrails),updatedAt:row.updated_at}});
}

export async function onRequestPut({request,env}){
  const auth=await requireUser(request,env);if(auth.response)return auth.response;
  if(!String(request.headers.get('content-type')||'').includes('application/json'))return json({ok:false,error:'Content-Type must be application/json'},415);
  const body=await request.json().catch(()=>({}));
  const brand={brandName:text(body.brandName,100),description:text(body.description,1500),audience:text(body.audience,800),offer:text(body.offer,800),voice:text(body.voice||'clear, useful, credible',300),goals:cleanList(body.goals),platforms:cleanList(body.platforms),guardrails:cleanList(body.guardrails)};
  if(!brand.brandName)return json({ok:false,error:'Brand name is required'},400);
  await ensureHyvoraMarketingSchema(env);const updatedAt=now();
  await env.DB.prepare(`INSERT INTO marketing_brand_profiles(user_id,brand_name,description,audience,offer,voice,goals,platforms,guardrails,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET brand_name=excluded.brand_name,description=excluded.description,audience=excluded.audience,offer=excluded.offer,voice=excluded.voice,goals=excluded.goals,platforms=excluded.platforms,guardrails=excluded.guardrails,updated_at=excluded.updated_at`).bind(auth.user.id,brand.brandName,brand.description,brand.audience,brand.offer,brand.voice,JSON.stringify(brand.goals),JSON.stringify(brand.platforms),JSON.stringify(brand.guardrails),updatedAt).run();
  return json({ok:true,brand:{...brand,updatedAt}});
}
