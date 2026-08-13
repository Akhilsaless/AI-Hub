import {executeZeroCost} from './router-execute.js';

export const LOCAL_ACTIONS={
  reason_compose_reply:{risk:'reason',confirmation:false,local:true}
};

export async function executeHopeLocalAction(env,action,p={}){
  if(action!=='reason_compose_reply')throw new Error('unsupported local HOPE action');
  const source=String(p.source||'').trim(),subject=String(p.sourceSubject||'').trim(),instruction=String(p.instruction||'Reply appropriately and help