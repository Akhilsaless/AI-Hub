import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const secretSet = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const publishableSet = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || secretSet.default;
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || publishableSet.default;

const providers = new Set(["gemini", "groq", "huggingface", "openai", "openrouter", "anthropic"]);
const paidProviders = new Set(["openai", "anthropic"]);

function corsOrigin(origin: string | null) {
  if (!origin) return "*";
  try {
    const url = new URL(origin);
    const hosted = url.protocol === "https:" && (
      url.hostname === "ai-hub-93x.pages.dev" ||
      url.hostname.endsWith(".chatgpt.site")
    );
    const local = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return hosted || local ? origin : "";
  } catch {
    return "";
  }
}

const json = (body: unknown, status = 200, origin = "*") => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  },
});

async function probe(provider: string, secret: string) {
  let url = "";
  const headers: Record<string, string> = {};
  if (provider === "gemini") url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(secret)}`;
  if (provider === "groq") url = "https://api.groq.com/openai/v1/models";
  if (provider === "huggingface") url = "https://huggingface.co/api/whoami-v2";
  if (provider === "openai") url = "https://api.openai.com/v1/models";
  if (provider === "openrouter") url = "https://openrouter.ai/api/v1/models";
  if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/models";
    headers["x-api-key"] = secret;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider !== "gemini") {
    headers.Authorization = `Bearer ${secret}`;
  }
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(9000) });
    if (response.ok) return { status: "healthy", message: "Credential verified with the provider." };
    if (response.status === 401 || response.status === 403) return { status: "invalid", message: "The provider rejected this credential." };
    if (response.status === 429) return { status: "limited", message: "Credential accepted, but the provider is currently rate limited." };
    return { status: "unavailable", message: `Provider health check returned HTTP ${response.status}.` };
  } catch {
    return { status: "unavailable", message: "The provider could not be reached during the health check." };
  }
}

Deno.serve(async (req: Request) => {
  const origin = corsOrigin(req.headers.get("Origin"));
  if (!origin) return json({ ok: false, error: "Origin not allowed." }, 403, "null");
  if (req.method === "OPTIONS") return json({ ok: true }, 200, origin);
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405, origin);
  if (!SERVICE_KEY || !PUBLIC_KEY) return json({ ok: false, error: "Provider vault is not configured." }, 503, origin);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ ok: false, error: "Sign in is required." }, 401, origin);
  const caller = createClient(SUPABASE_URL, PUBLIC_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return json({ ok: false, error: "Your session is invalid or expired." }, 401, origin);

  let body: { action?: unknown; workspaceId?: unknown; provider?: unknown; secret?: unknown; enabled?: unknown };
  try { body = await req.json(); }
  catch { return json({ ok: false, error: "Invalid request." }, 400, origin); }
  const action = typeof body.action === "string" ? body.action : "list";
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const provider = typeof body.provider === "string" ? body.provider : "";
  if (!workspaceId) return json({ ok: false, error: "Choose a workspace." }, 400, origin);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership } = await admin.from("memberships").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", authData.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return json({ ok: false, error: "Provider controls are Owner/Admin-only." }, 403, origin);
  }

  if (action === "list") {
    const { data, error } = await admin.from("provider_connections")
      .select("provider,tier,enabled,last_four,health_status,health_message,last_checked_at,updated_at")
      .eq("workspace_id", workspaceId).order("provider");
    if (error) return json({ ok: false, error: "Provider status could not be loaded." }, 500, origin);
    return json({ ok: true, connections: data || [] }, 200, origin);
  }

  if (!providers.has(provider)) return json({ ok: false, error: "Unsupported provider." }, 400, origin);

  if (action === "disconnect") {
    const { error } = await admin.rpc("delete_provider_secret", {
      p_workspace_id: workspaceId, p_provider: provider, p_actor_id: authData.user.id,
    });
    if (error) return json({ ok: false, error: "The provider could not be disconnected." }, 500, origin);
    await admin.from("audit_events").insert({ workspace_id: workspaceId, actor_id: authData.user.id, action: "provider_disconnected", entity_type: "provider_connection", entity_id: provider, metadata: { provider } });
    return json({ ok: true, provider, disconnected: true }, 200, origin);
  }

  if (action === "enable") {
    const enabled = body.enabled === true;
    if (enabled) {
      const { data: connection } = await admin.from("provider_connections").select("health_status")
        .eq("workspace_id", workspaceId).eq("provider", provider).maybeSingle();
      if (!connection || !["healthy", "limited"].includes(connection.health_status)) {
        return json({ ok: false, error: "Test this provider successfully before enabling it." }, 409, origin);
      }
    }
    if (provider === "openai" && enabled) {
      const { data: policy } = await admin.from("provider_policies").select("daily_budget_minor,monthly_budget_minor,emergency_stop")
        .eq("workspace_id", workspaceId).eq("provider", provider).maybeSingle();
      if (!policy || policy.emergency_stop || policy.daily_budget_minor <= 0 || policy.monthly_budget_minor <= 0) {
        return json({ ok: false, error: "Set OpenAI daily and monthly budgets and clear emergency stop before enabling it." }, 409, origin);
      }
    }
    const { error } = await admin.rpc("set_provider_enabled", {
      p_workspace_id: workspaceId, p_provider: provider, p_enabled: enabled, p_actor_id: authData.user.id,
    });
    if (error) return json({ ok: false, error: "The provider state could not be changed." }, 500, origin);
    return json({ ok: true, provider, enabled }, 200, origin);
  }

  let secret = typeof body.secret === "string" ? body.secret.trim() : "";
  if (action === "save") {
    if (secret.length < 10 || secret.length > 500) return json({ ok: false, error: "Add a valid provider credential." }, 400, origin);
    const tier = paidProviders.has(provider) ? "paid" : "bonus";
    const { error } = await admin.rpc("store_provider_secret", {
      p_workspace_id: workspaceId, p_provider: provider, p_secret: secret,
      p_actor_id: authData.user.id, p_tier: tier, p_last_four: secret.slice(-4),
    });
    if (error) return json({ ok: false, error: "The encrypted credential could not be saved." }, 500, origin);
  } else if (action === "test") {
    const { data, error } = await admin.rpc("get_provider_secret_for_test", {
      p_workspace_id: workspaceId, p_provider: provider, p_actor_id: authData.user.id,
    });
    if (error || !data) return json({ ok: false, error: "No stored credential is available to test." }, 404, origin);
    secret = data;
  } else {
    return json({ ok: false, error: "Unsupported action." }, 400, origin);
  }

  const health = await probe(provider, secret);
  secret = "";
  const checkedAt = new Date().toISOString();
  await admin.from("provider_connections").update({
    health_status: health.status, health_message: health.message,
    last_checked_at: checkedAt, updated_at: checkedAt,
  }).eq("workspace_id", workspaceId).eq("provider", provider);
  await admin.from("audit_events").insert({
    workspace_id: workspaceId, actor_id: authData.user.id,
    action: action === "save" ? "provider_credential_saved" : "provider_tested",
    entity_type: "provider_connection", entity_id: provider,
    metadata: { provider, health_status: health.status },
  });
  return json({ ok: true, provider, enabled: false, health_status: health.status, health_message: health.message, last_checked_at: checkedAt }, 200, origin);
});
