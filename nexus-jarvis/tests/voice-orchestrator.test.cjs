'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('nexus-jarvis/app/src/main/assets/jarvis-operator.js','utf8');
const html=fs.readFileSync('nexus-jarvis/app/src/main/assets/index.html','utf8');
function makeHarness(){
 const calls=[];
 const Android={
  contactAction(...args){calls.push(['contact',...args])},
  confirmSms(v){calls.push(['confirmSms',v])},
  openPreparedSms(){calls.push(['openPreparedSms'])},
  createReminder(title,at){calls.push(['reminder',title,at]);return 'Lembrete guardado.'},
  addCalendarEvent(...args){calls.push(['calendar',...args])},
  listReminders(){calls.push(['listReminders']);return 'Lembrete para amanhã.'},
  research(id,query){calls.push(['research',id,query])},
  researchFresh(id,query){calls.push(['researchFresh',id,query])},
  openUrl(url){calls.push(['url',url])}
 };
 const w={Android},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 vm.runInNewContext(script,{window:w,Android,document,Date,Intl,URL,console,
    setTimeout:()=>0,clearTimeout:()=>{},encodeURIComponent,closeWin:()=>{}},{timeout:1700});
 return{operator:w.JarvisOperator,w,calls,Android};
}
test('SMS normal chooses SMS and returns exact spoken message',()=>{
 const a=makeHarness().operator.parse('NEXUS, manda uma mensagem à Amor a dizer que estou a chegar a casa');
 assert.equal(a.type,'message');assert.equal(a.channel,'sms');assert.equal(a.who,'amor');
 assert.match(a.body,/estou a chegar a casa/);
});
test('WhatsApp is opt-in by explicit command',()=>{
 const a=makeHarness().operator.parse('Envia uma mensagem pelo WhatsApp para Amor a dizer olá');
 assert.equal(a.type,'message');assert.equal(a.channel,'whatsapp');
});
test('wife synonym uses already associated Amor alias',()=>{
 const a=makeHarness().operator.parse('Liga para a minha esposa');
 assert.equal(a.type,'call');assert.equal(a.who,'amor');
});
test('SMS is only sent after second voice confirmation',()=>{
 const s=makeHarness();
 assert.equal(s.operator.handle('Manda SMS para Amor a dizer chego às oito'),true);
 assert.deepEqual(JSON.parse(JSON.stringify(s.calls)),[['contact','sms_voice','amor','chego às oito']]);
 assert.equal(s.calls.some(x=>x[0]==='confirmSms'),false);
 s.w.nxSmsReady('amor','chego as oito');
 assert.equal(s.operator.needsAnswer(),true);
 assert.equal(s.operator.handle('Sim, envia'),true);
 assert.equal(s.calls.filter(x=>x[0]==='confirmSms').length,1);
 assert.equal(s.calls.find(x=>x[0]==='confirmSms')[1],true);
});
test('SMS retains accents and punctuation from voice text',()=>{
 const draft=makeHarness().operator.parse('Manda mensagem para Amor a dizer Olá, já cheguei à escola!');
 assert.equal(draft.type,'message');
 assert.equal(draft.body,'Olá, já cheguei à escola!');
});
test('reminder in words sets relative minutes',()=>{
 const at=makeHarness().operator.when('daqui a quinze minutos');
 const minutes=(at-Date.now())/60000;
 assert.ok(minutes>14.9&&minutes<15.1);
});
test('SMS no cancels safely',()=>{
 const s=makeHarness();s.w.nxSmsReady('amor','olá');
 assert.equal(s.operator.handle('Não, cancela'),true);
 assert.equal(s.calls.find(x=>x[0]==='confirmSms')[1],false);
});
test('dictation as follow-up keeps SMS destination',()=>{
 const s=makeHarness();
 s.operator.handle('Envia uma mensagem a Amor');
 assert.equal(s.operator.needsAnswer(),true);
 s.operator.handle('Estou a caminho e chego às oito.');
 assert.ok(s.calls.some(x=>x[0]==='contact'&&x[1]==='sms_voice'&&x[2]==='amor'&&/caminho/.test(x[3])));
});
test('news and refresh intent',()=>{
 const s=makeHarness();
 const a=s.operator.parse('Notícias ao segundo');
 assert.equal(a.type,'search');
 assert.match(a.query,/notícias de hoje/);
 const b=s.operator.parse('Atualiza as notícias');
 assert.equal(b.type,'search');
 assert.equal(b.refresh,true);
});
test('recipes are researched instead of being treated as commands',()=>{
 const s=makeHarness();
 assert.equal(s.operator.parse('Como fazer bacalhau à brás').type,'search');
 assert.equal(s.operator.parse('Dá-me uma receita de sopa').type,'search');
});
test('reminder with hour in Portuguese',()=>{
 const x=makeHarness().operator.parse('Lembra-me de ir às compras amanhã às nove e meia');
 assert.equal(x.type,'reminder');
 assert.ok(x.at>Date.now());
 const h=new Date(x.at);assert.equal(h.getHours(),9);assert.equal(h.getMinutes(),30);
});
test('calendar event requires calendar UI confirmation',()=>{
 const x=makeHarness().operator.parse('Agenda uma reunião amanhã às 15 horas');
 assert.equal(x.type,'calendar');assert.ok(x.at>Date.now());
});
test('multi-step commands get queued without auto-SMS',()=>{
 const s=makeHarness();
 assert.equal(s.operator.handle('Lembra-me amanhã às nove de comprar pão e depois liga para Amor'),true);
 assert.equal(s.calls[0][0],'reminder');
 assert.equal(s.operator.getDebugState().queued,1);
 assert.equal(s.calls.some(x=>x[0]==='contact'),false);
});
test('no news truth claim or remote access to contacts',()=>{
 const java=fs.readFileSync('nexus-jarvis/app/src/main/java/pt/nexus/jarvis/NexusContacts.java','utf8');
 assert.match(java,/void prepareVoiceSms/);assert.match(java,/void confirmVoiceSms/);
 assert.match(html,/JarvisOperator\.onSpeechDone/);
 assert.match(script,/Fontes consultadas/);
 assert.match(script,/Android\.researchFresh/);
});
