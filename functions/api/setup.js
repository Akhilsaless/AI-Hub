import {requireOwner} from '../lib/auth.js';

export async function onRequestPost(context) {
  const { env,request } = context;
  const denied=await requireOwner(request,env); if(denied)return denied;
  if (!env.DB) return json({ ok:false, error:'D1 binding DB is missing' }, 500);
  try {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS integrations (id TEXT PRIMARY KEY, provider TEXT NOT NULL, label TEXT, endpoint TEXT, model TEXT, key_cipher TEXT, iv TEXT, verified_free INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_connected', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS request_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, product TEXT, provider TEXT, model TEXT, success INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
    ]);
    return json({ok:true, message:'AI Hub database initialized'});
  } catch (e) { return json({ok:false,error:String(e?.message || e)},500); }
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
