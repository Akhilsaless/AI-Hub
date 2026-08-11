import {requireOwner} from '../lib/auth.js';
const enc = new TextEncoder();

async function ensureSchema(env){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      label TEXT,
      endpoint TEXT,
      model TEXT,
      key_cipher TEXT,
      iv TEXT,
      verified_free INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS request_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,product TEXT,provider TEXT,model TEXT,success INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  ]);
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
function b64(bytes){return btoa(String.fromCharCode(...bytes))}
async function getKey(secret){const digest=await crypto.subtle.digest('SHA-256',enc.encode(secret));return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt']);}
async function encrypt(secret,value){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await getKey(secret);const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(value)));return {cipher:b64(ct),iv:b64(iv)};}

export async function onRequestGet({request,env}){
  const denied=await requireOwner(request,env); if(denied) return denied;
  if(!env.DB) return json({ok:false,error:'DB binding missing'},500);
  try{await ensureSchema(env);const rows=await env.DB.prepare(`SELECT id,provider,label,endpoint,model,verified_free,enabled,updated_at FROM integrations ORDER BY provider`).all();return json({ok:true,items:rows.results||[]});}catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
export async function onRequestPost({request,env}){
  const denied=await requireOwner(request,env); if(denied) return denied;
  if(!env.DB) return json({ok:false,error:'DB binding missing'},500);
  if(!env.HUB_MASTER_KEY) return json({ok:false,error:'HUB_MASTER_KEY missing'},500);
  try{
    await ensureSchema(env); const input=await request.json(); const provider=String(input.provider||'').trim(); if(!provider) return json({ok:false,error:'provider is required'},400); const id=String(input.id||provider).trim(); let keyCipher=null,iv=null;
    if(String(input.apiKey||'').trim()){const encrypted=await encrypt(env.HUB_MASTER_KEY,String(input.apiKey));keyCipher=encrypted.cipher;iv=encrypted.iv;}
    await env.DB.prepare(`INSERT INTO integrations(id,provider,label,endpoint,model,key_cipher,iv,verified_free,enabled,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET provider=excluded.provider,label=excluded.label,endpoint=excluded.endpoint,model=excluded.model,key_cipher=COALESCE(excluded.key_cipher,integrations.key_cipher),iv=COALESCE(excluded.iv,integrations.iv),verified_free=excluded.verified_free,enabled=excluded.enabled,updated_at=excluded.updated_at`).bind(id,provider,String(input.label||provider),String(input.endpoint||''),String(input.model||''),keyCipher,iv,input.verifiedFree?1:0,input.enabled?1:0,new Date().toISOString()).run();
    return json({ok:true,id});
  }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
export async function onRequestDelete({request,env}){
  const denied=await requireOwner(request,env); if(denied) return denied;
  if(!env.DB) return json({ok:false,error:'DB binding missing'},500);
  try{await ensureSchema(env);const id=new URL(request.url).searchParams.get('id');if(!id)return json({ok:false,error:'id is required'},400);await env.DB.prepare('DELETE FROM integrations WHERE id=?').bind(id).run();return json({ok:true});}catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
