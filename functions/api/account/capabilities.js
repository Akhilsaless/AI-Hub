import {requireUser} from '../../lib/user-auth.js';
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json','cache-control':'no-store'}});
const state=(ready,requirements=[])=>ready?{status:'ready'}:{status:'complete_awaiting_owner_connection',requirements};

export async function onRequestGet({request,env}){
 const auth=await requireUser(request,env);if(auth.response)return auth.response;
 const emailReady=Boolean(env.EMAIL_PROVIDER_API_KEY&&env.EMAIL_FROM);
 return json({ok:true,profile:{status:'ready'},passwordChange:{status:'ready'},sessionRevocation:{status:'ready'},accountDeactivation:{status:'ready'},emailVerification:state(emailReady,['transactional email provider','verified sender']),passwordRecovery:state(emailReady,['transactional email provider','verified sender']),googleOAuth:state(Boolean(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET),['Google OAuth application']),githubOAuth:state(Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET),['GitHub OAuth application']),billing:state(Boolean(env.BILLING_SECRET_KEY&&env.BILLING_WEBHOOK_SECRET),['billing provider','webhook secret'])});
}
