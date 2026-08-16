const PLATFORM_CONFIG={
 youtube:{label:'YouTube',required:['YOUTUBE_ACCESS_TOKEN'],publishEnv:'YOUTUBE_PUBLISH_ENABLED'},
 instagram:{label:'Instagram',required:['META_ACCESS_TOKEN','INSTAGRAM_ACCOUNT_ID'],publishEnv:'META_PUBLISH_ENABLED'},
 facebook:{label:'Facebook',required:['META_ACCESS_TOKEN','FACEBOOK_PAGE_ID'],publishEnv:'META_PUBLISH_ENABLED'}
};
export const normalizePlatform=v=>String(v||'').trim().toLowerCase();
export function platformStatus(env,platform){const key=normalizePlatform(platform),cfg=PLATFORM_CONFIG[key];if(!cfg)return {supported:false,connected:false,publishEnabled:false,missing:['unsupported platform']};const missing=cfg.required.filter(k=>!env[k]);return {supported:true,label:cfg.label,connected:missing.length===0,publishEnabled:missing.length===0&&String(env[cfg.publishEnv]||'').toLowerCase()==='true',missing};}
export function allPlatformStatuses(env){return Object.keys(PLATFORM_CONFIG).map(platform=>({platform,...platformStatus(env,platform)}));}
export async function publishApprovedAsset(env,{platform,content}){const key=normalizePlatform(platform),status=platformStatus(env,key);if(!status.supported)return {ok:false,code:'unsupported_platform',error:'Unsupported platform'};if(!status.connected)return {ok:false,code:'not_connected',error:`${status.label} is not connected`};if(!status.publishEnabled)return {ok:false,code:'publishing_disabled',error:`${status.label} publishing is disabled by the owner`};
 // External mutation adapters are intentionally conservative. Live calls are enabled only when each provider-specific payload and OAuth verification layer is configured.
 if(key==='youtube')return {ok:false,code:'adapter_requires_media',error:'YouTube publishing requires an uploaded video/media object before a live API call can be made.'};
 if(key==='instagram')return {ok:false,code:'adapter_requires_media',error:'Instagram publishing requires a hosted image/video media URL before a live API call can be made.'};
 if(key==='facebook')return {ok:false,code:'adapter_requires_verified_payload',error:'Facebook live publishing requires verified page permissions and a finalized post payload.'};
 return {ok:false,code:'unsupported_platform',error:'Unsupported platform'};
}
