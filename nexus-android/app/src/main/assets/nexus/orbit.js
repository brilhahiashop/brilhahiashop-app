'use strict';
/**
 * NEXUS Orbits 1.0 — interactive spatial command carousel.
 * Every button acts on the user device; no fake feature labels.
 * Swipe left/right, press arrows, or use previously authorized gesture controls.
 */
(function(){
 const el=id=>document.getElementById(id);
 const deck=el('orbitDeck');if(!deck)return;
 const opts=[
  {id:'voice',icon:'✦',title:'FALAR',action:()=>window.NexusNative?.listen?.()},
  {id:'apps',icon:'▦',title:'APPS',action:()=>window.NexusNative?.apps?.()},
  {id:'research',icon:'⌕',title:'PESQUISA',action:()=>{const c=el('composer');c?.classList.remove('hidden');el('textInput')?.focus();}},
  {id:'agenda',icon:'◷',title:'AGENDA',action:()=>window.NexusNative?.reminders?.()},
  {id:'learning',icon:'◇',title:'APRENDER',action:()=>window.NexusNative?.command?.('NEXUS, vou ensinar-te uma rotina')},
  {id:'operator',icon:'⌘',title:'OPERADOR',action:()=>window.NexusNative?.operator?.()},
  {id:'settings',icon:'⚙',title:'SISTEMA',action:()=>window.NexusNative?.menu?.()}
 ];
 let current=0,locked=false,lastTopic='voice';
 const slots=[...deck.querySelectorAll('.orbit-card')];
 const modulo=n=>((n%opts.length)+opts.length)%opts.length;
 function select(index,animate=true){
  current=modulo(index);
  slots.forEach(button=>{
   const offset=Number(button.dataset.slot);
   const target=opts[modulo(current+offset)];
   button.replaceChildren();
   const ico=document.createElement('span');ico.className='orbit-icon';ico.textContent=target.icon;
   const name=document.createElement('span');name.className='orbit-name';name.textContent=target.title;
   button.append(ico,name);
   button.setAttribute('aria-label',offset===0?'Selecionado: '+target.title+', tocar para executar':'Selecionar '+target.title);
   button.classList.toggle('selected',offset===0);
   button.style.setProperty('--offset',String(offset));
  });
  deck.dataset.active=opts[current].id;
  if(animate){
   deck.classList.remove('orbit-motion');void deck.offsetWidth;deck.classList.add('orbit-motion');
  }
  lastTopic=opts[current].id;
 }
 function advance(delta){select(current+delta)}
 function perform(){
  const choice=opts[current];
  if(locked)return;locked=true;
  el('stateText').textContent='NEXUS · '+choice.title;
  try{choice.action();}finally{setTimeout(()=>locked=false,330);}
 }
 slots.forEach(btn=>btn.addEventListener('click',()=>{
  const offset=Number(btn.dataset.slot);
  if(offset===0)perform();else advance(offset);
 }));
 el('orbitPrev').addEventListener('click',()=>advance(-1));
 el('orbitNext').addEventListener('click',()=>advance(1));
 let startX=0,startY=0;
 deck.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
 deck.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
  if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy))advance(dx<0?1:-1);
 },{passive:true});
 deck.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();advance(-1);}if(e.key==='ArrowRight'){e.preventDefault();advance(1);}});
 window.nexusOrbitalFocus=key=>{
  const index=opts.findIndex(o=>o.id===key);
  if(index>=0)select(index,true);
 };
 window.nexusOrbitalExecute=perform;
 const nativeGesture=window.nexusGesture;
 window.nexusGesture=event=>{
  if(event==='next')advance(1);
  else if(event==='previous')advance(-1);
  else if(event==='confirm'&&deck.classList.contains('gesture-selected')){deck.classList.remove('gesture-selected');perform();}
  else if(event==='select'){deck.classList.add('gesture-selected');}
  if(nativeGesture&&event!=='next'&&event!=='previous'&&event!=='confirm'&&event!=='select')nativeGesture(event);
 };
 const answer=window.nexusAnswer;
 if(answer)window.nexusAnswer=data=>{
  const topic=String(data?.topic?.title||data?.topic||'').toLowerCase();
  if(data?.sources?.length||/(not[ií]cias|pesquisa|pesquisar|informação)/.test(topic))window.nexusOrbitalFocus('research');
  answer(data);
 };
 const local=window.nexusLocalAnswer;
 if(local)window.nexusLocalAnswer=(title,message)=>{
  const t=String(title).toLowerCase();
  if(t.includes('aprendizagem'))window.nexusOrbitalFocus('learning');
  else if(t.includes('android'))window.nexusOrbitalFocus('operator');
  else if(t.includes('aplic'))window.nexusOrbitalFocus('apps');
  local(title,message);
 };
 const panel=el('panel'),expand=el('panelExpand');
 expand?.addEventListener('click',()=>{
  const expanded=panel.classList.toggle('expanded');
  expand.setAttribute('aria-expanded',String(expanded));
  expand.textContent=expanded?'Recolher resposta':'Ver resposta completa';
 });
 el('closePanel')?.addEventListener('click',()=>{
  panel?.classList.remove('expanded');
  expand?.setAttribute('aria-expanded','false');
  if(expand)expand.textContent='Ver resposta completa';
 });
 select(0,false);
})();
