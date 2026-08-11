export default {
  async scheduled(_event,env,ctx){ctx.waitUntil(run(env));},
  async fetch(request,env){if(new URL(request.url).pathname!=='/health')return new Response('Not found',{status:404});return Response.json({ok:true,service:'hope-scheduler'});}
};
async function run(env){if(!env.HOPE_RUNNER_URL||!env.AUTOMATION_RUNNER_SECRET)throw new Error('Scheduler configuration missing');const r=await fetch(env.HOPE_RUNNER_URL,{method:'POST',headers:{authorization:`Bearer ${env.AUTOMATION_RUNNER_SECRET}`,'content-type':'application/json'},body:'{}'});if(!r.ok)throw new Error(`HOPE runner HTTP ${r.status}: ${await r.text()}`);return r.json();}
