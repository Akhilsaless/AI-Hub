export const TOOL_CATEGORIES=[
{id:'chat-reasoning',title:'Chat & Reasoning',examples:['general assistants','reasoning models','research assistants'],learn:['prompting','verification','model selection']},
{id:'coding',title:'Coding & App Building',examples:['coding assistants','AI IDEs','app builders'],learn:['specification','review','testing','security']},
{id:'image-design',title:'Image & Design',examples:['image generators','design copilots','presentation tools'],learn:['visual prompting','iteration','rights/safety']},
{id:'video-audio',title:'Video, Voice & Audio',examples:['video generation','voice generation','music/audio tools'],learn:['storyboarding','consistency','consent/licensing']},
{id:'research-data',title:'Research & Data',examples:['web research','document analysis','spreadsheet/data copilots'],learn:['source quality','citations','analysis verification']},
{id:'automation-agents',title:'Automation & Agents',examples:['workflow automation','agent frameworks','browser agents'],learn:['tools','permissions','retries','human approval']},
{id:'business',title:'Business AI',examples:['sales AI','marketing AI','support AI','recruiting AI'],learn:['workflow fit','ROI','privacy','measurement']}
];
export function toolExplorer({q='',category=''}={}){const s=String(q).toLowerCase();return TOOL_CATEGORIES.filter(x=>(!category||x.id===category)&&(!s||[x.title,...x.examples,...x.learn].join(' ').toLowerCase().includes(s)));}
export function newsToMicroLesson(item={}){return {id:`update-${String(item.id||Date.now())}`,title:String(item.title||'AI update'),whyItMatters:String(item.whyItMatters||''),duration:5,type:'optional-update',requiredForProgression:false,sections:['What changed','Who it affects','Try it','Verify the claim','What remains uncertain'],sourceRequired:true,publishedAt:item.publishedAt||new Date().toISOString()};}
