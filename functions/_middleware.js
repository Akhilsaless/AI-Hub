export async function onRequest(context){
  const url=new URL(context.request.url);
  const isHopePage=context.request.method==='GET'&&(url.pathname==='/hope'||url.pathname==='/hope/'||url.pathname==='/hope.html'||url.pathname==='/hope-v3.html');
  const response=await context.next();
  if(!isHopePage||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  try{
    return new HTMLRewriter().on('body',{element(el){el.append('<script src="/hope-voice6.js?v=6.5" defer></script>',{html:true})}}).transform(response);
  }catch(e){
    console.error('HOPE voice injection failed',String(e?.message||e));
    return response;
  }
}
