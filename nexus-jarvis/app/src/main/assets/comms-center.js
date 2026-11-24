/* NEXUS JARVIS Communications Center.
 * Gmail: on-device OAuth, up to 3 user-authorized Gmail accounts.
 * Social: count ACTIVE Android notifications only, never capture message contents.
 * No third-party model gets email contents or Google access tokens.
 */
(()=>{
'use strict';
const native=!!window.Android;
const $=id=>document.getElementById(id);
const lower=s=>String(s||'').toLocaleLowerCase('pt-PT').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const accounts=()=>{try{return JSON.parse(Android.gmailAccounts()||'[]')}catch(e){return []}};
let inbox=new Map(),spam=new Map(),all=[],last=null,folder="inbox",currentDialog=null;
let autoBills=false,confirmTrash=null;
function speakLocal(text){
 if($('cap'))$('cap').textContent=text;
 if(window.nxHUD)window.nxHUD.answer(text);
 if(typeof speak==='function')speak(text);
}
function message(text){if($('cap'))$('cap').textContent=text;if(window.nxHUD)window.nxHUD.answer(text)}
function safe(s){return String(s||'').trim()}
function node(tag,text,css){
 const n=document.createElement(tag);if(text!=null)n.textContent=text;
 if(css)n.className=css;return n;
}
function button(text,callback){
 const b=node('button',text);b.type='button';b.onclick=callback;return b;
}
function open(){
 if(!native){message('O acesso a emails e notificações está disponível na aplicação Android.');return}
 showWin('Central de Email · NEXUS',panel=>draw(panel));
}
function draw(panel){
 panel.textContent='';
 const heading=node('p','Liga até três contas Google. Os emails são lidos localmente e não são enviados ao fornecedor de IA.');
 panel.append(heading);
 const row=node('div',null,'row');
 const list=accounts();
 list.forEach(info=>{
   const name=info.email||'Ligar Gmail '+(info.slot+1);
   row.append(button(name,()=>{Android.gmailConnect(info.slot);message('A abrir autorização para a conta '+(info.slot+1)+'.')}));
 });
 panel.append(row);
 const options=node('div',null,'row');
 options.append(button('Ler 3 contas',()=>{Android.gmailScanAll();message('A consultar as contas autorizadas…')}));
 options.append(button('Ver resumo',()=>renderSummary()));
 options.append(button('Ler spam (conta 1)',()=>{Android.gmailScanSpam(0);message('A verificar a pasta de spam da primeira conta.')})); 
 panel.append(options);
 const label=node('label','Agendar lembretes de possíveis faturas com data de vencimento clara. Nunca efetuar pagamentos.');
 const check=node('input');check.type='checkbox';check.checked=!!Android.gmailAutoBills();
 check.onchange=()=>{autoBills=check.checked;Android.gmailAutoBillsSet(check.checked)};
 label.prepend(check);panel.append(label);
 panel.append(node('p','Importante: o acesso Gmail depende de autorização OAuth da Google, configurada para este APK. Mensagens no Lixo só são movidas depois de aprovação.'));
 const detach=node('div',null,'row');
 list.filter(x=>x.email).forEach(x=>detach.append(button('Desligar '+(x.slot+1),()=>{
  if(confirm('Desligar '+x.email+' do NEXUS neste telemóvel?')){
   Android.gmailRemoveAccount(x.slot);open();
  }
 })));
 panel.append(detach);
 const summary=node('div');summary.id='nxEmailSummary';panel.append(summary);fillSummary(summary);
}
function categoryLabel(c){
 return c==='fatura'?'Possível fatura':c==='importante'?'Importante':c==='promocao'?'Promoção':c==='spam'?'Spam':'Outro';
}
function sortEmails(a,b){
 const rank={fatura:0,importante:1,normal:2,promocao:3,spam:4};
 return (rank[a.category]??5)-(rank[b.category]??5)||
      Number(b.unread)-Number(a.unread);
}
function rebuild(){
 all=[];
 for(const [slot,items] of inbox.entries())
  for(const m of items)all.push({...m,slot});
 all.sort(sortEmails);
}
function summarize(voice=false){
 rebuild();
 const bill=all.filter(x=>x.category==='fatura');
 const important=all.filter(x=>x.category==='importante');
 const promo=all.filter(x=>x.category==='promocao');
 const unread=all.filter(x=>x.unread);
 const text='Analisei '+all.length+' emails recentes das contas autorizadas. '+
 (bill.length?bill.length+' possíveis faturas. ':'')+
 (important.length?important.length+' importantes. ':'')+
 promo.length+' promoções e '+unread.length+' por ler. '+
 (bill.length?'Possíveis faturas de '+bill.slice(0,4).map(x=>x.from||'remetente não indicado').join(', ')+'. ':'')+
 (important.length?'Mensagens importantes de '+important.slice(0,4).map(x=>x.from||'remetente desconhecido').join(', ')+'.':'');
 if(voice)speakLocal(text);return text;
}
function renderSummary(){
 if(!all.length){open();return}
 showWin('Emails recebidos · NEXUS',panel=>fillSummary(panel));
 speakLocal(summarize());
}
function fillSummary(panel){
 rebuild();
 if(!all.length){panel.append(node('p','Ainda não há mensagens carregadas. Escolhe «Ler 3 contas».'));return}
 panel.append(node('p',summarize(false)));
 for(let i=0;i<all.length&&i<32;i++){
  const x=all[i],wrapper=node('section');wrapper.style.cssText='border:1px solid #25567a;border-radius:12px;padding:10px;margin:8px 0;';
  const h=node('p',(i+1)+'. '+categoryLabel(x.category)+' · '+(x.subject||'Sem assunto'));h.style.fontWeight='700';wrapper.append(h);
  wrapper.append(node('p','De: '+(x.from||'Remetente desconhecido')));
  wrapper.append(node('p',x.email||''));
  if(x.dueAt)wrapper.append(node('p','Possível vencimento: '+new Date(x.dueAt).toLocaleDateString('pt-PT')+' · Confirma sempre os dados na fatura'));
  const actions=node('div',null,'row');
  actions.append(button('Ler',()=>{last=x;Android.gmailRead(x.slot,x.id);message('A ler o email '+(i+1)+'.')}));
  actions.append(button('Mover para Lixo',()=>askTrash(x)));
  wrapper.append(actions);panel.append(wrapper);
 }
}
function askTrash(x){
 confirmTrash=x;
 showWin('Confirmar limpeza de email',panel=>{
  panel.append(node('p','Mover este email para o Lixo do Gmail?'));
  panel.append(node('p',(x.subject||'Sem assunto')+' — '+(x.from||'Remetente desconhecido')));
  panel.append(node('p','A classificação pode falhar. O email será apenas movido para o Lixo, não apagado definitivamente.'));
  const actions=node('div',null,'row');
  actions.append(button('Confirmar Lixo',()=>{Android.gmailTrash(x.slot,x.id);confirmTrash=null;message('A pedir autorização Google para mover para o Lixo.')})); 
  actions.append(button('Cancelar',()=>{confirmTrash=null;renderSummary()}));
  panel.append(actions);
 });
}
function showOne(x){
 const text=safe(x.body)||safe(x.snippet)||'Sem texto disponível.';
 last=x;
 showWin('Email · '+(x.subject||'Sem assunto'),panel=>{
  panel.append(node('p','Conta: '+x.email));
  panel.append(node('p','De: '+x.from));
  const p=node('p',text);p.style.whiteSpace='pre-wrap';panel.append(p);
  panel.append(button('Mover para Lixo',()=>askTrash(x)));
 });
 const speakText='Email de '+(x.from||'remetente não identificado')+'. Assunto: '+(x.subject||'sem assunto')+'. '+text.slice(0,650);
 speakLocal(speakText);
}
window.nxMailEvent=(type,data)=>{
 const d=data||{};
 if(type==='linked'||type==='accounts'){
  message(d.note||'Conta ligada.');open();return;
 }
 if(type==='inbox'){
  inbox.set(d.slot,Array.isArray(d.messages)?d.messages:[]);
  rebuild();message(d.note||'Emails consultados.');return;
 }
 if(type==='spam'){
  spam.set(d.slot,Array.isArray(d.messages)?d.messages:[]);
  const list=spam.get(d.slot);
  if(!list.length){speakLocal('Não encontrei spam recente nesta conta.');return}
  showWin('Spam · rever antes de limpar',panel=>{
   panel.append(node('p','Mensagens marcadas como spam pelo Gmail. Nenhuma será apagada automaticamente.'));
   list.forEach((x,i)=>{
    const group=node('div');group.style.cssText='padding:10px;border-bottom:1px solid #2c5777;';
    group.append(node('p',(i+1)+'. '+x.subject+' · '+x.from));
    group.append(button('Rever e mover para Lixo',()=>askTrash(x)));panel.append(group);
   });
  });
  speakLocal('Encontrei '+list.length+' mensagens na pasta de spam. Estão prontas para revisão.');return;
 }
 if(type==='message'){showOne(d);return}
 if(type==='trashed'){
  const x=d.id,slot=d.slot;
  if(inbox.has(slot))inbox.set(slot,inbox.get(slot).filter(m=>m.id!==x));
  if(spam.has(slot))spam.set(slot,spam.get(slot).filter(m=>m.id!==x));
  rebuild();speakLocal('Email movido para o Lixo do Gmail.');return;
 }
 if(type==='complete'){
  rebuild();renderSummary();return;
 }
 if(type==='billScheduled'){message(d.note||'Lembrete de possível fatura criado.');return}
 if(type==='error'){message(d.note||'Não consegui ler o Gmail.');return}
 if(type==='status'){message(d.note||'Operação Gmail atualizada.')}
};
function showSocial(){
 if(!native)return;
 let data={};
 try{data=JSON.parse(Android.socialNotifications()||'{}')}catch(e){}
 if(!data.enabled){
  saySocial('Para verificar as redes sociais, autoriza a leitura das notificações do Android. Não vou ler as mensagens.');
  Android.enableSocialNotifications();return;
 }
 if(data.total==null){saySocial(data.message||'O acesso às notificações ainda está a iniciar.');return}
 saySocial(data.total?('Sim, tens '+data.total+' notificações ativas de redes sociais no Android. Não vou ler o conteúdo.'):
  'Neste momento não tens notificações ativas de redes sociais no Android.');
}
function saySocial(t){speakLocal(t)}
function parse(text){
 const n=lower(text).replace(/[?!.,;:]/g,' ').replace(/\s+/g,' ').trim();
 if(/(?:tenho|verifica|consulta|mostra|ha|existe|conta|notificacoes).*(?:notificac|redes sociais|facebook|instagram|tiktok|whatsapp)/.test(n)||
    /^(?:notificacoes|redes sociais)$/.test(n))return {type:'social'};
 if(/^(?:ler|le|le me|consulta|consultar|verifica|mostra|mostrar|resumo|resumir|quais sao|tenho|abre|abrir|emails|email|e mails|correio)/.test(n)
     &&/\b(?:email|emails|e mails|correio|caixa de entrada|faturas? para pagar|mensagens importantes|spam)\b/.test(n))
    return {type:'email'};
 if(/^(?:faturas? para pagar|emails importantes|correio importante|limpa spam|limpar spam|apagar spam)$/.test(n))return {type:'email'};
 return null;
}
function handle(text){
 if(!native)return false;
 const n=lower(text).replace(/[?!.,;:]/g,' ').replace(/\s+/g,' ').trim();
 if(confirmTrash){
  if(/^(?:sim|confirmo|confirma|mover para lixo)$/.test(n)){
   const x=confirmTrash;confirmTrash=null;Android.gmailTrash(x.slot,x.id);message('A mover o email para o Lixo.');return true;
  }
  if(/^(?:nao|cancela|cancelar)$/.test(n)){confirmTrash=null;speakLocal('Não apaguei o email.');return true}
 }
 const op=parse(text);if(!op)return false;
 if(op.type==='social'){showSocial();return true}
 if(/spam/.test(n)){
  const list=accounts().filter(a=>a.email);
  if(!list.length){speakLocal('Liga primeiro pelo menos uma conta Gmail.');open();return true}
  Android.gmailScanSpam(list[0].slot);message('A consultar o spam.');return true;
 }
 if(/(?:email|correio|fatura|importantes)/.test(n)){
  Android.gmailScanAll();message('A consultar emails das contas autorizadas.');return true;
 }
 open();return true;
}
function init(){
 const nav=$('quickActions');
 if(!nav)return;
 nav.append(button('✉ Email',open));
 nav.append(button('◉ Redes',showSocial));
}
window.NexusMail={parse,handle,open,showSocial,summary:()=>summarize(true)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
