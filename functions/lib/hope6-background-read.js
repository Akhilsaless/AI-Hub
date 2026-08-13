import {userConnectorCredentialForUser} from './user-tool-context.js';

const READ_ACTIONS=new Set(['gmail_search','calendar_read','github_read']);
const emailFromHeader=value=>String(value||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]||'';
const header=(msg,name)=>(msg?.payload?.headers||[]).find(x=>String(x.name).toLowerCase()===String(name).toLowerCase())?.value||'';

async function googleToken(env,raw){
  let t;try{t=JSON.parse(raw)}catch{t={access_token:raw}}
  if(t.expires_at>Date.now()+30000)return t.access_token;
  if(!t.refresh_token)throw new Error('Google session expired. Reconnect Google.');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,refresh_token:t.refresh_token,grant_type:'refresh_token'})}),j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Google refresh failed. Reconnect Google.');
  return j.access_token;
}

async function gmailSearch(env,userId,p){
  const cred=await userConnectorCredentialForUser(env,userId,'google'),token=await googleToken(env,cred.credential),h={authorization:`Bearer ${token}`,'content-type':'application/json'},limit=Math.min(Math.max(Number(p.limit||10),1),20);
  const q=new URLSearchParams({q:String(p.query||''),maxResults:String(limit)}),r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?'+q,{headers:h}),j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j?.error?.message||'Gmail search failed');
  const messages=[];
  for(const item of (j.messages||[]).slice(0,limit)){
    const fields='id,threadId,snippet,payload(headers)',u=`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&fields=${encodeURIComponent(fields)}`,mr=await fetch(u,{headers:h}),mj=await mr.json().catch(()=>({}));
    if(!mr.ok)continue;
    messages.push({id:mj.id,threadId:mj.threadId,from:emailFromHeader(header(mj,'From')),fromRaw:header(mj,'From'),to:header(mj,'To'),subject:header(mj,'Subject'),date:header(mj,'Date'),snippet:mj.snippet||''});
  }
  return {messages,resultSizeEstimate:j.resultSizeEstimate||messages.length};
}

async function calendarRead(env,userId,p){
  const cred=await userConnectorCredentialForUser(env,userId,'google'),token=await googleToken(env,cred.credential),h={authorization:`Bearer ${token}`,'content-type':'application/json'},q=new URLSearchParams({timeMin:p.timeMin||new Date().toISOString(),maxResults:String(Math.min(Math.max(Number(p.limit||10),1),20)),singleEvents:'true',orderBy:'startTime'}),r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+q,{headers:h}),j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j?.error?.message||'Calendar read failed');return j;
}

async function githubRead(env,userId,p){
  const cred=await userConnectorCredentialForUser(env,userId,'github'),repo=String(p.repo||'');if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw new Error('repo must be owner/name');
  const r=await fetch(`https://api.github.com/repos/${repo}`,{headers:{authorization:`Bearer ${cred.credential}`,accept:'application/vnd.github+json','user-agent':'AI-Hub-HOPE'}}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'GitHub read failed');return j;
}

export function isBackgroundReadAction(action){return READ_ACTIONS.has(action)}
export async function executeBackgroundRead(env,userId,action,p={}){if(action==='gmail_search')return gmailSearch(env,userId,p);if(action==='calendar_read')return calendarRead(env,userId,p);if(action==='github_read')return githubRead(env,userId,p);throw new Error('background execution is restricted to read-only actions')}
export function summarizeBackgroundRead(action,r){if(action==='gmail_search'){const n=r.resultSizeEstimate??r.messages?.length??0,first=r.messages?.[0];return first?`Found ${n} matching Gmail messages. Latest match: ${first.subject||'(no subject)'} from ${first.fromRaw||first.from||'unknown sender'}.`:`Found ${n} matching Gmail messages.`}if(action==='calendar_read')return `Found ${(r.items||[]).length} calendar events.`;if(action==='github_read')return `Repository ${r.full_name||''} verified${r.default_branch?`, default branch ${r.default_branch}`:''}.`;return 'Background read completed.'}
