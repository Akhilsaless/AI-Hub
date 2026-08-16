export async function ensureHyvoraMarketingSchema(env){
  const statements=[
    `CREATE TABLE IF NOT EXISTS marketing_brand_profiles(user_id TEXT PRIMARY KEY,brand_name TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',audience TEXT NOT NULL DEFAULT '',offer TEXT NOT NULL DEFAULT '',voice TEXT NOT NULL DEFAULT 'clear, useful, credible',goals TEXT NOT NULL DEFAULT '[]',platforms TEXT NOT NULL DEFAULT '[]',guardrails TEXT NOT NULL DEFAULT '[]',updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS marketing_campaigns(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,objective TEXT NOT NULL,platforms TEXT NOT NULL DEFAULT '[]',status TEXT NOT NULL DEFAULT 'draft',approval_mode TEXT NOT NULL DEFAULT 'before_publish',strategy TEXT NOT NULL DEFAULT '{}',schedule TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS marketing_assets(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,user_id TEXT NOT NULL,platform TEXT NOT NULL,asset_type TEXT NOT NULL,content TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',metadata TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS marketing_publication_jobs(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,asset_id TEXT NOT NULL,user_id TEXT NOT NULL,platform TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'awaiting_approval',scheduled_for TEXT,result TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS marketing_metrics(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,campaign_id TEXT,asset_id TEXT,platform TEXT NOT NULL,metric TEXT NOT NULL,value REAL NOT NULL DEFAULT 0,observed_at TEXT NOT NULL,source TEXT NOT NULL DEFAULT 'manual')`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user ON marketing_campaigns(user_id,updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_assets_campaign ON marketing_assets(user_id,campaign_id,updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_publication_user ON marketing_publication_jobs(user_id,status,scheduled_for)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_metrics_campaign ON marketing_metrics(user_id,campaign_id,observed_at)`
  ];
  for(const sql of statements)await env.DB.prepare(sql).run();
}

export const parseJson=(value,fallback=[])=>{try{return JSON.parse(value)}catch{return fallback}};
export const id=(prefix='mkt')=>`${prefix}_${crypto.randomUUID()}`;
export const now=()=>new Date().toISOString();
export const cleanList=value=>Array.from(new Set((Array.isArray(value)?value:[]).map(v=>String(v||'').trim()).filter(Boolean))).slice(0,20);
export function fallbackStrategy({brand,objective,platforms}){
  const audience=brand?.audience||'the intended audience';
  const offer=brand?.offer||brand?.description||'the brand offer';
  return {
    positioning:`Show how ${offer} helps ${audience} achieve ${objective}.`,
    pillars:['Educate with useful proof','Demonstrate the product or process','Build trust with outcomes and stories','Convert with one clear next action'],
    cadence:platforms.reduce((acc,p)=>({...acc,[p]:'3-5 quality posts per week, adjusted after analytics'}),{}),
    experiment:'Test two hooks for the same core idea and keep the winner based on retention/engagement, not vanity impressions.',
    safety:'Publishing remains approval-gated until a platform connection is verified.'
  };
}
