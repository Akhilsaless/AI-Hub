import {publicVideoCatalog} from '../../lib/video-provider-core.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet(){return json({ok:true,providers:publicVideoCatalog(),policy:{platformPremiumProvider:'managed',consumerCreditsAreNotApiCredits:true,noSilentPaidFallback:true}})}
