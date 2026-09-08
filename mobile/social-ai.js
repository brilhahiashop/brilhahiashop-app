export const SOCIAL_UI = String.raw`
  var BR_SOCIAL_STATE={status:null,campaigns:[],posts:[]};
  var BR_SOCIAL_CLIENT=null;
  function socialEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function ensureSocialCss(){
    if(document.getElementById('br-social-css'))return;
    var s=document.createElement('style');s.id='br-social-css';
    s.textContent='.br-social-screen{position:fixed;inset:0;z-index:2147483645;background:#07101d;color:#fff;overflow:auto;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}'+
    '.br-social-wrap{max-width:1080px;margin:auto;padding:14px 14px 100px}.br-social-top{position:sticky;top:0;z-index:3;background:rgba(7,16,29,.96);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0 14px;border-bottom:1px solid #243551}.br-social-title{font-size:22px;font-weight:900}.br-social-sub{font-size:12px;color:#92a0b6;margin-top:3px}'+
    '.br-social-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.br-social-card{background:#101a2d;border:1px solid #243551;border-radius:16px;padding:14px}.br-social-card h3{margin:0 0 10px;font-size:16px}.br-social-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.br-social-kpi{background:#0a1322;border:1px solid #243551;border-radius:12px;padding:10px}.br-social-kpi small{display:block;color:#92a0b6;font-size:10px}.br-social-kpi b{display:block;margin-top:4px;font-size:18px}'+
    '.br-social-choice{display:grid;grid-template-columns:1fr 1fr;gap:8px}.br-social-choice label,.br-check{display:flex;align-items:center;gap:8px;background:#0a1322;border:1px solid #243551;border-radius:12px;padding:10px;font-size:12px}.br-social-checks{display:flex;flex-wrap:wrap;gap:7px}.br-social-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #1d2d46}.br-social-row:last-child{border-bottom:0}.br-social-meta{min-width:0}.br-social-meta b{display:block;font-size:13px}.br-social-meta small{display:block;color:#92a0b6;font-size:11px;margin-top:3px;line-height:1.4}.br-social-actions{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}'+
    '.br-social-btn{border:1px solid #2d4264;background:#13213a;color:#fff;border-radius:11px;padding:9px 11px;font-weight:800;font-size:11px}.br-social-btn.gold{background:#d8b36b;color:#17120a;border-color:#d8b36b}.br-social-btn.green{background:#14321f;color:#c8f7d9;border-color:#275f42}.br-social-btn:disabled{opacity:.45}.br-social-status{font-size:11px;border:1px solid #243551;border-radius:999px;padding:5px 8px;white-space:nowrap}.br-social-ok{color:#62d98d}.br-social-warn{color:#e7b55e}.br-social-err{color:#ff7c87}.br-social-note{color:#92a0b6;font-size:11px;line-height:1.5;margin-top:8px}.br-social-progress{margin-top:8px;color:#5ad8cf;font-size:12px;font-weight:700}'+
    '.br-social-input,.br-social-select{box-sizing:border-box;width:100%;background:#0a1322;color:#fff;border:1px solid #243551;border-radius:11px;padding:11px}.br-social-field{margin-top:10px}.br-social-field label{display:block;color:#92a0b6;font-size:11px;margin-bottom:5px}.br-social-close{border:1px solid #243551;background:#101a2d;color:#fff;border-radius:12px;padding:10px 12px}.br-social-empty{padding:18px;text-align:center;color:#92a0b6;border:1px dashed #243551;border-radius:12px}.br-social-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid #243551;border-radius:999px;padding:6px 8px;font-size:10px}.br-social-badge i{width:7px;height:7px;border-radius:50%;background:#e7b55e}.br-social-badge.on i{background:#62d98d}'+
    '@media(max-width:760px){.br-social-grid{grid-template-columns:1fr}.br-social-kpis{grid-template-columns:repeat(2,1fr)}.br-social-row{align-items:flex-start;flex-direction:column}.br-social-actions{justify-content:flex-start;width:100%}}';
    document.head.appendChild(s);
  }
  async function socialApi(resource,opt){
    var t=authToken();if(!t)throw new Error('Sessão expirada. Entra novamente.');
    var o=opt||{},headers=Object.assign({'Content-Type':'application/json','Authorization':'Bearer '+t,'apikey':SB_KEY},o.headers||{});
    var r=await fetch(SB_URL+'/functions/v1/brilhah-social-ai?resource='+encodeURIComponent(resource),Object.assign({},o,{headers:headers}));
    var j=await r.json().catch(function(){return {};});if(!r.ok)throw new Error(j.error||'Erro no Social AI');return j;
  }
  function openSocialLogin(network){
    try{
      localStorage.setItem('br-social-pending-network',String(network||''));
      if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'open-external',url:'https://account.buffer.com/channels',network:String(network||'')}));
      }else{
        window.open('https://account.buffer.com/channels','_blank','noopener,noreferrer');
      }
    }catch(e){window.open('https://account.buffer.com/channels','_blank','noopener,noreferrer');}
  }
  async function syncAfterSocialLogin(){
    if(!document.getElementById('br-social-screen'))return;
    try{
      var st=BR_SOCIAL_STATE.status||{};
      if(!st.connected)return;
      await socialApi('sync-channels',{method:'POST',body:'{}'});
      localStorage.removeItem('br-social-pending-network');
      await loadSocial();
    }catch(e){}
  }
  function socialDefaultDate(){var d=new Date(Date.now()+8*3600000);d.setMinutes(0,0,0);var z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16);}
  function openSocial(){
    ensureSocialCss();var old=document.getElementById('br-social-screen');if(old)old.remove();
    var w=document.createElement('div');w.id='br-social-screen';w.className='br-social-screen';
    w.innerHTML='<div class="br-social-wrap"><div class="br-social-top"><div><div class="br-social-title">📣 BRILHAH Social AI</div><div class="br-social-sub">Campanhas, conteúdo, agenda e análise · sem watermark</div></div><button id="br-social-close" class="br-social-close">✕</button></div><div id="br-social-body"><div class="br-social-card" style="margin-top:12px">A carregar Social AI…</div></div></div>';
    document.body.appendChild(w);document.getElementById('br-social-close').onclick=function(){w.remove();};loadSocial();
  }
  async function loadSocial(){
    var body=document.getElementById('br-social-body');if(!body)return;
    try{var a=await Promise.all([socialApi('status'),socialApi('campaigns'),socialApi('posts')]);BR_SOCIAL_STATE={status:a[0],campaigns:a[1].campaigns||[],posts:a[2].posts||[]};renderSocial();}
    catch(e){body.innerHTML='<div class="br-social-card" style="margin-top:12px"><b>Não foi possível carregar.</b><div class="br-social-note br-social-err">'+socialEsc(e.message)+'</div><button id="br-social-retry" class="br-social-btn gold" style="margin-top:10px">Tentar novamente</button></div>';var b=document.getElementById('br-social-retry');if(b)b.onclick=loadSocial;}
  }
  function renderSocial(){
    var body=document.getElementById('br-social-body');if(!body)return;
    var st=BR_SOCIAL_STATE.status||{},chs=st.channels||[],cs=BR_SOCIAL_STATE.campaigns||[],ps=BR_SOCIAL_STATE.posts||[];
    var published=ps.filter(function(x){return x.status==='published';}).length,scheduled=ps.filter(function(x){return x.status==='scheduled';}).length,need=ps.filter(function(x){return x.status==='needs_media';}).length;
    var channelText=chs.length?chs.map(function(c){return String(c.service||'').toUpperCase();}).join(' · '):'Nenhum canal';
    body.innerHTML='<div class="br-social-kpis"><div class="br-social-kpi"><small>Produtos elegíveis</small><b>'+socialEsc((st.counts&&st.counts.active_products)||0)+'</b></div><div class="br-social-kpi"><small>Campanhas</small><b>'+socialEsc((st.counts&&st.counts.campaigns)||cs.length)+'</b></div><div class="br-social-kpi"><small>Agendados</small><b>'+scheduled+'</b></div><div class="br-social-kpi"><small>Publicados</small><b>'+published+'</b></div></div>'+
    '<div class="br-social-grid"><div class="br-social-card"><h3>1. Publicação</h3><div class="br-social-row"><div class="br-social-meta"><b>Buffer</b><small>'+socialEsc(channelText)+'</small></div><span class="br-social-badge '+(st.connected?'on':'')+'"><i></i>'+(st.connected?'Ligado':'Por ligar')+'</span></div>'+
    (st.connected?'<button id="br-sync-channels" class="br-social-btn" style="margin-top:10px">Atualizar canais</button>':'<div class="br-social-field"><label>API key pessoal do Buffer</label><input id="br-buffer-key" class="br-social-input" type="password" autocomplete="off" placeholder="Colar aqui — não é guardada na app"></div><button id="br-connect-buffer" class="br-social-btn gold" style="margin-top:9px">Ligar Buffer</button>')+
    '<div class="br-social-field"><label>Ligar perfis sociais</label><div class="br-social-checks"><button class="br-social-btn" data-br-login="instagram">Instagram</button><button class="br-social-btn" data-br-login="facebook">Facebook</button><button class="br-social-btn" data-br-login="tiktok">TikTok</button></div></div>'+
    '<div class="br-social-note">Ao tocar numa rede, abre a ligação segura do Buffer no browser. Faz login na conta certa, autoriza e volta à app; depois o perfil fica disponível para publicação direta.</div><div id="br-buffer-msg" class="br-social-note"></div></div>'+
    '<div class="br-social-card"><h3>2. Nova campanha</h3><div class="br-social-field"><label>Formato</label><div class="br-social-choice"><label><input type="radio" name="br-media" value="photo" checked>📸 Fotos</label><label><input type="radio" name="br-media" value="video">🎬 Vídeo MP4</label></div></div>'+
    '<div class="br-social-field"><label>Objetivo</label><select id="br-objective" class="br-social-select"><option value="sales">Vendas</option><option value="engagement">Interação</option><option value="awareness">Alcance</option></select></div>'+
    '<div class="br-social-field"><label>Redes</label><div class="br-social-checks"><label class="br-check"><input class="br-platform" type="checkbox" value="instagram" checked>Instagram</label><label class="br-check"><input class="br-platform" type="checkbox" value="facebook" checked>Facebook</label><label class="br-check"><input class="br-platform" type="checkbox" value="tiktok" checked>TikTok</label></div></div>'+
    '<div class="br-social-field"><label>Mercados</label><div class="br-social-checks"><label class="br-check"><input class="br-market" type="checkbox" value="PT" checked>PT</label><label class="br-check"><input class="br-market" type="checkbox" value="FR" checked>FR</label><label class="br-check"><input class="br-market" type="checkbox" value="BE">BE</label><label class="br-check"><input class="br-market" type="checkbox" value="IE">IE</label><label class="br-check"><input class="br-market" type="checkbox" value="NL">NL</label></div></div>'+
    '<div class="br-social-grid" style="margin-top:0"><div class="br-social-field"><label>Publicações / semana</label><select id="br-frequency" class="br-social-select"><option>3</option><option>5</option><option>7</option></select></div><div class="br-social-field"><label>Primeira publicação</label><input id="br-first-post" class="br-social-input" type="datetime-local" value="'+socialDefaultDate()+'"></div></div>'+
    '<div class="br-social-note">Só usa produtos Shopify ativos, com stock e imagem real. Sem promoções inventadas. Vídeos MP4 gerados no dispositivo, sem watermark de terceiros.</div><button id="br-create-campaign" class="br-social-btn gold" style="margin-top:10px">Criar campanha</button><div id="br-create-msg" class="br-social-progress"></div></div></div>'+
    '<div class="br-social-grid"><div class="br-social-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3 style="margin:0">Campanhas</h3><button id="br-social-refresh" class="br-social-btn">Atualizar</button></div><div style="margin-top:8px">'+campaignRows(cs,ps)+'</div></div>'+
    '<div class="br-social-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3 style="margin:0">Análise</h3><button id="br-sync-metrics" class="br-social-btn">Atualizar métricas</button></div><div class="br-social-note">Métricas por publicação depois de o Buffer receber os posts.</div><div style="margin-top:8px">'+metricRows(ps)+'</div><div id="br-metrics-msg" class="br-social-progress"></div></div></div>'+
    '<div class="br-social-card" style="margin-top:10px"><h3>Fila de conteúdo</h3><div class="br-social-note">'+need+' vídeo(s) por gerar · '+scheduled+' agendado(s) · '+published+' publicado(s)</div><div style="margin-top:8px">'+postRows(ps)+'</div></div>';bindSocial();
  }
  function campaignRows(cs,ps){
    if(!cs.length)return '<div class="br-social-empty">Ainda não existem campanhas.</div>';
    return cs.slice(0,12).map(function(c){var cp=ps.filter(function(p){return p.campaign_id===c.id;}),need=cp.filter(function(p){return p.status==='needs_media';}).length,ready=cp.filter(function(p){return p.status==='ready'||p.status==='awaiting_connection';}).length,sch=cp.filter(function(p){return p.status==='scheduled';}).length;return '<div class="br-social-row"><div class="br-social-meta"><b>'+socialEsc(c.name)+'</b><small>'+(c.media_type==='video'?'🎬 Vídeo':'📸 Fotos')+' · '+socialEsc((c.markets||[]).join(', '))+' · '+cp.length+' conteúdo(s) · '+sch+' agendado(s)</small></div><div class="br-social-actions">'+(need?'<button class="br-social-btn green" data-br-video="'+socialEsc(c.id)+'">Gerar vídeos ('+need+')</button>':'')+(ready?'<button class="br-social-btn gold" data-br-schedule="'+socialEsc(c.id)+'">Agendar ('+ready+')</button>':'')+'<span class="br-social-status '+(c.status==='active'?'br-social-ok':'br-social-warn')+'">'+socialEsc(c.status)+'</span></div></div>';}).join('');
  }
  function postRows(ps){if(!ps.length)return '<div class="br-social-empty">Sem conteúdo na fila.</div>';return ps.slice(0,40).map(function(p){var dt=p.scheduled_at?new Date(p.scheduled_at).toLocaleString('pt-PT'):'Sem data',cls=p.status==='published'||p.status==='scheduled'?'br-social-ok':p.status==='failed'?'br-social-err':'br-social-warn';return '<div class="br-social-row"><div class="br-social-meta"><b>'+socialEsc(p.product_name||'BRILHAH')+'</b><small>'+socialEsc(String(p.platform||'').toUpperCase())+' · '+socialEsc(p.market)+' · '+socialEsc(dt)+'</small></div><span class="br-social-status '+cls+'">'+socialEsc(p.status)+'</span></div>';}).join('');}
  function metricRows(ps){var a=ps.filter(function(p){return p.metrics&&Object.keys(p.metrics).length;});if(!a.length)return '<div class="br-social-empty">As métricas aparecem aqui depois das primeiras publicações.</div>';return a.slice(0,10).map(function(p){var m=p.metrics||{},parts=[];['views','impressions','reach','clicks','reactions','comments','shares','engagementRate'].forEach(function(k){if(m[k]&&m[k].value!=null)parts.push(k+': '+m[k].value);});return '<div class="br-social-row"><div class="br-social-meta"><b>'+socialEsc(p.product_name||p.platform)+'</b><small>'+socialEsc(parts.join(' · ')||'Métricas sincronizadas')+'</small></div></div>';}).join('');}
  function bindSocial(){
    var b=document.getElementById('br-connect-buffer');if(b)b.onclick=connectBufferUi;
    b=document.getElementById('br-sync-channels');if(b)b.onclick=async function(){var m=document.getElementById('br-buffer-msg');try{m.textContent='A sincronizar…';await socialApi('sync-channels',{method:'POST',body:'{}'});await loadSocial();}catch(e){m.className='br-social-note br-social-err';m.textContent=e.message;}};
    b=document.getElementById('br-create-campaign');if(b)b.onclick=createCampaignUi;b=document.getElementById('br-social-refresh');if(b)b.onclick=loadSocial;b=document.getElementById('br-sync-metrics');if(b)b.onclick=syncMetricsUi;
    document.querySelectorAll('[data-br-login]').forEach(function(x){x.onclick=function(){openSocialLogin(x.getAttribute('data-br-login'));};});
    document.querySelectorAll('[data-br-schedule]').forEach(function(x){x.onclick=function(){scheduleCampaignUi(x.getAttribute('data-br-schedule'),x);};});document.querySelectorAll('[data-br-video]').forEach(function(x){x.onclick=function(){generateCampaignVideosUi(x.getAttribute('data-br-video'),x);};});
  }
  async function connectBufferUi(){
    var key=(document.getElementById('br-buffer-key').value||'').trim(),m=document.getElementById('br-buffer-msg'),b=document.getElementById('br-connect-buffer');if(key.length<16){m.className='br-social-note br-social-err';m.textContent='Confirma a API key do Buffer.';return;}b.disabled=true;m.textContent='A validar ligação…';
    try{var r=await socialApi('connect-buffer',{method:'POST',body:JSON.stringify({api_key:key})});m.className='br-social-note br-social-ok';m.textContent='Buffer ligado: '+((r.organization&&r.organization.name)||'conta')+' ✓';document.getElementById('br-buffer-key').value='';await loadSocial();}catch(e){m.className='br-social-note br-social-err';m.textContent=e.message;b.disabled=false;}
  }
  async function createCampaignUi(){
    var media=(document.querySelector('input[name="br-media"]:checked')||{}).value||'photo',platforms=Array.from(document.querySelectorAll('.br-platform:checked')).map(function(x){return x.value;}),markets=Array.from(document.querySelectorAll('.br-market:checked')).map(function(x){return x.value;}),m=document.getElementById('br-create-msg'),b=document.getElementById('br-create-campaign');
    if(!platforms.length||!markets.length){m.className='br-social-progress br-social-err';m.textContent='Escolhe pelo menos uma rede e um mercado.';return;}var local=document.getElementById('br-first-post').value,d=local?new Date(local):new Date(Date.now()+8*3600000);b.disabled=true;m.textContent='A criar campanha com produtos reais…';
    try{var r=await socialApi('create-campaign',{method:'POST',body:JSON.stringify({media_type:media,objective:document.getElementById('br-objective').value,platforms:platforms,markets:markets,posts_per_week:Number(document.getElementById('br-frequency').value||3),first_post_at:d.toISOString(),autopilot:false,approval_required:true})});m.className='br-social-progress br-social-ok';m.textContent='Campanha criada: '+(r.posts||[]).length+' conteúdo(s) ✓';await loadSocial();}catch(e){m.className='br-social-progress br-social-err';m.textContent=e.message;b.disabled=false;}
  }
  async function scheduleCampaignUi(id,b){if(!BR_SOCIAL_STATE.status||!BR_SOCIAL_STATE.status.connected){alert('Liga primeiro o Buffer no topo do Social AI.');return;}b.disabled=true;b.textContent='A agendar…';try{var r=await socialApi('schedule-campaign',{method:'POST',body:JSON.stringify({campaign_id:id})});alert(r.scheduled+' publicação(ões) agendada(s).'+(r.failed?' '+r.failed+' ficaram por rever.':''));await loadSocial();}catch(e){alert(e.message);b.disabled=false;b.textContent='Agendar';}}
  async function syncMetricsUi(){var m=document.getElementById('br-metrics-msg'),b=document.getElementById('br-sync-metrics');b.disabled=true;m.textContent='A atualizar métricas…';try{var r=await socialApi('sync-metrics',{method:'POST',body:'{}'});m.className='br-social-progress br-social-ok';m.textContent=(r.checked||0)+' publicação(ões) analisadas ✓';await loadSocial();}catch(e){m.className='br-social-progress br-social-err';m.textContent=e.message;b.disabled=false;}}
  async function socialStorage(){if(BR_SOCIAL_CLIENT)return BR_SOCIAL_CLIENT;var mod=await import('https://esm.sh/@supabase/supabase-js@2.57.4');BR_SOCIAL_CLIENT=mod.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false}});return BR_SOCIAL_CLIENT;}
  async function loadProductImage(url){
    var t=authToken(),r=await fetch(SB_URL+'/functions/v1/brilhah-api?resource=image-proxy&url='+encodeURIComponent(url),{headers:{Authorization:'Bearer '+t,apikey:SB_KEY}});if(!r.ok)throw new Error('Imagem do produto indisponível.');var blob=await r.blob(),obj=URL.createObjectURL(blob),img=new Image();img.decoding='async';await new Promise(function(res,rej){img.onload=res;img.onerror=rej;img.src=obj;});setTimeout(function(){URL.revokeObjectURL(obj);},30000);return img;
  }
  function drawSocialFrame(ctx,img,name,market,t){
    var W=720,H=1280;ctx.fillStyle='#0a0f18';ctx.fillRect(0,0,W,H);var cover=Math.max(W/img.naturalWidth,H/img.naturalHeight),cw=img.naturalWidth*cover,ch=img.naturalHeight*cover;ctx.save();ctx.globalAlpha=.30;ctx.filter='blur(22px)';ctx.drawImage(img,(W-cw)/2,(H-ch)/2,cw,ch);ctx.restore();
    var contain=Math.min((W-64)/img.naturalWidth,(H-330)/img.naturalHeight)*(1+.025*Math.sin(t*Math.PI)),iw=img.naturalWidth*contain,ih=img.naturalHeight*contain;ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=24;ctx.drawImage(img,(W-iw)/2,100+(H-430-ih)/2,iw,ih);ctx.restore();
    var g=ctx.createLinearGradient(0,820,0,H);g.addColorStop(0,'rgba(7,16,29,0)');g.addColorStop(1,'rgba(7,16,29,.96)');ctx.fillStyle=g;ctx.fillRect(0,780,W,500);ctx.fillStyle='#fff';ctx.font='800 42px system-ui';ctx.textAlign='left';var short=String(name||'BRILHAH').replace(/\s+[–-]\s+BRILHAH\s*$/i,'').slice(0,34);ctx.fillText(short,42,1080);
    var tx={PT:'O teu estilo. O teu momento.',FR:'Ton style. Ton moment.',BE:'Ton style. Ton moment.',IE:'Your style. Your moment.',NL:'Jouw stijl. Jouw moment.'}[market]||'BRILHAH';ctx.fillStyle='#d8b36b';ctx.font='700 27px system-ui';ctx.fillText(tx,42,1130);ctx.fillStyle='#c7d2e0';ctx.font='600 20px system-ui';ctx.fillText('BRILHAH',42,1180);
  }
  async function makeSocialMp4(post,onProgress){
    var img=await loadProductImage(post.product_image_url||post.asset_url),m=await import('https://esm.sh/mediabunny@1.55.7'),canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;var ctx=canvas.getContext('2d',{alpha:false}),output=new m.Output({format:new m.Mp4OutputFormat(),target:new m.BufferTarget()}),source=new m.CanvasSource(canvas,{codec:'avc',quality:new m.Quality('high')});output.addVideoTrack(source);await output.start();var fps=24,seconds=6,total=fps*seconds;
    for(var i=0;i<total;i++){drawSocialFrame(ctx,img,post.product_name,post.market,i/(total-1));await source.add(i/fps,1/fps);if(onProgress&&i%8===0)onProgress(Math.round((i+1)/total*100));}await output.finalize();if(!output.target.buffer)throw new Error('Não foi possível gerar o MP4 neste dispositivo.');return new Blob([output.target.buffer],{type:'video/mp4'});
  }
  async function uploadSocialVideo(post,blob){
    var u=await socialApi('media-upload-url',{method:'POST',body:JSON.stringify({id:post.id,ext:'mp4',mime:'video/mp4'})}),c=await socialStorage(),up=await c.storage.from('brilhah-social').uploadToSignedUrl(u.path,u.token,blob,{contentType:'video/mp4'});if(up.error)throw up.error;await socialApi('update-post',{method:'POST',body:JSON.stringify({id:post.id,asset_url:u.public_url,asset_path:u.path,media_ready:true})});return u;
  }
  async function generateCampaignVideosUi(cid,b){
    var posts=(BR_SOCIAL_STATE.posts||[]).filter(function(p){return p.campaign_id===cid&&p.status==='needs_media';});if(!posts.length)return;b.disabled=true;var original=b.textContent,done=0;
    try{var groups={};posts.forEach(function(p){var k=(p.product_id||p.product_name)+'|'+p.market;if(!groups[k])groups[k]=[];groups[k].push(p);});var keys=Object.keys(groups);
      for(var gi=0;gi<keys.length;gi++){var group=groups[keys[gi]],first=group[0];b.textContent='MP4 '+(gi+1)+'/'+keys.length+' · 0%';var blob=await makeSocialMp4(first,function(pct){b.textContent='MP4 '+(gi+1)+'/'+keys.length+' · '+pct+'%';}),u=await uploadSocialVideo(first,blob);done++;for(var j=1;j<group.length;j++){await socialApi('update-post',{method:'POST',body:JSON.stringify({id:group[j].id,asset_url:u.public_url,asset_path:u.path,media_ready:true})});done++;}}
      alert(done+' vídeo(s) preparado(s) sem watermark ✓');await loadSocial();
    }catch(e){alert('Vídeo: '+e.message);b.disabled=false;b.textContent=original;}
  }
  if(!window.__brSocialFocusHook){window.__brSocialFocusHook=true;window.addEventListener('focus',function(){setTimeout(syncAfterSocialLogin,700);});document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(syncAfterSocialLogin,700);});}
  function addSocial(){
    var old=document.getElementById('br-social-nav');if(!loggedIn()){if(old)old.remove();return;}if(old)return;var side=document.getElementById('side')||document.querySelector('aside');if(!side)return;var btn=document.createElement('button');btn.id='br-social-nav';btn.className='nav';btn.type='button';btn.innerHTML='<span class="ico">📣</span>Social AI';btn.onclick=openSocial;var settings=document.getElementById('br-settings-nav');if(settings)side.insertBefore(btn,settings);else side.appendChild(btn);
  }
`;
