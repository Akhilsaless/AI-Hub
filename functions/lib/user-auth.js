import {isOwner} from './auth.js';
import {ensureD1Schema} from './d1-schema.js';
const enc=new TextEncoder(),dec=new TextDecoder();
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function unb64(s){s=s.replaceAll('-','+').replaceAll('_','/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function cookie(request,name){for(const part of (request.headers.get('cookie')||'').split(';')){const [k,...v]=part.trim().split('=');if(k===name)return v.join('=')}return null}
async function key(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function ensureUsers(env){return ensureD1Schema(env)}
async function derive(password,salt){const material=await crypto.subtle.importKey('raw',enc.encode(String(password)),{name:'PBKDF2'},false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:150000},material,256);return b64(new Uint8Array(bits))}
export async function hashPassword(password){const salt=crypto.randomUUID()+crypto.randomUUID(),hash=await derive(password,salt);return {salt,hash}}
function fixedTimeEqual(a,b){
 try{
  const left=unb64(String(a||'')),right=unb64(String(b||''));
  if(left.length!==right.length)return false;
  let difference=0;
  for(let i=0;i<left.length;i++)difference|=left[i]^right[i];
  return difference===0;
 }catch{return false}
}
export async function verifyPassword(password,salt,hash){return fixedTimeEqual(await derive(password,salt),hash)}
export async function createUserSession(env,user){const exp=Date.now()+1000*60*60*24*14,payload=b64(enc.encode(JSON.stringify({sub:user.id,email:user.email,plan:user.plan,sv:Number(user.session_version||0),exp}))),k=await key(env.HUB_MASTER_KEY+':user-session'),sig=new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(payload)));return `${payload}.${b64(sig)}`}
export async function currentUser(request,env){
 const token=cookie(request,'aihub_user');
 if(token&&env.HUB_MASTER_KEY){try{const [p,s]=token.split('.'),k=await key(env.HUB_MASTER_KEY+':user-session'),ok=await crypto.subtle.verify('HMAC',k,unb64(s),enc.encode(p));if(ok){const body=JSON.parse(dec.decode(unb64(p)));if(Number(body.exp)>Date.now()){await ensureUsers(env);const user=await env.DB.prepare(`SELECT id,email,name,plan,status,session_version,created_at FROM app_users WHERE id=? AND status='active'`).bind(body.sub).first();if(user&&Number(body.sv??0)===Number(user.session_version||0))return {...user,isOwner:false}}}}catch{}}
 if(await isOwner(request,env))return {id:'owner',email:'owner@aihub.local',name:'Admin',plan:'teams',status:'active',created_at:null,isOwner:true};
 return null;
}
export async function requireUser(request,env){const u=await currentUser(request,env);return u?{user:u,response:null}:{user:null,response:new Response(JSON.stringify({ok:false,error:'user authentication required'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}})}}
export function userCookie(token){return `aihub_user=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600`}
export function clearUserCookie(){return `aihub_user=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}
export const PLAN_LIMITS={free:{hope_daily:40,research_daily:3,academy_tracks:2,missions_weekly:2,builder_projects:1},pro:{hope_daily:250,research_daily:25,academy_tracks:999,missions_weekly:20,builder_projects:5},builder:{hope_daily:600,research_daily:60,academy_tracks:999,missions_weekly:999,builder_projects:50},teams:{hope_daily:1000,research_daily:100,academy_tracks:999,missions_weekly:999,builder_projects:200}}
