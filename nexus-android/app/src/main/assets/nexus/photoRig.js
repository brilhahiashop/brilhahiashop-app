/* NEXUS face-rig 0.8: local image-based mouth deformation.
   No camera. Speech range callbacks from Android improve temporal alignment,
   but this is NOT phoneme-accurate 3D lip synchronization. */
(()=>{
 const host=document.querySelector('#avatarWrap'),img=host&&host.querySelector('img.avatar');
 if(!host||!img)return;
 const canvas=document.createElement('canvas');canvas.id='photoRig';canvas.className='photo-mouth-rig';
 canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);
 const ctx=canvas.getContext('2d',{alpha:true,willReadFrequently:false});
 if(!ctx)return;
 let speaking=false,mode=0,lastWord='',holdUntil=0,raf=0,renderedAt=0,open=0;
 const originalState=window.nexusAvatarState;
 const originalRange=window.nexusSpeechRange;
 function attached(){return !host.classList.contains('model-ready');}
 function resize(){
  if(!img.naturalWidth||!img.naturalHeight)return;
  const ir=img.getBoundingClientRect(),hr=host.getBoundingClientRect();
  const sx=ir.width/img.naturalWidth,sy=ir.height/img.naturalHeight;
  const x=.408*img.naturalWidth,y=.675*img.naturalHeight,w=.195*img.naturalWidth,h=.077*img.naturalHeight;
  const cw=Math.max(1,Math.round(w)),ch=Math.max(1,Math.round(h));
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  canvas.style.left=(ir.left-hr.left+x*sx)+'px';canvas.style.top=(ir.top-hr.top+y*sy)+'px';
  canvas.style.width=(w*sx)+'px';canvas.style.height=(h*sy)+'px';
 }
 function makeFrame(amount){
  const w=canvas.width,h=canvas.height;if(w<10||h<10)return;
  const sx=img.naturalWidth*.408,sy=img.naturalHeight*.504,sw=img.naturalWidth*.195,sh=img.naturalHeight*.077;
  // Split mouth near its visible seam and move the lower lip down.
  const seam=.405,shift=Math.min(14,h*.27)*amount;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  const cut=ctx.createRadialGradient(w*.5,h*.5,w*.06,w*.5,h*.5,w*.51);
  cut.addColorStop(0,'rgba(0,0,0,1)');cut.addColorStop(.65,'rgba(0,0,0,1)');cut.addColorStop(1,'rgba(0,0,0,0)');
  // Dark inner opening, only between actual lips.
  ctx.fillStyle='rgba(16,10,26,'+Math.min(.9,amount*.85)+')';
  ctx.beginPath();ctx.ellipse(w*.5,h*(seam+.055),w*.35,Math.max(.5,h*.16*amount),0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(img,sx,sy,sw,sh*seam,0,0,w,h*seam);
  ctx.drawImage(img,sx,sy+sh*seam,sw,sh*(1-seam),0,h*seam+shift,w,h*(1-seam)-shift);
  ctx.globalCompositeOperation='destination-in';ctx.fillStyle=cut;ctx.fillRect(0,0,w,h);
  ctx.restore();
 }
 function draw(t){
  raf=0;if(!speaking||!attached()||document.hidden)return;
  raf=requestAnimationFrame(draw);if(t-renderedAt<60)return;renderedAt=t;
  const beat=(Math.sin(t*.027)+Math.sin(t*.049+1.3))*.5;
  const wordLength=Math.max(2,lastWord.length);
  const strong=performance.now()<holdUntil;
  const wanted=Math.min(.98,Math.max(.08,(strong?.39:.14)+beat*.27+(wordLength%5)*.04));
  open+=(wanted-open)*.42;makeFrame(open);
 }
 function start(){
  if(!img.complete||!img.naturalWidth)return;
  resize();
  if(speaking&&attached()&&!raf)raf=requestAnimationFrame(draw);
 }
 function stop(){
  if(raf)cancelAnimationFrame(raf);raf=0;
  open=0;ctx.clearRect(0,0,canvas.width,canvas.height);
 }
 window.nexusAvatarState=state=>{
  if(originalState)originalState(state);
  speaking=state==='speaking';
  if(speaking)start();else stop();
 };
 window.nexusSpeechRange=word=>{
  if(originalRange)originalRange(word);
  lastWord=String(word||'').slice(0,45);
  holdUntil=performance.now()+Math.min(650,100+lastWord.length*68);
  if(speaking)start();
 };
 img.addEventListener('load',start);
 window.addEventListener('resize',start);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(speaking)start();});
 new MutationObserver(()=>{if(attached()){if(speaking)start();}else stop();}).observe(host,{attributes:true,attributeFilter:['class']});
 if(img.complete)start();
})();