'use strict';
const $=s=>document.querySelector(s), avatarWrap=$('#avatarWrap'),stateText=$('#stateText'),panel=$('#panel'),notice=$('#notice');
let state='idle',memory=[],cards=[],position=-1,pending='',speaking=false;
const native=window.NexusNative, labels={idle:'TOCA PARA FALAR',thinking:'A PENSAR',speaking:'A RESPONDER',listening:'ESTOU A OUVIR'};
function setState(value){state=value;avatarWrap.className='avatar-wrap state-'+value;stateText.textContent=labels[value]||labels.idle;speaking=value==='speaking';}
window.nexusVoiceState=setState;
function textBlocks(text){const container=document.createDocumentFragment();String(text).split(/\n{2,}/).forEach(block=>{const p=document.createElement('p');p.textContent=block;container.appendChild(p);});return container;}
function renderCard(direction=1){if(position<0)return;const card=cards[position];panel.classList.remove('hidden');panel.getAnimations().forEach(a=>a.cancel());panel.animate([{opacity:.1,transform:'perspective(900px) rotateY('+direction*65+'deg) translateX('+direction*70+'px)'},{opacity:1,transform:'perspective(900px) rotateY(0) translateX(0)'}],{duration:420,easing:'ease-out'});$('#panelTopic').textContent=card.title;$('#panelContent').replaceChildren(textBlocks(card.reply));$('#panelSources').replaceChildren();(card.sources||[]).slice(0,6).forEach(source=>{if(!source||typeof source!=='object')return;try{const u=new URL(source.url);if(u.protocol!=='https:')return;const a=document.createElement('a');a.href=u.href;a.textContent=source.title||u.hostname;a.rel='noopener noreferrer';$('#panelSources').appendChild(a);}catch{}});$('#panelCount').textContent=(position+1)+' / '+cards.length;}
function addCard(title,reply,sources=[]){cards.push({title,reply,sources});if(cards.length>30)cards.shift();position=cards.length-1;renderCard();}
function rotate(direction){if(!cards.length)return;position=(position+direction+cards.length)%cards.length;renderCard(direction);}
function classify(q){const topics=[['Meteorologia',/tempo|chuva|meteorolog|temperatura/i],['Notícias',/not[ií]cia|atualidade/i],['Negócios',/neg[oó]cio|brilhah|loja|venda/i],['Redes sociais',/instagram|facebook|redes|tiktok/i],['Ciência',/ci[eê]ncia|espa[cç]o|universo/i],['Tecnologia',/tecnolog|programa|computador/i],['Música',/m[uú]sica|beat|guitarra/i],['Fotografia',/fotograf|c[aâ]mara|evento/i]];return (topics.find(t=>t[1].test(q))||['Conversa'])[0];}
function ask(question){const q=String(question||'').trim().slice(0,4000);if(!q||state==='thinking')return;if(!native){nexusFailure('Abre a aplicação Android para utilizar a voz e a ligação segura.');return;}native.stop();pending=q;setState('thinking');notice.textContent='A ligar ao servidor…';native.ask(JSON.stringify({message:q,search:true,history:memory.slice(-8)}));}
window.nexusReceiveQuestion=ask;
window.nexusAnswer=data=>{const reply=data.reply||data.answer;if(typeof reply!=='string'||!reply.trim()){nexusFailure('O servidor devolveu uma resposta sem texto.');return;}const title=typeof data.topic==='string'?data.topic:(data.topic&&data.topic.title)||classify(pending);addCard(title,reply,data.sources||[]);memory.push({role:'user',content:pending},{role:'assistant',content:reply});memory=memory.slice(-8);notice.textContent='';$('.health').textContent='● SERVIDOR RESPONDEU';setState('idle');native.speak(reply);};
window.nexusFailure=error=>{setState('idle');notice.textContent=error;$('.health').textContent='● VERIFICAR LIGAÇÃO';};
window.nexusClearHistory=()=>{memory=[];cards=[];position=-1;panel.classList.add('hidden');notice.textContent='Contexto desta sessão apagado.';};
window.nexusStopAll=()=>{if(native)native.stop();pending='';setState('idle');notice.textContent='';};
function talk(){if(!native){nexusFailure('Voz disponível na aplicação Android.');return;}if(speaking){native.stop();setState('idle');return;}native.listen();}
$('#talkBtn').onclick=talk;avatarWrap.onclick=talk;$('.menu').onclick=()=>native&&native.menu();
$('#keyboardBtn').onclick=()=>{$('#composer').classList.toggle('hidden');if(!$('#composer').classList.contains('hidden'))$('#textInput').focus();};
$('#composer').onsubmit=e=>{e.preventDefault();ask($('#textInput').value);$('#textInput').value='';};
$('#closePanel').onclick=()=>panel.classList.add('hidden');$('#clearBtn').onclick=()=>{if(cards.length)renderCard();else addCard('Os teus projetos','Escolhe um tema ou fala sobre a BRILHAH, fotografia, música, carreira ou qualquer outro assunto.');};
$('#previous').onclick=()=>rotate(-1);$('#next').onclick=()=>rotate(1);
let startX=0,startY=0;panel.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});panel.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy))rotate(dx<0?1:-1);},{passive:true});
window.addEventListener('error',()=>{notice.textContent='Ocorreu um erro na interface. Usa MENU → Recarregar interface.';});
document.addEventListener('visibilitychange',()=>{if(document.hidden)nexusStopAll();});
setState('idle');
