const enc = new TextEncoder();

function b64url(bytes){
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function fromB64url(s){
  s=s.replaceAll('-','+').replaceAll('_','/');
  while(s.length%4) s+='=';
  return Uint8Array.from(atob(s),c=>c.charCodeAt(0));
}
async function hmacKey(secret){
  return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
function getCookie(request,name){
  const raw=request.headers.get('cookie')||'';
  for(const part of raw.split(';')){
    const [k,...v]=part.trim().split('=');
    if(k===name) return v.join('=');
  }
  return null;
}
export async function createOwnerSession(env){
  const exp=Date.now()+1000*60*60*12;
  const payload=b64url(enc.encode(JSON.stringify({role:'owner',exp})));
  const key=await hmacKey(env.HUB_MASTER_KEY+':owner-session');
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(payload)));
  return `${payload}.${b64url(sig)}`;
}
export async function isOwner(request,env){
  if(!env.OWNER_PASSWORD || !env.HUB_MASTER_KEY) return false;
  const token=getCookie(request,'aihub_owner');
  if(!token || !token.includes('.')) return false;
  const [payload,sigText]=token.split('.');
  try{
    const key=await hmacKey(env.HUB_MASTER_KEY+':owner-session');
    const ok=await crypto.subtle.verify('HMAC',key,fromB64url(sigText),enc.encode(payload));
    if(!ok) return false;
    const body=JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return body?.role==='owner' && Number(body?.exp)>Date.now();
  }catch{return false;}
}
export async function requireOwner(request,env){
  return (await isOwner(request,env)) ? null : new Response(JSON.stringify({ok:false,error:'owner authentication required'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}});
}
export async function passwordMatches(input,env){
  if(!env.OWNER_PASSWORD) return false;
  const a=enc.encode(String(input||''));
  const b=enc.encode(String(env.OWNER_PASSWORD));
  const da=new Uint8Array(await crypto.subtle.digest('SHA-256',a));
  const db=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
  if(da.length!==db.length) return false;
  let diff=0;
  for(let i=0;i<da.length;i++) diff|=da[i]^db[i];
  return diff===0;
}
export function ownerCookie(token){
  return `aihub_owner=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;
}
export function clearOwnerCookie(){
  return `aihub_owner=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
