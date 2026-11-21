/* Approximate mouth deformation integrated in the avatar image.
 * Android TTS range events drive the motion; not phoneme-perfect visemes.
 */
(()=>{
'use strict';
const img=document.getElementById('humanAvatar'),canvas=document.getElementById('humanRig'),host=document.getElementById('nexusHuman');
if(!img||!canvas||!host)return;
const ctx=canvas.getContext('2d');if(!ctx)return;
let mode='idle',raf=0,last=0,amount=0,wanted=.1,until=0;
function align(){
 if(!img.complete||!img.naturalWidth)return false;
 const a=img.getBoundingClientRect(),h=host.getBoundingClientRect();
 const s=Math.min(a.width/img.naturalWidth,a.height/img.naturalHeight);
 const w=img.naturalWidth*s,ht=img.naturalHeight*s;
 canvas.style.left=(a.left+(a.width-w)/2-h.left)+'px';
 canvas.style.top=(a.top+(a.height-ht)/2-h.top)+'px';
 canvas.style.width=w+'px';canvas.style.height=ht+'px';
 if(canvas.width!==img.naturalWidth||canvas.height!==img.naturalHeight){canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;}
 return true;
}
function draw(openness){
 if(!align())return;const W=canvas.width,H=canvas.height;
 const x=W*.407,y=H*.500,w=W*.19,h=H*.075;
 ctx.clearRect(0,0,W,H);if(openness<.065)return;
 ctx.save();ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w*.48,h*.52,0,0,Math.PI*2);ctx.clip();
 ctx.drawImage(img,x,y,w,h,x,y,w,h);
 const shift=h*.18*openness;
 ctx.fillStyle='rgba(12,7,23,'+(.70*openness)+')';
 ctx.beginPath();ctx.ellipse(x+w/2,y+h*.46,w*.30,h*.13*openness,0,0,Math.PI*2);ctx.fill();
 ctx.drawImage(img,x,y+h*.46,w,h*.54,x,y+h*.46+shift,w,h*.54-shift);
 const feather=ctx.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,w*.6);
 feather.addColorStop(0,'#fff');feather.addColorStop(.7,'#fffe');feather.addColorStop(1,'#fff0');
 ctx.globalCompositeOperation='destination-in';ctx.fillStyle=feather;ctx.fillRect(x,y,w,h);
 ctx.restore();
}
function tick(t){raf=0;if(mode!=='speaking'||document.hidden){ctx.clearRect(0,0,canvas.width,canvas.height);return}
 raf=requestAnimationFrame(tick);if(t-last<46)return;last=t;
 if(performance.now()>until)wanted=.12;
 amount+=(wanted-amount)*.32;
 draw(Math.max(0,Math.min(1,amount+.06*Math.sin(t*.035))));
}
window.humanRig={
 state(s){mode=s;if(s==='speaking'){if(!raf)raf=requestAnimationFrame(tick)}
 else{if(raf)cancelAnimationFrame(raf);raf=0;amount=0;ctx.clearRect(0,0,canvas.width,canvas.height)}},
 speech(word){const txt=String(word||'');const vowels=(txt.match(/[aeiouáàâãéêíóôõú]/gi)||[]).length;
   wanted=Math.max(.22,Math.min(.85,.23+vowels*.13+txt.length*.018));
   until=performance.now()+Math.max(160,Math.min(480,txt.length*70));}
};
img.addEventListener('load',align);window.addEventListener('resize',align);if(img.complete)align();
})();
