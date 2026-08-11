const enc=new TextEncoder();
function fromB64(s){return Uint8Array.from(atob(String(s||'')),c=>c.charCodeAt(0))}
async function keyFromSecret(secret){const digest=await crypto.subtle.digest('SHA-256',enc.encode(secret));return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt'])}
export async function decryptStoredKey(env,row){
  if(!row?.key_cipher||!row?.iv||!env.HUB_MASTER_KEY) return '';
  const key=await keyFromSecret(env.HUB_MASTER_KEY);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.iv)},key,fromB64(row.key_cipher));
  return new TextDecoder().decode(pt);
}
