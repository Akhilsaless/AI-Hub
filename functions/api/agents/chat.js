import {requireOwner} from '../../lib/auth.js';
import {executeZeroCost} from '../../lib/router-execute.js';

const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const STOP=new Set(['the','a','an','and','or','but','to','of','in','on','for','with','is','it','this','that','i','you','me','my','your','we','our','was','are','be','have','has','had','do','did','what','when','where','who','how','about','from','as','at','by']);

async function ensure(env){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS agent_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS agent_memory(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT NOT NULL,memory_key TEXT NOT NULL,memory_value TEXT NOT NULL,importance INTEGER NOT NULL DEFAULT 5,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(agent_id,memory_key))`)
  ]);
}

function tokens(text){
  return [...new Set(String(text||'').toLowerCase().replace(/[^a-z0-9\s_-]/g,' ').split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)))].slice(0,30);
}

function memoryKey(text){
  const t=tokens(text).slice(0,8).join('-');
  return `msg-${t||crypto.randomUUID().slice(0,8)}-${Date.now()}`.slice(0,180);
}

async function storeMemory(env,agent,text,importance=5){
  const now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO agent_memory(agent_id,memory_key,memory_value,importance,created_at,updated_at) VALUES(?,?,?,?,?,?)`).bind(agent,memoryKey(text),String(text).slice(0,12000),importance,now,now).run();
}

async function relevantMemories(env,agent,query){
  const qTokens=tokens(query);
  const r=await env.DB.prepare(`SELECT id,memory_value,importance,updated_at FROM agent_memory WHERE agent_id=? ORDER BY importance DESC,id DESC LIMIT 250`).bind(agent).all();
  const scored=(r.results||[]).map(m=>{
    const mt=new Set(tokens(m.memory_value));
    let score=0;
    for(const t of qTokens) if(mt.has(t)) score+=3;
    if(String(m.memory_value).toLowerCase().includes(String(query).toLowerCase().slice(0,40))) score+=5;
    score+=Number(m.importance||0)*0.15;
    return {...m,score};
  }).filter(x=>x.score>0.8).sort((a,b)=>b.score-a.score||b.id-a.id).slice(0,12);
  return scored;
}

async function recentMessages(env,agent,limit=24){
  const r=await env.DB.prepare(`SELECT role,content,created_at FROM agent_messages WHERE agent_id=? ORDER BY id DESC LIMIT ?`).bind(agent,limit).all();
  return (r.results||[]).reverse();
}

export async function onRequestGet({request,env}){
  const denied=await requireOwner(request,env);if(denied)return denied;
  try{
    await ensure(env);
    const u=new URL(request.url),agent=u.searchParams.get('agent')||'primary';
    const r=await env.DB.prepare(`SELECT id,role,content,created_at FROM agent_messages WHERE agent_id=? ORDER BY id DESC LIMIT 80`).bind(agent).all();
    const mem=await env.DB.prepare(`SELECT COUNT(*) n FROM agent_memory WHERE agent_id=?`).bind(agent).first();
    return json({ok:true,messages:(r.results||[]).reverse(),memoryCount:Number(mem?.n||0)});
  }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}

export async function onRequestPost({request,env}){
  const denied=await requireOwner(request,env);if(denied)return denied;
  try{
    await ensure(env);
    const b=await request.json();
    const agent=String(b.agent||'primary').slice(0,64);
    const text=String(b.message||'').trim().slice(0,30000);
    const mode=b.mode==='hard'?'hard':'normal';
    if(!text)return json({ok:false,error:'Message required'},400);

    const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO agent_messages(agent_id,role,content,created_at) VALUES(?,?,?,?)`).bind(agent,'user',text,now).run();
    await storeMemory(env,agent,text,/\b(remember|important|always|never|prefer|my name|project|birthday|goal|favorite|favourite)\b/i.test(text)?9:5);

    const recent=await recentMessages(env,agent,22);
    const memories=await relevantMemories(env,agent,text);
    const memoryBlock=memories.length?memories.map((m,i)=>`${i+1}. ${m.memory_value}`).join('\n'):'No older relevant memories were retrieved.';

    const system=agent==='primary'
      ?`You are Hope, the owner's advanced AI operating agent inside Universal AI Hub. Be proactive, capable, concise and natural. You have persistent memory stored by the Hub. Use retrieved memories when relevant, but never invent a memory. If a memory conflicts with the user's latest statement, prefer the latest statement. Coordinate research, development, product building and automation. Never claim an external action happened unless a tool actually completed it. Prefer zero-cost routes. Ask for approval before consequential external actions.\n\nRelevant long-term memories:\n${memoryBlock}`
      :`You are the ${agent} specialist inside Hope's multi-agent system. Focus on your specialty. You may use the following retrieved long-term memories when relevant, but never invent memories.\n\nRelevant memories:\n${memoryBlock}`;

    const result=await executeZeroCost(env,[{role:'system',content:system},...recent],mode);
    if(!result.ok)return json({ok:false,needsModel:true,error:result.error,attempts:result.attempts},503);

    const answer=String(result.text||'').trim();
    await env.DB.prepare(`INSERT INTO agent_messages(agent_id,role,content,created_at) VALUES(?,?,?,?)`).bind(agent,'assistant',answer,new Date().toISOString()).run();
    return json({ok:true,agent,text:answer,provider:result.provider,model:result.model,mode,recalledMemories:memories.length});
  }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
