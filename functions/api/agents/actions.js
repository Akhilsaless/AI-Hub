import {requireOwner} from '../../lib/auth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){const denied=await requireOwner(request,env);if(denied)return denied;return json({ok:true,agent:'Hope',actions:[
{id:'camera',label:'Camera',icon:'camera',accept:'image/*',capture:true,status:'ui-ready',description:'Capture an image for Hope to inspect when vision routing is connected.'},
{id:'photos',label:'Photos',icon:'image',accept:'image/*',multiple:true,status:'ui-ready',description:'Choose images from your device.'},
{id:'files',label:'Files',icon:'paperclip',accept:'*/*',multiple:true,status:'ui-ready',description:'Attach documents or project files for supported parsers/tools.'},
{id:'plugins',label:'Plugins & Tools',icon:'plug',status:'registry-ready',description:'Choose connected tools and integrations.'},
{id:'think',label:'Think Harder',icon:'brain',mode:'deep',status:'router-ready',description:'Ask the router to prefer the strongest eligible reasoning route.'},
{id:'research',label:'Deep Research',icon:'search',agent:'research',status:'agent-ready',description:'Delegate research to the Research Agent.'},
{id:'builder',label:'Build an App',icon:'code',agent:'builder',status:'agent-ready',description:'Delegate planning and software work to Product Builder.'},
{id:'automation',label:'Automations',icon:'clock',agent:'automation',status:'agent-ready',description:'Create or inspect approved automated work.'},
{id:'agents',label:'Choose Agent',icon:'users',status:'agent-ready',description:'Switch to Hope or a specialist/custom agent.'}
]})}
