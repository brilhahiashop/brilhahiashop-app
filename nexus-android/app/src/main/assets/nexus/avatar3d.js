/* Original procedural 3D android bust. No external model, texture, tracking or network. */
(()=>{
 const host=document.querySelector('#avatarWrap');let renderer,raf=0,enabled=false,available=true,voice='idle',wordUntil=0,last=0;
 const fallback=message=>{host.classList.remove('model-ready');document.querySelector('#avatarMode').textContent='ILUSTRAÇÃO';document.querySelector('#avatarInfo').textContent=message;};
 try{
 const T=window.THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,30);camera.position.set(0,.55,5.9);camera.lookAt(0,.15,0);
 renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);host.prepend(renderer.domElement);renderer.domElement.className='avatar-canvas';
 const skin=new T.MeshStandardMaterial({color:0x3898b4,metalness:.68,roughness:.31,emissive:0x062a42,emissiveIntensity:.6});
 const dark=new T.MeshStandardMaterial({color:0x041623,metalness:.9,roughness:.24});const glow=new T.MeshBasicMaterial({color:0x7ffaff});const eyeWhite=new T.MeshStandardMaterial({color:0xbbeaf0,roughness:.2});
 scene.add(new T.AmbientLight(0x6abfff,2));const key=new T.DirectionalLight(0xb9f8ff,4);key.position.set(-2,3,4);scene.add(key);const rim=new T.PointLight(0x00ffff,10);rim.position.set(2,1,-1);scene.add(rim);
 const bust=new T.Group();scene.add(bust);const head=new T.Group();head.position.y=.55;bust.add(head);
 function oval(parent,material,x,y,z,sx,sy,sz){const m=new T.Mesh(new T.SphereGeometry(1,32,24),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 oval(bust,skin,0,-.98,-.09,.98,.34,.42);oval(bust,skin,0,-.67,-.08,.24,.5,.23);
 oval(head,skin,0,0,0,.59,.77,.47);oval(head,skin,0,-.43,.09,.43,.33,.38);
 // Sculpted swept hair and long side sections.
 oval(head,dark,0,.20,-.14,.64,.67,.46);oval(head,skin,0,.05,.11,.55,.65,.43);
 const hairLeft=oval(head,dark,-.51,-.18,-.10,.16,.83,.29);hairLeft.rotation.z=-.12;
 const hairRight=oval(head,dark,.51,-.18,-.10,.16,.83,.29);hairRight.rotation.z=.12;
 const fringe=oval(head,dark,-.18,.58,.13,.48,.19,.34);fringe.rotation.z=.22;
 oval(head,skin,-.58,-.03,0,.085,.17,.10);oval(head,skin,.58,-.03,0,.085,.17,.10);
 const eyes=[];for(const x of [-.215,.215]){const e=new T.Group();e.position.set(x,.12,.486);head.add(e);oval(e,dark,0,0,0,.16,.089,.045);oval(e,eyeWhite,0,0,.025,.135,.062,.035);const pupil=oval(e,glow,0,0,.057,.047,.049,.015);oval(e,dark,0,0,.07,.018,.027,.008);eyes.push({group:e,pupil});const brow=oval(head,dark,x,.245,.47,.17,.023,.026);brow.rotation.z=x<0?.1:-.1;}
 oval(head,skin,0,-.06,.52,.068,.15,.10);oval(head,skin,0,-.15,.54,.09,.05,.065);
 const mouth=new T.Group();mouth.position.set(0,-.32,.47);head.add(mouth);const opening=oval(mouth,dark,0,0,0,.155,.014,.022);oval(mouth,skin,0,.018,.015,.17,.026,.025);const lower=oval(mouth,skin,0,-.021,.015,.16,.024,.025);
 // Cyan seams are actual 3D curves on the model.
 for(const side of [-1,1]){const curve=new T.CatmullRomCurve3([new T.Vector3(side*.46,.48,.30),new T.Vector3(side*.53,.05,.29),new T.Vector3(side*.42,-.40,.33),new T.Vector3(side*.18,-.65,.30)]);head.add(new T.Mesh(new T.TubeGeometry(curve,30,.008,6,false),glow));}
 const ring=new T.Mesh(new T.TorusGeometry(.86,.012,8,64),glow);ring.rotation.x=Math.PI/2;ring.position.y=-1.18;bust.add(ring);
 const particles=[];for(let n=0;n<55;n++){particles.push((Math.random()-.5)*2.7,(Math.random()-.5)*3,(Math.random()-.5)*1.5-1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(particles,3));scene.add(new T.Points(geo,new T.PointsMaterial({color:0x54cde3,size:.015,transparent:true,opacity:.5})));
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 function frame(ms){raf=0;if(!enabled||document.hidden)return;raf=requestAnimationFrame(frame);if(ms-last<32)return;last=ms;const t=ms/1000;
  bust.position.y=Math.sin(t*1.3)*.018;head.rotation.y=Math.sin(t*.48)*.095;head.rotation.z=Math.sin(t*.7)*.026+(voice==='listening'?-.055:0);head.rotation.x=voice==='thinking'?.045:Math.sin(t*.6)*.015;
  const blink=Math.pow(Math.max(0,Math.sin(t*1.09)),60);eyes.forEach(e=>{e.group.scale.y=Math.max(.07,1-blink);e.pupil.position.x=Math.sin(t*.45)*.016;});
  const talking=voice==='speaking';const timed=performance.now()<wordUntil;const amount=talking?(timed?.045+.025*Math.sin(t*21):.018+.012*Math.sin(t*13)):0;opening.scale.y=.014+Math.max(0,amount);lower.position.y=-.021-Math.max(0,amount);ring.rotation.z=t*.14;renderer.render(scene,camera);
 }
 const start=()=>{if(!raf&&enabled&&!document.hidden)raf=requestAnimationFrame(frame);};
 window.nexusAvatarState=s=>{voice=s;};window.nexusSpeechRange=word=>{wordUntil=performance.now()+Math.min(800,Math.max(140,String(word).length*70));};
 window.nexusAvatarMode=()=>{if(!available){fallback('3D interrompido · usa MENU para recarregar');return;}enabled=!enabled;host.classList.toggle('model-ready',enabled);document.querySelector('#avatarMode').textContent=enabled?'3D ESTILIZADO':'ATIVAR 3D';document.querySelector('#avatarInfo').textContent=enabled?'AVATAR 3D ESTILIZADO · BOCA ANIMADA':'ROSTO REALISTA · FALA ANIMADA';if(enabled)start();else{cancelAnimationFrame(raf);raf=0;}};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();available=false;enabled=false;cancelAnimationFrame(raf);fallback('WebGL indisponível · ilustração local');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;voice='idle';}else start();});host.classList.remove('model-ready');document.querySelector('#avatarMode').textContent='ATIVAR 3D';document.querySelector('#avatarInfo').textContent='ROSTO REALISTA · FALA ANIMADA';
 }catch(e){if(renderer)renderer.dispose();fallback('Sem suporte 3D · ilustração local');window.nexusAvatarMode=()=>{};}
 document.querySelector('#avatarMode').onclick=e=>{e.stopPropagation();window.nexusAvatarMode();};
})();
