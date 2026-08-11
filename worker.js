const PROVIDERS = [
  {id:'openrouter',name:'OpenRouter Free',region:'Global',note:'Use only free router / free model variants.'},
  {id:'gemini',name:'Google Gemini Free Tier',region:'Global',note:'Enable only after confirming the selected model is currently free.'},
  {id:'groq',name:'Groq Free Tier',region:'Global',note:'Fast hosted inference; free limits vary by model.'},
  {id:'workers-ai',name:'Cloudflare Workers AI',region:'Global',note:'Uses the Cloudflare account AI binding; no external key required.'},
  {id:'qwen',name:'Qwen / Alibaba',region:'China',note:'Connect legitimate free API quota or OpenAI-compatible endpoint.'},
  {id:'deepseek',name:'DeepSeek',region:'China',note:'Official API may be paid; use only a verified zero-cost route in Zero-Cost mode.'},
  {id:'zai',name:'Z.ai / GLM',region:'China',note:'Connect a verified free model/endpoint only.'},
  {id:'kimi',name:'Kimi / Moonshot',region:'China',note:'Connect a verified free/open route only.'},
  {id:'minimax',name:'MiniMax',region:'China',note:'Connect a verified free/open route only.'},
  {id:'tencent',name:'Tencent / Hunyuan',region:'China',note:'Connect free quota/token-hub routes only when verified.'}
];

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
function html(body){return new Response(body,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})}
function b64(bytes){return btoa(String.fromCharCode(...bytes))}
function fromB64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function keyFromSecret(secret){const raw=new TextEncoder().encode(secret);const digest=await crypto.subtle.digest('SHA-256',raw);return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encrypt(secret,value){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await keyFromSecret(secret);const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value)));return `${b64(iv)}.${b64(ct)}`}
async function decrypt(secret,value){const [a,b]=value.split('.');const key=await keyFromSecret(secret);const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(a)},key,fromB64(b));return new TextDecoder().decode(pt)}

async function ensureDb(env){if(!env.DB) return false;await env.DB.prepare(`CREATE TABLE IF NOT EXISTS integrations(
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT,
  endpoint TEXT,
  model TEXT,
  key_cipher TEXT,
  verified_free INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
)`).run();return true}

async function listIntegrations(env){if(!(await ensureDb(env))) return {storage:'not-configured',items:[]};const rows=await env.DB.prepare('SELECT id,provider,label,endpoint,model,verified_free,enabled,updated_at FROM integrations ORDER BY provider').all();return {storage:'d1',items:rows.results||[]}}
async function saveIntegration(env,input){if(!(await ensureDb(env))) throw new Error('D1 is not bound yet. Add a D1 binding named DB in Cloudflare first.');if(!env.HUB_MASTER_KEY) throw new Error('HUB_MASTER_KEY Worker secret is not configured yet.');const id=String(input.id||input.provider||crypto.randomUUID());const cipher=input.apiKey?await encrypt(env.HUB_MASTER_KEY,String(input.apiKey)):null;await env.DB.prepare(`INSERT INTO integrations(id,provider,label,endpoint,model,key_cipher,verified_free,enabled,updated_at)
VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET provider=excluded.provider,label=excluded.label,endpoint=excluded.endpoint,model=excluded.model,key_cipher=COALESCE(excluded.key_cipher,integrations.key_cipher),verified_free=excluded.verified_free,enabled=excluded.enabled,updated_at=excluded.updated_at`).bind(id,String(input.provider||''),String(input.label||''),String(input.endpoint||''),String(input.model||''),cipher,input.verifiedFree?1:0,input.enabled?1:0,new Date().toISOString()).run();return {ok:true,id}}
async function removeIntegration(env,id){if(!(await ensureDb(env))) throw new Error('D1 is not configured.');await env.DB.prepare('DELETE FROM integrations WHERE id=?').bind(id).run();return {ok:true}}
async function getIntegrationSecret(env,id){if(!(await ensureDb(env))) return null;if(!env.HUB_MASTER_KEY) return null;const row=await env.DB.prepare('SELECT key_cipher FROM integrations WHERE id=?').bind(id).first();if(!row?.key_cipher) return null;return decrypt(env.HUB_MASTER_KEY,row.key_cipher)}

function page(){const cards=PROVIDERS.map(p=>`<div class="card"><div class="row"><div><h3>${p.name}</h3><div class="muted">${p.region}</div></div><span class="pill" id="status-${p.id}">Not connected</span></div><p>${p.note}</p><button onclick="openProvider('${p.id}','${p.name.replaceAll("'","&#39;")}')">Connect / Configure</button></div>`).join('');return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Hub</title><style>
:root{font-family:Inter,system-ui,sans-serif;color:#111;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}.shell{max-width:1180px;margin:auto;padding:24px}.hero{background:linear-gradient(135deg,#101114,#232633);color:white;border-radius:24px;padding:28px;box-shadow:0 20px 60px #0002}.hero h1{margin:0 0 8px;font-size:34px}.hero p{margin:0;color:#c9ced9}.top{display:flex;justify-content:space-between;gap:16px;align-items:center}.badge{background:#153f25;color:#91f6ae;border:1px solid #2a6b40;padding:8px 12px;border-radius:999px;font-weight:700}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}.stat{background:#ffffff12;border:1px solid #ffffff1d;border-radius:16px;padding:14px}.stat b{display:block;font-size:22px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.card,.panel{background:white;border:1px solid #e7e9ee;border-radius:18px;padding:18px;box-shadow:0 6px 24px #18203a0a}.row{display:flex;justify-content:space-between;gap:12px;align-items:center}.muted{color:#6f7685;font-size:13px}.pill{font-size:12px;border-radius:999px;padding:6px 9px;background:#f1f2f5}.pill.on{background:#e8f8ec;color:#187033}button{border:0;border-radius:11px;padding:10px 13px;font-weight:700;cursor:pointer;background:#111;color:white}button.secondary{background:#eef0f4;color:#111}.sectionTitle{display:flex;justify-content:space-between;align-items:end;margin-top:28px}.sectionTitle h2{margin:0}.panel{margin-top:14px}.setup{display:grid;grid-template-columns:1fr 1fr;gap:14px}.notice{padding:13px;border-radius:13px;background:#fff8dd;border:1px solid #f0df9a;color:#6b5700}.good{background:#eaf8ee;border-color:#bce2c6;color:#1f6834}dialog{border:0;border-radius:20px;padding:0;max-width:680px;width:94%;box-shadow:0 30px 90px #0005}dialog::backdrop{background:#0007}.modal{padding:22px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{display:flex;flex-direction:column;gap:6px}.field.full{grid-column:1/-1}input,select{width:100%;border:1px solid #d8dce5;border-radius:10px;padding:11px;background:white}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px}.list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.item{padding:12px;border:1px solid #e7e9ee;border-radius:12px;display:flex;justify-content:space-between;gap:10px}.code{font-family:ui-monospace,monospace;font-size:12px}@media(max-width:760px){.grid,.stats,.setup,.fields{grid-template-columns:1fr}.field.full{grid-column:auto}.top{align-items:flex-start;flex-direction:column}}
</style></head><body><div class="shell"><div class="hero"><div class="top"><div><h1>Universal AI Hub</h1><p>One control plane for your products, free AI sources, Chinese/global models, automation and app building.</p></div><span class="badge">ZERO-COST MODE ON</span></div><div class="stats"><div class="stat"><b id="providerCount">10</b><span>Provider families</span></div><div class="stat"><b id="connectedCount">0</b><span>Connected integrations</span></div><div class="stat"><b>₹0</b><span>Paid fallback allowed</span></div></div></div>
<div class="sectionTitle"><div><h2>AI integrations</h2><div class="muted">Add providers once; every connected product will eventually use the Hub API.</div></div><button class="secondary" onclick="refresh()">Refresh</button></div><div class="grid">${cards}</div>
<div class="sectionTitle"><div><h2>Activation status</h2><div class="muted">Permanent encrypted credential storage requires D1 + HUB_MASTER_KEY.</div></div></div><div class="setup"><div class="panel"><h3>Hub storage</h3><div id="storageBox" class="notice">Checking…</div><p class="muted">The page itself is deployable immediately. Add the D1 binding and Worker secret afterward to activate encrypted server-side integration storage.</p></div><div class="panel"><h3>Connected records</h3><div id="integrationList" class="list"><div class="muted">None yet.</div></div></div></div>
<div class="sectionTitle"><div><h2>Connect products</h2><div class="muted">After the full Hub runtime is activated, each product gets its own AI_HUB_URL + AI_HUB_KEY.</div></div></div><div class="panel"><div class="code">AI_HUB_URL = https://YOUR-WORKER.workers.dev/v1<br>AI_HUB_KEY = one separate server-side key per product</div><p class="muted">Existing Supabase, Meta, WhatsApp, YouTube, payments and business APIs stay in their current products. Only their AI calls need to move behind this Hub.</p></div>
</div><dialog id="providerDialog"><div class="modal"><div class="row"><div><h2 id="dialogTitle" style="margin:0">Connect provider</h2><div class="muted">Keys are encrypted before D1 storage when HUB_MASTER_KEY is configured.</div></div><button class="secondary" onclick="providerDialog.close()">Close</button></div><div class="fields" style="margin-top:18px"><div class="field"><label>Provider</label><input id="providerId" readonly></div><div class="field"><label>Label</label><input id="providerLabel"></div><div class="field full"><label>API endpoint (optional)</label><input id="providerEndpoint" placeholder="https://api.example.com/v1"></div><div class="field"><label>Model (optional)</label><input id="providerModel" placeholder="current free model"></div><div class="field"><label>API key / token</label><input id="providerKey" type="password" placeholder="Stored encrypted server-side"></div><div class="field"><label><input id="verifiedFree" type="checkbox" style="width:auto"> I verified this route/model is currently free</label></div><div class="field"><label><input id="providerEnabled" type="checkbox" style="width:auto"> Enable after saving</label></div></div><div id="modalMsg" class="muted" style="margin-top:12px"></div><div class="actions"><button class="secondary" onclick="providerDialog.close()">Cancel</button><button onclick="saveProvider()">Save integration</button></div></div></dialog>
<script>
const providerDialog=document.getElementById('providerDialog');function openProvider(id,name){providerId.value=id;providerLabel.value=name;providerEndpoint.value='';providerModel.value='';providerKey.value='';verifiedFree.checked=false;providerEnabled.checked=false;modalMsg.textContent='';providerDialog.showModal()}
async function call(path,opts={}){const r=await fetch(path,opts);const t=await r.text();let j;try{j=JSON.parse(t)}catch{j={error:t}}if(!r.ok)throw new Error(j.error||t);return j}
async function refresh(){try{const d=await call('/api/integrations');connectedCount.textContent=d.items.length;storageBox.className='notice '+(d.storage==='d1'?'good':'');storageBox.textContent=d.storage==='d1'?'D1 connected — encrypted storage can be used once HUB_MASTER_KEY is present.':'Live page is running. D1 is not bound yet, so integrations cannot be persisted yet.';document.querySelectorAll('[id^="status-"]').forEach(x=>{x.textContent='Not connected';x.classList.remove('on')});integrationList.innerHTML='';if(!d.items.length)integrationList.innerHTML='<div class="muted">No integrations saved yet.</div>';for(const x of d.items){const s=document.getElementById('status-'+x.provider);if(s){s.textContent=x.enabled?'Connected':'Saved';s.classList.add('on')}const el=document.createElement('div');el.className='item';el.innerHTML='<div><b>'+esc(x.label||x.provider)+'</b><div class="muted">'+esc(x.model||x.endpoint||'Configured')+'</div></div><button class="secondary" data-id="'+esc(x.id)+'">Remove</button>';el.querySelector('button').onclick=()=>removeRecord(x.id);integrationList.append(el)}}catch(e){storageBox.textContent=String(e)}}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
async function saveProvider(){modalMsg.textContent='Saving…';try{const d=await call('/api/integrations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:providerId.value,provider:providerId.value,label:providerLabel.value,endpoint:providerEndpoint.value,model:providerModel.value,apiKey:providerKey.value,verifiedFree:verifiedFree.checked,enabled:providerEnabled.checked})});modalMsg.textContent='Saved.';setTimeout(()=>providerDialog.close(),400);await refresh()}catch(e){modalMsg.textContent=String(e)}}
async function removeRecord(id){if(!confirm('Remove this integration?'))return;try{await call('/api/integrations/'+encodeURIComponent(id),{method:'DELETE'});await refresh()}catch(e){alert(String(e))}}
refresh();
</script></body></html>`}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/health') return json({ok:true,service:'AI Hub',zero_cost_mode:true,d1:Boolean(env.DB),encrypted_vault:Boolean(env.DB&&env.HUB_MASTER_KEY),time:new Date().toISOString()});
    if(url.pathname==='/api/integrations'&&request.method==='GET') return json(await listIntegrations(env));
    if(url.pathname==='/api/integrations'&&request.method==='POST'){
      try{return json(await saveIntegration(env,await request.json()))}catch(e){return json({error:String(e.message||e)},400)}
    }
    if(url.pathname.startsWith('/api/integrations/')&&request.method==='DELETE'){
      try{return json(await removeIntegration(env,decodeURIComponent(url.pathname.split('/').pop())))}catch(e){return json({error:String(e.message||e)},400)}
    }
    if(url.pathname==='/api/provider-secret'&&request.method==='POST'){
      try{const {id}=await request.json();const secret=await getIntegrationSecret(env,String(id||''));return json({ok:Boolean(secret),configured:Boolean(secret)})}catch(e){return json({error:String(e.message||e)},400)}
    }
    if(url.pathname==='/') return html(page());
    return json({error:'Not found'},404);
  }
};
