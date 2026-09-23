import * as T from './vendor/three.module.js';
const host=document.querySelector('[data-hero-flow]'),pause=host.querySelector('[data-flow-toggle]');
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),mix=T.MathUtils.lerp,clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n)};
function shape(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function solid(w,h,r,d,m){const g=new T.ExtrudeGeometry(shape(w,h,r),{depth:d,bevelEnabled:true,bevelSegments:4,bevelSize:.018,bevelThickness:.018,curveSegments:24,steps:1});g.translate(0,0,-d/2);return new T.Mesh(g,m);}
function surface(w,h,r,map){const g=new T.ShapeGeometry(shape(w,h,r),24),p=g.attributes.position,u=g.attributes.uv;for(let i=0;i<p.count;i++)u.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);return new T.Mesh(g,new T.MeshBasicMaterial({map,toneMapped:false}));}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
function box(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,s,x,y,size=25,color='#27313d',weight=500){c.save();c.translate(x,y);if(c.layoutScale)c.scale(1/c.layoutScale,1);c.font=`${weight} ${size}px Manrope,Arial,sans-serif`;c.fillStyle=color;c.fillText(s,0,0);c.restore();}
async function boot(){
 await document.fonts.ready;
 const mascot=new Image();mascot.src='/assets/newmani/hero-v1/mascots/motivator_cutout_transparent.webp';await mascot.decode();
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;host.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,60);camera.position.set(0,0,15);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight('#ffffff','#a5b3c0',3));const key=new T.DirectionalLight('#ffffff',4);key.position.set(-5,8,7);scene.add(key);const rimLight=new T.DirectionalLight('#cadfeb',3);rimLight.position.set(5,1,-4);scene.add(rimLight);
 const studio=new T.Scene();studio.background=new T.Color('#bfc7ce');for(const [x,y,z,w,h]of[[-4,4,2,4,8],[4,1,1,2,7],[0,6,-3,8,3]]){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:'white',side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);studio.add(p);}const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(studio,.025).texture;pm.dispose();
 const phone=new T.Group();scene.add(phone);
 // Narrow body; screen is independently re-laid out at matching pixel density.
 const metal=new T.MeshStandardMaterial({color:'#767b82',metalness:.96,roughness:.19});phone.add(solid(2.42,5.35,.36,.2,metal));
 const bezel=solid(2.36,5.29,.34,.018,new T.MeshPhysicalMaterial({color:'#10151c',metalness:.4,roughness:.16,clearcoat:1}));bezel.position.z=.102;phone.add(bezel);
 const edgePoints=shape(2.40,5.33,.36).getPoints(160).map(p=>new T.Vector3(p.x,p.y,.106));phone.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(edgePoints),new T.LineBasicMaterial({color:'#e4e8ec',transparent:true,opacity:.75})));
 const rear=solid(2.30,5.22,.33,.04,new T.MeshPhysicalMaterial({color:'#181b20',metalness:.35,roughness:.32,clearcoat:.6}));rear.position.z=-.126;phone.add(rear);
 for(const [x,y,h]of[[1.23,.78,.66],[-1.23,1.03,.44],[-1.23,.45,.44]]){const b=solid(.05,h,.02,.06,metal);b.position.set(x,y,0);phone.add(b);}
 const banks=['СберБанк','Альфа-Банк','ВТБ','Т-Банк'],colors=['#348e69','#c25050','#407bb0','#9c844e'];
 const ui=canvasTexture(684,1560,c=>{c.scale(.912,1);c.layoutScale=.912;
 c.fillStyle='#f5f6f8';c.fillRect(0,0,750,1560);text(c,'9:41',47,62,27,'#18212b',700);box(c,277,28,196,50,25,'#080d15');text(c,'▂▄▆  ▰',598,60,26);text(c,'mani',42,156,65,'#ff682d',800);text(c,'⠿',654,151,48);
 box(c,30,575,690,145,32,'#ffffff');text(c,'Общий баланс',55,620,26,'#626d78');text(c,'*** ₽',54,681,45,'#192430',700);text(c,'›',663,672,45);text(c,'Обновлено сегодня в 15:32',77,759,23,'#74808b');
 box(c,30,790,690,113,28,'#ffffff');text(c,'↑',55,857,41);text(c,'Доходы',106,832,24);text(c,'*** ₽',106,875,30,'#222b34',700);text(c,'↓',397,857,41);text(c,'Расходы',449,832,24);text(c,'*** ₽',449,875,30,'#222b34',700);
 text(c,'Предстоящие платежи',35,961,30,'#202b36',700);box(c,30,987,690,111,27,'#ffffff');text(c,'Фев',51,1024,20,'#75808a');text(c,'15',55,1068,30);text(c,'Spotify',137,1032,29);text(c,'Т-Банк *2136',137,1073,24,'#73808b');text(c,'−299 ₽',583,1058,28);
 text(c,'Банки',35,1160,31,'#202b36',700);
 for(let i=0;i<4;i++){const x=30+(i%2)*354,y=1190+Math.floor(i/2)*126;box(c,x,y,336,112,25,'#e9edf2');text(c,'Подключаем',x+23,y+48,23,'#8a96a2');text(c,'счета банка',x+23,y+82,22,'#a0a9b1');}
 box(c,213,1464,324,60,30,'#ffffff');text(c,'⌂     ●     ♙',256,1504,30);box(c,255,1538,240,8,4,'#24313e');
 });
 const front=surface(2.28,5.2,.32,ui);front.position.z=.135;phone.add(front);
 const mascotMap=new T.Texture(mascot);mascotMap.colorSpace=T.SRGBColorSpace;mascotMap.needsUpdate=true;
 const character=new T.Mesh(new T.PlaneGeometry(1.65*mascot.width/mascot.height,1.65),new T.MeshBasicMaterial({map:mascotMap,transparent:true,depthWrite:false,toneMapped:false}));character.position.set(0,1.32,.148);phone.add(character);
 const slots=banks.map((name,i)=>{const maps=[1,2].map(count=>canvasTexture(672,224,c=>{box(c,0,0,672,224,48,'#ffffff');box(c,24,34,72,72,25,colors[i]);text(c,['С','А','В','Т'][i],43,85,40,'#ffffff',800);text(c,name,117,84,40,'#202c38',650);text(c,`${count} ${count===1?'карта':'карты'} · Сегодня в 08:40`,27,176,30,'#7b8692');text(c,'✓',601,85,37,'#44a976');}));const m=surface(1.12,.374,.08,maps[0]);m.userData.maps=maps;m.position.set((i%2?1:-1)*.59,-1.554-Math.floor(i/2)*.42,.15);m.material.transparent=true;phone.add(m);return m;});
 const starts=[[-1.7,2.65,.35],[2.1,1.55,-.65],[-2.65,.5,.65],[1.65,2.7,-.25],[-1.6,-.8,.45],[2.45,-.85,-.5],[-2.1,-2.45,.65],[1.3,-2.35,.4]];
 // Independent, finite nudges with rests, not periodic or orbiting motion.
 const scattered=[
 [.12,-.31,-.57,.05,.7,.14,-.17,.08],
 [-.24,.49,.73,.65,.55,-.16,.09,-.12],
 [.27,.18,-.16,.2,.48,.19,.13,-.08],
 [-.13,-.53,-.84,1.1,.65,-.17,-.14,.12],
 [.19,.35,.48,.4,.6,-.12,.17,-.1],
 [-.3,-.22,.13,1.35,.5,.13,-.16,.09],
 [.08,-.4,-.73,.9,.7,.17,.11,-.07],
 [.23,.28,.63,.15,.8,-.14,.16,.1]
 ];
 const palette=['#138d61','#dd485f','#2872db','#dba321','#7754bd','#dc713b','#209fa7','#b55693'];
 const cards=starts.map((_,i)=>{const g=new T.Group();scene.add(g);const b=i%4,color=palette[i];g.add(solid(1.73,1.08,.12,.025,new T.MeshStandardMaterial({color,metalness:.55,roughness:.25})));const map=canvasTexture(864,540,c=>{const gradient=c.createLinearGradient(0,0,864,540);gradient.addColorStop(0,color);gradient.addColorStop(1,color+'b0');c.fillStyle=color;c.fillRect(0,0,864,540);c.fillStyle=gradient;c.fillRect(0,0,864,540);c.strokeStyle='#ffffff20';c.lineWidth=2;for(let j=0;j<16;j++){c.beginPath();c.ellipse(780,440,150+j*19,170+j*14,-.4,0,Math.PI*2);c.stroke();}text(c,banks[b],45,87,40,'#ffffff',650);box(c,49,184,94,75,14,'#ddcca6');c.strokeStyle='#907d60';c.lineWidth=3;c.strokeRect(68,192,54,58);c.beginPath();c.moveTo(49,221);c.lineTo(143,221);c.stroke();text(c,')))',172,236,31,'#ffffffad');text(c,'••••  '+[2481,6052,3194,2136,9205,7614,5308,1602][i],48,398,40,'#ffffffdc');text(c,i<4?'Основная карта':'Дополнительная карта',48,486,25,'#ffffffb0');});const f=surface(1.72,1.07,.12,map);f.material.dispose();f.material=new T.MeshPhysicalMaterial({map,roughness:.32,metalness:.18,clearcoat:1,clearcoatRoughness:.15});f.position.z=.035;g.add(f);return g;});
 let t=reduced.matches?11:0,paused=false,last=0,raf=0,visible=true,phase=-1;
 const target=new T.Vector3();
 // Keep bank landing coordinates aligned with the narrower screen.
 slots.forEach(s=>{s.position.x*=.912;s.geometry.scale(.912,1,1);});
 function render(){const settle=ease((t-8.8)/1.8),alive=1-settle;phone.rotation.set(mix(.05,-.015,settle)+Math.sin(t*1.1)*.055*alive,mix(-.23,.26,settle)+Math.sin(t*.82)*.19*alive,mix(.035,-.035,settle)+Math.sin(t*1.05)*.045*alive);phone.position.set(Math.sin(t*.8)*.13*alive,mix(-.12,.05,settle)+Math.sin(t*1.4)*.12*alive,Math.sin(t*.9)*.12*alive);const size=mix(.96,1.28,settle);phone.scale.set(size,size,size*.62);
 const hello=clamp((t-8.6)/1.7),greeting=Math.sin(hello*Math.PI);character.rotation.z=Math.sin(hello*Math.PI*4)*.09*greeting;character.position.y=1.32+greeting*.08;character.scale.setScalar(1+greeting*.045);phone.updateMatrixWorld(true);
 cards.forEach((card,i)=>{const start=2+i*.72,p=ease((t-start)/1.35),[sx,sy,sz]=starts[i];slots[i%4].getWorldPosition(target);const compact=camera.aspect<.85,k=compact?.72:1;
 const orbit=t*(1.75+i*.065)+i*Math.PI*.78,radius=2.15+(i%3)*.23,angle=orbit+p*Math.PI*1.2;
 const ox=Math.cos(angle)*radius*k,oy=Math.sin(angle)*2.3,oz=Math.sin(angle+.8)*1.15;
 card.position.set(mix(ox,target.x,p),mix(oy,target.y,p),mix(oz,target.z+.055,p));
 const spin=Math.min(t,start)*2.65+i*.9,unwind=ease(p/.82);
 card.rotation.set(mix(Math.sin(spin*.63)*.75,phone.rotation.x,unwind),mix(spin,phone.rotation.y,unwind),mix(orbit*.72,phone.rotation.z,unwind));card.scale.set(mix(1,.593,p),mix(1,.346,p),1);card.visible=p<1;
 });
 slots.forEach((s,i)=>{const a=ease((t-(2+i*.72+1.05))/.35),second=t>=2+(i+4)*.72+1.35;s.visible=a>0;s.material.opacity=a;s.material.map=s.userData.maps[second?1:0];const arrival=2+(second?i+4:i)*.72+1.35,pulse=Math.sin(clamp((t-arrival)/.5)*Math.PI)*.065;s.scale.setScalar(1+pulse);});
 pause.textContent=t>=11?'Повторить анимацию':paused?'Продолжить анимацию':'Пауза';
 pause.setAttribute('aria-label',pause.textContent);renderer.render(scene,camera);}

 function tick(now){raf=0;if(!last)last=now;t=Math.min(11,t+Math.min((now-last)/1000,.08));last=now;render();if(t<11&&!paused&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
 function run(){last=0;if(!raf&&!paused&&visible&&!document.hidden&&t<11)raf=requestAnimationFrame(tick);}
 function resize(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.z=Math.max(14, 7.6 / (2*Math.tan(32*Math.PI/360)*camera.aspect));camera.updateProjectionMatrix();render();}
 new ResizeObserver(resize).observe(host);new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)run();else{cancelAnimationFrame(raf);raf=0;}},{threshold:.1}).observe(host);
 pause.onclick=()=>{if(t>=11){t=0;paused=false;}else paused=!paused;if(paused){cancelAnimationFrame(raf);raf=0;}render();run();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else run();});
 reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(raf);raf=0;t=11;host.classList.remove('ready');}else{render();host.classList.add('ready');}});

 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);host.classList.remove('ready');pause.hidden=true;});
 resize();host.classList.add('ready');clearTimeout(window.heroFlowTimeout);document.documentElement.classList.remove('hero-flow-pending');pause.hidden=false;run();
}
boot().catch(e=>{console.error(e);clearTimeout(window.heroFlowTimeout);document.documentElement.classList.remove('hero-flow-pending');host.classList.remove('ready');pause.hidden=true;});
