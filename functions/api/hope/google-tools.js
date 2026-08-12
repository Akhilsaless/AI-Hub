import {requireOwner} from '../../lib/auth.js';
import {googleGet} from '../../lib/google-oauth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const clean=s=>String(s||'').trim();
const decode=s=>{try{return decodeURIComponent(escape(atob(String(s||'').replace(/-/g,'+').replace(/_/g,'/'))))}catch{return ''}};
const header=(p,n)=>p?.headers?.find(h=>String(h.name).toLowerCase()===n.toLowerCase())?.value||'';
function bodyText(p){if(!p)return '';if(p.mimeType==='text/plain'&&p.body?.data)return decode(p.body.data);for(const x of p.parts||[]){const t=bodyText(x);if(t)return t}return ''}
async function gmail(env,limit=5,q=''){
 const n=Math.max(1,Math.min(20,Number(limit)||5));const qs=new URLSearchParams({maxResults:String(n)});if(q)qs.set('q',q);
 const list=await googleGet(env,`https://gmail.googleapis.com/gmail/v1/users/me/messages?${qs}`);const messages=[];
 for(const x of list.messages||[]){const m=await googleGet(env,`https://gmail.googleapis.com/gmail/v1/users/me/messages/${x.id}?format=full`);messages.push({id:m.id,threadId:m.threadId,from:header(m.payload,'From'),to:header(m.payload,'To'),subject:header(m.payload,'Subject'),date:header(m.payload,'Date'),snippet:m.snippet||'',body:bodyText(m.payload).slice(0,4000)})}
 return messages;
}
async function calendar(env,days=1){const d=Math.max(1,Math.min(30,Number(days)||1)),a=new Date(),b=new Date(a.getTime()+d*86400000);const qs=new URLSearchParams({maxResults:'50',singleEvents:'true',orderBy:'startTime',timeMin:a.toISOString(),timeMax:b.toISOString()});const r=await googleGet(env,`https://www.googleapis.com/calendar/v3/calendars/primary/events?${qs}`);return (r.items||[]).map(e=>({id:e.id,summary:e.summary||'(No title)',start:e.start?.dateTime||e.start?.date,end:e.end?.dateTime||e.end?.date,location:e.location||'',description:e.description||'',status:e.status,htmlLink:e.htmlLink||''}))}
async function drive(env,q='',limit=10){const n=Math.max(1,Math.min(50,Number(limit)||10));let query="trashed = false";if(q)query+=` and name contains '${clean(q).replace(/'/g,"\\'")}'`;const qs=new URLSearchParams({pageSize:String(n),q:query,orderBy:'modifiedTime desc',fields:'files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName,emailAddress))'});const r=await googleGet(env,`https://www.googleapis.com/drive/v3/files?${qs}`);return r.files||[]}
export async function onRequestPost({request,env}){const denied=await requireOwner(request,env);if(denied)return denied;try{const b=await request.json(),tool=clean(b.tool).toLowerCase();if(tool==='gmail.latest'||tool==='gmail.search')return json({ok:true,tool,items:await gmail(env,b.limit,b.query||'')});if(tool==='calendar.upcoming')return json({ok:true,tool,items:await calendar(env,b.days)});if(tool==='drive.search'||tool==='drive.latest')return json({ok:true,tool,items:await drive(env,b.query||'',b.limit)});return json({ok:false,error:'Unsupported tool. Use gmail.latest, gmail.search, calendar.upcoming, drive.search, or drive.latest.'},400)}catch(e){return json({ok:false,error:String(e?.message||e)},500)}}
