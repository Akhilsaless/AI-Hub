import {ensureD1Schema} from '../lib/d1-schema.js';

export async function onRequest(context){
 try{
  await ensureD1Schema(context.env);
  return context.next();
 }catch(error){
  console.error(JSON.stringify({event:'d1_schema_migration_failed',message:String(error?.message||error)}));
  return new Response(JSON.stringify({ok:false,error:'HYVORA persistence is temporarily unavailable'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store','retry-after':'10'}});
 }
}
