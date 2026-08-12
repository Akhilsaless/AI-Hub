export async function ensureAutomationSchema(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agent_tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',schedule TEXT,tool TEXT,payload TEXT,requires_approval INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
  for(const sql of [
    `ALTER TABLE agent_tasks ADD COLUMN result TEXT`,
    `ALTER TABLE agent_tasks ADD COLUMN next_run_at TEXT`,
    `ALTER TABLE agent_tasks ADD COLUMN recurrence TEXT`,
    `ALTER TABLE agent_tasks ADD COLUMN last_run_at TEXT`,
    `ALTER TABLE agent_tasks ADD COLUMN run_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE agent_tasks ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE agent_tasks ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`
  ]){try{await env.DB.prepare(sql).run()}catch{}}
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS automation_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,task_id INTEGER NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,result TEXT,error TEXT,verified INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(task_id) REFERENCES agent_tasks(id))`).run();
}
function pad(n){return String(n).padStart(2,'0')}
export function parseSchedule(value,now=new Date()){
  const raw=String(value||'').trim();
  if(!raw)return {nextRunAt:null,recurrence:null};
  if(/^(run\s+)?once\s+now$/i.test(raw)||/^now$/i.test(raw))return {nextRunAt:now.toISOString(),recurrence:null};
  const direct=new Date(raw);
  if(!Number.isNaN(direct.getTime()))return {nextRunAt:direct.toISOString(),recurrence:null};
  let m=raw.match(/^daily\s+(?:at\s+)?(\d{1,2}):(\d{2})$/i);
  if(m){const h=Number(m[1]),min=Number(m[2]);if(h>23||min>59)throw new Error('Invalid daily time');let d=new Date(now);d.setUTCSeconds(0,0);d.setUTCHours(h,min,0,0);if(d<=now)d.setUTCDate(d.getUTCDate()+1);return {nextRunAt:d.toISOString(),recurrence:`daily ${pad(h)}:${pad(min)}`}}
  m=raw.match(/^every\s+(\d+)\s+(hour|hours|day|days)$/i);
  if(m){const n=Math.max(1,Number(m[1])),unit=m[2].toLowerCase().startsWith('hour')?'hours':'days',ms=n*(unit==='hours'?3600000:86400000);return {nextRunAt:new Date(now.getTime()+ms).toISOString(),recurrence:`every ${n} ${unit}`}}
  throw new Error('Schedule must be "now", "run once now", an ISO date/time, "daily HH:MM" (UTC), or "every N hours/days"');
}
export function nextAfter(recurrence,from=new Date()){
  const r=String(recurrence||'').trim();if(!r)return null;
  let m=r.match(/^daily\s+(\d{2}):(\d{2})$/i);if(m){const d=new Date(from);d.setUTCSeconds(0,0);d.setUTCHours(Number(m[1]),Number(m[2]),0,0);if(d<=from)d.setUTCDate(d.getUTCDate()+1);return d.toISOString()}
  m=r.match(/^every\s+(\d+)\s+(hours|days)$/i);if(m){const ms=Number(m[1])*(m[2]==='hours'?3600000:86400000);return new Date(from.getTime()+ms).toISOString()}
  return null;
}
