import {requireUser} from '../../lib/user-auth.js';
const json=v=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json','cache-control':'no-store'}});
const CURATED=[
 {id:'reasoning',title:'Reasoning models',summary:'Modern assistants increasingly separate fast responses from deeper reasoning modes. Learn when the extra latency and cost are justified.',lessonId:'reasoning',source:'Academy editorial'},
 {id:'agents',title:'Agents and tool use',summary:'The useful shift is from chat-only answers toward controlled systems that can use tools, maintain state and request approval.',lessonId:'agents',source:'Academy editorial'},
 {id:'open-models',title:'Open model ecosystems',summary:'Open-weight models and inference providers keep expanding model choice. Compare capability, privacy, latency and total cost rather than chasing one leaderboard.',lessonId:'models',source:'Academy editorial'}
];
export async function onRequestGet({request,env}){const auth=await requireUser(request,env);if(auth.response)return auth.response;return json({ok:true,mode:env.ACADEMY_NEWS_FEED_URL?'configured':'curated',updatedAt:new Date().toISOString(),items:CURATED,note:env.ACADEMY_NEWS_FEED_URL?'A live source is configured; provider ingestion can replace curated items after source validation.':'Curated fallback is intentionally used until a trustworthy live news/feed source is configured. No fake live updates are generated.'})}
