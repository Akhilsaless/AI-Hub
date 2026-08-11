import { requireOwner } from '../../../lib/auth.js';
import { encryptStoredKey } from '../../../lib/vault.js';
function getCookie(request,name){for(const p of (request.headers.get('cookie')||'').split(';')){const [k,...v]=p.trim().split('=');if(k===name)return v.join('=')}return ''}
function clear(name){return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}
export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 const u=new URL(request.url),code=u.searchParams.get('code'),state=u.searchParams.get('state');
 const verifier=getCookie(request,'or_pkce'),expected=getCookie(request,'or_state');
 if(!code||!verifier||!state||state!==expected)return new Response('OpenRouter authorization validation failed.',{status:400});
 try{
  const r=await fetch('https://openrouter.ai/api/v1/auth/keys',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,code_verifier:verifier,code_challenge_method:'S256'})});
  const data=await r.json();if(!r.ok||!data?.key)throw new Error(data?.error?.message||data?.error||`OpenRouter HTTP ${r.status}`);
  const encrypted=await encryptStoredKey(env,data.key);
  await env.DB.prepare(`INSERT INTO integrations(id,provider,label,endpoint,model,key_cipher,iv,verified_free,enabled,updated_at) VALUES('openrouter','openrouter','OpenRouter Free','https://openrouter.ai/api/v1','',?,?,0,0,?) ON CONFLICT(id) DO UPDATE SET key_cipher=excluded.key_cipher,iv=excluded.iv,endpoint=excluded.endpoint,updated_at=excluded.updated_at`).bind(encrypted.cipher,encrypted.iv,new Date().toISOString()).run();
  const h=new Headers({location:'/?connected=openrouter','cache-control':'no-store'});h.append('set-cookie',clear('or_pkce'));h.append('set-cookie',clear('or_state'));return new Response(null,{status:302,headers:h});
 }catch(e){return new Response(`OpenRouter connection failed: ${String(e?.message||e)}`,{status:502})}
}
