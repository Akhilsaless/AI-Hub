import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const secretSet = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const publishableSet = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || secretSet.default;
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || publishableSet.default;

function allowedUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    const hosted = url.protocol === "https:" && (url.hostname === "ai-hub-93x.pages.dev" || url.hostname.endsWith(".chatgpt.site"));
    const local = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return hosted || local ? url.toString() : null;
  } catch { return null; }
}

function corsOrigin(value: string | null) {
  if (!value) return "*";
  return allowedUrl(value) ? value : "";
}

const json = (body: unknown, status = 200, origin = "*") => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json", "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  },
});

Deno.serve(async (req: Request) => {
  const origin = corsOrigin(req.headers.get("Origin"));
  if (!origin) return json({ ok: false, error: "Origin not allowed." }, 403, "null");
  if (req.method === "OPTIONS") return json({ ok: true }, 200, origin);
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405, origin);
  if (!SERVICE_KEY || !PUBLIC_KEY) return json({ ok: false, error: "Invitation service is not configured." }, 503, origin);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ ok: false, error: "Sign in is required." }, 401, origin);

  const caller = createClient(SUPABASE_URL, PUBLIC_KEY, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return json({ ok: false, error: "Your session is invalid or expired." }, 401, origin);

  let body: { workspaceId?: unknown; email?: unknown; role?: unknown; redirectTo?: unknown };
  try { body = await req.json(); }
  catch { return json({ ok: false, error: "Invalid request." }, 400, origin); }
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "admin" || body.role === "member" || body.role === "viewer" ? body.role : "member";
  const redirectTo = allowedUrl(body.redirectTo);
  if (!workspaceId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !redirectTo) return json({ ok: false, error: "Add a valid email, role and HOPE return URL." }, 400, origin);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: permission } = await admin.from("memberships").select("role").eq("workspace_id", workspaceId).eq("user_id", authData.user.id).maybeSingle();
  if (!permission || !["owner", "admin"].includes(permission.role)) return json({ ok: false, error: "Only workspace owners and admins can invite members." }, 403, origin);
  const { data: existing } = await admin.from("invitations").select("id").eq("workspace_id", workspaceId).ilike("email", email).eq("status", "pending").maybeSingle();
  if (existing) return json({ ok: false, error: "An active invitation already exists for this email." }, 409, origin);

  const { data: invitation, error: insertError } = await admin.from("invitations").insert({ workspace_id: workspaceId, email, role, invited_by: authData.user.id }).select("id,status").single();
  if (insertError || !invitation) return json({ ok: false, error: "The invitation could not be created." }, 500, origin);
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { workspace_id: workspaceId, invited_role: role } });
  const { data: current } = await admin.from("invitations").select("status").eq("id", invitation.id).single();
  if (inviteError && current?.status !== "accepted") {
    await admin.from("invitations").update({ status: "revoked" }).eq("id", invitation.id);
    return json({ ok: false, error: "The invitation email could not be delivered. Check Supabase Auth email settings." }, 502, origin);
  }
  await admin.from("audit_events").insert({ workspace_id: workspaceId, actor_id: authData.user.id, action: current?.status === "accepted" ? "member_added" : "invitation_sent", entity_type: "invitation", entity_id: invitation.id, metadata: { email, role } });
  return json({ ok: true, invitation: { id: invitation.id, email, role, status: current?.status || "pending" }, message: current?.status === "accepted" ? "Existing user added to the workspace." : "Invitation email sent." }, 200, origin);
});
