'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('nexus-jarvis/app/src/main/assets/jarvis-operator.js','utf8');
const page=fs.readFileSync('nexus-jarvis/app/src/main/assets/index.html','utf8');
function subject(){
 const callbacks={};
 const Android={};
 const window={Android};
 const document={readyState:'loading',addEventListener(name,fn){callbacks[name]=fn}};
 vm.runInNewContext(src,{window,Android,document,setTimeout,clearTimeout,console,Date,Intl,encodeURIComponent},{timeout:1500});
 return window.JarvisOperator;
}
test('command calls Amor by alias',()=>{
 const i=subject().parse('Liga para Amor');
 assert.equal(i.type,'call');assert.equal(i.who,'amor');
});
test('command distinguishes torch from call',()=>{
 assert.equal(subject().parse('Liga a lanterna'),null);
});
test('WhatsApp command extracts recipient and dictated text',()=>{
 const i=subject().parse('Manda mensagem no WhatsApp para Amor a dizer chego às oito');
 assert.equal(i.type,'message');assert.equal(i.who,'amor');assert.equal(i.channel,'whatsapp');
 assert.match(i.body,/chego/);
});
test('SMS command identifies channel',()=>{
 const i=subject().parse('Envia SMS para Maria a dizer olá');
 assert.equal(i.channel,'sms');assert.equal(i.who,'maria');
});
test('reminder tomorrow with written hour',()=>{
 const p=subject().parse('Lembra-me de comprar pão amanhã às nove');
 assert.equal(p.type,'reminder');assert.ok(Number.isFinite(p.at));assert.ok(p.at>Date.now());
 assert.match(p.title,/comprar/);
});
test('relative time in minutes',()=>{
 const delta=subject().when('daqui a 10 minutos')-Date.now();
 assert.ok(delta>590000&&delta<610000);
});
test('internet research routes to native real sources',()=>{
 const q=subject().parse('Pesquisa últimas notícias de Portugal');
 assert.equal(q.type,'search');assert.match(q.query,/not/i);
});
test('informational questions do not dial or send',()=>{
 assert.equal(subject().parse('Como enviar uma mensagem?'),null);
});
test('humanoid asset and command scripts linked',()=>{
 assert.match(page,/avatar-human\.webp/);
 assert.match(page,/human-face\.js/);
 assert.match(page,/jarvis-operator\.js/);
});
test('Android commands available in native Java source',()=>{
 const native=fs.readFileSync('nexus-jarvis/app/src/main/java/pt/nexus/jarvis/MainActivity.java','utf8');
 for(const method of ['contactAction','createReminder','listReminders','research','availableVoices']){
  assert.ok(native.includes(method),method);
 }
});
