import {requireUser} from '../../lib/user-auth.js';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestGet({request,env}){
  const a=await requireUser(request,env);if(a.response)return a.response;
  const origin=new URL(request.url).origin;
  const googleConfigured=Boolean(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET);
  const githubConfigured=Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET);
  return json({ok:true,isOwner:Boolean(a.user.isOwner),providers:{
    google:{configured:googleConfigured,missing:a.user.isOwner?[!env.GOOGLE_CLIENT_ID?'GOOGLE_CLIENT_ID':null,!env.GOOGLE_CLIENT_SECRET?'GOOGLE_CLIENT_SECRET':null].filter(Boolean):[],redirectUri:`${origin}/api/user/connect/google/callback`},
    github:{configured:githubConfigured,missing:a.user.isOwner?[!env.GITHUB_CLIENT_ID?'GITHUB_CLIENT_ID':null,!env.GITHUB_CLIENT_SECRET?'GITHUB_CLIENT_SECRET':null].filter(Boolean):[],redirectUri:`${origin}/api/user/connect/github/callback`}
  },note:'Secret values are never returned. Normal users only need to press Connect once OAuth is configured by the owner.'})
}
