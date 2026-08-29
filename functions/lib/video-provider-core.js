export const VIDEO_PROVIDERS={
 ltx:{id:'ltx',name:'LTX Video',accessClass:'free',connectionMode:'self-hosted-or-endpoint',backendUsable:true,platformFunded:false,note:'Open model route. User may connect a compatible endpoint or self-hosted deployment.'},
 hunyuan:{id:'hunyuan',name:'HunyuanVideo',accessClass:'free',connectionMode:'self-hosted-or-endpoint',backendUsable:true,platformFunded:false,note:'Open model route. Compute is not free unless the connected endpoint offers free quota.'},
 huggingface_video:{id:'huggingface_video',name:'Hugging Face Video',accessClass:'bonus',connectionMode:'api-key',backendUsable:true,platformFunded:false,note:'Uses the user/provider inference allowance where a compatible hosted video model is available.'},
 pika:{id:'pika',name:'Pika',accessClass:'bonus',connectionMode:'external-account',backendUsable:false,platformFunded:false,note:'Consumer signup/monthly credits are shown as external credits unless an official API entitlement is separately connected.'},
 runway:{id:'runway',name:'Runway',accessClass:'bonus',connectionMode:'external-account',backendUsable:false,platformFunded:false,note:'Consumer web credits are not treated as API credits. API usage requires separate supported API credentials/billing.'},
 pixverse:{id:'pixverse',name:'PixVerse',accessClass:'bonus',connectionMode:'external-account',backendUsable:false,platformFunded:false,note:'Consumer daily/signup credits are not assumed to be API-usable.'},
 wan:{id:'wan',name:'Wan',accessClass:'premium',connectionMode:'api-key',backendUsable:true,platformFunded:true,note:'Only platform-funded premium video provider enabled for this phase.'}
};
export const videoProvider=id=>VIDEO_PROVIDERS[String(id||'')]||null;
export function publicVideoCatalog(){return Object.values(VIDEO_PROVIDERS).map(({id,name,accessClass,connectionMode,backendUsable,platformFunded,note})=>({id,name,accessClass,connectionMode,backendUsable,platformFunded,note}));}
export function assertPlatformVideoProvider(id){if(id!=='wan')throw new Error('Wan is the only platform-funded premium video provider enabled for this phase.');return true;}
