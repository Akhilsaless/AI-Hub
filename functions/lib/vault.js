const enc=new TextEncoder();
function b64(bytes){return btoa(String.fromCharCode(...bytes))}
function fromB64(s){return Uint8Array.from(atob(String(s||'')),c=>c.charCodeAt(0))}
async function keyFromSecret(secret,usages){const digest=await crypto.subtle.digest('SHA-256',enc.encode(secret));return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,usages)}
export async function encryptStoredKey(env,value){
  if(!env.HUB_MASTER_KEY) throw new Error('HUB_MASTER_KEY missing');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await keyFromSecret(env.HUB_MASTER_KEY,['encrypt']);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(String(value||''))));
  return {cipher:b64(ct),iv:b64(iv)};
}
export async function decryptStoredKey(env,row){
  if(!row?.key_cipher||!row?.iv||!env.HUB_MASTER_KEY) return '';
  const key=await keyFromSecret(env.HUB_MASTER_KEY,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.iv)},key,fromB64(row.key_cipher));
  return new TextDecoder().decode(pt);
}
