import assert from "node:assert/strict";
import {
  CURRICULUM,
  curriculumActivities,
  LEVEL_MODULE_COUNTS,
} from "../functions/lib/academy-curriculum.js";
import {
  allLessons,
  levelLessons,
  progressionFor,
  canAccessLesson,
} from "../functions/lib/academy.js";
const activities = curriculumActivities(),
  lessons = allLessons();
assert.equal(
  activities.length,
  lessons.length,
  "curriculum and progression lesson counts must match",
);
assert.equal(
  new Set(activities.map((x) => x.id)).size,
  activities.length,
  "activity IDs must be unique",
);
for (const [level, count] of Object.entries(LEVEL_MODULE_COUNTS))
  assert.equal(
    CURRICULUM.filter((m) => m.levelId === level).length,
    count,
    `${level} module count drifted`,
  );
for (const level of ["beginner", "intermediate", "advanced"]) {
  const ls = levelLessons(level);
  assert.ok(ls.length >= 50, `${level} needs substantial depth`);
  const caps = ls.filter((x) => x.capstone);
  assert.ok(caps.length >= 5, `${level} needs a multi-step capstone`);
  const checks = ls.filter((x) =>
    ["quiz", "boss", "assessment"].includes(x.format),
  );
  assert.ok(checks.length >= 8, `${level} needs recurring mastery checks`);
}
for (const legacy of [
  "ai-in-10",
  "prompt-battle",
  "hallucination-hunt",
  "context-window",
  "multimodal",
  "reasoning",
  "openai",
  "gemini",
  "claude",
  "llama",
  "deepseek",
  "qwen",
  "mistral",
  "kimi",
  "glm",
  "minimax",
  "research",
  "docs",
  "sheets",
  "sales",
  "marketing",
  "recruiting",
  "finance",
  "apis",
  "rag",
  "agents",
  "mcp",
  "automation",
  "deploy",
  "planning",
  "memory",
  "tools",
  "routing",
  "evals",
  "guardrails",
  "self-repair",
  "multi-agent",
  "problem",
  "economics",
  "mvp",
  "offer",
  "launch",
])
  assert.ok(
    lessons.some((x) => x.id === legacy),
    `legacy lesson missing: ${legacy}`,
  );
assert.ok(
  !lessons.some((x) => x.id === "grok"),
  "excluded provider must not remain in active curriculum",
);
const completed = (level, score) =>
  levelLessons(level).map((x) => ({
    lesson_id: x.id,
    status: "completed",
    score,
  }));
let p = [];
assert.equal(
  canAccessLesson(levelLessons("intermediate")[0].id, p).allowed,
  false,
);
p = completed("beginner", 80);
assert.equal(progressionFor(p).levels.intermediate.unlocked, true);
p = [...p, ...completed("intermediate", 85)];
assert.equal(progressionFor(p).levels.advanced.unlocked, true);
for (const level of ["beginner", "intermediate", "advanced"]) {
  const ls = levelLessons(level);
  for (let i = 1; i < ls.length; i++) {
    const prior = ls
      .slice(0, i)
      .map((x) => ({ lesson_id: x.id, status: "completed", score: 100 }));
    if (level !== "beginner") prior.unshift(...completed("beginner", 100));
    if (level === "advanced") prior.unshift(...completed("intermediate", 100));
    const access = canAccessLesson(ls[i].id, prior);
    assert.equal(
      access.allowed,
      true,
      `${level} sequence conflict at ${ls[i].id}`,
    );
  }
}
console.log(
  JSON.stringify({
    ok: true,
    activities: activities.length,
    levels: Object.fromEntries(
      ["beginner", "intermediate", "advanced"].map((x) => [
        x,
        levelLessons(x).length,
      ]),
    ),
    minutes: activities.reduce((n, x) => n + x.minutes, 0),
  }),
);
