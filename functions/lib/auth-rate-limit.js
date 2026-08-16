const enc=new TextEncoder();

async function actorHash(request,env,scope){
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const key=await crypto.subtle.importKey('raw',enc.encode(`${env.HUB_MASTER_KEY}:auth-rate-limit`),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(`${scope}:${ip}`)));
 return Array.from(signature,b=>b.toString(16).padStart(2,'0')).join('');
}

async function ensure(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_rate_limits(scope TEXT NOT NULL,actor_hash TEXT NOT NULL,window_started INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,blocked_until INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(scope,actor_hash))`).run();
}

export async function authRateStatus(request,env,scope,{limit=10,windowSeconds=900}={}){
 await ensure(env);
 const actor=await actorHash(request,env,scope),now=Math.floor(Date.now()/1000);
 const row=await env.DB.prepare(`SELECT window_started,attempts,blocked_until FROM auth_rate_limits WHERE scope=? AND actor_hash=?`).bind(scope,actor).first();
 if(!row)return {ok:true,actor,remaining:limit};
 if(Number(row.blocked_until)>now)return {ok:false,actor,retryAfter:Number(row.blocked_until)-now,remaining:0};
 if(now-Number(row.window_started)>=windowSeconds)return {ok:true,actor,remaining:limit};
 return {ok:true,actor,remaining:Math.max(0,limit-Number(row.attempts||0))};
}

export async function recordAuthAttempt(env,scope,actor,{limit=10,windowSeconds=900,blockSeconds=900}={}){
 const now=Math.floor(Date.now()/1000),stamp=new Date().toISOString();
 await env.DB.prepare(`INSERT INTO auth_rate_limits(scope,actor_hash,window_started,attempts,blocked_until,updated_at) VALUES(?,?,?,1,0,?) ON CONFLICT(scope,actor_hash) DO UPDATE SET blocked_until=CASE WHEN ?-auth_rate_limits.window_started>=? THEN 0 WHEN auth_rate_limits.attempts+1>=? THEN ?+? ELSE auth_rate_limits.blocked_until END,attempts=CASE WHEN ?-auth_rate_limits.window_started>=? THEN 1 ELSE auth_rate_limits.attempts+1 END,window_started=CASE WHEN ?-auth_rate_limits.window_started>=? THEN ? ELSE auth_rate_limits.window_started END,updated_at=?`).bind(scope,actor,now,stamp,now,windowSeconds,limit,now,blockSeconds,now,windowSeconds,now,windowSeconds,now,stamp).run();
 const row=await env.DB.prepare(`SELECT attempts,blocked_until FROM auth_rate_limits WHERE scope=? AND actor_hash=?`).bind(scope,actor).first();
 return {attempts:Number(row?.attempts||0),blockedUntil:Number(row?.blocked_until||0)};
}

export async function clearAuthAttempts(env,scope,actor){
 await env.DB.prepare(`DELETE FROM auth_rate_limits WHERE scope=? AND actor_hash=?`).bind(scope,actor).run();
}

export function requireJsonRequest(request){
 return /^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'');
}
