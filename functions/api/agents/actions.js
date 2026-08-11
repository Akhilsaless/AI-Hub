import {requireOwner} from '../../lib/auth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){const denied=await requireOwner(request,env);if(denied)return denied;let caps=[];try{const ints=await env.DB.prepare(`SELECT id,enabled FROM integrations`).all();const connected=new Set((ints.results||[]).filter(x=>x.enabled).map(x=>x.id));caps=[
{id:'camera',label:'Camera',icon:'camera',status:'ready',description:'Capture an image; understanding depends on the routed model supporting vision.'},
{id:'photos',label:'Photos',icon:'image',status:'ready',description:'Choose images from your device.'},
{id:'files',label:'Files',icon:'paperclip',status:'ready',description:'Attach local files; full document parsing activates with a parser/model connector.'},
{id:'plugins',label:'Plugins & Tools',icon:'plug',status:'ready',description:'Inspect connector readiness and permissions.'},
{id:'think',label:'Think Harder',icon:'brain',status:'ready',description:'Use deeper reasoning settings on the next request.'},
{id:'research',label:'Deep Research',icon:'search',status:connected.has('openrouter')?'connector-ready':'needs-provider',description:'Research specialist. Live web search additionally requires a tool-capable route and may have separate usage pricing.'},
{id:'builder',label:'Build an App',icon:'code',status:'needs-github',description:'Planning works now; repository writes require a GitHub connector.'},
{id:'automation',label:'Automations',icon:'clock',status:'queue-ready',description:'Create/approve tasks now; timed execution requires a Worker scheduler.'},
{id:'agents',label:'Choose Agent',icon:'users',status:'ready',description:'Switch between Hope and specialists.'}
];}catch{}return json({ok:true,agent:'Hope',actions:caps})}
