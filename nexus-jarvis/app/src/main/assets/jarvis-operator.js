/* Local-first multimodal command router. External messages remain user-confirmed. */
(()=>{
'use strict';
const native=!!window.Android;
const $=id=>document.getElementById(id);
const normalize=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[?!.,;:\-]+/g,' ').replace(/\s+/g,' ').trim();
const wake=x=>String(x||'').trim().replace(/^(?:ola\s+|hey\s+|ei\s+)?(?:nexus|nexos|jarvis)[,!: ]*/i,'').trim();
let pending=null,queue=[],sid=0;
const searches=new Map();
function feedback(t,voice=true){
 if($('cap'))$('cap').textContent=t;
 if(window.nxHUD)window.nxHUD.answer(t);
 if(voice&&typeof speak==='function')speak(t);
}
window.nxActionStatus=t=>feedback(String(t||''),false);
window.nxResearch=(id,raw)=>{let o={};try{o=JSON.parse(raw)}catch(e){}const p=searches.get(id);if(p){searches.delete(id);p(o)}};
function contact(txt){
 const raw=normalize(wake(txt));
 const message=raw.match(/^(?:envia|enviar|manda|mandar|escreve|prepara|redige)\s+(?:uma\s+)?(?:(?:mensagem|recado)\s+(?:no|pelo|por)\s+)?(?:mensagem\s+)?(?:(whatsapp|sms)\s+)?(?:para\s+|ao\s+|a\s+)?(.+)$/);
 if(message){
  let target=message[2],body='';
  const part=target.match(/\s+(?:a dizer(?: que)?|que diga|com o texto|com a mensagem|dizendo)\s+/);
  if(part){body=target.slice(part.index+part[0].length);target=target.slice(0,part.index)}
  target=target.replace(/^(?:ao|a|o|minha|meu|para)\s+/,'').trim();
  if(!target)return null;
  return {type:'message',who:target,body,channel:message[1]==='whatsapp'||/\bwhatsapp\b/.test(raw)?'whatsapp':'sms'};
 }
 const call=raw.match(/^(?:liga|ligar|telefona|telefonar|faz uma chamada|quero ligar|preciso de ligar)\s+(?:para\s+|ao\s+|a\s+|o\s+)?(.+)$/);
 if(call){
  const who=call[1].replace(/^(?:para|ao|a|o|minha|meu)\s+/,'').trim();
  if(!who||/^(lanterna|wifi|wi fi|bluetooth|volume|luz|som|dados|musica|alarme|despertador)\b/.test(who))return null;
  return {type:'call',who};
 }
 return null;
}
function when(text,now=new Date()){
 const n=normalize(text),relative=n.match(/daqui a\s+(\d+)\s*(minutos?|horas?|dias?)/);
 if(relative){const i=+relative[1],unit=relative[2].startsWith('minuto')?60000:relative[2].startsWith('hora')?3600000:86400000;return i>0&&i<10000?now.getTime()+i*unit:null}
 const digits={zero:0,uma:1,um:1,duas:2,dois:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,catorze:14,quatorze:14,quinze:15,dezasseis:16,dezassete:17,dezoito:18,dezanove:19,vinte:20};
 const m=n.match(/\b(?:as|pelas|para as)\s+(\d{1,2}|uma|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezasseis|dezoito|vinte)(?:\s*(?:h|horas|:|e)\s*(\d{1,2}|meia|quinze|trinta))?(?:\s+(?:da|de)\s+(manha|tarde|noite))?/);
 if(!m)return null;
 let hour=/^\d+$/.test(m[1])?+m[1]:digits[m[1]],minute=!m[2]?0:m[2]==='meia'||m[2]==='trinta'?30:m[2]==='quinze'?15:+m[2];
 if((m[3]==='tarde'||m[3]==='noite')&&hour<12)hour+=12;
 if(hour>23||minute>59)return null;
 const d=new Date(now);
 if(n.includes('depois de amanha'))d.setDate(d.getDate()+2);
 else if(n.includes('amanha'))d.setDate(d.getDate()+1);
 d.setHours(hour,minute,0,0);
 if(!n.includes('amanha')&&d.getTime()<=now.getTime()+1000)d.setDate(d.getDate()+1);
 return d.getTime();
}
function reminder(text){
 const n=normalize(wake(text));
 if(/^(?:mostra|lista|quais sao|diz)\s+(?:os\s+)?(?:meus\s+)?lembretes/.test(n))return{type:'list'};
 if(!/^(?:lembra me|lembrete|avisa me|recorda me|cria um lembrete|criar lembrete|agenda um lembrete|quero um lembrete)/.test(n))return null;
 let title=wake(text).replace(/^(?:lembra[\s-]*me|lembrete|avisa[\s-]*me|recorda[\s-]*me|cria um lembrete|criar lembrete|agenda um lembrete|quero um lembrete)\s*/i,'')
 .replace(/\b(?:depois de amanh[aã]|amanh[aã]|hoje)\b/gi,'')
 .replace(/daqui a\s+\d+\s+(?:minutos?|horas?|dias?)/gi,'')
 .replace(/\b(?:[àa]s|pelas|para as)\s+(?:\d{1,2}|uma|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quinze|vinte)(?:\s*(?:h|horas|:|e)\s*(?:\d{1,2}|meia))?(?:\s+(?:da|de)\s+(?:manh[aã]|tarde|noite))?/gi,'')
 .replace(/^\s*(?:de|para|que)\s+/i,'').replace(/\s+/g,' ').trim()||'Compromisso pessoal';
 return{type:'reminder',title,at:when(text)};
}
function searchIntent(t){
 const n=normalize(wake(t));
 if(!/^(pesquisa|pesquisar|procura|procurar|investiga|investigar|faz uma pesquisa|ultimas noticias|noticias de hoje|noticias hoje)/.test(n))return null;
 const term=wake(t).replace(/^(?:pesquisa|pesquisar|procura|procurar|investiga|investigar|faz uma pesquisa)\s*/i,'')
 .replace(/^(?:na net|na internet|no google|sobre|acerca de)\s+/i,'').trim();
 return {type:'search',query:term.length>=2?term:'notícias de hoje em Portugal'};
}
function parse(text){return contact(text)||reminder(text)||searchIntent(text)}
async function research(query){
 if(!native||!Android.research)return false;
 if(window.nxHUD){window.nxHUD.request(query);window.nxHUD.state('researching','')}
 const id='r'+(++sid);
 const response=new Promise(resolve=>{
  searches.set(id,resolve);
  setTimeout(()=>{if(searches.has(id)){searches.delete(id);resolve({})}},9000);
 });
 Android.research(id,query);
 const out=await response;
 const sources=(Array.isArray(out.sources)?out.sources:[]).filter(s=>s&&/^https:\/\//i.test(s.url)).slice(0,8);
 if(!sources.length){
  feedback('Não consegui verificar fontes públicas. Vou abrir o Google para veres os resultados.');
  Android.openUrl('https://www.google.com/search?q='+encodeURIComponent(query));return true;
 }
 const evidence=sources.map((s,i)=>(i+1)+'. '+s.title+' — '+s.url+'\n'+String(s.snippet||'').slice(0,300)).join('\n');
 let answer;
 try{
  answer=await callAI([{role:'system',content:SYS+' Os dados abaixo são apenas títulos e excertos. Não inventes notícias, fontes ou factos não comprovados. Indica incerteza quando necessário.'},...history.slice(-6),{role:'user',content:'Pesquisa: '+query+'\nFontes públicas recolhidas:\n'+evidence}]);
 }catch(e){answer='Encontrei '+sources.length+' fontes para '+query+'. Consulta os resultados no ecrã.';}
 history.push({role:'user',content:query},{role:'assistant',content:answer});
 showWin('Pesquisa · '+query,b=>{
  b.append(el('p',answer));const group=document.createElement('div');group.className='row';
  sources.forEach((s,i)=>{const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(i+1)+'. '+String(s.title).slice(0,80);group.append(a)});
  b.append(group);
 });
 feedback(answer);return true;
}
function renderQueue(){
 const b=$('nxNextStep');if(!b)return;
 b.hidden=queue.length===0;b.textContent=queue.length?'Continuar sequência ('+queue.length+')':'';
}
function run(action){
 if(action.type==='call'){Android.contactAction('call',action.who,'');if(window.nxHUD)window.nxHUD.request('Ligar para '+action.who);return true}
 if(action.type==='message'){
  if(!action.body){
    pending={type:'dictate',who:action.who,channel:action.channel};
    feedback('Que mensagem queres escrever para '+action.who+'?');
    if(typeof hands!=='undefined'&&!hands){hands=true;syncHands();}
  }else{
    Android.contactAction(action.channel,action.who,action.body);
    feedback('Mensagem preparada para '+action.who+'. Confirma no ecrã antes do envio.',false);
  }
  return true;
 }
 if(action.type==='reminder'){
  if(!action.at){
    pending={type:'time',title:action.title};
    feedback('Para quando queres o lembrete «'+action.title+'»? Diz, por exemplo, amanhã às nove.');
    if(typeof hands!=='undefined'&&!hands){hands=true;syncHands();}
  }else feedback(Android.createReminder(action.title,action.at));
  return true;
 }
 if(action.type==='list'){feedback(Android.listReminders());return true}
 if(action.type==='search'){research(action.query);return true}
 return false;
}
function handle(text){
 if(!native)return false;
 const u=wake(text).trim();
 if(pending){
  if(/^(cancela|cancelar|esquece|nao|não|para)$/.test(normalize(u))){pending=null;feedback('Pedido cancelado.');return true}
  const p=pending;pending=null;
  if(p.type==='dictate'){
    Android.contactAction(p.channel,p.who,u);
    feedback('Preparei a mensagem para '+p.who+'. Confirma o envio no ecrã.',false);return true;
  }
  if(p.type==='time'){
    const at=when(u);
    if(!at){pending=p;feedback('Não consegui identificar a hora. Por exemplo: amanhã às dez.');return true}
    feedback(Android.createReminder(p.title,at));return true;
  }
 }
 const parts=u.split(/\s+(?:e depois|e a seguir|depois disso|a seguir)\s+/i).filter(Boolean);
 const one=parse(parts[0]);if(!one)return false;
 if(parts.length>1&&parts.length<=4){
  const extras=parts.slice(1).map(parse);
  if(extras.every(Boolean)){queue=extras;renderQueue()}
 }
 return run(one);
}
function addSettings(b){
 if(!native||!Android.availableVoices)return;
 const txt=document.createElement('p');txt.textContent='Voz portuguesa: escolhe um motor de voz de qualidade superior, se estiver instalado.';
 const select=document.createElement('select');select.style.cssText='width:100%;padding:10px;color:white;background:#15223c;';
 let voices=[];try{voices=JSON.parse(Android.availableVoices()||'[]')}catch(e){}
 voices.sort((a,b)=>(a.language==='pt-PT'?0:1)-(b.language==='pt-PT'?0:1)||b.quality-a.quality);
 voices.forEach(v=>{const o=document.createElement('option');o.value=v.name;o.textContent=v.language+' · '+v.name+(v.network?' (online)':'');select.append(o)});
 const choose=document.createElement('button');choose.type='button';choose.textContent='Usar esta voz';
 choose.onclick=()=>{if(select.value)Android.chooseVoice(select.value)};
 b.append(txt,select,choose);
}
window.JarvisOperator={handle,when,parse,addSettings,continue(){const next=queue.shift();renderQueue();if(next)run(next)}};
function init(){
 const bar=$('quickActions');if(!bar)return;
 const next=document.createElement('button');next.id='nxNextStep';next.type='button';next.hidden=true;next.onclick=()=>window.JarvisOperator.continue();bar.append(next);
 const wa=document.createElement('button');wa.type='button';wa.textContent='✉ SMS';
 wa.onclick=()=>{
  showWin('SMS por voz',b=>{
    const i=document.createElement('input');i.type='text';i.placeholder='Nome do contacto, por exemplo Amor';
    const send=document.createElement('button');send.type='button';send.textContent='Ditar mensagem';
    send.onclick=()=>{const who=i.value.trim();if(!who)return;closeWin();run({type:'message',who,channel:'sms',body:''})};
    b.append(i,send);
  });
 };bar.append(wa);
 const r=document.createElement('button');r.type='button';r.textContent='◷ Lembretes';
 r.onclick=()=>showWin('Lembretes',b=>b.append(el('p',Android.listReminders())));
 bar.append(r);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
