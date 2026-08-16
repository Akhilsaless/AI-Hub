export const D1_SCHEMA_VERSION=1;

const BASELINE=[
 `CREATE TABLE IF NOT EXISTS integrations(id TEXT PRIMARY KEY,provider TEXT NOT NULL,label TEXT,endpoint TEXT,model TEXT,key_cipher TEXT,iv TEXT,verified_free INTEGER NOT NULL DEFAULT 0,enabled INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'not_connected',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 `CREATE TABLE IF NOT EXISTS request_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,product TEXT,provider TEXT,model TEXT,success INTEGER NOT NULL DEFAULT 0,latency_ms INTEGER NOT NULL DEFAULT 0,task_profile TEXT,error TEXT,estimated_cost_usd REAL NOT NULL DEFAULT 0,input_tokens INTEGER NOT NULL DEFAULT 0,output_tokens INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 `CREATE TABLE IF NOT EXISTS provider_settings(provider TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 0,warning_percent INTEGER NOT NULL DEFAULT 80,daily_budget_usd REAL NOT NULL DEFAULT 0,monthly_budget_usd REAL NOT NULL DEFAULT 0,emergency_stop INTEGER NOT NULL DEFAULT 0,last_success_at TEXT,last_error TEXT,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS provider_models(provider TEXT NOT NULL,model_id TEXT NOT NULL,name TEXT,qualified_free INTEGER NOT NULL DEFAULT 0,qualification_source TEXT,healthy INTEGER NOT NULL DEFAULT 1,discovered_at TEXT NOT NULL,PRIMARY KEY(provider,model_id))`,
 `CREATE TABLE IF NOT EXISTS provider_health(provider TEXT PRIMARY KEY,healthy INTEGER NOT NULL DEFAULT 1,last_checked_at TEXT,error TEXT,last_status INTEGER,latency_ms INTEGER,last_error TEXT,checked_at TEXT)`,
 `CREATE TABLE IF NOT EXISTS provider_budget_state(provider TEXT PRIMARY KEY,day_key TEXT NOT NULL,month_key TEXT NOT NULL,daily_spend_usd REAL NOT NULL DEFAULT 0,monthly_spend_usd REAL NOT NULL DEFAULT 0,reserved_usd REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS tool_connectors(id TEXT PRIMARY KEY,label TEXT NOT NULL,key_cipher TEXT,iv TEXT,account TEXT,metadata TEXT,enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS app_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,plan TEXT NOT NULL DEFAULT 'free',status TEXT NOT NULL DEFAULT 'active',session_version INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_usage(user_id TEXT NOT NULL,metric TEXT NOT NULL,period TEXT NOT NULL,value INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,metric,period))`,
 `CREATE TABLE IF NOT EXISTS auth_rate_limits(scope TEXT NOT NULL,actor_hash TEXT NOT NULL,window_started INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,blocked_until INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(scope,actor_hash))`,
 `CREATE TABLE IF NOT EXISTS user_connectors(user_id TEXT NOT NULL,connector_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'disconnected',account_label TEXT,scopes TEXT NOT NULL DEFAULT '[]',token_cipher TEXT,iv TEXT,metadata TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,connector_id))`,
 `CREATE TABLE IF NOT EXISTS user_projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL DEFAULT 'general',status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS team_members(team_id TEXT NOT NULL,user_id TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'member',created_at TEXT NOT NULL,PRIMARY KEY(team_id,user_id))`,
 `CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,instructions TEXT NOT NULL,proactive INTEGER NOT NULL DEFAULT 1,memory_mode TEXT NOT NULL DEFAULT 'long',permissions TEXT NOT NULL DEFAULT '{}',enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS agent_memory(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT NOT NULL,memory_key TEXT NOT NULL,memory_value TEXT NOT NULL,importance INTEGER NOT NULL DEFAULT 5,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(agent_id,memory_key))`,
 `CREATE TABLE IF NOT EXISTS agent_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS agent_tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',schedule TEXT,tool TEXT,payload TEXT,requires_approval INTEGER NOT NULL DEFAULT 1,result TEXT,next_run_at TEXT,recurrence TEXT,last_run_at TEXT,run_count INTEGER NOT NULL DEFAULT 0,failure_count INTEGER NOT NULL DEFAULT 0,enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS automation_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,task_id INTEGER NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,result TEXT,error TEXT,verified INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(task_id) REFERENCES agent_tasks(id))`,
 `CREATE TABLE IF NOT EXISTS hope_memories(id INTEGER PRIMARY KEY AUTOINCREMENT,memory_type TEXT NOT NULL,memory_key TEXT,content TEXT NOT NULL,source TEXT,confidence REAL NOT NULL DEFAULT 1,importance INTEGER NOT NULL DEFAULT 5,enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_goals(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,status TEXT NOT NULL DEFAULT 'active',priority INTEGER NOT NULL DEFAULT 3,progress INTEGER NOT NULL DEFAULT 0,next_action TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_goal_items(id INTEGER PRIMARY KEY AUTOINCREMENT,goal_id TEXT NOT NULL,item_type TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',priority INTEGER NOT NULL DEFAULT 3,position INTEGER NOT NULL DEFAULT 0,notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_missions(id TEXT PRIMARY KEY,goal_id TEXT,title TEXT NOT NULL,objective TEXT,status TEXT NOT NULL DEFAULT 'planned',mode TEXT NOT NULL DEFAULT 'ask_execute',current_step INTEGER NOT NULL DEFAULT 0,plan TEXT NOT NULL DEFAULT '[]',context TEXT NOT NULL DEFAULT '{}',result TEXT,verified INTEGER NOT NULL DEFAULT 0,retry_count INTEGER NOT NULL DEFAULT 0,max_retries INTEGER NOT NULL DEFAULT 3,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_approvals(id TEXT PRIMARY KEY,mission_id TEXT,scope TEXT NOT NULL,action TEXT NOT NULL,summary TEXT NOT NULL,risk TEXT NOT NULL DEFAULT 'medium',preview TEXT,rollback TEXT,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,resolved_at TEXT)`,
 `CREATE TABLE IF NOT EXISTS hope_verifications(id INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT,action TEXT NOT NULL,target TEXT,method TEXT NOT NULL,status TEXT NOT NULL,evidence TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_permissions(id TEXT PRIMARY KEY,scope TEXT NOT NULL,action TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'ask_execute',risk TEXT NOT NULL DEFAULT 'medium',enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_experience(id INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT,experience_type TEXT NOT NULL,summary TEXT NOT NULL,details TEXT,success INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_entities(id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,name TEXT NOT NULL,summary TEXT,project_id TEXT,status TEXT NOT NULL DEFAULT 'active',source TEXT,confidence REAL NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_relationships(id INTEGER PRIMARY KEY AUTOINCREMENT,from_id TEXT NOT NULL,relation TEXT NOT NULL,to_id TEXT NOT NULL,confidence REAL NOT NULL DEFAULT 1,evidence TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(from_id,relation,to_id))`,
 `CREATE TABLE IF NOT EXISTS hope_open_loops(id TEXT PRIMARY KEY,subject TEXT NOT NULL,related_id TEXT,current_state TEXT,reason TEXT,next_action TEXT,dependency TEXT,priority INTEGER NOT NULL DEFAULT 3,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,last_activity TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_decisions(id TEXT PRIMARY KEY,subject TEXT NOT NULL,decision TEXT NOT NULL,reason TEXT,applies_to TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE',supersedes_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_policies(id TEXT PRIMARY KEY,scope TEXT NOT NULL,rule TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'enforce',source TEXT NOT NULL DEFAULT 'user',status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,goal_id TEXT,repository TEXT,environment TEXT,architecture TEXT,current_version TEXT,last_work TEXT,next_action TEXT,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_timeline(id INTEGER PRIMARY KEY AUTOINCREMENT,project_id TEXT,event_type TEXT NOT NULL,summary TEXT NOT NULL,evidence TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_skills(id TEXT NOT NULL,version INTEGER NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',confidence TEXT NOT NULL DEFAULT 'EXPERIMENTAL',procedure TEXT NOT NULL,requirements TEXT NOT NULL DEFAULT '[]',validation TEXT,change_reason TEXT,evidence TEXT,created_at TEXT NOT NULL,PRIMARY KEY(id,version))`,
 `CREATE TABLE IF NOT EXISTS hope_skill_stats(skill_id TEXT PRIMARY KEY,executions INTEGER NOT NULL DEFAULT 0,successes INTEGER NOT NULL DEFAULT 0,failures INTEGER NOT NULL DEFAULT 0,partials INTEGER NOT NULL DEFAULT 0,total_duration_ms INTEGER NOT NULL DEFAULT 0,last_execution TEXT,models TEXT NOT NULL DEFAULT '{}',tools TEXT NOT NULL DEFAULT '{}',failure_patterns TEXT NOT NULL DEFAULT '{}',verification_passes INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_worker_stats(worker_type TEXT NOT NULL,model TEXT NOT NULL,tasks INTEGER NOT NULL DEFAULT 0,successes INTEGER NOT NULL DEFAULT 0,failures INTEGER NOT NULL DEFAULT 0,total_duration_ms INTEGER NOT NULL DEFAULT 0,total_cost REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(worker_type,model))`,
 `CREATE TABLE IF NOT EXISTS hope_outcomes(id INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT,action TEXT,outcome TEXT NOT NULL,status TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0,feedback TEXT,environment TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_shadow_patterns(id TEXT PRIMARY KEY,signature TEXT NOT NULL,repetitions INTEGER NOT NULL DEFAULT 1,successes INTEGER NOT NULL DEFAULT 0,exceptions INTEGER NOT NULL DEFAULT 0,last_seen TEXT NOT NULL,suggested INTEGER NOT NULL DEFAULT 0,approved INTEGER NOT NULL DEFAULT 0)`,
 `CREATE TABLE IF NOT EXISTS hope_cost_events(id INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT,path TEXT NOT NULL,provider TEXT,model TEXT,estimated_cost REAL NOT NULL DEFAULT 0,currency TEXT NOT NULL DEFAULT 'USD',created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope_gateway_events(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,thread_id TEXT,intent TEXT NOT NULL,reasoning TEXT NOT NULL,provider TEXT,model TEXT,success INTEGER NOT NULL,latency_ms INTEGER NOT NULL DEFAULT 0,error TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hope3_execution_events(id INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT NOT NULL,step_id TEXT,event_type TEXT NOT NULL,status TEXT NOT NULL,detail TEXT,evidence TEXT,attempt INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_hope_threads(id TEXT NOT NULL,user_id TEXT NOT NULL,title TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,id))`,
 `CREATE TABLE IF NOT EXISTS user_hope_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,thread_id TEXT NOT NULL DEFAULT 'legacy',role TEXT NOT NULL,content TEXT NOT NULL,attachments TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_hope_memory(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,content TEXT NOT NULL,importance INTEGER NOT NULL DEFAULT 5,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_hope_agent_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,objective TEXT NOT NULL,plan TEXT NOT NULL,status TEXT NOT NULL,current_step TEXT,result TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_hope_actions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,action TEXT NOT NULL,status TEXT NOT NULL,risk TEXT NOT NULL,payload TEXT NOT NULL,result TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_hope_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,objective TEXT NOT NULL,status TEXT NOT NULL,job TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_hope_missions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,title TEXT NOT NULL,objective TEXT NOT NULL,schedule TEXT NOT NULL,recurrence TEXT,next_run_at TEXT,status TEXT NOT NULL DEFAULT 'active',approval_mode TEXT NOT NULL DEFAULT 'writes',enabled INTEGER NOT NULL DEFAULT 1,last_run_at TEXT,run_count INTEGER NOT NULL DEFAULT 0,failure_count INTEGER NOT NULL DEFAULT 0,last_result TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS user_hope_mission_runs(id TEXT PRIMARY KEY,mission_id TEXT NOT NULL,user_id TEXT NOT NULL,status TEXT NOT NULL,job TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,FOREIGN KEY(mission_id) REFERENCES user_hope_missions(id))`,
 `CREATE TABLE IF NOT EXISTS user_hope_inbox(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,type TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'unread',priority INTEGER NOT NULL DEFAULT 5,mission_id TEXT,run_id TEXT,action TEXT,created_at TEXT NOT NULL,read_at TEXT,resolved_at TEXT)`,
 `CREATE TABLE IF NOT EXISTS user_hope_working_memory(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,scope TEXT NOT NULL,scope_id TEXT,kind TEXT NOT NULL,content TEXT NOT NULL,importance INTEGER NOT NULL DEFAULT 5,source_run_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS academy_profiles(user_id TEXT PRIMARY KEY,xp INTEGER NOT NULL DEFAULT 0,streak INTEGER NOT NULL DEFAULT 0,last_active TEXT,skill_scores TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS academy_progress(user_id TEXT NOT NULL,lesson_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'started',score INTEGER NOT NULL DEFAULT 0,xp_earned INTEGER NOT NULL DEFAULT 0,completed_at TEXT,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id))`,
 `CREATE TABLE IF NOT EXISTS academy_missions(user_id TEXT NOT NULL,mission_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',score INTEGER NOT NULL DEFAULT 0,xp_earned INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,mission_id))`,
 `CREATE TABLE IF NOT EXISTS academy_proofs(user_id TEXT NOT NULL,arena_id TEXT NOT NULL,attempt_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'started',score INTEGER NOT NULL DEFAULT 0,verified INTEGER NOT NULL DEFAULT 0,evidence TEXT NOT NULL DEFAULT '{}',feedback TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,attempt_id))`,
 `CREATE TABLE IF NOT EXISTS academy_duels(user_id TEXT NOT NULL,duel_id TEXT PRIMARY KEY,prompt TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',model_a TEXT NOT NULL,provider_a TEXT NOT NULL,response_a TEXT NOT NULL,model_b TEXT NOT NULL,provider_b TEXT NOT NULL,response_b TEXT NOT NULL,choice TEXT,reason TEXT,reasoning TEXT,revealed INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT,judged_at TEXT)`
];

const INDEXES=[
 `CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at)`,
 `CREATE INDEX IF NOT EXISTS idx_user_projects_user ON user_projects(user_id,updated_at)`,
 `CREATE INDEX IF NOT EXISTS idx_user_connectors_user ON user_connectors(user_id,status)`,
 `CREATE INDEX IF NOT EXISTS idx_user_hope_messages_thread ON user_hope_messages(user_id,thread_id,id)`,
 `CREATE INDEX IF NOT EXISTS idx_user_hope_memory_user ON user_hope_memory(user_id,importance,created_at)`,
 `CREATE INDEX IF NOT EXISTS idx_user_hope_actions_user ON user_hope_actions(user_id,created_at)`,
 `CREATE INDEX IF NOT EXISTS idx_user_hope_jobs_user ON user_hope_jobs(user_id,status,updated_at)`,
 `CREATE INDEX IF NOT EXISTS idx_hope_missions_due ON user_hope_missions(enabled,status,next_run_at)`,
 `CREATE INDEX IF NOT EXISTS idx_hope_inbox_user ON user_hope_inbox(user_id,status,created_at)`,
 `CREATE INDEX IF NOT EXISTS idx_hope_working_memory_user ON user_hope_working_memory(user_id,scope,scope_id,updated_at)`,
 `CREATE INDEX IF NOT EXISTS idx_hope_memories_type ON hope_memories(memory_type,enabled,updated_at)`,
 `CREATE INDEX IF NOT EXISTS idx_hope_goal_items_goal ON hope_goal_items(goal_id,item_type,status,position)`,
 `CREATE INDEX IF NOT EXISTS idx_hope_missions_status ON hope_missions(status,updated_at)`,
 `CREATE INDEX IF NOT EXISTS idx_hope_approvals_status ON hope_approvals(status,created_at)`,
 `CREATE INDEX IF NOT EXISTS idx_open_loops_status ON hope_open_loops(status,priority,last_activity)`
];

const UPGRADES={
 integrations:{label:'TEXT',endpoint:'TEXT',key_cipher:'TEXT',iv:'TEXT',verified_free:'INTEGER NOT NULL DEFAULT 0',enabled:'INTEGER NOT NULL DEFAULT 0',status:"TEXT NOT NULL DEFAULT 'not_connected'",created_at:'TEXT',updated_at:'TEXT'},
 request_logs:{product:'TEXT',latency_ms:'INTEGER NOT NULL DEFAULT 0',task_profile:'TEXT',error:'TEXT',estimated_cost_usd:'REAL NOT NULL DEFAULT 0',input_tokens:'INTEGER NOT NULL DEFAULT 0',output_tokens:'INTEGER NOT NULL DEFAULT 0'},
 provider_health:{last_status:'INTEGER',latency_ms:'INTEGER',last_error:'TEXT',checked_at:'TEXT'},
 agent_tasks:{result:'TEXT',next_run_at:'TEXT',recurrence:'TEXT',last_run_at:'TEXT',run_count:'INTEGER NOT NULL DEFAULT 0',failure_count:'INTEGER NOT NULL DEFAULT 0',enabled:'INTEGER NOT NULL DEFAULT 1'},
 app_users:{session_version:'INTEGER NOT NULL DEFAULT 0'},
 user_hope_messages:{thread_id:"TEXT NOT NULL DEFAULT 'legacy'",attachments:"TEXT NOT NULL DEFAULT '[]'"},
 academy_duels:{status:"TEXT NOT NULL DEFAULT 'open'",reason:'TEXT',reasoning:'TEXT',revealed:'INTEGER NOT NULL DEFAULT 0',updated_at:'TEXT',judged_at:'TEXT'}
};

let ready;

async function columns(env,table){
 const result=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
 return new Set((result.results||[]).map(row=>String(row.name)));
}

async function addMissingColumns(env){
 for(const [table,wanted] of Object.entries(UPGRADES)){
  const existing=await columns(env,table);
  for(const [name,type] of Object.entries(wanted))if(!existing.has(name)){
   try{await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`).run()}catch(error){
    if(!/duplicate column/i.test(String(error?.message||error)))throw error;
   }
  }
 }
}

async function migrate(env){
 if(!env.DB)throw new Error('D1 binding DB is missing');
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS hyvora_schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL)`).run();
 const applied=await env.DB.prepare(`SELECT version FROM hyvora_schema_migrations WHERE version=?`).bind(D1_SCHEMA_VERSION).first();
 if(applied)return {version:D1_SCHEMA_VERSION,applied:false};
 await env.DB.batch(BASELINE.map(sql=>env.DB.prepare(sql)));
 await addMissingColumns(env);
 await env.DB.batch(INDEXES.map(sql=>env.DB.prepare(sql)));
 await env.DB.prepare(`INSERT OR IGNORE INTO hyvora_schema_migrations(version,name,applied_at) VALUES(?,?,?)`).bind(D1_SCHEMA_VERSION,'existing_hyvora_baseline',new Date().toISOString()).run();
 return {version:D1_SCHEMA_VERSION,applied:true};
}

export function ensureD1Schema(env){
 if(!ready)ready=migrate(env).catch(error=>{ready=null;throw error});
 return ready;
}

export const D1_BASELINE_TABLES=BASELINE.map(sql=>sql.match(/CREATE TABLE IF NOT EXISTS\s+([\w]+)/i)?.[1]).filter(Boolean);
