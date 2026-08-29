import { requireUser } from "../../../lib/user-auth.js";
import {
  createHopeOrchestration,
  orchestrationStatus,
} from "../../../lib/hope-agent-registry.js";
import { cancelHopeOrchestration } from "../../../lib/hope-agent-orchestrator.js";

const json = (v, s = 200) =>
  new Response(JSON.stringify(v), {
    status: s,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "id required" }, 400);
  const activity = await orchestrationStatus(env, id, auth.user.id);
  return activity
    ? json({ ok: true, activity })
    : json({ ok: false, error: "run not found" }, 404);
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({})),
    objective = String(body.objective || body.message || "")
      .trim()
      .slice(0, 30000),
    threadId = String(body.threadId || "").slice(0, 80) || null,
    attachments = Array.isArray(body.attachments)
      ? body.attachments.slice(0, 4)
      : [];
  if (!objective && !attachments.length)
    return json({ ok: false, error: "objective or attachment required" }, 400);
  const activity = await createHopeOrchestration(env, {
    userId: auth.user.id,
    threadId,
    objective: objective || "Analyze the attached material.",
    attachments,
  });
  return json({ ok: true, activity });
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "id required" }, 400);
  const cancelled = await cancelHopeOrchestration(env, id, auth.user.id);
  return cancelled
    ? json({ ok: true, cancelled: true })
    : json({ ok: false, error: "run is not cancellable" }, 409);
}
