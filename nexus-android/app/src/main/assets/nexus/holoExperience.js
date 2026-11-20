'use strict';
/**
 * NEXUS 1.2 HUD. All displayed information originates in the actual response/source
 * handlers. No invented live results, simulated remote queries, or artificial mouth.
 */
(()=>{
 const get=id=>document.getElementById(id);
 const stage=document.querySelector('.stage'),hero=document.querySelector('.hero');
 const panel=get('panel'),content=get('panelContent'),sourceList=get('panelSources');
 const avatar=get('avatarWrap'),health=document.querySelector('.health');
 if(!stage||!hero||!panel||!content||!avatar)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const signal=document.createElement('div');signal.id='nexusVoiceEnergy';signal.setAttribute('aria-hidden','true');
 signal.innerHTML='<span></span><span></span><span></span><span></span><span></span><span></span><span></span>';
 avatar.appendChild(signal);
 const boot=document.createElement('section');boot.id='nexusWelcome';boot.setAttribute('role','status');boot.setAttribute('aria-live','polite');
 boot.innerHTML='<div class="welcome-kicker">✦ NEXUS ONLINE</div><div class="welcome-main">Olá. Sou o NEXUS.</div><div class="welcome-sub">Em que posso ajudar?</div>';
 stage.appendChild(boot);
 const transcript=document.createElement('div');transcript.id='holoTranscript';
 transcript.setAttribute('aria-hidden','true');panel.insertBefore(transcript,get('panelExpand'));
 const feed=document.createElement('div');feed.id='holoFeed';panel.insertBefore(feed,get('panelExpand'));
 const status=document.createElement('div');status.id='holoStageStatus';panel.insertBefore(status,content);
 const userMessage=document.createElement('div');userMessage.id='holoRequest';userMessage.setAttribute('aria-live','polite');
 stage.appendChild(userMessage);
 let booted=false,bootTimer=0,hideTimer=0,lastFull='',lastVisible='',voice='idle',spoken=0,autoProgress=0,lastStamp=0,raf=0;
 const escapeText=s=>String(s||'').replace(/\s+/g,' ').trim();
 const fragment=string=>document.createTextNode(string);
 function announce(text){
  if(booted)return;
  booted=true;
  const cleaned=escapeText(text||'Olá. Sou o NEXUS. Em que posso ajudar?');
  boot.querySelector('.welcome-main').textContent=cleaned.startsWith('Olá')?'Olá André. Sou o NEXUS.':cleaned.slice(0,86);
  boot.querySelector('.welcome-sub').textContent='Em que posso ajudar?';
  boot.classList.add('visible');
  document.body.classList.add('nexus-booting');
  clearTimeout(bootTimer);
  bootTimer=setTimeout(()=>{boot.classList.remove('visible');document.body.classList.remove('nexus-booting');},5300);
 }
 window.nexusBoot=()=>announce('Olá. Sou o NEXUS. Em que posso ajudar?');
 function showRequest(text){
  const q=escapeText(text);
  if(!q)return;
  userMessage.textContent=q.length>115?q.slice(0,112)+'…':q;
  userMessage.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer=setTimeout(()=>userMessage.classList.remove('visible'),5600);
 }
 function markVoice(s){
  voice=s||'idle';
  document.body.dataset.nexusVoice=voice;
  avatar.dataset.mode=voice;
  if(health)health.textContent=({listening:'● A OUVIR',thinking:'● A PENSAR',speaking:'● A RESPONDER',researching:'● A PESQUISAR'}[voice]||'● NEXUS PRONTA');
  if(voice==='speaking'){lastStamp=0;if(!raf&&!reduced)raf=requestAnimationFrame(tick);}
  if(voice==='idle'&&lastFull){autoProgress=1;drawTranscript(lastFull);}
 }
 function tick(now){
  raf=0;
  if(voice!=='speaking'||!lastFull||panel.classList.contains('expanded'))return;
  if(lastStamp)autoProgress=Math.min(1,autoProgress+Math.min(90,now-lastStamp)/Math.max(6500,lastFull.length*63));
  lastStamp=now;
  drawTranscript(lastFull);
  if(autoProgress<1)raf=requestAnimationFrame(tick);
 }
 function drawTranscript(text){
  const normalized=escapeText(text).slice(0,5000);
  if(panel.classList.contains('expanded')){transcript.textContent='';return;}
  let count=reduced?normalized.length:Math.ceil(normalized.length*Math.max(autoProgress,spoken));
  if(!count&&normalized.length)count=Math.min(55,normalized.length);
  const visible=normalized.slice(0,count);
  if(visible!==lastVisible){transcript.replaceChildren(fragment(visible));lastVisible=visible;}
  transcript.classList.toggle('streaming',count<normalized.length);
 }
 function sources(arr){
  feed.replaceChildren();
  const actual=Array.isArray(arr)?arr.filter(s=>s&&typeof s.url==='string'&&/^https:\/\//i.test(s.url)).slice(0,6):[];
  if(!actual.length)return;
  const label=document.createElement('span');label.className='holo-feed-title';label.textContent=actual.length+' FONTES REAIS';feed.append(label);
  actual.forEach((source,i)=>{
   try{
    const u=new URL(source.url);if(u.protocol!=='https:')return;
    const link=document.createElement('a');link.className='holo-source-tile';
    link.href=u.href;link.rel='noopener noreferrer';link.textContent=(i+1).toString().padStart(2,'0')+' · '+escapeText(source.title||u.hostname).slice(0,95);
    link.style.animationDelay=(i*110)+'ms';feed.append(link);
   }catch{}
  });
 }
 function showResult(text,found,stageName){
  lastFull=escapeText(text);lastVisible='';autoProgress=0;spoken=0;lastStamp=0;
  panel.classList.add('holo-result-active');
  if(panel.classList.contains('expanded')){transcript.textContent='';}else drawTranscript(lastFull);
  sources(found);
  status.textContent=stageName||'RESULTADO VERIFICADO';
 }
 function expanded(){
  const open=panel.classList.contains('expanded');
  panel.classList.toggle('holo-expanded',open);
  if(open){transcript.textContent='';autoProgress=1;}
  else{lastVisible='';drawTranscript(lastFull);}
 }
 const origVoice=window.nexusVoiceState;
 window.nexusVoiceState=s=>{if(origVoice)origVoice(s);markVoice(s);};
 const origGreeting=window.nexusGreeting;
 window.nexusGreeting=text=>{if(origGreeting)origGreeting(text);announce(text);};
 const origHeard=window.nexusHeard;
 window.nexusHeard=text=>{if(origHeard)origHeard(text);showRequest(text);};
 const origQuestion=window.nexusReceiveQuestion;
 window.nexusReceiveQuestion=(question,...rest)=>{showRequest(question);return origQuestion&&origQuestion(question,...rest);};
 const origPreview=window.nexusResearchPreview;
 window.nexusResearchPreview=list=>{
  if(origPreview)origPreview(list);
  showResult('A consultar fontes. Os resultados encontrados estão disponíveis para abrir.',list,'A PESQUISAR · FONTES');
  markVoice('researching');
 };
 const origAnswer=window.nexusAnswer;
 window.nexusAnswer=data=>{
  if(origAnswer)origAnswer(data);
  if(!data)return;
  // The native answer handler may normalize provider output (e.g. actual Open-Meteo
  // forecast instead of a raw model claim). Show exactly what it rendered.
  const actual=content.textContent||data.reply||data.answer||'';
  showResult(actual,data.sources,'RESPOSTA DO NEXUS');
  userMessage.classList.remove('visible');
  if(window.nexusOrbitalFocus && Array.isArray(data.sources)&&data.sources.length)window.nexusOrbitalFocus('research');
 };
 const origLocal=window.nexusLocalAnswer;
 window.nexusLocalAnswer=(title,text)=>{
  if(origLocal)origLocal(title,text);
  showResult(text,[],String(title||'AÇÃO CONCLUÍDA').slice(0,70));
 };
 const origFailure=window.nexusFailure;
 window.nexusFailure=error=>{if(origFailure)origFailure(error);status.textContent='FALHA · VERIFICAR';showResult(error,[],'PRECISA DE ATENÇÃO');markVoice('error');};
 const origStop=window.nexusStopAll;
 window.nexusStopAll=()=>{if(origStop)origStop();if(raf)cancelAnimationFrame(raf);raf=0;markVoice('idle');};
 window.nexusSpeechProgress=(start,end)=>{
  if(!lastFull||voice!=='speaking')return;
  const length=Math.max(1,window.nexusSpeechLength||lastFull.length);
  spoken=Math.max(spoken,Math.min(1,Number(end||start)/length));
  drawTranscript(lastFull);
 };
 window.nexusSpeechLengthChanged=length=>{window.nexusSpeechLength=Math.max(1,Number(length)||1);};
 panel.addEventListener('click',e=>{
  if(e.target.closest('button,a,input,nav')||e.target===get('panelContent'))return;
  get('panelExpand')?.click();
 });
 new MutationObserver(expanded).observe(panel,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(voice==='speaking'&&!raf)raf=requestAnimationFrame(tick);});
 markVoice('idle');
 // Startup caption is independent of Android TTS availability; speech starts only when ready.
 window.setTimeout(window.nexusBoot,450);
})();
