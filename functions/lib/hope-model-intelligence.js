const n=v=>Number(v||0);
const cap=(text,word)=>new RegExp(`\\b${word}\\b`,'i').test(String(text||''));
export function taskProfile(prompt=''){
 const s=String(prompt);return {reasoning:cap(s,'reason|analyze|strategy|solve|compare|architecture|audit|diagnose'),code:cap(s,'code|debug|repository|api|javascript|python|sql|refactor|migration'),vision:cap(s,'image|photo|screenshot|vision'),research:cap(s,'research|latest|sources|current|news'),speed:/\b(quick|fast|short|simple)\b/i.test(s),long:/\b(long|document|pdf|report|large|book|comprehensive)\b/i.test(s),agent:/\b(agent|workflow|tool|execute|orchestrat|multi-step|automation)\b/i.test(s),highStakes:/\b(production|security|financial|legal|migration|incident|root cause)\b/i.test(s)};
}
export function taskComplexity(prompt='',feature='chat',attachments=[]){
 const p=taskProfile(prompt);let score=0;if(p.reasoning)score+=2;if(p.code)score+=2;if(p.long)score+=2;if(p.agent)score+=3;if(p.highStakes)score+=2;if(p.vision||attachments.length)score+=1;if(['planning','analysis','coding','agent','reasoning'].includes(feature))score+=2;if(String(prompt).length>1800)score+=2;if(p.speed&&score<5)score=Math.max(0,score-2);return {score,profile:p,level:score>=7?'high':score>=4?'medium':'low'};
}
export function shouldEscalatePremium(prompt='',feature='chat',attachments=[]){const c=taskComplexity(prompt,feature,attachments);return {recommended:c.score>=6,reason:c.score>=6?'complex_task_benefits_from_premium':'free_route_preferred',...c};}
export function scoreRoute(route,profile={},stats={}){
 let score=50;const id=`${route.provider} ${route.model_id}`.toLowerCase();
 if(route.qualified_free||route.verified_free)score+=25;
 if(profile.code&&/(coder|code|qwen|deepseek|gemini|llama|gpt)/.test(id))score+=10;
 if(profile.reasoning&&/(reason|r1|qwen|deepseek|gemini|glm|gpt)/.test(id))score+=9;
 if(profile.vision&&/(vision|vl|gemini|multimodal|gpt)/.test(id))score+=14;
 if(profile.agent&&/(gpt|gemini|tool|reason)/.test(id))score+=10;
 if(profile.speed&&/(groq|cerebras)/.test(id))score+=12;
 const success=n(stats.success),failure=n(stats.failure),lat=n(stats.avg_latency_ms);if(success+failure>0)score+=Math.max(-15,Math.min(15,(success-failure)/(success+failure)*15));if(lat>0)score+=Math.max(-10,10-lat/300);
 return Math.round(score*100)/100;
}
export async function rankedRoutes(env,routes,prompt=''){
 const profile=taskProfile(prompt),rows=env.DB?(await env.DB.prepare(`SELECT provider,model,COUNT(*) total,SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) success,SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) failure FROM request_logs GROUP BY provider,model`).all()).results||[]:[],map=new Map(rows.map(x=>[`${x.provider}|${x.model}`,x]));
 return routes.map(r=>({...r,intelligenceScore:scoreRoute(r,profile,map.get(`${r.provider}|${r.model_id}`)||{})})).sort((a,b)=>b.intelligenceScore-a.intelligenceScore);
}
