import {requireOwner} from '../../lib/auth.js';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});

async function ensure(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS provider_settings(
    provider TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    warning_percent INTEGER NOT NULL DEFAULT 80,
    daily_budget_usd REAL NOT NULL DEFAULT 0,
    monthly_budget_usd REAL NOT NULL DEFAULT 0,
    emergency_stop INTEGER NOT NULL DEFAULT 0,
    last_success_at TEXT,
    last_error TEXT,
    updated_at TEXT NOT NULL
  )`).run();
}

async function snapshot(env){
  await ensure(env);
  const [integrations,settings,health,today,month]=await Promise.all([
    env.DB.prepare(`SELECT id provider,label,model,verified_free,enabled integration_enabled,updated_at FROM integrations ORDER BY provider`).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT * FROM provider_settings ORDER BY provider`).all(),
    env.DB.prepare(`SELECT * FROM provider_health`).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT provider,COUNT(*) requests,SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) successes,COALESCE(SUM(estimated_cost_usd),0) estimated_cost_usd FROM request_logs WHERE created_at>=? GROUP BY provider`).bind(new Date().toISOString().slice(0,10)).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT provider,COUNT(*) requests,SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) successes,COALESCE(SUM(estimated_cost_usd),0) estimated_cost_usd FROM request_logs WHERE created_at>=? GROUP BY provider`).bind(new Date().toISOString().slice(0,7)+'-01').all().catch(()=>({results:[]}))
  ]);
  const map=list=>Object.fromEntries((list.results||[]).map(x=>[x.provider,x])),i=map(integrations),s=map(settings),h=map(health),d=map(today),m=map(month),ids=[...new Set(['openai','openrouter',...Object.keys(i),...Object.keys(s)])].filter(x=>x!=='global');
  return ids.map(provider=>({provider,configured:!!i[provider],model:i[provider]?.model||'',enabled:!!(s[provider]?.enabled??i[provider]?.integration_enabled),verifiedFree:!!i[provider]?.verified_free,emergencyStop:!!s[provider]?.emergency_stop,warningPercent:Number(s[provider]?.warning_percent??80),dailyBudgetUsd:Number(s[provider]?.daily_budget_usd||0),monthlyBudgetUsd:Number(s[provider]?.monthly_budget_usd||0),health:typeof h[provider]?.healthy==='number'?(h[provider].healthy?'healthy':'unhealthy'):'unchecked',lastSuccessfulCall:s[provider]?.last_success_at||null,lastError:s[provider]?.last_error||h[provider]?.last_error||h[provider]?.error||null,usageToday:{requests:Number(d[provider]?.requests||0),successful:Number(d[provider]?.successes||0),estimatedCostUsd:Number(d[provider]?.estimated_cost_usd||0)},usageMonth:{requests:Number(m[provider]?.requests||0),successful:Number(m[provider]?.successes||0),estimatedCostUsd:Number(m[provider]?.estimated_cost_usd||0)},updatedAt:s[provider]?.updated_at||i[provider]?.updated_at||null}));
}

export async function onRequestGet({request,env}){const denied=await requireOwner(request,env);if(denied)return denied;return json({ok:true,emergencyStop:Boolean((await env.DB.prepare(`SELECT 1 stopped FROM provider_settings WHERE emergency_stop=1 LIMIT 1`).first().catch(()=>null))?.stopped),providers:await snapshot(env)})}

export async function onRequestPost({request,env}){
  const denied=await requireOwner(request,env);if(denied)return denied;
  await ensure(env);
  const body=await request.json().catch(()=>({})),provider=String(body.provider||'').trim(),now=new Date().toISOString();
  if(body.action==='emergency-stop'){
    const stopped=body.stopped!==false;
    const statements=[env.DB.prepare(`INSERT INTO provider_settings(provider,enabled,emergency_stop,updated_at) VALUES('global',0,?,?) ON CONFLICT(provider) DO UPDATE SET emergency_stop=excluded.emergency_stop,updated_at=excluded.updated_at`).bind(stopped?1:0,now)];
    if(stopped)statements.unshift(env.DB.prepare(`UPDATE integrations SET enabled=0,updated_at=?`).bind(now));
    await env.DB.batch(statements);
    return json({ok:true,emergencyStop:stopped});
  }
  if(!provider)return json({ok:false,error:'provider is required'},400);
  if(body.action==='disconnect'){
    await env.DB.batch([env.DB.prepare(`DELETE FROM integrations WHERE id=?`).bind(provider),env.DB.prepare(`DELETE FROM provider_models WHERE provider=?`).bind(provider),env.DB.prepare(`DELETE FROM provider_settings WHERE provider=?`).bind(provider)]);
    return json({ok:true,provider,disconnected:true});
  }
  if(body.action!=='update')return json({ok:false,error:'unsupported action'},400);
  const enabled=body.enabled===true,configured=await env.DB.prepare(`SELECT id FROM integrations WHERE id=?`).bind(provider).first();
  if(enabled&&!configured)return json({ok:false,error:'Connect and test this provider before enabling it.'},409);
  const warning=Math.max(1,Math.min(100,Number(body.warningPercent??80))),daily=Math.max(0,Number(body.dailyBudgetUsd||0)),monthly=Math.max(0,Number(body.monthlyBudgetUsd||0));
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO provider_settings(provider,enabled,warning_percent,daily_budget_usd,monthly_budget_usd,emergency_stop,updated_at) VALUES(?,?,?,?,?,0,?) ON CONFLICT(provider) DO UPDATE SET enabled=excluded.enabled,warning_percent=excluded.warning_percent,daily_budget_usd=excluded.daily_budget_usd,monthly_budget_usd=excluded.monthly_budget_usd,updated_at=excluded.updated_at`).bind(provider,enabled?1:0,warning,daily,monthly,now),
    env.DB.prepare(`UPDATE integrations SET enabled=?,updated_at=? WHERE id=?`).bind(enabled?1:0,now,provider)
  ]);
  return json({ok:true,provider,enabled,warningPercent:warning,dailyBudgetUsd:daily,monthlyBudgetUsd:monthly});
}
