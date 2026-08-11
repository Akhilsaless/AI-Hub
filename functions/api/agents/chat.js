import {requireOwner} from '../../lib/auth.js';
import {executeZeroCost} from '../../lib/router-execute.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});

async function ensure(env){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS agent_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,