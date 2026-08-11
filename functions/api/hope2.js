import { ensureHope2 } from '../lib/hope2-schema.js';
import { requireOwner } from '../lib/auth.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const id=p=>`${p}_${crypto.randomUUID()}`;
const clean=s=>String(s||'').trim();
export async function onRequest({request,env}){
  const auth=await requireOwner(request,env); if(auth instanceof Response) return auth;
  await ensureHope2(env);
  const url=new URL(request.url), op=url.searchParams.get('op')||'dashboard';
  if(request.method==='GET'){
    if(op==='dashboard'){
      const [goals,missions,approvals,memories]=await Promise.all([
        env.DB.prepare(`SELECT * FROM hope_goals WHERE status!='archived' ORDER BY priority DESC,updated_at DESC LIMIT 30`).all(),
        env.DB.prepare(`SELECT * FROM hope_missions ORDER BY updated_at DESC LIMIT 30`).all(),
        env.DB.prepare(`SELECT * FROM hope_approvals WHERE status='pending' ORDER BY created_at DESC LIMIT 30`).all(),
        env.DB.prepare(`SELECT id,memory_type,memory_key,content,source,confidence,importance,updated_at FROM hope_memories WHERE enabled=1 ORDER BY importance DESC,updated_at DESC LIMIT 30`).all()
      ]);
      return json({ok:true,goals:goals.results,missions:missions.results,approvals:approvals.results,memories:memories.results});
    }
    if(op==='continue'){
      const mission=await env.DB.prepare(`SELECT * FROM hope_missions WHERE status IN ('running','blocked','planned','waiting_approval') ORDER BY updated_at DESC LIMIT 1`).first();
      const goal=mission?.goal_id?await env.DB.prepare(`SELECT * FROM hope_goals WHERE id=?`).bind(mission.goal_id).first():await env.DB.prepare(`SELECT * FROM hope_goals WHERE status='active' ORDER BY priority DESC,updated_at DESC LIMIT 1`).first();
      const items=goal?await env.DB.prepare(`SELECT * FROM hope_goal_items WHERE goal_id=? ORDER BY position,id`).bind(goal.id).all():{results:[]};
      return json({ok:true,goal:goal||null,mission:mission||null,items:items.results||[],suggestedNextAction:mission?`Resume mission: ${mission.title}`:(goal?.next_action||null)});
    }
    return json({ok:false,error:'unknown operation'},400);
  }
  if(request.method!=='POST') return json({ok:false,error:'method not allowed'},405);
  let b={}; try{b=await request.json()}catch{return json({ok:false,error:'invalid JSON'},400)}
  const now=new Date().toISOString();
  if(op==='remember'){
    const type=clean(b.type)||'semantic', content=clean(b.content); if(!content)return json({ok:false,error:'content required'},400);
    const allowed=['personal','episodic','operational','goal','skill','failure','semantic']; if(!allowed.includes(type))return json({ok:false,error:'invalid memory type'},400);
    await env.DB.prepare(`INSERT INTO hope_memories(memory_type,memory_key,content,source,confidence,importance,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)`).bind(type,clean(b.key)||null,content,clean(b.source)||'user',Math.max(0,Math.min(1,Number(b.confidence??1))),Math.max(1,Math.min(10,Number(b.importance??5))),now,now).run();
    return json({ok:true});
  }
  if(op==='forget'){
    if(!b.id)return json({ok:false,error:'memory id required'},400); await env.DB.prepare(`UPDATE hope_memories SET enabled=0,updated_at=? WHERE id=?`).bind(now,b.id).run(); return json({ok:true});
  }
  if(op==='goal'){
    const title=clean(b.title); if(!title)return json({ok:false,error:'title required'},400); const gid=id('goal');
    await env.DB.prepare(`INSERT INTO hope_goals(id,title,description,status,priority,progress,next_action,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(gid,title,clean(b.description),b.status||'active',Math.max(1,Math.min(5,Number(b.priority??3))),0,clean(b.nextAction)||null,now,now).run(); return json({ok:true,id:gid});
  }
  if(op==='goal_item'){
    if(!b.goalId||!clean(b.title))return json({ok:false,error:'goalId and title required'},400); const type=['milestone','task','blocker'].includes(b.type)?b.type:'task';
    await env.DB.prepare(`INSERT INTO hope_goal_items(goal_id,item_type,title,status,priority,position,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(b.goalId,type,clean(b.title),b.status||'pending',Math.max(1,Math.min(5,Number(b.priority??3))),Number(b.position??0),clean(b.notes),now,now).run(); return json({ok:true});
  }
  if(op==='mission'){
    const title=clean(b.title); if(!title)return json({ok:false,error:'title required'},400); const mid=id('mission'), plan=Array.isArray(b.plan)?b.plan:[];
    await env.DB.prepare(`INSERT INTO hope_missions(id,goal_id,title,objective,status,mode,plan,context,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(mid,b.goalId||null,title,clean(b.objective),b.status||'planned',b.mode||'ask_execute',JSON.stringify(plan),JSON.stringify(b.context||{}),now,now).run(); return json({ok:true,id:mid});
  }
  if(op==='mission_state'){
    if(!b.id)return json({ok:false,error:'mission id required'},400); const allowed=['planned','running','blocked','waiting_approval','completed','failed','cancelled']; if(!allowed.includes(b.status))return json({ok:false,error:'invalid status'},400);
    await env.DB.prepare(`UPDATE hope_missions SET status=?,current_step=COALESCE(?,current_step),result=COALESCE(?,result),verified=COALESCE(?,verified),updated_at=? WHERE id=?`).bind(b.status,b.currentStep??null,b.result??null,b.verified===undefined?null:(b.verified?1:0),now,b.id).run(); return json({ok:true});
  }
  if(op==='approval'){
    if(!clean(b.scope)||!clean(b.action)||!clean(b.summary))return json({ok:false,error:'scope, action and summary required'},400); const aid=id('approval');
    await env.DB.prepare(`INSERT INTO hope_approvals(id,mission_id,scope,action,summary,risk,preview,rollback,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(aid,b.missionId||null,clean(b.scope),clean(b.action),clean(b.summary),b.risk||'medium',clean(b.preview)||null,clean(b.rollback)||null,'pending',now).run(); return json({ok:true,id:aid});
  }
  if(op==='resolve_approval'){
    if(!b.id||!['approved','rejected'].includes(b.status))return json({ok:false,error:'id and approved/rejected status required'},400); await env.DB.prepare(`UPDATE hope_approvals SET status=?,resolved_at=? WHERE id=? AND status='pending'`).bind(b.status,now,b.id).run(); return json({ok:true});
  }
  if(op==='verify'){
    if(!clean(b.action)||!clean(b.method)||!['passed','failed','unknown'].includes(b.status))return json({ok:false,error:'action, method and valid status required'},400);
    await env.DB.prepare(`INSERT INTO hope_verifications(mission_id,action,target,method,status,evidence,created_at) VALUES(?,?,?,?,?,?,?)`).bind(b.missionId||null,clean(b.action),clean(b.target)||null,clean(b.method),b.status,clean(b.evidence)||null,now).run(); if(b.missionId&&b.status==='passed')await env.DB.prepare(`UPDATE hope_missions SET verified=1,updated_at=? WHERE id=?`).bind(now,b.missionId).run(); return json({ok:true});
  }
  return json({ok:false,error:'unknown operation'},400);
}
