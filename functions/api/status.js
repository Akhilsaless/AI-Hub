export async function onRequestGet({env}) {
  if (!env.DB) return out({ok:false,database:false,error:'DB binding missing'},500);
  try {
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    return out({ok:true,database:true,masterKeyConfigured:Boolean(env.HUB_MASTER_KEY),tables:(tables.results||[]).map(x=>x.name)});
  } catch(e){return out({ok:false,database:true,error:String(e?.message||e)},500)}
}
function out(v,s=200){return new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}})}
