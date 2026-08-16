import {executeHopeGateway} from '../../../lib/hope-gateway.js';
import {currentUser} from '../../../lib/user-auth.js';

const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const MOODS={normal:'Respond naturally, clearly and directly.',happy:'Sound upbeat, warm and energetic.',funny:'Be genuinely funny in casual conversation while staying useful and accurate.',angry:'Use a fiery, impatient, sharp-witted tone without insulting or threatening anyone.'};

function localFallback(message,mood){
  const text=String(message||'').trim(),m=String(mood||'normal');
  if(/^h+(i+|ello|ey)\b[!. ]*$/i.test(text)){
    if(m==='funny')return 'Hey 😂 HOPE reporting for duty. What are we getting into?';
    if(m==='happy')return 'Hey! 😊 I’m here and ready. What do you want to do?';
    if(m==='angry')return 'Hey. I’m here—tell me what we’re tackling.';
    return 'Hey! I’m here. What would you like to do?';
  }
  if(/^(nothing much|not much|nothing)$/i.test(text))return m==='funny'?'Fair enough 😂 We can professionally do absolutely nothing for a minute. Or give me anything you want to explore.':'No problem. I’m here whenever you want to talk or work on something.';
  if(/^(thanks|thank you|thx)[!. ]*$/i.test(text))return m==='funny'?'Anytime 😄 My invoice for emotional support is mysteriously zero.':'Anytime. What do you want to do next?';
  if(/^(ok+|okay|cool|nice)[!. ]*$/i.test(text))return m==='funny'?'Perfect 😄 I’ll pretend that was a standing ovation. What’s next?':'Got it. What’s next?';
  return m==='funny'?'I hit a temporary model hiccup 😅 Your message is safe. Send it once more and I’ll take another route.':'I hit a temporary model hiccup. Your message is safe—send it once more and I’ll take another route.';
}

async function persistRecoveredReply(request,env,threadId,text){
  if(!threadId||!text||!env.DB)return false;
  try{
    const user=await currentUser(request,env);
    if(!user)return false;
    const latest=await env.DB.prepare(`SELECT content FROM user_hope_messages WHERE user_id=? AND thread_id=? AND role='assistant' ORDER BY id DESC LIMIT 1`).bind(user.id,threadId).first();
    if(latest?.content===text)return true;
    const now=new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO user_hope_messages(user_id,thread_id,role,content,attachments,created_at) VALUES(?,?,?,?,?,?)`).bind(user.id,threadId,'assistant',text,'[]',now),
      env.DB.prepare(`UPDATE user_hope_threads SET updated_at=? WHERE user_id=? AND id=?`).bind(now,user.id,threadId)
    ]);
    return true;
  }catch(e){console.error(JSON.stringify({message:'HOPE recovered reply persistence failed',error:String(e?.message||e)}));return false}
}

export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url),isChat=request.method==='POST'&&/\/api\/user\/hope\/chat\/?$/.test(url.pathname);
  if(!isChat)return context.next();
  const clone=request.clone();let body={};try{body=await clone.json()}catch{}
  try{
    const response=await context.next();
    if(response.status<500)return response;
    console.error('HOPE downstream HTTP failure',response.status,await response.clone().text().catch(()=>''));
  }catch(e){console.error('HOPE downstream exception',String(e?.stack||e?.message||e))}
  const message=String(body.message||'').trim(),mood=MOODS[String(body.mood||'normal')]?String(body.mood||'normal'):'normal';
  // Never make greetings and tiny conversational turns wait on another external provider after the main route already failed.
  const threadId=String(body.threadId||''),tiny=message.length<=80&&/^(h+(i+|ello|ey)|yo|good\s+(morning|afternoon|evening)|how are you|how r u|what'?s up|whats up|nothing much|not much|nothing|thanks|thank you|thx|ok+|okay|cool|nice)[!.? ]*$/i.test(message);
  if(tiny){const text=localFallback(message,mood),persisted=await persistRecoveredReply(request,env,threadId,text);return json({ok:true,threadId,text,mood,recovered:true,persisted})}
  try{
    const user=await currentUser(request,env),r=await executeHopeGateway(env,{user:user||{id:'resilience'},threadId,prompt:message,intent:'conversation',system:`You are HOPE. ${MOODS[mood]} Answer the user directly. Do not mention routing, providers, backend errors, or this fallback.`,messages:[{role:'user',content:message}]});
    if(r.ok&&String(r.text||'').trim()){const text=String(r.text).trim(),persisted=await persistRecoveredReply(request,env,threadId,text);return json({ok:true,threadId,text,mood,recovered:true,persisted})}
  }catch(e){console.error('HOPE resilience route failed',String(e?.message||e))}
  const text=localFallback(message,mood),persisted=await persistRecoveredReply(request,env,threadId,text);return json({ok:true,threadId,text,mood,recovered:true,persisted});
}
