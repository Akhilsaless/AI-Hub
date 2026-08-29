import assert from "node:assert/strict";
import {
  CURRICULUM,
  LEVEL_MODULE_COUNTS,
  curriculumActivities,
} from "../functions/lib/academy-curriculum.js";
import {
  allLessons,
  levelLessons,
  lesson,
  progressionFor,
  canAccessLesson,
} from "../functions/lib/academy.js";
const activities = curriculumActivities();
for (const [level, count] of Object.entries(LEVEL_MODULE_COUNTS))
  assert.equal(
    CURRICULUM.filter((m) => m.levelId === level).length,
    count,
    `${level} module count`,
  );
assert.ok(
  activities.length >= 220,
  "core academy should contain at least 220 learning activities",
);
assert.equal(
  new Set(activities.map((x) => x.id)).size,
  activities.length,
  "activity IDs must be unique",
);
for (const level of ["beginner", "intermediate", "advanced"]) {
  const ls = levelLessons(level);
  assert.ok(ls.length >= 55, `${level} needs substantial depth`);
  assert.ok(
    CURRICULUM.some((m) => m.levelId === level && m.capstone),
    `${level} needs a capstone`,
  );
  assert.ok(
    ls.some((x) => x.format === "quiz"),
    `${level} needs mastery checks`,
  );
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
  assert.ok(lesson(legacy), `legacy lesson ${legacy} must remain compatible`);
assert.equal(
  lesson("grok")?.retired,
  true,
  "excluded provider progress must resolve to a retired compatibility record",
);
const complete = (ids, score) =>
  ids.map((lesson_id) => ({ lesson_id, status: "completed", score }));
const beginner = levelLessons("beginner");
assert.equal(canAccessLesson(beginner[0].id, []).allowed, true);
assert.equal(canAccessLesson(beginner.at(-1).id, []).allowed, false);
let p = complete(
  beginner.map((x) => x.id),
  90,
);
assert.equal(
  progressionFor(p).levels.intermediate.unlocked,
  true,
  "deep beginner completion should unlock intermediate",
);
const intermediate = levelLessons("intermediate");
p = [
  ...p,
  ...complete(
    intermediate.map((x) => x.id),
    90,
  ),
];
assert.equal(
  progressionFor(p).levels.advanced.unlocked,
  true,
  "deep intermediate completion should unlock advanced",
);
const minutes = Object.fromEntries(
  ["beginner", "intermediate", "advanced"].map((level) => [
    level,
    levelLessons(level).reduce(
      (n, x) => n + Number(x.estimatedMinutes || 0),
      0,
    ),
  ]),
);
assert.ok(
  minutes.beginner >= 600,
  "beginner should represent at least 10 hours",
);
assert.ok(
  minutes.intermediate >= 900,
  "intermediate should represent at least 15 hours",
);
assert.ok(
  minutes.advanced >= 1000,
  "advanced should represent substantial advanced work",
);
console.log("academy phase 2 curriculum gate: PASS", {
  activities: activities.length,
  minutes,
});
