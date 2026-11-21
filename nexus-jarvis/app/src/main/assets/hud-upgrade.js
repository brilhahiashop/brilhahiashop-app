
/* HUD integration for the independent JARVIS app. No fake web results or lip-sync. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const phase=el('hudPhase'), result=el('hudResult'), transcript=el('hudTranscript');
const energy=Array.from(document.querySelectorAll('.hud-energy i'));
if(!phase||!result||!transcript)return;
let lastAnswer='',lastRequest='',spokenText='';
function normalize(s){return String(s==null?'':s).replace(/[*#_`>~]/g,' ').replace(/\s+/g,' ').trim()}
function text(t){transcript.textContent=normalize(t);result.hidden=false}
function setEnergy(v){
 const a=Math.max(0,Math.min(1,(Number(v)+2)/14));
 energy.forEach((n,i)=>n.style.setProperty('--a',String(Math.max(.09,Math.min(1,a*(.35+.65*Math.abs(Math.cos(i*1.5))))))));
}
const hud={
 state(s,msg){
  const labels={idle:'DISPONÍVEL',listening:'A OUVIR',thinking:'A PENSAR',speaking:'A RESPONDER',researching:'A PESQUISAR'};
  document.body.dataset.nxState=s;
  phase.textContent='NEXUS · '+(labels[s]||'ONLINE');
  if(s==='idle')setEnergy(0);
  if(s==='listening'&&msg)el('hudRequest').textContent=msg;
 },
 energy(v){setEnergy(v)},
 liveText(t){el('hudRequest').textContent='«'+normalize(t).slice(0,100)+'»'},
 request(t){lastRequest=normalize(t);el('hudRequest').textContent='«'+lastRequest.slice(0,100)+'»'},
 answer(t){
  lastAnswer=normalize(t);spokenText=lastAnswer;
  if(!lastAnswer)return;
  text(lastAnswer);
  el('hudResultLabel').textContent='RESPOSTA REAL';
 },
 spoken(start,end){
  if(!spokenText)return;
  const s=Math.max(0,Math.min(spokenText.length,Number(start)||0));
  const e=Math.max(s,Math.min(spokenText.length,Number(end)||s));
  const pre=document.createElement('span');pre.textContent=spokenText.slice(0,s);
  const active=document.createElement('mark');active.textContent=spokenText.slice(s,e);
  const post=document.createElement('span');post.textContent=spokenText.slice(e);
  transcript.textContent='';transcript.append(pre,active,post);
  result.hidden=false;
 },
 greet(){
  this.state('idle','');
  el('hudRequest').textContent='OLÁ · SOU O NEXUS';
  if(window.Android&&typeof speak==='function')speak('Olá! Sou o NEXUS. Em que posso ajudar?');
 }
};
window.nxHUD=hud;
function showApps(){
 if(!window.Android||typeof Android.listApps!=='function'){
  showWin('Aplicações',b=>b.append(elText('p','A lista de apps só está disponível no Android.')));return;
 }
 let apps=[];
 try{apps=JSON.parse(Android.listApps()||'[]')}catch(e){}
 showWin('Abrir uma aplicação',b=>{
   const label=elText('p','Escolha uma aplicação instalada:');
   const search=document.createElement('input');search.type='text';search.placeholder='Procurar aplicação';search.setAttribute('aria-label','Procurar aplicação');
   const list=document.createElement('div');list.className='app-picker';
   const refresh=()=>{
     const q=search.value.trim().toLocaleLowerCase('pt-PT');
     list.textContent='';
     const filtered=apps.filter(x=>String(x).toLocaleLowerCase('pt-PT').includes(q)).slice(0,36);
     if(!filtered.length){list.append(elText('p','Não foram encontradas aplicações.'));return}
     filtered.forEach(name=>{
       const btn=elText('button',name);btn.type='button';
       btn.onclick=()=>{const ok=Android.openApp(name);if(ok!=='ok')el('cap').textContent='Não consegui abrir '+name+'.'};
       list.append(btn);
     });
   };
   search.addEventListener('input',refresh);
   b.append(label,search,list);refresh();search.focus();
 });
}
function elText(tag,t){const n=document.createElement(tag);n.textContent=t;return n}
const actions={
 talk(){listen()},
 apps(){showApps()},
 research(){const t=el('txt');t.placeholder='O que queres pesquisar?';t.focus()},
 weather(){ask('Como está o tempo hoje?')},
 sales(){ask('Como vão as minhas vendas hoje?')},
 settings(){el('gear').click()}
};
document.querySelectorAll('#quickActions button[data-action]').forEach(btn=>{
 btn.addEventListener('click',()=>{const a=actions[btn.dataset.action];if(a)a()});
});
el('hudExpand').addEventListener('click',()=>{
 const win=el('win');
 if(win.classList.contains('open')){closeWin();return}
 showWin('Resposta',b=>b.append(elText('p',lastAnswer||'Ainda não tenho uma resposta.')));
});
hud.state('idle','');
})();
