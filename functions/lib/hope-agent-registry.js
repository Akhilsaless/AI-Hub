const now = () => new Date().toISOString();
const list = (v) => JSON.stringify(v);

export const HOPE_AGENT_DEFINITIONS = [
  {
    id: "hope-orchestrator",
    name: "HOPE Orchestrator",
    description:
      "Owns the request, selects the smallest capable team and synthesizes the response.",
    capabilities: ["intent", "routing", "synthesis"],
    tools: ["ai-gateway"],
    permissions: ["ai:invoke"],
    tasks: ["all"],
    profile: "balanced",
    timeout: 30000,
    cost: 0,
    risk: "LOW",
  },
  {
    id: "planner",
    name: "Planner",
    description: "Breaks complex goals into bounded, dependency-aware work.",
    capabilities: ["planning", "decomposition"],
    tools: ["ai-gateway"],
    permissions: ["ai:invoke"],
    tasks: ["planning", "engineering", "research"],
    profile: "reasoning",
    timeout: 30000,
    cost: 120,
    risk: "LOW",
  },
  {
    id: "deep-research",
    name: "Deep Research",
    description:
      "Analyzes supplied authoritative sources and identifies evidence gaps.",
    capabilities: ["research", "source-analysis"],
    tools: ["verified-source-set", "ai-gateway"],
    permissions: ["research:read", "ai:invoke"],
    tasks: ["research"],
    profile: "reasoning",
    timeout: 45000,
    cost: 180,
    risk: "LOW",
  },
  {
    id: "ai-research",
    name: "AI Research",
    description:
      "Evaluates meaningful AI developments without amplifying hype.",
    capabilities: ["ai-research", "relevance-scoring"],
    tools: ["verified-source-set", "ai-gateway"],
    permissions: ["research:read", "ai:invoke"],
    tasks: ["research", "academy"],
    profile: "reasoning",
    timeout: 45000,
    cost: 180,
    risk: "LOW",
  },
  {
    id: "model-scout",
    name: "Model Scout",
    description:
      "Finds model and provider candidates and checks capability claims.",
    capabilities: ["model-discovery", "provider-analysis"],
    tools: ["provider-registry", "verified-source-set", "ai-gateway"],
    permissions: ["providers:read", "research:read", "ai:invoke"],
    tasks: ["research", "models"],
    profile: "reasoning",
    timeout: 45000,
    cost: 180,
    risk: "LOW",
  },
  {
    id: "benchmark",
    name: "Benchmark",
    description:
      "Compares candidates against HOPE quality, latency, reliability and cost criteria.",
    capabilities: ["benchmarking", "comparison"],
    tools: ["ai-lab", "ai-gateway"],
    permissions: ["benchmarks:run", "ai:invoke"],
    tasks: ["models", "evaluation"],
    profile: "reasoning",
    timeout: 60000,
    cost: 240,
    risk: "MEDIUM",
  },
  {
    id: "ai-evaluator",
    name: "AI Evaluator",
    description:
      "Classifies discoveries as useful, duplicate, experimental, expensive or production-ready.",
    capabilities: ["evaluation", "relevance-scoring"],
    tools: ["ai-gateway"],
    permissions: ["ai:invoke"],
    tasks: ["research", "models", "evaluation"],
    profile: "reasoning",
    timeout: 40000,
    cost: 160,
    risk: "LOW",
  },
  {
    id: "academy-teacher",
    name: "Academy Teacher",
    description:
      "Turns verified knowledge into concise, accurate learning material.",
    capabilities: ["teaching", "curriculum"],
    tools: ["academy", "ai-gateway"],
    permissions: ["academy:read", "ai:invoke"],
    tasks: ["academy", "teaching"],
    profile: "balanced",
    timeout: 40000,
    cost: 160,
    risk: "LOW",
  },
  {
    id: "hope-tutor",
    name: "HOPE Tutor",
    description:
      "Adapts explanations to the learner and their current mastery.",
    capabilities: ["personalized-teaching"],
    tools: ["academy", "memory", "ai-gateway"],
    permissions: ["academy:read", "memory:read:self", "ai:invoke"],
    tasks: ["teaching"],
    profile: "balanced",
    timeout: 40000,
    cost: 160,
    risk: "LOW",
  },
  {
    id: "memory",
    name: "Memory",
    description:
      "Finds relevant user-owned context and rejects cross-user data access.",
    capabilities: ["memory-retrieval", "deduplication"],
    tools: ["memory"],
    permissions: ["memory:read:self"],
    tasks: ["memory"],
    profile: "fast",
    timeout: 15000,
    cost: 40,
    risk: "MEDIUM",
  },
  {
    id: "tool",
    name: "Tool",
    description:
      "Selects the safest capable tool and validates its permission boundary.",
    capabilities: ["tool-selection", "permission-check"],
    tools: ["tool-registry"],
    permissions: ["tools:read"],
    tasks: ["action", "automation"],
    profile: "fast",
    timeout: 20000,
    cost: 60,
    risk: "MEDIUM",
  },
  {
    id: "automation",
    name: "Automation",
    description: "Designs safe, resumable repeatable workflows.",
    capabilities: ["automation", "scheduling"],
    tools: ["automations", "ai-gateway"],
    permissions: ["automations:read", "ai:invoke"],
    tasks: ["automation"],
    profile: "balanced",
    timeout: 40000,
    cost: 160,
    risk: "MEDIUM",
  },
  {
    id: "hyvora",
    name: "HYVORA",
    description:
      "Handles marketing strategy and content workflows inside existing HYVORA boundaries.",
    capabilities: ["marketing", "content-strategy"],
    tools: ["hyvora", "ai-gateway"],
    permissions: ["hyvora:read", "ai:invoke"],
    tasks: ["marketing"],
    profile: "balanced",
    timeout: 45000,
    cost: 180,
    risk: "MEDIUM",
  },
  {
    id: "critic",
    name: "Quality / Critic",
    description:
      "Checks completeness, contradictions, unsupported claims and instruction compliance.",
    capabilities: ["verification", "critique"],
    tools: ["ai-gateway"],
    permissions: ["ai:invoke"],
    tasks: ["verification"],
    profile: "reasoning",
    timeout: 45000,
    cost: 180,
    risk: "LOW",
  },
  {
    id: "security",
    name: "Security",
    description:
      "Reviews consequential actions, data boundaries and abuse risks.",
    capabilities: ["security-review", "risk-analysis"],
    tools: ["security-policy", "ai-gateway"],
    permissions: ["security:read", "ai:invoke"],
    tasks: ["security", "engineering", "action"],
    profile: "reasoning",
    timeout: 45000,
    cost: 180,
    risk: "HIGH",
  },
  {
    id: "upgrade",
    name: "Upgrade",
    description:
      "Evaluates improvements through propose, sandbox, test, compare and rollback gates.",
    capabilities: ["upgrade-analysis", "rollback-planning"],
    tools: ["upgrade-center", "ai-gateway"],
    permissions: ["upgrades:propose", "ai:invoke"],
    tasks: ["upgrade", "models"],
    profile: "reasoning",
    timeout: 50000,
    cost: 200,
    risk: "MEDIUM",
  },
  {
    id: "coding",
    name: "Coding / Technical",
    description: "Analyzes implementation, debugging and architecture work.",
    capabilities: ["coding", "debugging", "architecture"],
    tools: ["ai-gateway"],
    permissions: ["ai:invoke"],
    tasks: ["engineering"],
    profile: "reasoning",
    timeout: 60000,
    cost: 240,
    risk: "MEDIUM",
  },
  {
    id: "data-analysis",
    name: "Data / Analysis",
    description:
      "Performs structured comparisons, calculations and evidence-based analysis.",
    capabilities: ["analysis", "calculation"],
    tools: ["ai-gateway"],
    permissions: ["ai:invoke"],
    tasks: ["analysis", "evaluation"],
    profile: "reasoning",
    timeout: 45000,
    cost: 180,
    risk: "LOW",
  },
];

const registryReady = new WeakMap();

async function initializeHopeAgentRegistry(env) {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS hope_agent_registry(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,capabilities TEXT NOT NULL DEFAULT '[]',tools TEXT NOT NULL DEFAULT '[]',required_permissions TEXT NOT NULL DEFAULT '[]',supported_tasks TEXT NOT NULL DEFAULT '[]',preferred_model_profile TEXT NOT NULL DEFAULT 'balanced',maximum_execution_ms INTEGER NOT NULL DEFAULT 30000,maximum_cost_credits INTEGER NOT NULL DEFAULT 0,risk_level TEXT NOT NULL DEFAULT 'LOW',enabled INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'active',health TEXT NOT NULL DEFAULT 'healthy',last_execution_at TEXT,execution_count INTEGER NOT NULL DEFAULT 0,success_count INTEGER NOT NULL DEFAULT 0,failure_count INTEGER NOT NULL DEFAULT 0,total_latency_ms INTEGER NOT NULL DEFAULT 0,quality_score REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS hope_orchestration_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,thread_id TEXT,objective TEXT NOT NULL,complexity TEXT NOT NULL,status TEXT NOT NULL,planned_agents INTEGER NOT NULL DEFAULT 0,used_agents INTEGER NOT NULL DEFAULT 0,verification_status TEXT NOT NULL DEFAULT 'pending',started_at TEXT,completed_at TEXT,elapsed_ms INTEGER NOT NULL DEFAULT 0,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS hope_orchestration_tasks(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,user_id TEXT NOT NULL,agent_id TEXT NOT NULL,task_type TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'waiting',sequence_group INTEGER NOT NULL DEFAULT 0,depends_on TEXT NOT NULL DEFAULT '[]',tool TEXT,started_at TEXT,completed_at TEXT,elapsed_ms INTEGER NOT NULL DEFAULT 0,result TEXT,error TEXT,quality_score REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(run_id) REFERENCES hope_orchestration_runs(id),FOREIGN KEY(agent_id) REFERENCES hope_agent_registry(id))`,
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_hope_orchestration_runs_user ON hope_orchestration_runs(user_id,created_at)`,
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_hope_orchestration_tasks_run ON hope_orchestration_tasks(run_id,sequence_group,status)`,
    ),
  ]);
  const stamp = now();
  for (const a of HOPE_AGENT_DEFINITIONS)
    await env.DB.prepare(
      `INSERT INTO hope_agent_registry(id,name,description,capabilities,tools,required_permissions,supported_tasks,preferred_model_profile,maximum_execution_ms,maximum_cost_credits,risk_level,enabled,status,health,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,'active','healthy',?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,capabilities=excluded.capabilities,tools=excluded.tools,required_permissions=excluded.required_permissions,supported_tasks=excluded.supported_tasks,preferred_model_profile=excluded.preferred_model_profile,maximum_execution_ms=excluded.maximum_execution_ms,maximum_cost_credits=excluded.maximum_cost_credits,risk_level=excluded.risk_level,updated_at=excluded.updated_at`,
    )
      .bind(
        a.id,
        a.name,
        a.description,
        list(a.capabilities),
        list(a.tools),
        list(a.permissions),
        list(a.tasks),
        a.profile,
        a.timeout,
        a.cost,
        a.risk,
        stamp,
      )
      .run();
}

export function ensureHopeAgentRegistry(env) {
  let pending = registryReady.get(env.DB);
  if (!pending) {
    pending = initializeHopeAgentRegistry(env).catch((error) => {
      registryReady.delete(env.DB);
      throw error;
    });
    registryReady.set(env.DB, pending);
  }
  return pending;
}

const has = (s, re) => re.test(s);
export function assessHopeComplexity(objective = "", attachments = []) {
  const s = String(objective),
    l = s.toLowerCase();
  let score = 0;
  if (s.length > 500) score += 1;
  if (s.length > 1600) score += 2;
  if (attachments.length) score += 1;
  if (has(l, /\b(research|sources?|today|latest|current|news)\b/)) score += 2;
  if (has(l, /\b(compare|evaluate|audit|benchmark|investigate)\b/)) score += 2;
  if (has(l, /\b(architecture|strategy|debug|implement|upgrade|migration)\b/))
    score += 2;
  if (
    has(
      l,
      /\b(and then|after that|end-to-end|production|frontend|backend|database|security|deploy|multi-agent|multiple agents)\b/,
    )
  )
    score += 2;
  if (
    has(
      l,
      /\b(legal|medical|financial|security|permission|delete|publish|send|payment|billing)\b/,
    )
  )
    score += 2;
  const complexity = score >= 6 ? "complex" : score >= 2 ? "medium" : "simple";
  return { complexity, score };
}

function unique(items) {
  return [...new Set(items)];
}
export function selectHopeAgents(objective = "", attachments = []) {
  const s = String(objective).toLowerCase(),
    assessment = assessHopeComplexity(objective, attachments);
  if (assessment.complexity === "simple") return { ...assessment, agents: [] };
  if (
    /\b(send|email|schedule|calendar|create event|publish|delete)\b/.test(s) &&
    !/\b(research|compare|audit|plan|strategy|architecture)\b/.test(s)
  )
    return { ...assessment, agents: [] };
  const agents = [];
  if (
    /\b(plan|strategy|roadmap|architecture|implement|build|upgrade|multi-step|end-to-end)\b/.test(
      s,
    )
  )
    agents.push("planner");
  if (/\b(upgrade|improve|migration|new model)\b/.test(s))
    agents.push("upgrade");
  if (
    /\b(research|latest|current|today|news|sources?|market|compare)\b/.test(s)
  )
    agents.push("deep-research");
  if (
    /\b(ai|model|provider|gemini|openai|openrouter|benchmark|free tier|credits)\b/.test(
      s,
    )
  )
    agents.push("model-scout");
  if (/\b(benchmark|latency|quality|model|provider)\b/.test(s))
    agents.push("benchmark");
  if (
    /\b(ai|model|provider|gemini|openai|openrouter|benchmark|free tier|credits|useful|hype|production-ready)\b/.test(
      s,
    )
  )
    agents.push("ai-evaluator");
  if (
    /\b(code|coding|debug|repository|api|database|frontend|backend|deploy|architecture|implement)\b/.test(
      s,
    )
  )
    agents.push("coding");
  if (
    /\b(security|auth|authorization|permission|rls|secret|payment|billing|delete|publish|send)\b/.test(
      s,
    )
  )
    agents.push("security");
  if (/\b(academy|teach|lesson|learn|curriculum|explain)\b/.test(s))
    agents.push("academy-teacher");
  if (/\b(hyvora|marketing|campaign|content|social media)\b/.test(s))
    agents.push("hyvora");
  if (/\b(memory|remember|preference|previous|earlier)\b/.test(s))
    agents.push("memory");
  if (/\b(automation|schedule|recurring|workflow)\b/.test(s))
    agents.push("automation");
  if (/\b(data|calculate|analysis|metrics|forecast)\b/.test(s))
    agents.push("data-analysis");
  let selected = unique(agents);
  if (!selected.length) selected = ["data-analysis"];
  const specialistLimit = assessment.complexity === "complex" ? 5 : 2;
  selected = selected.slice(0, specialistLimit);
  if (!selected.includes("critic")) selected.push("critic");
  return { ...assessment, agents: selected };
}

export async function createHopeOrchestration(
  env,
  { userId, threadId = null, objective = "", attachments = [] },
) {
  await ensureHopeAgentRegistry(env);
  const selection = selectHopeAgents(objective, attachments),
    id = crypto.randomUUID(),
    stamp = now();
  const enabled = [];
  for (const agentId of selection.agents) {
    const row = await env.DB.prepare(
      `SELECT id FROM hope_agent_registry WHERE id=? AND enabled=1 AND status='active' AND health!='unhealthy'`,
    )
      .bind(agentId)
      .first();
    if (row) enabled.push(agentId);
  }
  await env.DB.prepare(
    `INSERT INTO hope_orchestration_runs(id,user_id,thread_id,objective,complexity,status,planned_agents,verification_status,created_at,updated_at) VALUES(?,?,?,?,?,'planned',?,'pending',?,?)`,
  )
    .bind(
      id,
      userId,
      threadId,
      objective.slice(0, 30000),
      selection.complexity,
      enabled.length,
      stamp,
      stamp,
    )
    .run();
  for (const agentId of enabled) {
    const group =
        agentId === "critic"
          ? 2
          : agentId === "benchmark" && enabled.includes("model-scout")
            ? 1
            : 0,
      taskId = crypto.randomUUID(),
      tool =
        agentId === "deep-research" || agentId === "model-scout"
          ? "verified-source-set"
          : "ai-gateway";
    await env.DB.prepare(
      `INSERT INTO hope_orchestration_tasks(id,run_id,user_id,agent_id,task_type,status,sequence_group,depends_on,tool,created_at,updated_at) VALUES(?,?,?,?,?,'waiting',?,? ,?,?,?)`,
    )
      .bind(
        taskId,
        id,
        userId,
        agentId,
        agentId.replaceAll("-", " "),
        group,
        group === 2
          ? list(enabled.filter((x) => x !== "critic"))
          : group === 1
            ? list(["model-scout"])
            : "[]",
        tool,
        stamp,
        stamp,
      )
      .run();
  }
  return orchestrationStatus(env, id, userId);
}

export async function orchestrationStatus(env, id, userId) {
  await ensureHopeAgentRegistry(env);
  const run = await env.DB.prepare(
    `SELECT id,thread_id,complexity,status,planned_agents,used_agents,verification_status,started_at,completed_at,elapsed_ms,error,created_at,updated_at FROM hope_orchestration_runs WHERE id=? AND user_id=?`,
  )
    .bind(id, userId)
    .first();
  if (!run) return null;
  const q = await env.DB.prepare(
    `SELECT t.id,t.agent_id,r.name,t.task_type,t.status,t.sequence_group,t.tool,t.started_at,t.completed_at,t.elapsed_ms,t.error,t.quality_score FROM hope_orchestration_tasks t JOIN hope_agent_registry r ON r.id=t.agent_id WHERE t.run_id=? AND t.user_id=? ORDER BY t.sequence_group,t.created_at`,
  )
    .bind(id, userId)
    .all();
  return {
    runId: run.id,
    threadId: run.thread_id,
    complexity: run.complexity,
    status: run.status,
    plannedAgents: Number(run.planned_agents || 0),
    usedAgents: Number(run.used_agents || 0),
    verificationStatus: run.verification_status,
    verified: run.verification_status === "verified",
    startedAt: run.started_at,
    completedAt: run.completed_at,
    elapsedMs: Number(run.elapsed_ms || 0),
    error: run.error || null,
    agents: (q.results || []).map((x) => ({
      id: x.agent_id,
      name: x.name,
      taskType: x.task_type,
      status: x.status,
      tool: x.tool || null,
      elapsedMs: Number(x.elapsed_ms || 0),
      error: x.error || null,
      qualityScore: Number(x.quality_score || 0),
    })),
  };
}

export async function finishDirectOrchestration(
  env,
  id,
  userId,
  { ok = true, error = null, elapsedMs = 0 } = {},
) {
  if (!id) return null;
  await ensureHopeAgentRegistry(env);
  const stamp = now();
  await env.DB.prepare(
    `UPDATE hope_orchestration_runs SET status=?,used_agents=0,verification_status=?,started_at=COALESCE(started_at,?),completed_at=?,elapsed_ms=?,error=?,updated_at=? WHERE id=? AND user_id=? AND status IN ('planned','running')`,
  )
    .bind(
      ok ? "completed" : "failed",
      ok ? "direct" : "failed",
      stamp,
      stamp,
      Math.max(0, Number(elapsedMs || 0)),
      error ? String(error).slice(0, 1200) : null,
      stamp,
      id,
      userId,
    )
    .run();
  await env.DB.prepare(
    `UPDATE hope_orchestration_tasks SET status='cancelled',completed_at=?,error='Not required after deterministic/direct routing',updated_at=? WHERE run_id=? AND user_id=? AND status='waiting'`,
  )
    .bind(stamp, stamp, id, userId)
    .run();
  return orchestrationStatus(env, id, userId);
}

export async function listAgentRegistry(env) {
  await ensureHopeAgentRegistry(env);
  const q = await env.DB.prepare(
    `SELECT * FROM hope_agent_registry ORDER BY name`,
  ).all();
  return (q.results || []).map((x) => ({
    ...x,
    capabilities: JSON.parse(x.capabilities || "[]"),
    tools: JSON.parse(x.tools || "[]"),
    required_permissions: JSON.parse(x.required_permissions || "[]"),
    supported_tasks: JSON.parse(x.supported_tasks || "[]"),
    success_rate: Number(x.execution_count || 0)
      ? Math.round(
          (Number(x.success_count || 0) / Number(x.execution_count)) * 1000,
        ) / 10
      : 0,
    average_latency_ms: Number(x.execution_count || 0)
      ? Math.round(Number(x.total_latency_ms || 0) / Number(x.execution_count))
      : 0,
  }));
}
