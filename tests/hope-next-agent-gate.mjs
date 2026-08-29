import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import {
  HOPE_AGENT_DEFINITIONS,
  assessHopeComplexity,
  createHopeOrchestration,
  orchestrationStatus,
  selectHopeAgents,
} from "../functions/lib/hope-agent-registry.js";

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }
  bind(...args) {
    this.args = args;
    return this;
  }
  _run() {
    const s = this.db.prepare(this.sql);
    s.bind(this.args);
    return s;
  }
  async run() {
    const s = this._run();
    try {
      while (s.step()) {}
      return {
        meta: {
          changes: this.db.getRowsModified(),
          last_row_id: Number(
            this.db.exec("select last_insert_rowid() id")[0]
              ?.values?.[0]?.[0] || 0,
          ),
        },
      };
    } finally {
      s.free();
    }
  }
  async first() {
    const s = this._run();
    try {
      return s.step() ? s.getAsObject() : null;
    } finally {
      s.free();
    }
  }
  async all() {
    const s = this._run(),
      results = [];
    try {
      while (s.step()) results.push(s.getAsObject());
      return { results };
    } finally {
      s.free();
    }
  }
}
class D1 {
  constructor(db) {
    this.db = db;
  }
  prepare(sql) {
    return new Statement(this.db, sql);
  }
  async batch(items) {
    return Promise.all(items.map((x) => x.run()));
  }
}

assert.equal(assessHopeComplexity("What is RAG?").complexity, "simple");
assert.deepEqual(
  selectHopeAgents("What is RAG?").agents,
  [],
  "simple questions must stay with HOPE",
);
const medium = selectHopeAgents("Compare RAG and fine-tuning for my project.");
assert.equal(medium.complexity, "medium");
assert.ok(
  medium.agents.length >= 2 && medium.agents.length <= 3,
  "medium work must use a small team",
);
const complex = selectHopeAgents(
  "Research today's newest AI models, benchmark useful ones against our current free model and tell me whether HOPE should upgrade.",
);
assert.equal(complex.complexity, "complex");
for (const id of [
  "deep-research",
  "model-scout",
  "benchmark",
  "upgrade",
  "critic",
])
  assert.ok(
    complex.agents.includes(id),
    `${id} must be selected for model-upgrade research`,
  );
assert.equal(
  new Set(HOPE_AGENT_DEFINITIONS.map((x) => x.id)).size,
  HOPE_AGENT_DEFINITIONS.length,
  "agent IDs must be unique",
);

const SQL = await initSqlJs(),
  env = { DB: new D1(new SQL.Database()) };
const run = await createHopeOrchestration(env, {
  userId: "user-a",
  threadId: "thread-a",
  objective: "Compare RAG and fine-tuning for my project.",
});
assert.equal(run.status, "planned");
assert.equal(run.agents.length, run.plannedAgents);
assert.equal(
  await orchestrationStatus(env, run.runId, "user-b"),
  null,
  "another user must not read an orchestration run",
);
const simple = await createHopeOrchestration(env, {
  userId: "user-a",
  threadId: "thread-b",
  objective: "What is RAG?",
});
assert.equal(
  simple.plannedAgents,
  0,
  "simple questions must not deploy specialists",
);

console.log(
  `PASS hope-next-agent-gate: ${HOPE_AGENT_DEFINITIONS.length} registered agents, minimal allocation, dynamic model team and user isolation verified`,
);
