import {requireOwner} from '../../lib/auth.js';
import {ACCESS_CLASSES,PREMIUM_APPROVAL_MODES,ensureAIEntitlementSchema} from '../../lib/ai-entitlements.js';
import {AI_PROVIDERS,ensureAIProviderSchema} from '../../lib/ai-provider-core.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const now=()=>new Date().toISOString();

export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 await ensureAIProviderSchema(env);await ensureAIEntitlementSchema(env);
 const [modelAccess,plans,userOverrides,wallets,decisions]=await Promise.all([
  env.DB.prepare(`SELECT * FROM ai_model_access ORDER BY provider,model_id,owner_scope`).all(),
  env.DB.prepare(`SELECT * FROM ai_plan_entitlements ORDER BY plan_id,capability`).all(),
  env.DB.prepare(`SELECT * FROM ai_user_entitlements ORDER BY updated_at DESC LIMIT 200`).all(),
  env.DB.prepare(`SELECT user_id,COALESCE(SUM(amount_usd),0) balance_usd FROM ai_wallet_ledger GROUP BY user_id ORDER BY balance_usd DESC LIMIT 200`).all(),
  env.DB.prepare(`SELECT * FROM ai_routing_decisions ORDER BY id DESC LIMIT 100`).all()
 ]);
 return json({ok:true,accessClasses:ACCESS_CLASSES,approvalModes:PREMIUM_APPROVAL_MODES,providers:Object.entries(AI_PROVIDERS).map(([id,p])=>({id,name:p.name,premium:Boolean(p.premium),freeCapable:Boolean(p.freeCapable),capabilities:p.capabilities})),modelAccess:modelAccess.results||[],planEntitlements:plans.results||[],userOverrides:userOverrides.results||[],wallets:wallets.results||[],recentDecisions:decisions.results||[]});
}

export async function onRequestPost({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 await ensureAIProviderSchema(env);await ensureAIEntitlementSchema(env);
 const b=await request.json().catch(()=>({})),action=String(b.action||'');
 if(action==='set-model-access'){
  const provider=String(b.provider||''),modelId=String(b.modelId||''),accessClass=String(b.accessClass||'free'),ownerScope=String(b.ownerScope||'platform');
  if(!AI_PROVIDERS[provider]||!modelId)return json({ok:false,error:'Valid provider and modelId are required'},400);
  if(!ACCESS_CLASSES.includes(accessClass))return json({ok:false,error:'Invalid access class'},400);
  if(accessClass==='premium'&&provider!=='openai'&&provider!=='wan')return json({ok:false,error:'Only OpenAI and Wan may be platform-funded premium providers in this phase'},400);
  const cost=Math.max(0,Number(b.estimatedUnitCostUsd||0));
  await env.DB.prepare(`INSERT INTO ai_model_access(provider,model_id,access_class,owner_scope,enabled,super_admin_only,estimated_unit_cost_usd,metadata,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(provider,model_id,owner_scope) DO UPDATE SET access_class=excluded.access_class,enabled=excluded.enabled,super_admin_only=excluded.super_admin_only,estimated_unit_cost_usd=excluded.estimated_unit_cost_usd,metadata=excluded.metadata,updated_at=excluded.updated_at`).bind(provider,modelId,accessClass,ownerScope,b.enabled===false?0:1,b.superAdminOnly?1:0,cost,JSON.stringify(b.metadata||{}),now()).run();
  return json({ok:true,action,provider,modelId,accessClass,ownerScope,estimatedUnitCostUsd:cost});
 }
 if(action==='set-plan-entitlement'){
  const planId=String(b.planId||'').trim(),capability=String(b.capability||'').trim(),approvalMode=String(b.approvalMode||'disabled');if(!planId||!capability)return json({ok:false,error:'planId and capability are required'},400);if(!PREMIUM_APPROVAL_MODES.includes(approvalMode))return json({ok:false,error:'Invalid approval mode'},400);
  const allowance=Math.max(0,Number(b.monthlyAllowanceUsd||0));await env.DB.prepare(`INSERT INTO ai_plan_entitlements(plan_id,capability,enabled,monthly_allowance_usd,approval_mode,metadata,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(plan_id,capability) DO UPDATE SET enabled=excluded.enabled,monthly_allowance_usd=excluded.monthly_allowance_usd,approval_mode=excluded.approval_mode,metadata=excluded.metadata,updated_at=excluded.updated_at`).bind(planId,capability,b.enabled===false?0:1,allowance,approvalMode,JSON.stringify(b.metadata||{}),now()).run();return json({ok:true,action,planId,capability,monthlyAllowanceUsd:allowance,approvalMode});
 }
 if(action==='set-user-entitlement'){
  const userId=String(b.userId||'').trim(),capability=String(b.capability||'').trim();if(!userId||!capability)return json({ok:false,error:'userId and capability are required'},400);const approvalMode=b.approvalMode==null?null:String(b.approvalMode);if(approvalMode&&!PREMIUM_APPROVAL_MODES.includes(approvalMode))return json({ok:false,error:'Invalid approval mode'},400);const allowance=b.monthlyAllowanceUsd==null?null:Math.max(0,Number(b.monthlyAllowanceUsd));await env.DB.prepare(`INSERT INTO ai_user_entitlements(user_id,capability,enabled,monthly_allowance_usd,approval_mode,metadata,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,capability) DO UPDATE SET enabled=excluded.enabled,monthly_allowance_usd=excluded.monthly_allowance_usd,approval_mode=excluded.approval_mode,metadata=excluded.metadata,updated_at=excluded.updated_at`).bind(userId,capability,b.enabled===false?0:1,allowance,approvalMode,JSON.stringify(b.metadata||{}),now()).run();return json({ok:true,action,userId,capability});
 }
 if(action==='wallet-credit'){
  const userId=String(b.userId||'').trim(),amount=Math.max(0,Number(b.amountUsd||0));if(!userId||!amount)return json({ok:false,error:'userId and positive amountUsd are required'},400);await env.DB.prepare(`INSERT INTO ai_wallet_ledger(user_id,amount_usd,kind,note,created_at) VALUES(?,?,'credit',?,?)`).bind(userId,amount,String(b.note||'Super Admin credit').slice(0,240),now()).run();return json({ok:true,action,userId,amountUsd:amount});
 }
 return json({ok:false,error:'Unsupported action'},400);
}
