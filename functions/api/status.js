async function ensureSchema(env){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS integrations (id TEXT PRIMARY KEY, provider TEXT NOT NULL, label TEXT, endpoint TEXT, model TEXT, key_cipher TEXT, iv TEXT, verified_free INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS request_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, product TEXT, provider TEXT, model TEXT, success INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  ]);
}
export async function onRequestGet({env}) {
  if (!env.DB) return out({ok:false,database:false,error:'DB binding missing'},500);
  try {
    await ensureSchema(env);
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    return out({ok:true,database:true,masterKeyConfigured:Boolean(env.HUB_MASTER_KEY),tables:(tables.results||[]).map(x=>x.name)});
  } catch(e){return out({ok:false,database:true,error:String(e?.message||e)},500)}
}
function out(v,s=200){return new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}})}
