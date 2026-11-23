'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('nexus-jarvis/app/src/main/assets/index.html','utf8');
const start=html.indexOf('const SITES=');
const end=html.indexOf('/* Token Shopify',start);
assert(start>=0&&end>start,'command source missing');
function run(input) {
 const calls=[];
 const Android={
  torch:v=>calls.push(['torch',v]),alarm:(h,m)=>calls.push(['alarm',h,m]),
  timer:n=>calls.push(['timer',n]),dial:n=>calls.push(['dial',n]),
  navigate:p=>calls.push(['navigate',p]),volume:v=>calls.push(['volume',v]),
  settings:v=>calls.push(['settings',v]),openUrl:u=>calls.push(['url',u]),
  openApp:n=>{calls.push(['openApp',n]);return'ok'},
  findContact:n=>{calls.push(['findContact',n]);return n==='joão'?'João|912345678':''}
 };
 const context={Android,encodeURIComponent,window:{JarvisOperator:null}};
 vm.runInNewContext(html.slice(start,end)+'\nthis.perform=phoneCmd;',context,{timeout:1000});
 return{answer:context.perform(input),calls};
}
test('lanterna liga',()=>assert.equal(run('Liga a lanterna').calls[0][1],true));
test('lanterna desliga',()=>assert.equal(run('Desliga a lanterna').calls[0][1],false));
test('alarme com meia hora',()=>assert.equal(run('Acorda-me às 7 e meia').calls[0][2],30));
test('temporizador',()=>assert.equal(run('Temporizador de 10 minutos').calls[0][1],600));
test('temporizador com números por extenso',()=>assert.equal(run('Temporizador de quinze minutos').calls[0][1],900));
test('abrir aplicação',()=>assert.equal(run('Abre o WhatsApp').calls[0][1],'whatsapp'));
test('pesquisar na web',()=>assert.match(run('Pesquisa astronomia').calls[0][1],/google.com\/search/));
test('contacto',()=>assert.equal(run('Liga ao joão').calls.at(-1)[1],'912345678'));
test('pergunta não executa comando',()=>assert.equal(run('Como posso abrir um site?').answer,null));
test('painel de apps existe',()=>{
 const js=fs.readFileSync('nexus-jarvis/app/src/main/assets/hud-upgrade.js','utf8');
 assert(js.includes('Android.listApps()'));assert(html.includes('id="hudPhase"'));
});
test('Shopify requer domínio oficial',()=>assert(html.includes('myshopify.com')));
