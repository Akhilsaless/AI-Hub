import { CURRICULUM, curriculumActivities } from "./academy-curriculum.js";
export { CURRICULUM } from "./academy-curriculum.js";
export const LEVELS = [
  {
    id: "beginner",
    title: "Beginner",
    order: 1,
    minMastery: 80,
    tracks: ["foundations", "models", "work"],
  },
  {
    id: "intermediate",
    title: "Intermediate",
    order: 2,
    minMastery: 85,
    tracks: ["work", "builder"],
  },
  {
    id: "advanced",
    title: "Advanced",
    order: 3,
    minMastery: 88,
    tracks: ["agent-engineer", "business"],
  },
];
export const SPECIALIST_TRACKS = [
  { id: "students", title: "AI for Students", requiresLevel: "intermediate" },
  {
    id: "job-seekers",
    title: "AI for Job Seekers",
    requiresLevel: "intermediate",
  },
  {
    id: "creators",
    title: "AI for Creators & YouTube",
    requiresLevel: "intermediate",
  },
  {
    id: "marketing-specialist",
    title: "AI for Marketing",
    requiresLevel: "intermediate",
  },
  {
    id: "sales-specialist",
    title: "AI for Sales",
    requiresLevel: "intermediate",
  },
  {
    id: "business-owners",
    title: "AI for Business Owners",
    requiresLevel: "intermediate",
  },
  { id: "developers", title: "AI for Developers", requiresLevel: "advanced" },
  {
    id: "automation-agents",
    title: "AI Automation & Agents",
    requiresLevel: "advanced",
  },
  {
    id: "data-productivity",
    title: "AI for Data & Productivity",
    requiresLevel: "intermediate",
  },
];
const META = {
  foundations: {
    title: "AI Foundations",
    icon: "🧠",
    desc: "Understand, prompt and verify AI safely.",
  },
  models: {
    title: "Model Arena",
    icon: "⚔️",
    desc: "Compare major AI model families and capabilities.",
  },
  work: {
    title: "AI at Work",
    icon: "⚡",
    desc: "Use AI for research, documents, data and business work.",
  },
  builder: {
    title: "AI Builder",
    icon: "🛠️",
    desc: "Build with APIs, RAG, agents and automation.",
  },
  "agent-engineer": {
    title: "Agent Engineer",
    icon: "🤖",
    desc: "Engineer reliable, evaluated and secure AI systems.",
  },
  business: {
    title: "AI Business Builder",
    icon: "🚀",
    desc: "Turn AI ability into products and businesses.",
  },
};
const activities = curriculumActivities();
export const TRACKS = Object.keys(META).map((id) => {
  const a = activities.filter((x) => x.trackId === id),
    levelId = a[0]?.levelId || "beginner",
    m = META[id];
  return {
    id,
    title: m.title,
    icon: m.icon,
    level: levelId[0].toUpperCase() + levelId.slice(1),
    levelId,
    xp: a.length * 100,
    desc: m.desc,
    lessons: a.map((x) => [x.id, x.title, x.type]),
  };
});
export const MODEL_FAMILIES = [
  "OpenAI GPT",
  "Google Gemini",
  "Anthropic Claude",
  "Meta Llama",
  "DeepSeek",
  "Qwen",
  "Mistral",
  "Kimi",
  "GLM",
  "MiniMax",
  "Cohere",
  "NVIDIA NIM",
  "OpenRouter",
  "Hugging Face",
  "Groq",
  "Cerebras",
];
export function allLessons() {
  return activities.map((x, i) => ({
    id: x.id,
    title: x.title,
    format: x.type,
    trackId: x.trackId,
    trackTitle: META[x.trackId]?.title || x.trackId,
    levelId: x.levelId,
    moduleId: x.moduleId,
    moduleTitle: x.moduleTitle,
    moduleIndex: x.moduleIndex,
    activityIndex: x.activityIndex,
    estimatedMinutes: x.minutes,
    capstone: x.capstone,
    index: i,
    xp: 80 + (i % 3) * 20,
  }));
}
export function lesson(id) {
  if (id === "grok")
    return {
      id: "grok",
      title: "Retired lesson",
      format: "retired",
      trackId: "models",
      trackTitle: "Model Arena",
      levelId: "beginner",
      retired: true,
      retirementReason: "This provider is excluded from HOPE.",
    };
  return allLessons().find((x) => x.id === id) || null;
}
export function levelById(id) {
  return LEVELS.find((x) => x.id === id) || LEVELS[0];
}
export function levelLessons(levelId) {
  return allLessons().filter((l) => l.levelId === levelId);
}
export function levelProgress(levelId, progress = []) {
  const lessons = levelLessons(levelId),
    done = lessons.filter((l) =>
      progress.some((p) => p.lesson_id === l.id && p.status === "completed"),
    ),
    scores = done.map((l) =>
      Number(progress.find((p) => p.lesson_id === l.id)?.score || 0),
    ),
    average = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  return {
    levelId,
    total: lessons.length,
    completed: done.length,
    average,
    complete: done.length === lessons.length,
  };
}
export function progressionFor(progress = []) {
  const beginner = levelProgress("beginner", progress),
    intermediate = levelProgress("intermediate", progress),
    advanced = levelProgress("advanced", progress);
  const beginnerPassed =
    beginner.complete && beginner.average >= levelById("beginner").minMastery;
  const intermediatePassed =
    intermediate.complete &&
    intermediate.average >= levelById("intermediate").minMastery;
  return {
    levels: {
      beginner: { ...beginner, unlocked: true, passed: beginnerPassed },
      intermediate: {
        ...intermediate,
        unlocked: beginnerPassed,
        passed: intermediatePassed,
      },
      advanced: {
        ...advanced,
        unlocked: beginnerPassed && intermediatePassed,
        passed:
          advanced.complete &&
          advanced.average >= levelById("advanced").minMastery,
      },
    },
    highestUnlocked: beginnerPassed
      ? intermediatePassed
        ? "advanced"
        : "intermediate"
      : "beginner",
  };
}
export function canAccessLesson(lessonId, progress = []) {
  const l = lesson(lessonId);
  if (!l) return { allowed: false, reason: "unknown_lesson" };
  const gate = progressionFor(progress).levels[l.levelId];
  if (!gate?.unlocked)
    return { allowed: false, reason: "level_locked", levelId: l.levelId };
  const levelLs = levelLessons(l.levelId),
    idx = levelLs.findIndex((x) => x.id === l.id);
  if (idx > 0) {
    const previous = levelLs[idx - 1];
    const previousDone = progress.some(
      (p) => p.lesson_id === previous.id && p.status === "completed",
    );
    if (!previousDone)
      return {
        allowed: false,
        reason: "previous_lesson_required",
        requiredLessonId: previous.id,
        levelId: l.levelId,
      };
  }
  return { allowed: true, levelId: l.levelId };
}
export function dailyMission(seed = new Date().toISOString().slice(0, 10)) {
  const missions = [
    [
      "Spot the Fake",
      "HOPE gives you three AI claims. Find the hallucination.",
      "research",
    ],
    [
      "Model Duel",
      "Solve one task with two model approaches and judge the winner.",
      "models",
    ],
    [
      "Automate It",
      "Take one repetitive task and design a 3-step AI automation.",
      "builder",
    ],
    [
      "Prompt Remix",
      "Turn a weak prompt into a professional one in under 90 seconds.",
      "foundations",
    ],
    [
      "Agent Rescue",
      "An agent is failing. Diagnose the reason and propose the smallest fix.",
      "agent-engineer",
    ],
  ];
  let n = 0;
  for (const c of seed) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  const m = missions[n % missions.length];
  return {
    id: `daily-${seed}`,
    title: m[0],
    description: m[1],
    track: m[2],
    xp: 150,
  };
}
export function levelFor(xp) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 180)) + 1);
}
