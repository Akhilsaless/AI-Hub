import { requireOwner } from "../../lib/auth.js";
import {
  ensureHopeAgentRegistry,
  listAgentRegistry,
} from "../../lib/hope-agent-registry.js";
import { testHopeAgent } from "../../lib/hope-agent-orchestrator.js";

const json = (v, s = 200) =>
  new Response(JSON.stringify(v), {
    status: s,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

export async function onRequestGet({ request, env }) {
  const denied = await requireOwner(request, env);
  if (denied) return denied;
  return json({ ok: true, agents: await listAgentRegistry(env) });
}

export async function onRequestPatch({ request, env }) {
  const denied = await requireOwner(request, env);
  if (denied) return denied;
  await ensureHopeAgentRegistry(env);
  const body = await request.json().catch(() => ({})),
    id = String(body.id || ""),
    enabled = body.enabled,
    status = body.status,
    maximumExecutionMs = body.maximumExecutionMs,
    maximumCostCredits = body.maximumCostCredits;
  if (!id) return json({ ok: false, error: "id required" }, 400);
  const row = await env.DB.prepare(
    `SELECT id FROM hope_agent_registry WHERE id=?`,
  )
    .bind(id)
    .first();
  if (!row) return json({ ok: false, error: "agent not found" }, 404);
  if (enabled !== undefined)
    await env.DB.prepare(
      `UPDATE hope_agent_registry SET enabled=?,updated_at=? WHERE id=?`,
    )
      .bind(enabled ? 1 : 0, new Date().toISOString(), id)
      .run();
  if (["active", "paused"].includes(status))
    await env.DB.prepare(
      `UPDATE hope_agent_registry SET status=?,updated_at=? WHERE id=?`,
    )
      .bind(status, new Date().toISOString(), id)
      .run();
  if (maximumExecutionMs !== undefined)
    await env.DB.prepare(
      `UPDATE hope_agent_registry SET maximum_execution_ms=?,updated_at=? WHERE id=?`,
    )
      .bind(
        Math.max(5000, Math.min(120000, Number(maximumExecutionMs) || 30000)),
        new Date().toISOString(),
        id,
      )
      .run();
  if (maximumCostCredits !== undefined)
    await env.DB.prepare(
      `UPDATE hope_agent_registry SET maximum_cost_credits=?,updated_at=? WHERE id=?`,
    )
      .bind(
        Math.max(0, Math.min(10000, Number(maximumCostCredits) || 0)),
        new Date().toISOString(),
        id,
      )
      .run();
  return json({
    ok: true,
    agent: (await listAgentRegistry(env)).find((x) => x.id === id),
  });
}

export async function onRequestPost({ request, env }) {
  const denied = await requireOwner(request, env);
  if (denied) return denied;
  const body = await request.json().catch(() => ({})),
    id = String(body.id || "");
  if (!id) return json({ ok: false, error: "id required" }, 400);
  const result = await testHopeAgent(env, id);
  return json(result, result.ok ? 200 : 503);
}
