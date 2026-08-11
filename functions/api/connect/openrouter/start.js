import { requireOwner } from '../../../lib/auth.js';

const enc = new TextEncoder();
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function randomToken(bytes=32){return b64url(crypto.getRandomValues(new Uint8Array(bytes)))}
async function challenge(verifier){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(verifier))))}
function cookie(name,value,maxAge=600){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`}

export async function onRequestGet({request,env}){
  const denied=await requireOwner(request,env); if(denied) return denied;
  const url=new URL(request.url);
  const verifier=randomToken(48);
  const state=randomToken(24);
  const cb=`${url.origin}/api/connect/openrouter/callback`;
  const auth=new URL('https://openrouter.ai/auth');
  auth.searchParams.set('callback_url',cb);
  auth.searchParams.set('code_challenge',await challenge(verifier));
  auth.searchParams.set('code_challenge_method','S256');
  auth.searchParams.set('state',state);
  const headers=new Headers({location:auth.toString(),'cache-control':'no-store'});
  headers.append('set-cookie',cookie('or_pkce',verifier));
  headers.append('set-cookie',cookie('or_state',state));
  return new Response(null,{status:302,headers});
}
