/* NEXUS JARVIS voice operator 1.6
 * Local commands are handled before any AI calls. SMS is never sent without explicit approval.
 * News and recipes are based on public source results, not invented "live" updates.
 */
(()=>{
'use strict';
const native=!!window.Android;
const byId=id=>document.getElementById(id);
const norm=value=>String(value||'').toLocaleLowerCase('pt-PT').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[!?.,;:\-]+/g,' ').replace(/\s+/g,' ').trim();
const strip=value=>String(value||'').trim().replace(/^(?:ol[aá]|hey|ei)\s+/i,'').replace(/^(?:nexus|nexos|jarvis)\s*[,!:]?\s*/i,'').trim();
const MAX_STEPS=5;
let pending=null,taskQueue=[],paused=false,researching=false,sequence=0,lastResearch='',lastKind='';
const requests=new Map();
const isText=t=>String(t||'').trim().length>0;
const isYes=t=>/^(?:sim|sim envia|envia|podes enviar|pode enviar|confirmo|confirmado|esta certo|est[aá] certo|manda|autoriza|autorizo|sim por favor)$/.test(norm(t));
const isNo=t=>/^(?:(?:nao)(?:\s+(?:cancela|cancelar|envies|enviar|manda|por favor))?|cancela|cancelar|desiste|esquece|para|parar)$/.test(norm(t));
const isEdit=t=>/^(?:altera|editar|corrige|muda|quero corrigir|reescrever|edita a mensagem)$/.test(norm(t));
function say(value,spoken=true){
 const t=String(value||'').trim();
 if(!t)return;
 const caption=byId('cap');if(caption)caption.textContent=t;
 if(window.nxHUD)window.nxHUD.answer(t);
 if(spoken&&typeof speak==='function')speak(t);
}
function showMessage(title,body){
 if(typeof showWin!=='function')return;
 showWin(title,b=>{
  const p=document.createElement('p');p.textContent=body;b.append(p);
 });
}
function contactAlias(raw){
 let t=norm(raw).replace(/^(?:(?:para|ao|a|o|à|a minha|ao meu|minha|meu)\s+)+/,'').trim();
 if(/^(?:mulher|esposa|minha esposa|minha mulher)$/.test(t))return 'amor';
 if(/^(?:meu filho|o meu filho)$/.test(t))return 'filho';
 if(/^(?:minha filha|a minha filha)$/.test(t))return 'filha';
 return t.replace(/\s+(?:por favor|se faz favor)$/,'').trim();
}
function contact(text){
 const s=norm(strip(text));
 const start=/^(?:envia|enviar|manda|mandar|escreve|redige|prepara|dita|quero enviar|quero mandar|podes enviar)\b/.exec(s);
 if(start&&/\b(mensagem|sms|whatsapp|recado|texto)\b/.test(s)){
  const channel=/\b(?:whatsapp|whatsap|watsap)\b/.test(s)?'whatsapp':'sms';
  let t=s.slice(start[0].length).trim()
   .replace(/^(?:uma?\s+)?(?:mensagem|sms|whatsapp|recado|texto)\b\s*/,'')
   .replace(/^(?:no|pelo|por)\s+(?:whatsapp|sms)\s*/,'')
   .replace(/^(?:mensagem|sms|whatsapp)\b\s*/,'')
   .replace(/^(?:para|ao|a|o)\s+/,'');
  const marker=/\s+(?:a dizer(?: que)?|que diga|com o texto|com a mensagem|dizendo|com a frase|a falar que)\s+/.exec(t);
  let body='';
  if(marker){
   // Recipient matching is accent-insensitive; the SMS body retains the actual dictated accents and punctuation.
   const original=strip(text);
   const originalMarker=/\s+(?:a dizer(?: que)?|que diga|com o texto|com a mensagem|dizendo|com a frase|a falar que)\s+/i.exec(original);
   body=originalMarker?original.slice(originalMarker.index+originalMarker[0].length).trim():t.slice(marker.index+marker[0].length).trim();
   t=t.slice(0,marker.index).trim();
  }
  const alias=contactAlias(t);
  if(!alias||alias.length>70)return null;
  return{type:'message',who:alias,body,channel};
 }
 const call=/^(?:liga|ligar|telefona|telefonar|faz uma chamada|fazer uma chamada|quero ligar|preciso de ligar|chama por telefone)\s+(?:para\s+|ao\s+|a\s+|o\s+)?(.+)$/.exec(s);
 if(call){
  const who=contactAlias(call[1]);
  if(!who||/^(?:lanterna|wifi|wi fi|bluetooth|volume|dados|luz|som|musica|alarme|despertador|televisao)\b/.test(who))return null;
  return{type:'call',who};
 }
 return null;
}
const numbers={zero:0,uma:1,um:1,duas:2,dois:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,catorze:14,quatorze:14,quinze:15,dezasseis:16,dezassete:17,dezoito:18,dezanove:19,vinte:20};
const months=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const weekdays=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
function when(text,now=new Date()){
 const s=norm(text);
 const relative=/\bdaqui a\s+(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|vinte|trinta)\s*(minutos?|horas?|dias?)\b/.exec(s);
 if(relative){
  const amount=/^\d+$/.test(relative[1])?Number(relative[1]):numbers[relative[1]];
  const unit=relative[2].startsWith('minuto')?60000:relative[2].startsWith('hora')?3600000:86400000;
  return amount>0&&amount<9999?now.getTime()+amount*unit:null;
 }
 const clock=/\b(?:as|pelas|para as|por volta das)\s+(\d{1,2}|uma|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezasseis|dezassete|dezoito|dezanove|vinte)(?:\s*(?::|h|horas?|e)\s*(\d{1,2}|meia|quinze|trinta|quarenta e cinco))?(?:\s+(?:da|de)\s+(manha|tarde|noite))?/.exec(s);
 if(!clock)return null;
 let hour=/^\d+$/.test(clock[1])?Number(clock[1]):numbers[clock[1]];
 const min=clock[2]==null?0:clock[2]==='meia'||clock[2]==='trinta'?30:clock[2]==='quinze'?15:clock[2]==='quarenta e cinco'?45:Number(clock[2]);
 if(!Number.isInteger(hour)||hour>23||min>59||min<0)return null;
 if((clock[3]==='tarde'||clock[3]==='noite')&&hour<12)hour+=12;
 const day=new Date(now.getTime());day.setHours(hour,min,0,0);
 let explicitDay=false;
 if(s.includes('depois de amanha')){day.setDate(day.getDate()+2);explicitDay=true;}
 else if(s.includes('amanha')){day.setDate(day.getDate()+1);explicitDay=true;}
 else if(s.includes('hoje')){explicitDay=true;}
 const date=/\bdia\s+(\d{1,2})(?:\s+de\s+([a-z]+))?(?:\s+de\s+(\d{4}))?/.exec(s);
 if(date){
  const d=Number(date[1]),m=date[2]?months.indexOf(date[2]):day.getMonth();
  if(d<1||d>31||m<0)return null;
  let year=date[3]?Number(date[3]):day.getFullYear();
  let desired=new Date(year,m,d,hour,min);
  if(desired.getDate()!==d||desired.getMonth()!==m)return null;
  if(!date[3]&&desired.getTime()<=now.getTime()){
   if(date[2])year++;else{desired.setMonth(desired.getMonth()+1);if(desired.getDate()!==d)return null;}
   if(date[2])desired=new Date(year,m,d,hour,min);
  }
  return desired.getTime()>now.getTime()?desired.getTime():null;
 }
 if(!date){
  const wm=/\b(?:proxima\s+)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:\s+feira)?\b/.exec(s);
  if(wm&&!s.includes('amanha')){
   let offset=(weekdays.indexOf(wm[1])-day.getDay()+7)%7;
   if(offset===0||/\bproxima\b/.test(s))offset=offset||7;
   day.setDate(day.getDate()+offset);
   explicitDay=true;
  }
 }
 if(day.getTime()<=now.getTime()+1000){
  if(explicitDay)return null;
  day.setDate(day.getDate()+1);
 }
 return day.getTime();
}
function removeDate(text){
 return String(text||'')
 .replace(/\b(?:depois de amanh[aã]|amanh[aã]|hoje)\b/gi,'')
 .replace(/\bdaqui a\s+(?:\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta)\s+(?:minutos?|horas?|dias?)\b/gi,'')
 .replace(/\b(?:dia\s+\d{1,2}(?:\s+de\s+[a-zçáãéíóú]+)?(?:\s+de\s+\d{4})?)\b/gi,'')
 .replace(/\b(?:pr[oó]xima\s+)?(?:segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?\b/gi,'')
 .replace(/\b(?:[àa]s|pelas|para as|por volta das)\s+(?:\d{1,2}|uma|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quinze|dezasseis|dezoito|vinte)(?:\s*(?::|h|horas?|e)\s*(?:\d{1,2}|meia|quinze|trinta|quarenta e cinco))?(?:\s+(?:da|de)\s+(?:manh[aã]|tarde|noite))?/gi,'')
 .replace(/\s+/g,' ').trim().replace(/^(?:de|para|que|sobre|às)\s+/i,'').trim();
}
function reminder(text){
 const s=norm(strip(text));
 if(/^(?:(?:mostra|lista|diz|quais sao)\s+(?:os\s+)?(?:meus\s+)?)lembretes/.test(s))return{type:'list'};
 if(!/^(?:lembra me|lembrete|avisa me|recorda me|cria um lembrete|criar lembrete|agenda um lembrete|quero um lembrete|nao me deixes esquecer|nao esquecer|marca um lembrete)\b/.test(s))return null;
 const raw=strip(text).replace(/^(?:lembra[\s-]*me|lembrete|avisa[\s-]*me|recorda[\s-]*me|cria[r]?\s+um\s+lembrete|agenda\s+um\s+lembrete|quero\s+um\s+lembrete|n[aã]o\s+me\s+deixes\s+esquecer|n[aã]o\s+esquecer|marca\s+um\s+lembrete)\s*/i,'');
 const title=removeDate(raw)||'Compromisso pessoal';
 return{type:'reminder',title,at:when(text)};
}
function calendar(text){
 const s=norm(strip(text));
 if(!/^(?:agenda|agendar|marca|marcar|adiciona|adicionar|cria um evento)\s+(?:uma?\s+)?(?:reuniao|consulta|evento|compromisso|visita|encontro|consulta medica|sessao)\b/.test(s))return null;
 const raw=strip(text).replace(/^(?:agenda|agendar|marca|marcar|adiciona|adicionar|cria um evento)\s*/i,'');
 return{type:'calendar',title:removeDate(raw)||'Compromisso',at:when(text)};
}
function device(text){
 const s=norm(strip(text));
 if(/^(?:liga|acende|ativa|desliga|apaga|desativa)\s+(?:a\s+)?lanterna\b/.test(s))return{type:'device',phrase:strip(text),external:false};
 if(/^(?:sobe|aumenta|diminui|baixa|reduz)\s+(?:o\s+)?volume\b/.test(s))return{type:'device',phrase:strip(text),external:false};
 if(/^(?:abre|abrir|inicia|iniciar|lanca|vai para)\s+.+/.test(s))return{type:'device',phrase:strip(text),external:true};
 if(/^(?:temporizador|timer|cronometro|contagem|poe um temporizador)\b/.test(s))return{type:'device',phrase:strip(text),external:false};
 if(/^(?:alarme|acorda me|poe o despertador|poe um alarme|define um alarme)\b/.test(s))return{type:'device',phrase:strip(text),external:false};
 if(/^(?:leva me|navega|navegar|direcoes|como chego|como chegar|rota)\b/.test(s))return{type:'device',phrase:strip(text),external:true};
 return null;
}
function searchIntent(text){
 const raw=strip(text),s=norm(raw);
 const news=/^(?:noticias(?: de hoje| hoje| de agora| ao segundo| do dia)?|ultimas noticias|as noticias|diz me as noticias|quais sao as noticias|o que se passa hoje|o que aconteceu hoje|atualiza(?: as)? noticias|atualizar(?: as)? noticias)\b/.test(s);
 const recipe=/\b(?:receita|receitas|ingredientes|cozinhar|culinaria)\b/.test(s)
   ||/^(?:como faco|como fazer|como preparar|como se faz)\s+(?:um[a]?\s+)?(?:bolo|sopa|bacalhau|frango|arroz|lasanha|omelete|massa|prato)\b/.test(s);
 const search=/^(?:pesquisa|pesquisar|procura|procurar|investiga|investigar|faz uma pesquisa|pesquisa a fundo|ve na internet|ve na net|consulta na internet|quero saber noticias|verifica na internet)\b/.test(s);
 const current=/\b(?:hoje|ontem|agora|atualmente|ultimas|noticias|mais recente|esta semana|ao vivo|em direto)\b/.test(s)
   && /^(?:quem|qual|quais|onde|quanto|o que aconteceu|o que se passa|como esta|como estao)\b/.test(s);
 if(!(news||recipe||search||current))return null;
 let query=raw.replace(/^(?:pesquisa a fundo|faz uma pesquisa|pesquisa|pesquisar|procura|procurar|investiga|investigar|ve na internet|ve na net|consulta na internet)\s*/i,'')
  .replace(/^(?:sobre|no google|na internet|na net|acerca de)\s+/i,'').trim();
 if(news&&s.match(/^(?:noticias|ultimas noticias|as noticias|diz me as noticias|quais sao as noticias|atualiza noticias|atualizar noticias)(?: de hoje| hoje| de agora| ao segundo| do dia)?$/))
  query='notícias de hoje em Portugal';
 if(recipe&&query.length<8)query=raw;
 if(query.length<2)query='notícias de hoje em Portugal';
 return{type:'search',query,news,recipe,refresh:/^(?:atualiza|atualizar)/.test(s)};
}
function weather(text){
 const s=norm(strip(text));
 if(/^(?:como esta o tempo|que tempo faz|qual a previsao|qual e a previsao|meteorologia|vai chover|qual a temperatura|tempo para amanha|tempo hoje)/.test(s))
  return{type:'weather',query:strip(text)};
 return null;
}
function parse(text){return (window.NexusMail&&window.NexusMail.parse(text))||contact(text)||reminder(text)||calendar(text)||weather(text)||searchIntent(text)||device(text)}
function splitActions(text){
 const parts=strip(text).split(/\s+(?:e depois|de seguida|e a seguir|depois disso|a seguir)\s+/i).map(x=>x.trim()).filter(Boolean);
 return parts.length>MAX_STEPS?[strip(text)]:parts;
}
function renderQueue(){
 const button=byId('nxNextStep');if(!button)return;
 button.hidden=taskQueue.length===0;
 button.textContent=taskQueue.length?'Continuar ('+taskQueue.length+' tarefa'+(taskQueue.length===1?'':'s')+')':'';
}
function pauseQueue(){paused=true;renderQueue()}
function continueQueue(){
 if(!taskQueue.length){say('Não tenho mais tarefas pendentes.');return}
 paused=false;const action=taskQueue.shift();renderQueue();run(action);
}
function requestFollowup(kind,context,message){
 pending={kind,...context};
 say(message);
}
function finishPendingSms(send){
 pending=null;
 try{Android.confirmSms(Boolean(send))}
 catch(e){say('Não consegui confirmar o SMS com o Android.')}
}
function showSmsConfirm(alias,body){
 if(typeof showWin!=='function')return;
 showWin('Confirmar SMS',panel=>{
  const recipient=document.createElement('p');recipient.textContent='Para: '+alias;
  const msg=document.createElement('p');msg.textContent='Mensagem: '+body;
  const row=document.createElement('div');row.className='row';
  function btn(label,fn){const node=document.createElement('button');node.type='button';node.textContent=label;node.onclick=fn;row.append(node)}
  btn('Enviar SMS',()=>{closeWin();finishPendingSms(true)});
  btn('Abrir Mensagens',()=>{pending=null;closeWin();Android.openPreparedSms()});
  btn('Cancelar',()=>{closeWin();finishPendingSms(false)});
  panel.append(recipient,msg,row);
 });
}
window.nxSmsReady=(alias,body)=>{
 pending={kind:'confirmSms',alias,body};
 showSmsConfirm(alias,body);
 say('SMS preparado para '+alias+'. '+String(body).slice(0,220)+'. Queres enviar? Diz sim, envia, ou não, cancela.');
};
window.nxActionStatus=message=>{
 const txt=String(message||'');
 if(!txt)return;
 if(pending&&pending.kind==='prepareSms'&&/não foi selecionado|n[aã]o consegui abrir os contactos|n[aã]o foi poss[ií]vel preparar|não tem um número/i.test(txt)){
  pending=null;
  pauseQueue();
 }
 // The SMS network callback is informative, not proof of delivery.
 say(txt,/SMS|envi|falha|cancelad|permiss[aã]o|contacto/i.test(txt));
 if(/Abri a aplicação Mensagens|Abri o WhatsApp|A iniciar a chamada/i.test(txt))paused=true;
};
window.nxResearch=(id,json)=>{
 const resolve=requests.get(id);
 if(!resolve)return;
 requests.delete(id);let value={};
 try{value=JSON.parse(json)}catch(e){}
 resolve(value);
};
async function research(query,refresh=false){
 if(!native||!Android.research){say('A pesquisa com fontes precisa da aplicação Android.');return}
 researching=true;lastResearch=query;lastKind='search';
 if(window.nxHUD){window.nxHUD.request(query);window.nxHUD.state('researching','A pesquisar fontes verificáveis');}
 const id='s'+(++sequence);
 const data=new Promise(resolve=>{
  requests.set(id,resolve);
  setTimeout(()=>{if(requests.has(id)){requests.delete(id);resolve({})}},12000);
 });
 if(refresh&&Android.researchFresh)Android.researchFresh(id,query);else Android.research(id,query);
 const found=await data;
 const sources=(Array.isArray(found.sources)?found.sources:[]).filter(s=>s&&/^https:\/\//i.test(s.url)).slice(0,9);
 if(!sources.length){
  researching=false;
  say('Não consegui confirmar informação recente nas fontes públicas. Vou abrir o navegador para pesquisares diretamente.');
  if(Android.openUrl)Android.openUrl('https://www.google.com/search?q='+encodeURIComponent(query));
  pauseQueue();return;
 }
 const evidence=sources.map((s,i)=>(i+1)+'. '+String(s.title||'')+
   '\nFonte: '+s.url+
   (s.published?'\nData de publicação: '+s.published:'')+
   '\nExcerto: '+String(s.snippet||'').slice(0,450)).join('\n\n');
 let response='';
 const prompt='Consulta solicitada: '+query+'\nFontes públicas recolhidas agora:\n'+evidence;
 try{
  response=await callAI([{role:'system',content:SYS+
   ' Usa apenas as fontes fornecidas para eventos e dados atuais. São títulos e excertos, NÃO artigos completos. '+
   'Distingue a data de consulta da data de publicação. Se não houver dados suficientes, assume a limitação. '+
   'Não afirmes notícias ao segundo, tempo real garantido nem acesso a sites privados. '+
   'Em receitas, explica ingredientes e método quando há informação suficiente; se fizeres uma sugestão genérica, identifica-a como tal.'},
   ...history.slice(-6),{role:'user',content:prompt}]);
 }catch(e){response='Encontrei '+sources.length+' fontes sobre '+query+'. Não consegui gerar um resumo agora. Podes consultar as fontes no ecrã.'}
 history.push({role:'user',content:query},{role:'assistant',content:response});
 if(history.length>22)history.splice(0,history.length-22);
 const timestamp=found.checkedAt?new Date(found.checkedAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):'agora';
 showWin('Pesquisa · '+query,panel=>{
  const summary=document.createElement('p');summary.textContent=response;panel.append(summary);
  const when=document.createElement('p');when.textContent='Fontes consultadas às '+timestamp+'. A publicação pode ser anterior.';panel.append(when);
  const r=document.createElement('div');r.className='row';
  for(let i=0;i<sources.length;i++){
    const s=sources[i],link=document.createElement('a');
    link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';
    link.textContent=(i+1)+'. '+String(s.title||'Consultar fonte').slice(0,85);
    r.append(link);
  }
  panel.append(r);
  const update=document.createElement('button');update.type='button';update.textContent='Atualizar pesquisa';
  update.onclick=()=>research(query,true);panel.append(update);
 });
 researching=false;
 say(response);
}
async function weatherNow(text){
 researching=true;
 try{
  const result=await getWeather(text);
  const report=weatherCtx(result);
  weatherWin(result,report);
  researching=false;say(report);
 }catch(e){researching=false;say('Não consegui obter a meteorologia atualizada. Confirma a ligação à Internet.')}
}
function run(action){
 if(!action)return false;
 lastKind=action.type;
 if(action.type==='email'||action.type==='social'){
  return window.NexusMail?window.NexusMail.handle(action.phrase||action.query||'verifica emails'):false;
 }
 if(action.type==='call'){
  pauseQueue();if(window.nxHUD)window.nxHUD.request('Ligar para '+action.who);
  Android.contactAction('call',action.who,'');return true;
 }
 if(action.type==='message'){
  pauseQueue();
  if(!action.body){requestFollowup('dictate',{who:action.who,channel:action.channel},
    'Qual é a mensagem para '+action.who+'? Podes ditar o texto agora.');return true}
  if(window.nxHUD)window.nxHUD.request('Mensagem para '+action.who);
  if(action.channel==='whatsapp'){
   Android.contactAction('whatsapp',action.who,action.body);
   say('Preparei uma mensagem no WhatsApp para '+action.who+'. Confirma na aplicação.',false);
  }else{
   pending={kind:'prepareSms',who:action.who};
   Android.contactAction('sms_voice',action.who,action.body);
   say('A preparar SMS para '+action.who+'.',false);
  }
  return true;
 }
 if(action.type==='reminder'){
  if(!action.at){requestFollowup('reminderTime',{title:action.title},
    'Quando queres que te lembre de '+action.title+'? Por exemplo amanhã às nove.');return true}
  const result=Android.createReminder(action.title,action.at);say(result);return true;
 }
 if(action.type==='calendar'){
  if(!action.at){requestFollowup('calendarTime',{title:action.title},
    'A que dia e hora queres agendar '+action.title+'?');return true}
  pauseQueue();Android.addCalendarEvent(action.title,action.at,60);
  say('Abri o calendário com o compromisso. Confirma a gravação no ecrã.',false);return true;
 }
 if(action.type==='list'){say(Android.listReminders());return true}
 if(action.type==='device'){
  const result=typeof phoneCmd==='function'?phoneCmd(action.phrase):null;
  if(!result){say('Não consegui executar esse comando neste telemóvel.');return true}
  if(action.external)pauseQueue();
  say(result);return true;
 }
 if(action.type==='weather'){weatherNow(action.query);return true}
 if(action.type==='search'){research(action.query,action.refresh);return true}
 return false;
}
function handle(value){
 if(!native)return false;
 const text=strip(value);
 const n=norm(text);
 if(!text)return false;
 if(pending){
  const p=pending;
  if(p.kind==='confirmSms'){
    if(isYes(text)){closeWin();finishPendingSms(true);say('Confirmação recebida. A solicitar o envio ao Android.');return true}
    if(isNo(text)){closeWin();finishPendingSms(false);say('Não enviei o SMS.');return true}
    if(isEdit(text)){pending=null;closeWin();requestFollowup('dictate',{who:p.alias,channel:'sms'},'Diz novamente a mensagem para '+p.alias+'.');return true}
    if(/^(?:abre|abrir|mostra)(?: as)? mensagens$/.test(n)){
      pending=null;closeWin();Android.openPreparedSms();return true
    }
    say('Preciso de confirmação. Diz sim, envia, ou não, cancela.');return true;
  }
  if(p.kind==='prepareSms'){
    if(isNo(text)){pending=null;Android.confirmSms(false);say('Pedido de SMS cancelado.');return true}
    say('Estou a localizar o contacto. Se o Android pedir, seleciona a pessoa nos contactos.');return true;
  }
  if(p.kind==='dictate'){
    if(isNo(text)){pending=null;say('Mensagem cancelada.');return true;}
    pending=null;
    return run({type:'message',who:p.who,body:text,channel:p.channel});
  }
  if(p.kind==='reminderTime'||p.kind==='calendarTime'){
    if(isNo(text)){pending=null;say('Agendamento cancelado.');return true}
    const at=when(text);
    if(!at){say('Não percebi a data. Diz, por exemplo, amanhã às dez, ou daqui a quinze minutos.');return true}
    pending=null;
    return run({type:p.kind==='calendarTime'?'calendar':'reminder',title:p.title,at});
  }
 }
 if(/^(?:cancela|cancelar|parar|p[aá]ra tudo|esquece tudo|cancela tudo)$/.test(n)){
  pending=null;taskQueue=[];paused=false;renderQueue();say('Parei a sequência e cancelei as tarefas pendentes.');return true;
 }
 if(/^(?:continua|continuar|pr[oó]xima|proxima tarefa|seguinte|avan[çc]a|avan[çc]ar)$/.test(n)){
  continueQueue();return true;
 }
 if(/^(?:atualiza|atualizar|refresh|pesquisa outra vez|pesquisa novamente|quero dados novos)$/.test(n)){
  if(lastResearch)research(lastResearch,true);
  else say('Diz o tema que queres pesquisar primeiro.');
  return true;
 }
 if(window.NexusMail&&window.NexusMail.handle(text))return true;
 const parts=splitActions(text);
 const all=parts.map(parse);
 if(!all[0])return false;
 if(parts.length>1){
  if(all.every(Boolean)){taskQueue=all.slice(1);renderQueue();paused=false}
  else{taskQueue=[];renderQueue();say('Percebi o primeiro pedido, mas não consegui interpretar todos os passos. Vou executar apenas o primeiro.')}
 }
 return run(all[0]);
}
function onSpeechDone(){
 if(pending)return false;
 if(researching||paused||!taskQueue.length)return false;
 const next=taskQueue.shift();
 renderQueue();
 setTimeout(()=>run(next),250);
 return true;
}
function needsAnswer(){return !!pending&&pending.kind!=='prepareSms'}
function addSettings(panel){
 if(!native||!Android.availableVoices)return;
 const intro=document.createElement('p');intro.textContent='Voz portuguesa. Para maior naturalidade, instala vozes de alta qualidade no motor TTS do Android.';
 const chooser=document.createElement('select');chooser.style.cssText='width:100%;padding:10px;color:white;background:#172640;';
 let voices=[];
 try{voices=JSON.parse(Android.availableVoices()||'[]')}catch(e){}
 voices.sort((a,b)=>(a.language==='pt-PT'?0:1)-(b.language==='pt-PT'?0:1)||(b.quality-a.quality));
 for(const v of voices){const o=document.createElement('option');o.value=v.name;o.textContent=v.language+' · '+v.name+(v.network?' (online)':'');chooser.append(o)}
 const choose=document.createElement('button');choose.type='button';choose.textContent='Escolher voz';
 choose.onclick=()=>{if(chooser.value)Android.chooseVoice(chooser.value)};
 let profile={rate:.94,pitch:.98};
 try{profile=JSON.parse(Android.currentVoiceProfile()||'{}')}catch(e){}
 function adjust(label,value,min,max,step){
  const row=document.createElement('label');row.textContent=label+' ';
  const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;
  input.style.width='100%';row.append(input);panel.append(row);return input;
 }
 panel.append(intro,chooser,choose);
 if(!voices.length){const msg=document.createElement('p');msg.textContent='Não foram encontradas vozes portuguesas. Confirma as definições TTS do Android.';panel.append(msg)}
 const rate=adjust('Velocidade',profile.rate||.94,.72,1.28,.02);
 const pitch=adjust('Entoação',profile.pitch||.98,.75,1.25,.02);
 const save=document.createElement('button');save.type='button';save.textContent='Aplicar voz';
 save.onclick=()=>Android.setVoiceProfile(Number(rate.value),Number(pitch.value));
 const demo=document.createElement('button');demo.type='button';demo.textContent='Ouvir demonstração';
 demo.onclick=()=>say('Olá. Estou pronta para ajudar. Posso fazer chamadas, preparar mensagens, guardar lembretes e pesquisar notícias e receitas.');
 panel.append(save,demo);
}
window.JarvisOperator={handle,when,parse,contact,addSettings,needsAnswer,onSpeechDone,continue:continueQueue,
 getDebugState:()=>({pending:pending?pending.kind:null,queued:taskQueue.length,lastResearch})};
function init(){
 const bar=byId('quickActions');if(!bar)return;
 const next=document.createElement('button');next.type='button';next.id='nxNextStep';next.hidden=true;
 next.onclick=continueQueue;bar.append(next);
 const sms=document.createElement('button');sms.type='button';sms.textContent='✉ SMS';
 sms.onclick=()=>{
  showWin('SMS por voz',panel=>{
   const entry=document.createElement('input');entry.type='text';entry.placeholder='Nome do contacto, por exemplo Amor';
   const ok=document.createElement('button');ok.type='button';ok.textContent='Ditar';
   ok.onclick=()=>{if(entry.value.trim()){closeWin();run({type:'message',who:contactAlias(entry.value),body:'',channel:'sms'})}};
   panel.append(entry,ok);
  });
 };bar.append(sms);
 const reminders=document.createElement('button');reminders.type='button';reminders.textContent='◷ Lembretes';
 reminders.onclick=()=>showMessage('Os teus lembretes',Android.listReminders());
 bar.append(reminders);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
