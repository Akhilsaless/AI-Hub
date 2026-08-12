const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const strip=html=>String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim();

function blockedHost(host){
  const h=String(host||'').toLowerCase().replace(/^\[|\]$/g,'');
  if(!h||h==='localhost'||h.endsWith('.localhost')||h==='0.0.0.0'||h==='::'||h==='::1')return true;
  if(/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return true;
  const m=h.match(/^172\.(\d+)\./);if(m&&Number(m[1])>=16&&Number(m[1])<=31)return true;
  if(h.startsWith('fc')||h.startsWith('fd')||h.startsWith('fe80:'))return true;
  return false;
}
function safeUrl(raw){
  const u=new URL(raw);
  if(!/^https?:$/.test(u.protocol))throw new Error('Unsupported URL protocol');
  if(u.username||u.password)throw new Error('Credential-bearing URLs are blocked');
  if(blockedHost(u.hostname))throw new Error('Private/local network destinations are blocked');
  return u;
}
async function fetchText(url,{timeout=9000,max=350000}={}){
  const u=safeUrl(url),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const r=await fetch(u.toString(),{headers:{'User-Agent':'Mozilla/5.0 HOPE-Research/3.0','Accept':'text/html,text/plain,application/xhtml+xml'},redirect:'follow',signal:controller.signal});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const ct=(r.headers.get('content-type')||'').toLowerCase();
    if(!ct.includes('text/html')&&!ct.includes('text/plain')&&!ct.includes('application/xhtml+xml'))throw new Error(`Unsupported content type ${ct||'unknown'}`);
    return (await r.text()).slice(0,max);
  }finally{clearTimeout(timer)}
}
function decodeDuckUrl(href){
  try{
    const u=new URL(href,'https://duckduckgo.com');
    const uddg=u.searchParams.get('uddg');
    return uddg?decodeURIComponent(uddg):u.href;
  }catch{return href}
}
function parseDuck(html){
  const out=[],re=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;while((m=re.exec(html))&&out.length<12){const url=decodeDuckUrl(m[1]),title=strip(m[2]);if(url&&title)out.push({url,title});}
  return out;
}
function parseBing(html){
  const out=[],re=/<li[^>]+class="b_algo"[\s\S]*?<h2>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;while((m=re.exec(html))&&out.length<12){const url=m[1],title=strip(m[2]);if(url&&title)out.push({url,title});}
  return out;
}
async function discover(query,limit=8){
  const q=encodeURIComponent(clean(query));
  const engines=[
    {name:'duckduckgo',url:`https://html.duckduckgo.com/html/?q=${q}`,parse:parseDuck},
    {name:'bing',url:`https://www.bing.com/search?q=${q}&count=10`,parse:parseBing}
  ];
  const seen=new Set(),items=[],errors=[];
  for(const e of engines){
    try{
      const html=await fetchText(e.url,{timeout:7000,max:500000});
      for(const r of e.parse(html)){
        try{const u=safeUrl(r.url);const key=u.origin+u.pathname;if(seen.has(key))continue;seen.add(key);items.push({...r,url:u.toString(),engine:e.name});if(items.length>=limit)break;}catch{}
      }
      if(items.length>=Math.min(4,limit))break;
    }catch(err){errors.push(`${e.name}: ${String(err?.message||err)}`)}
  }
  return {items:items.slice(0,limit),errors};
}
function scoreSource(query,src){
  const q=new Set(clean(query).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2));
  const hay=(src.title+' '+src.text).toLowerCase();let score=0;
  for(const t of q)if(hay.includes(t))score++;
  try{const h=new URL(src.url).hostname;if(/\.gov$|\.edu$/.test(h))score+=2;if(/wikipedia\.org$/.test(h))score+=1;}catch{}
  return score;
}
async function readSource(item){
  const html=await fetchText(item.url,{timeout:9000,max:500000});
  const title=clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||item.title||'');
  return {...item,title:strip(title)||item.title,text:strip(html).slice(0,14000)};
}
export async function autonomousResearch(query,{maxSources=5}={}){
  const subject=clean(query);if(!subject)throw new Error('Research query required');
  const discovery=await discover(subject,Math.max(maxSources+3,8));
  const settled=await Promise.allSettled(discovery.items.slice(0,8).map(readSource));
  const sources=[];for(const r of settled)if(r.status==='fulfilled'&&r.value.text?.length>120)sources.push(r.value);
  sources.sort((a,b)=>scoreSource(subject,b)-scoreSource(subject,a));
  const selected=sources.slice(0,maxSources).map((s,i)=>({id:i+1,title:s.title,url:s.url,text:s.text,engine:s.engine}));
  return {ok:selected.length>0,query:subject,verified:selected.length>0,sources:selected,discoveryErrors:discovery.errors,discovered:discovery.items.length};
}

export function researchContext(result){
  if(!result?.sources?.length)return 'No live research sources were retrieved.';
  return result.sources.map(s=>`[${s.id}] ${s.title}\nURL: ${s.url}\n${s.text.slice(0,9000)}`).join('\n\n');
}
