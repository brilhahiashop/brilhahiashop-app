'use strict';
const $=s=>document.querySelector(s), avatarWrap=$('#avatarWrap'),stateText=$('#stateText'),panel=$('#panel'),notice=$('#notice');
let state='idle',memory=[],cards=[],position=-1,pending='',speaking=false,pendingRequest=false,learningMode=false;
const native=window.NexusNative, labels={idle:'TOCA PARA FALAR',thinking:'A PENSAR',speaking:'A RESPONDER',listening:'ESTOU A OUVIR'};
function setState(value){if(window.nexusAvatarState)window.nexusAvatarState(value);state=value;avatarWrap.className='avatar-wrap state-'+value;stateText.textContent=labels[value]||labels.idle;speaking=value==='speaking';}
window.nexusVoiceState=setState;
window.nexusGreeting=text=>{notice.textContent=text;};
window.nexusFeedback=text=>{notice.textContent=text;};
window.nexusHeard=text=>{notice.textContent='Ouvi: '+text;};
window.nexusLocalAnswer=(title,reply)=>{
  pendingRequest=false;
  if(/Modo Aprendizagem ativo/.test(reply))learningMode=true;
  if(/Guardei a rotina|Cancelei o ensino/.test(reply))learningMode=false;
  addCard(title,reply);setState('idle');notice.textContent='';
};
function textBlocks(text){const container=document.createDocumentFragment();String(text).split(/\n{2,}/).forEach(block=>{const p=document.createElement('p');p.textContent=block;container.appendChild(p);});return container;}
function renderCard(direction=1){if(position<0)return;const card=cards[position];panel.classList.remove('hidden');panel.getAnimations().forEach(a=>a.cancel());panel.animate([{opacity:.1,transform:'perspective(900px) rotateY('+direction*65+'deg) translateX('+direction*70+'px)'},{opacity:1,transform:'perspective(900px) rotateY(0) translateX(0)'}],{duration:420,easing:'ease-out'});$('#panelTopic').textContent=card.title;$('#panelContent').replaceChildren(textBlocks(card.reply));$('#panelSources').replaceChildren();(card.sources||[]).slice(0,6).forEach(source=>{if(!source||typeof source!=='object')return;try{const u=new URL(source.url);if(u.protocol!=='https:')return;const a=document.createElement('a');a.href=u.href;a.textContent=source.title||u.hostname;a.rel='noopener noreferrer';$('#panelSources').appendChild(a);}catch{}});$('#panelCount').textContent=(position+1)+' / '+cards.length;}
function addCard(title,reply,sources=[]){cards.push({title,reply,sources});if(cards.length>30)cards.shift();position=cards.length-1;renderCard();}
function rotate(direction){if(!cards.length)return;position=(position+direction+cards.length)%cards.length;renderCard(direction);}
function classify(q){const topics=[['Meteorologia',/tempo|chuva|meteorolog|temperatura/i],['Notícias',/not[ií]cia|atualidade/i],['Negócios',/neg[oó]cio|brilhah|loja|venda/i],['Redes sociais',/instagram|facebook|redes|tiktok/i],['Ciência',/ci[eê]ncia|espa[cç]o|universo/i],['Tecnologia',/tecnolog|programa|computador/i],['Música',/m[uú]sica|beat|guitarra/i],['Fotografia',/fotograf|c[aâ]mara|evento/i]];return (topics.find(t=>t[1].test(q))||['Conversa'])[0];}
function isLocalInstruction(q){
 const s=q.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^(ola\s+)?(nexus|nexos)[,!: -]*/,'').trim();
 return learningMode||/^(?:(?:por favor\s+)?(?:podes|poderias|consegues)\s+)?(?:abre|abrir|entra|muda para|vai para)\b/.test(s)||/^(abre|abrir|inicia|iniciar|lanca|fecha|fechar|sair|minimiza|volta|regressa|entra no|entra na|executa|lembra.me|lembrete|avisa.me|recorda.me|agenda|agendar|compromisso|marca|marcar|apresenta.te|apresenta te|quem es|fala.me de ti|diz.me quem es|pesquisa|pesquisar|procura|quero ensinar|vou ensinar|vamos ensinar|modo aprendizagem|aprende|guarda|grava|memoriza|mostra rotinas|lista rotinas|apaga rotina|proximo passo|seguinte passo|continuar rotina|repete rotina|faz rotina)\b/.test(s);
}
function ask(question,forceAI=false){
 const q=String(question||'').trim().slice(0,4000);
 if(!q||pendingRequest)return;
 if(!native){nexusFailure('Abre a aplicação Android para utilizar a voz e a ligação segura.');return;}
 if(!forceAI&&isLocalInstruction(q)&&native.command){notice.textContent='Comando recebido: '+q;native.command(q);return;}
 native.stop();pendingRequest=true;pending=q;setState('thinking');notice.textContent='A consultar a IA…';
 native.ask(JSON.stringify({message:q,search:true,history:memory.slice(-8)}));
}
window.nexusReceiveQuestion=ask;
window.nexusAskAI=q=>ask(q,true);
function weatherReply(weather){
 if(!weather||!weather.current||!Number.isFinite(weather.current.temperature_2m))return null;
 const number=value=>Number.isFinite(value)?value.toLocaleString('pt-PT'):'—';
 let text='Temperatura em '+String(weather.city||'local consultado')+': '+number(weather.current.temperature_2m)+' °C.\nAtualização: '+String(weather.current.time||'não indicada')+'.';
 const d=weather.daily||{};
 (d.time||[]).slice(0,4).forEach((day,i)=>{text+='\n\n'+String(day)+': mínima '+number((d.temperature_2m_min||[])[i])+' °C · máxima '+number((d.temperature_2m_max||[])[i])+' °C · probabilidade de precipitação '+number((d.precipitation_probability_max||[])[i])+'%.';});
 return text+'\n\nFonte: Open-Meteo, indicada pelo servidor. A previsão pode mudar.';
}
window.nexusAnswer=data=>{pendingRequest=false;const weather=weatherReply(data.weather);const reply=weather||data.reply||data.answer;if(typeof reply!=='string'||!reply.trim()){nexusFailure('O servidor devolveu uma resposta sem texto.');return;}const title=weather?'Meteorologia · '+String(data.weather.city||'Previsão'):typeof data.topic==='string'?data.topic:(data.topic&&data.topic.title)||classify(pending);addCard(title,reply,data.sources||[]);memory.push({role:'user',content:pending},{role:'assistant',content:reply});memory=memory.slice(-8);notice.textContent='';$('.health').textContent='● SERVIDOR RESPONDEU';setState('idle');native.speak(reply);};
window.nexusFailure=error=>{pendingRequest=false;setState('idle');notice.textContent=error;$('.health').textContent='● VERIFICAR LIGAÇÃO';};
window.nexusClearHistory=()=>{memory=[];cards=[];position=-1;panel.classList.add('hidden');notice.textContent='Contexto desta sessão apagado.';};
window.nexusStopAll=()=>{if(native)native.stop();pendingRequest=false;pending='';setState('idle');notice.textContent='';};
function talk(){if(!native){nexusFailure('Voz disponível na aplicação Android.');return;}if(speaking){native.stop();setState('idle');return;}native.listen();}
$('#learnBtn').onclick=()=>{if(native&&native.command)native.command('NEXUS, vou ensinar-te uma rotina');else notice.textContent='Modo aprendizagem disponível no Android.';};
window.nexusHandsFreeState=enabled=>{
 const b=$('#handsFreeBtn');if(!b)return;
 b.setAttribute('aria-pressed',enabled?'true':'false');
 $('#handsFreeStatus').textContent=enabled?'MICROFONE ATIVO':'DESLIGADO';
};
$('#handsFreeBtn').onclick=()=>{
 if(native&&native.handsFree)native.handsFree();
 else notice.textContent='Modo mãos livres disponível na aplicação Android.';
};
if(native&&native.handsFreeActive)window.nexusHandsFreeState(native.handsFreeActive());
$('#talkBtn').onclick=talk;avatarWrap.onclick=talk;$('.menu').onclick=()=>native&&native.menu();
$('#keyboardBtn').onclick=()=>{$('#composer').classList.toggle('hidden');if(!$('#composer').classList.contains('hidden'))$('#textInput').focus();};
$('#composer').onsubmit=e=>{e.preventDefault();ask($('#textInput').value);$('#textInput').value='';};
$('#closePanel').onclick=()=>panel.classList.add('hidden');$('#clearBtn').onclick=()=>{if(cards.length)renderCard();else addCard('Os teus projetos','Escolhe um tema ou fala sobre a BRILHAH, fotografia, música, carreira ou qualquer outro assunto.');};
$('#previous').onclick=()=>rotate(-1);$('#next').onclick=()=>rotate(1);
let startX=0,startY=0;panel.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});panel.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy))rotate(dx<0?1:-1);},{passive:true});
window.addEventListener('error',()=>{notice.textContent='Ocorreu um erro na interface. Usa MENU → Recarregar interface.';});
document.addEventListener('visibilitychange',()=>{if(document.hidden)nexusStopAll();});
setState('idle');

window.nexusConversationState=active=>{$('#conversationBtn').setAttribute('aria-pressed',active?'true':'false');$('#conversationBtn').textContent=active?'CONVERSA ATIVA':'CONVERSA';};
$('#conversationBtn').onclick=()=>native&&native.conversation&&native.conversation();
$('#gestureBtn').onclick=()=>native&&native.gestures&&native.gestures();
window.nexusGesture=event=>{if(event==='next')rotate(1);else if(event==='previous')rotate(-1);else if(event==='select'){panel.classList.add('gesture-selected');notice.textContent='Painel selecionado. Mostra o polegar para confirmar.';}else if(event==='confirm'){panel.classList.remove('gesture-selected');if(position>=0){panel.classList.remove('hidden');notice.textContent='Painel confirmado: '+cards[position].title;}}else if(event==='started'){$('#gestureBtn').textContent='PARAR CÂMARA';}else{$('#gestureBtn').textContent='GESTOS';panel.classList.remove('gesture-selected');notice.textContent=event==='unavailable'?'Não foi possível iniciar a câmara ou reconhecer a mão.':'Câmara desligada.';}};
