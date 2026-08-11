import {requireOwner} from '../../../lib/auth.js';
const enc=new TextEncoder();
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
async function sha256(text){return new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text)))}
export async function onRequestGet({request,env}){
 const denied=await requireOwner(request,env);if(denied)return denied;
 const verifier=b64url(crypto.getRandomValues(new Uint8Array(32)));
 const challenge=b64url(await sha256(verifier));
 const state=b64url(crypto.getRandomValues(new Uint8Array(24)));
 const origin=new URL(request.url).origin;
 const callback=`${origin}/api/oauth/openrouter/callback`;
 const url=new URL('https://openrouter.ai/auth');
 url.searchParams.set('callback_url',callback);
 url.searchParams.set('code_challenge',challenge);
 url.searchParams.set('code_challenge_method','S256');
 const headers=new Headers({location:url.toString(),'cache-control':'no-store'});
 headers.append('set-cookie',`or_pkce=${verifier}; Path=/api/oauth/openrouter; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
 headers.append('set-cookie',`or_state=${state}; Path=/api/oauth/openrouter; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
 headers.append('set-cookie',`or_callback=${encodeURIComponent(callback)}; Path=/api/oauth/openrouter; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
 return new Response(null,{status:302,headers});
}
