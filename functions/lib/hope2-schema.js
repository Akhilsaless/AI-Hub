export async function ensureHope2(env){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_memories(id INTEGER PRIMARY KEY AUTOINCREMENT, memory_type TEXT NOT NULL, memory_key TEXT, content TEXT NOT NULL, source TEXT, confidence REAL NOT NULL DEFAULT 1, importance INTEGER NOT NULL DEFAULT 5, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hope_memories_type ON hope_memories(memory_type,enabled,updated_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_goals(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,status TEXT NOT NULL DEFAULT 'active',priority INTEGER NOT NULL DEFAULT 3,progress INTEGER NOT NULL DEFAULT 0,next_action TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_goal_items(id INTEGER PRIMARY KEY AUTOINCREMENT,goal_id TEXT NOT NULL,item_type TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',priority INTEGER NOT NULL DEFAULT 3,position INTEGER NOT NULL DEFAULT 0,notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hope_goal_items_goal ON hope_goal_items(goal_id,item_type,status,position)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_missions(id TEXT PRIMARY KEY,goal_id TEXT,title TEXT NOT NULL,objective TEXT,status TEXT NOT NULL DEFAULT 'planned',mode TEXT NOT NULL DEFAULT 'ask_execute',current_step INTEGER NOT NULL DEFAULT 0,plan TEXT NOT NULL DEFAULT '[]',context TEXT NOT NULL DEFAULT '{}',result TEXT,verified INTEGER NOT NULL DEFAULT 0,retry_count INTEGER NOT NULL DEFAULT 0,max_retries INTEGER NOT NULL DEFAULT 3,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hope_missions_status ON hope_missions(status,updated_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_permissions(id TEXT PRIMARY KEY,scope TEXT NOT NULL,action TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'ask_execute',risk TEXT NOT NULL DEFAULT 'medium',enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_approvals(id TEXT PRIMARY KEY,mission_id TEXT,scope TEXT NOT NULL,action TEXT NOT NULL,summary TEXT NOT NULL,risk TEXT NOT NULL DEFAULT 'medium',preview TEXT,rollback TEXT,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,resolved_at TEXT)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hope_approvals_status ON hope_approvals(status,created_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_verifications(id INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT,action TEXT NOT NULL,target TEXT,method TEXT NOT NULL,status TEXT NOT NULL,evidence TEXT,created_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS hope_experience(id INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT,experience_type TEXT NOT NULL,summary TEXT NOT NULL,details TEXT,success INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)`)
  ]);
  const now=new Date().toISOString();
  const defaults=[['github.commit','github','commit','ask_execute','medium'],['github.production_merge','github','production_merge','ask_execute','high'],['gmail.read','gmail','read','suggest','low'],['gmail.send','gmail','send','ask_execute','high'],['calendar.read','calendar','read','suggest','low'],['calendar.write','calendar','write','ask_execute','medium'],['files.delete','files','delete','ask_execute','high'],['automation.run','automation','run','ask_execute','medium']];
  for(const d of defaults) await env.DB.prepare(`INSERT OR IGNORE INTO hope_permissions(id,scope,action,mode,risk,enabled,updated_at) VALUES(?,?,?,?,?,1,?)`).bind(...d,now).run();
}
