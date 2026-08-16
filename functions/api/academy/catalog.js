import {requireUser} from '../../lib/user-auth.js';
import {ACADEMY_LEVELS,catalog,categories} from '../../lib/academy-catalog.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){const auth=await requireUser(request,env);if(auth.response)return auth.response;const u=new URL(request.url);return json({ok:true,levels:ACADEMY_LEVELS,categories:categories(),tools:catalog({q:u.searchParams.get('q')||'',category:u.searchParams.get('category')||'',access:u.searchParams.get('access')||''}),updatedAt:'2026-08-16',freshness:'Owner-updatable catalog. Live discovery/news requires a configured research source; links are official product entry points.'});}
