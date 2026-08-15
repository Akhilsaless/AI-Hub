import {isOwner} from './lib/auth.js';

export async function onRequest(context){
  const url=new URL(context.request.url);
  const isHopePage=context.request.method==='GET'&&(url.pathname==='/hope'||url.pathname==='/hope/'||url.pathname==='/hope.html'||url.pathname==='/hope-v3.html');
  const owner=await isOwner(context.request,context.env);
  if(context.request.method==='GET'&&(url.pathname==='/models'||url.pathname==='/models.html')&&!owner)return Response.redirect(`${url.origin}/hope`,302);
  const response=await context.next();
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  try{
    let rewriter=new HTMLRewriter();
    if(!owner)rewriter=rewriter.on('a[href="/models.html"],a[href="/models"],button[onclick*="models.html"]',{element(el){el.remove()}});
    if(isHopePage)rewriter=rewriter.on('body',{element(el){el.append('<script src="/hope-voice6.js?v=6.5" defer></script>',{html:true})}});
    return rewriter.transform(response);
  }catch(e){
    console.error('HOPE page policy injection failed',String(e?.message||e));
    return response;
  }
}
