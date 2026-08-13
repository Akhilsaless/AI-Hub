const enc=new TextEncoder(),dec=new TextDecoder();
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function unb64(s){s=s.replaceAll('-','+').replaceAll('_','/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function key(env){return crypto.subtle.importKey('raw',enc.encode(env.HUB_MASTER_KEY+':oauth-state'),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function makeOAuthState(env,userId,provider){const payload=b64(enc.encode(JSON.stringify({userId,provider,nonce:crypto.randomUUID(),exp:Date.now()+10*60*1000}))),k=await key(env),sig=new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(payload)));return `${payload}.${b64(sig)}`}
export async function readOAuthState(env,state){try{const [payload,sig]=String(state||'').split('.'),k=await key(env),ok=await crypto.subtle.verify('HMAC',k,unb64(sig),enc.encode(payload));if(!ok)return null;const body=JSON.parse(dec.decode(unb64(payload)));return Number(body.exp)>Date.now()?body:null}catch{return null}}
