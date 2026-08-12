export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/health') return new Response('Not found', { status: 404 });
    return Response.json({ ok: true, service: 'hope-scheduler', targetConfigured: Boolean(env.HOPE_RUNNER_URL), secretConfigured: Boolean(env.AUTOMATION_RUNNER_SECRET) });
  }
};

async function run(env) {
  if (!env.HOPE_RUNNER_URL) throw new Error('HOPE_RUNNER_URL is missing');
  if (!env.AUTOMATION_RUNNER_SECRET) throw new Error('AUTOMATION_RUNNER_SECRET is missing');
  const target = String(env.HOPE_RUNNER_URL).replace(/\/$/, '') + '/api/automations/run';
  const response = await fetch(target, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.AUTOMATION_RUNNER_SECRET}`,
      'content-type': 'application/json',
      'user-agent': 'HOPE-Automation-Scheduler/1.0'
    },
    body: JSON.stringify({ source: 'cloudflare-cron', scheduledAt: new Date().toISOString() })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`HOPE runner HTTP ${response.status}: ${body.slice(0, 500)}`);
  console.log('HOPE automation tick', body.slice(0, 2000));
}
