import {PLAN_LIMITS} from './user-auth.js';
export const PLANS={
 free:{id:'free',name:'Free',priceInr:0,features:['hope','academy_basic','models_free','skill_passport_basic'],limits:PLAN_LIMITS.free},
 pro:{id:'pro',name:'Pro',priceInr:699,features:['hope','research','academy_full','models_free','skill_passport_full','proof_arena','projects'],limits:PLAN_LIMITS.pro},
 builder:{id:'builder',name:'Builder',priceInr:1699,features:['hope','research','academy_full','models_free','skill_passport_full','proof_arena','projects','builder','automations','advanced_missions'],limits:PLAN_LIMITS.builder},
 teams:{id:'teams',name:'Teams',priceInr:null,features:['hope','research','academy_full','models_free','skill_passport_full','proof_arena','projects','builder','automations','advanced_missions','team_admin','team_skill_analytics','shared_workspaces'],limits:PLAN_LIMITS.teams}
};
export function plan(id='free'){return PLANS[id]||PLANS.free}
export function hasFeature(user,feature){return plan(user?.plan).features.includes(feature)}
export function periodKey(metric,date=new Date()){return /weekly/i.test(metric)?date.toISOString().slice(0,10):date.toISOString().slice(0,10)}
export async function usage(env,userId,metric,period=periodKey(metric)){const r=await env.DB.prepare(`SELECT value FROM user_usage WHERE user_id=? AND metric=? AND period=?`).bind(userId,metric,period).first();return Number(r?.value||0)}
export async function consume(env,user,metric,amount=1){const p=plan(user.plan),limit=Number(p.limits?.[metric]??Infinity),period=periodKey(metric),used=await usage(env,user.id,metric,period);if(Number.isFinite(limit)&&used+amount>limit)return {ok:false,used,limit,remaining:Math.max(0,limit-used)};await env.DB.prepare(`INSERT INTO user_usage(user_id,metric,period,value) VALUES(?,?,?,?) ON CONFLICT(user_id,metric,period) DO UPDATE SET value=value+excluded.value`).bind(user.id,metric,period,amount).run();return {ok:true,used:used+amount,limit,remaining:Number.isFinite(limit)?Math.max(0,limit-used-amount):null}}
export function entitlementSnapshot(user){const p=plan(user?.plan);return {plan:p.id,name:p.name,features:p.features,limits:p.limits,priceInr:p.priceInr}}
