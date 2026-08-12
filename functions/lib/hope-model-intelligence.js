const n=v=>Number(v||0);
const cap=(text,word)=>new RegExp(`\\b${word}\\b`,'i').test(String(text||''));
export function taskProfile(prompt=''){
 const s=String(prompt);return {reasoning:cap(s,'reason|analyze|strategy|solve|compare'),code:cap(s,'code|debug|repository|api|javascript|python|sql'),vision:cap(s,'image|photo|screenshot|vision'),research:cap(s,'research|latest|sources|current|news'),speed:/\b(quick|fast|short|simple)\b/i.test(s),long:/\b(long|document|pdf|report|large|book)\b/i.test(s)};
}
export function scoreRoute(route,profile={},stats={}){
 let score=50;const id=`${route.provider} ${route.model_id}`.toLowerCase();
 if(route.qualified_free||route.verified_free)score+=25;
 if(profile.code&&/(coder|code|qwen|deepseek|gemini|llama)/.test(id))score+=10;
 if(profile.reasoning&&/(reason|r1|qwen|deepseek|gemini|glm)/.test(id))score+=9;
 if(profile.vision&&/(vision|vl|gemini|multimodal)/.test(id))score+=14;
 if(profile.speed&&/(groq|cerebras)/.test(id))score+=12;
 const success=n(stats.success),failure=n(stats.failure),lat=n(stats.avg_latency_ms);if(success+failure>0)score+=Math.max(-15,Math.min(15,(success-failure)/(success+failure)*15));if(lat>0)score+=Math.max(-10,10-lat/300);
 return Math.round(score*100)/100;
}
export async function rankedRoutes(env,routes,prompt=''){
 const profile=taskProfile(prompt),rows=env.DB?(await env.DB.prepare(`SELECT provider,model,COUNT(*) total,SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) success,SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) failure FROM request_logs GROUP BY provider,model`).all()).results||[]:[],map=new Map(rows.map(x=>[`${x.provider}|${x.model}`,x]));
 return routes.map(r=>({...r,intelligenceScore:scoreRoute(r,profile,map.get(`${r.provider}|${r.model_id}`)||{})})).sort((a,b)=>b.intelligenceScore-a.intelligenceScore);
}
