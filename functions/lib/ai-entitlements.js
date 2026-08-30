const now=()=>new Date().toISOString();
export const ACCESS_CLASSES=['free','bonus','byok','premium'];
export const PREMIUM_APPROVAL_MODES=['automatic','manual','disabled'];

export async function ensureAIEntitlementSchema(env){
 const q=[
 `CREATE TABLE IF NOT EXISTS ai_model_access(provider TEXT NOT NULL,model_id TEXT NOT NULL,access_class TEXT NOT NULL DEFAULT 'free',owner_scope TEXT NOT NULL DEFAULT 'platform',enabled INTEGER NOT NULL DEFAULT 1,super_admin_only INTEGER NOT NULL DEFAULT 0,estimated_unit_cost_usd REAL NOT NULL DEFAULT 0,metadata TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL,PRIMARY KEY(provider,model_id,owner_scope))`,
 `CREATE TABLE IF NOT EXISTS ai_plan_entitlements(plan_id TEXT NOT NULL,capability TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,monthly_allowance_usd REAL NOT NULL DEFAULT 0,approval_mode TEXT NOT NULL DEFAULT 'disabled',metadata TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL,PRIMARY KEY(plan_id,capability))`,
 `CREATE TABLE IF NOT EXISTS ai_user_entitlements(user_id TEXT NOT NULL,capability TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,monthly_allowance_usd REAL,approval_mode TEXT,metadata TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL,PRIMARY KEY(user_id,capability))`,
 `CREATE TABLE IF NOT EXISTS ai_allowance_ledger(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,capability TEXT NOT NULL,provider TEXT,model_id TEXT,amount_usd REAL NOT NULL DEFAULT 0,source TEXT NOT NULL,correlation_id TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS ai_wallet_ledger(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,amount_usd REAL NOT NULL,kind TEXT NOT NULL,provider TEXT,model_id TEXT,correlation_id TEXT,note TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS ai_routing_decisions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,feature TEXT NOT NULL,provider TEXT,model_id TEXT,access_class TEXT,decision TEXT NOT NULL,reason TEXT,correlation_id TEXT,estimated_cost_usd REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL)`
 ];
 for(const sql of q)await env.DB.prepare(sql).run();
}

export function capabilityFor({feature='chat',mediaType='text'}={}){
 if(mediaType==='video'||feature==='video')return 'video-premium';
 if(feature==='image')return 'image-premium';
 if(['analysis','planning','coding','agent','reasoning'].includes(feature))return 'premium-reasoning';
 return 'premium-ai';
}

export async function resolveEntitlement(env,{userId,planId='free',capability}){
 await ensureAIEntitlementSchema(env);
 const user=userId?await env.DB.prepare(`SELECT * FROM ai_user_entitlements WHERE user_id=? AND capability=?`).bind(userId,capability).first().catch(()=>null):null;
 const plan=await env.DB.prepare(`SELECT * FROM ai_plan_entitlements WHERE plan_id=? AND capability=?`).bind(planId,capability).first().catch(()=>null);
 const src=user||plan;
 return {enabled:Boolean(src?.enabled),monthlyAllowanceUsd:Number(src?.monthly_allowance_usd||0),approvalMode:src?.approval_mode||'disabled',source:user?'user':plan?'plan':'none'};
}

export async function allowanceSpent(env,{userId,capability}){
 await ensureAIEntitlementSchema(env);const start=new Date().toISOString().slice(0,7)+'-01';
 const r=await env.DB.prepare(`SELECT COALESCE(SUM(amount_usd),0) n FROM ai_allowance_ledger WHERE user_id=? AND capability=? AND created_at>=?`).bind(userId,capability,start).first();
 return Number(r?.n||0);
}

export async function walletBalance(env,userId){
 await ensureAIEntitlementSchema(env);const r=await env.DB.prepare(`SELECT COALESCE(SUM(amount_usd),0) n FROM ai_wallet_ledger WHERE user_id=?`).bind(userId).first();return Number(r?.n||0);
}

export async function authorizePremium(env,{userId,planId='free',capability,estimatedCostUsd=0,manualApproved=false,correlationId=null}){
 const entitlement=await resolveEntitlement(env,{userId,planId,capability});
 if(!entitlement.enabled)return {allowed:false,reason:'premium_not_in_plan',entitlement};
 if(entitlement.approvalMode==='disabled')return {allowed:false,reason:'premium_disabled',entitlement};
 if(entitlement.approvalMode==='manual'&&!manualApproved)return {allowed:false,reason:'approval_required',entitlement};
 const spent=await allowanceSpent(env,{userId,capability}),remaining=Math.max(0,entitlement.monthlyAllowanceUsd-spent);
 if(estimatedCostUsd<=remaining)return {allowed:true,funding:'plan_allowance',remainingUsd:remaining,entitlement};
 const wallet=await walletBalance(env,userId);
 if(wallet>=estimatedCostUsd)return {allowed:true,funding:'wallet',walletBalanceUsd:wallet,entitlement};
 return {allowed:false,reason:'premium_allowance_exhausted',remainingUsd:remaining,walletBalanceUsd:wallet,entitlement};
}

export async function recordPremiumCharge(env,{userId,capability,provider,modelId,costUsd,funding,correlationId}){
 await ensureAIEntitlementSchema(env);const amount=Math.max(0,Number(costUsd||0));if(!amount)return;
 if(funding==='wallet')await env.DB.prepare(`INSERT INTO ai_wallet_ledger(user_id,amount_usd,kind,provider,model_id,correlation_id,note,created_at) VALUES(?,?,'usage',?,?,?,?,?)`).bind(userId,-amount,provider,modelId,correlationId,'Premium AI usage',now()).run();
 else await env.DB.prepare(`INSERT INTO ai_allowance_ledger(user_id,capability,provider,model_id,amount_usd,source,correlation_id,created_at) VALUES(?,?,?,?,?,'plan',?,?)`).bind(userId,capability,provider,modelId,amount,correlationId,now()).run();
}

export async function logRoutingDecision(env,{userId=null,feature='chat',provider=null,modelId=null,accessClass=null,decision,reason='',correlationId=null,estimatedCostUsd=0}){
 await ensureAIEntitlementSchema(env);await env.DB.prepare(`INSERT INTO ai_routing_decisions(user_id,feature,provider,model_id,access_class,decision,reason,correlation_id,estimated_cost_usd,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(userId,feature,provider,modelId,accessClass,decision,reason,correlationId,Number(estimatedCostUsd||0),now()).run().catch(()=>{});
}

export function defaultAccessClass(provider,freeCapable=false){if(provider==='openai'||provider==='wan')return 'premium';return freeCapable?'free':'byok'}
export function platformPremiumAllowed(provider,mediaType='text'){return mediaType==='video'?provider==='wan':provider==='openai'}
