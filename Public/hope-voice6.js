(()=>{
  const micBtn=document.getElementById('mic'),voiceBtn=document.getElementById('voice'),inputBox=document.getElementById('input'),sendBtn=document.getElementById('send'),stateEl=document.getElementById('state'),messagesEl=document.getElementById('messages');
  if(!micBtn||!voiceBtn||!inputBox||!sendBtn)return;
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null,listening=false,autoSpeak=localStorage.hopeVoice==='1',lastSpoken='';
  const setState=t=>{if(stateEl)stateEl.textContent=t};
  function setVoiceButton(){voiceBtn.textContent=autoSpeak?'🔊':'🔇';voiceBtn.title=autoSpeak?'Voice replies on':'Voice replies off'}
  function speak(text){if(!autoSpeak||!('speechSynthesis'in window))return;const clean=String(text||'').replace(/https?:\/\/\S+/g,'link').replace(/[`*_#>]/g,'').trim();if(!clean||clean===lastSpoken)return;lastSpoken=clean;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean.slice(0,4000));u.rate=.98;u.pitch=1;u.lang=navigator.language||'en-IN';u.onstart=()=>setState('HOPE is speaking…');u.onend=()=>setState('Ready');u.onerror=()=>setState('Ready');window.speechSynthesis.speak(u)}
  voiceBtn.onclick=()=>{autoSpeak=!autoSpeak;localStorage.hopeVoice=autoSpeak?'1':'0';if(!autoSpeak&&'speechSynthesis'in window)window.speechSynthesis.cancel();setVoiceButton();setState(autoSpeak?'Voice replies on':'Voice replies off')};
  function stopListening(){try{recognition?.stop()}catch{}listening=false;micBtn.textContent='🎙';micBtn.title='Talk to HOPE';setState('Ready')}
  function startListening(){
    if(!SpeechRecognition){setState('Voice input is not supported in this browser');inputBox.focus();return}
    if(listening){stopListening();return}
    recognition=new SpeechRecognition();recognition.lang=navigator.language||'en-IN';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;let finalText='';
    recognition.onstart=()=>{listening=true;micBtn.textContent='⏹';micBtn.title='Stop listening';setState('Listening…')};
    recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t;else interim+=t}inputBox.value=(finalText||interim).trim();inputBox.dispatchEvent(new Event('input',{bubbles:true}))};
    recognition.onerror=e=>{listening=false;micBtn.textContent='🎙';setState(e.error==='not-allowed'?'Microphone permission is blocked':'I couldn’t hear that clearly');};
    recognition.onend=()=>{listening=false;micBtn.textContent='🎙';micBtn.title='Talk to HOPE';const text=(finalText||inputBox.value||'').trim();if(text){setState('Sending voice message…');setTimeout(()=>sendBtn.click(),120)}else setState('Ready')};
    try{recognition.start()}catch{setState('Microphone could not start')}
  }
  micBtn.onclick=startListening;setVoiceButton();
  if(messagesEl&&'MutationObserver'in window){new MutationObserver(muts=>{for(const m of muts){for(const n of m.addedNodes){if(n.nodeType===1&&n.classList?.contains('assistant')){const text=n.textContent||'';setTimeout(()=>speak(text),180)}}}}).observe(messagesEl,{childList:true})}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){try{recognition?.stop()}catch{}if('speechSynthesis'in window)window.speechSynthesis.cancel()}});
  window.hopeVoice6={speak,startListening,stopListening,get enabled(){return autoSpeak}};
})();
