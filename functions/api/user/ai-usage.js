import {requireUser} from '../../lib/user-auth.js';
import {ensureAIEntitlementSchema,resolveEntitlement,allowanceSpent,walletBalance} from '../../lib/ai-entitlements.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const CAPS=['premium-ai','premium-reasoning','video-premium'];
export async function onRequestGet({request,env}){
 const a=await requireUser(request,env);if(a.response)return a.response;await ensureAIEntitlementSchema(env);
 const entitlements=[];for(const capability of CAPS){const e=await resolveEntitlement(env,{userId:a.user.id,planId:a.user.plan||'free',capability}),spent=await allowanceSpent(env,{userId:a.user.id,capability});entitlements.push({capability,...e,spentUsd:spent,remainingUsd:Math.max(0,Number(e.monthlyAllowanceUsd||0)-spent)})}
 const wallet=await walletBalance(env,a.user.id),recent=await env.DB.prepare(`SELECT feature,provider,model_id,access_class,decision,reason,estimated_cost_usd,created_at FROM ai_routing_decisions WHERE user_id=? ORDER BY id DESC LIMIT 20`).bind(a.user.id).all().catch(()=>({results:[]}));
 return json({ok:true,plan:a.user.plan||'free',walletBalanceUsd:wallet,entitlements,recentRouting:recent.results||[]});
}
