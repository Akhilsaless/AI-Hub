import {executeZeroCost} from './router-execute.js';

export const LOCAL_ACTIONS={reason_compose_reply:{risk:'reason',confirmation:false,local:true}};

export async function executeHopeLocalAction(env,action,p={}){
  if(action!=='reason_compose_reply')throw new Error('unsupported local HOPE action');
  const source=String(p.source||'').trim();
  const subject=String(p.sourceSubject||'').trim();
  const instruction=String(p.instruction||'Write an appropriate, useful reply.').trim();
  if(!source)throw new Error('Source message is required to compose a reply');
  const messages=[
    {role:'system',content:'You are HOPE. Draft a concise, natural email reply using only the supplied source message and user instruction. Do not invent facts, commitments, dates, prices, attachments, or completed actions. Return only the email body, with no subject line, commentary, markdown fences, or metadata.'},
    {role:'user',content:`Email subject: ${subject||'(none)'}\nSource message: ${source}\nUser instruction: ${instruction}`}
  ];
  const r=await executeZeroCost(env,messages,'normal');
  if(!r.ok||!String(r.text||'').trim())throw new Error(r.error||'HOPE could not compose the reply');
  return {text:String(r.text).trim(),provider:r.provider,model:r.model};
}

export function summarizeLocalAction(action,r){
  if(action==='reason_compose_reply')return 'HOPE prepared a reply draft from the earlier message.';
  return 'HOPE reasoning step completed.';
}
