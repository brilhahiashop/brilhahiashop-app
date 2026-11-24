'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const center=fs.readFileSync('nexus-jarvis/app/src/main/assets/comms-center.js','utf8');
const html=fs.readFileSync('nexus-jarvis/app/src/main/assets/index.html','utf8');
const operator=fs.readFileSync('nexus-jarvis/app/src/main/assets/jarvis-operator.js','utf8');
const gmail=fs.readFileSync('nexus-jarvis/app/src/main/java/pt/nexus/jarvis/NexusGmail.java','utf8');
const social=fs.readFileSync('nexus-jarvis/app/src/main/java/pt/nexus/jarvis/NexusSocialListener.java','utf8');
const activity=fs.readFileSync('nexus-jarvis/app/src/main/java/pt/nexus/jarvis/MainActivity.java','utf8');
function build(){
 const calls=[];
 const android={
  gmailAccounts(){return JSON.stringify([{slot:0,email:''},{slot:1,email:'a@example.com'},{slot:2,email:''}])},
  gmailAutoBills(){return false},
  gmailScanAll(){calls.push('scan')},
  socialNotifications(){return JSON.stringify({enabled:true,total:2,groups:{Instagram:1,Facebook:1}})},
  enableSocialNotifications(){calls.push('permission')}
 };
 const window={Android:android};
 const document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 vm.runInNewContext(center,{window,Android:android,document,Date,JSON,console},{timeout:1500});
 return{ui:window.NexusMail,calls};
}
test('all 3 slots available for account authorization',()=>{
 const {ui}=build();assert.equal(typeof ui.open,'function');assert.equal(typeof ui.handle,'function');
 assert.match(gmail,/for\(int i=0;i<3;i\+\+\)/);
 assert.match(gmail,/new Account\(account,"com.google"\)/);
});
test('Gmail access tokens are transient and not forwarded to AI',()=>{
 assert.match(gmail,/final String token=result.getAccessToken\(\)/);
 assert.doesNotMatch(gmail,/putString\("token"|setString\("token"|storeSecret\("gmail"/);
 assert.doesNotMatch(center,/callAI\(/);
});
test('permission scopes are least privilege',()=>{
 assert.match(gmail,/gmail\.readonly/);assert.match(gmail,/gmail\.modify/);
 assert.match(gmail,/"trash"\.equals\(action\)\?MODIFY:READ/);
});
test('invoice notification is strictly local and opt-in',()=>{
 assert.match(gmail,/getBoolean\("autoBills",false\)/);
 assert.match(gmail,/maybeScheduleBill/);
 assert.match(gmail,/NexusReminders\.add/);
 assert.ok(gmail.includes('data\\\\s+limite')||gmail.includes('vencimento')); // due-date extraction source
});
test('user must approve before moving an email to trash',()=>{
 assert.match(center,/Confirmar Lixo/);
 assert.match(center,/Android\.gmailTrash\(x\.slot,x\.id\)/);
 assert.match(center,/confirmTrash/);
});
test('social notifications are only counted, no text read',()=>{
 assert.match(social,/getActiveNotifications\(\)/);
 assert.match(social,/sbn\.getPackageName\(\)/);
 assert.doesNotMatch(social,/EXTRA_TEXT|EXTRA_BIG_TEXT|EXTRA_TITLE|getText\(/);
});
test('social notification question routed on device',()=>{
 const {ui}=build();
 assert.equal(ui.parse('Tenho notificações nas redes sociais?').type,'social');
 assert.equal(ui.handle('Tenho notificações nas redes sociais?'),true);
});
test('email summary question routed on device',()=>{
 const {ui,calls}=build();
 assert.equal(ui.parse('Lê os meus emails').type,'email');
 assert.equal(ui.handle('Lê os meus emails'),true);
 assert.equal(calls.includes('scan'),true);
});
test('existing SMS, calls, reminders and search source preserved',()=>{
 assert.match(operator,/sms_voice/);
 assert.match(operator,/createReminder/);
 assert.match(operator,/contactAction\('call'/);
 assert.match(operator,/Android\.researchFresh/);
 assert.match(html,/comms-center\.js/);
});
test('HTTP 402 now offers alternative Gemini and does not rely on second Pollinations endpoint',()=>{
 assert.match(html,/response.status===402/);
 assert.match(html,/Gemini/);
 assert.match(html,/callGemini/);
 assert.doesNotMatch(html,/text\.pollinations\.ai\/openai/);
 assert.match(activity,/gmailConnect\(int slot\)/);
});
