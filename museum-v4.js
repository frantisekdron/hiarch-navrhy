import * as THREE from './assets/vendor/three.module.min.js';
import {makeProjectModel} from './museum-models-v4.js?v=4.0';

const $=id=>document.getElementById(id);
const shell=$('museum'),host=$('museumCanvas'),status=$('museumStatus');
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:650px)');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const companies={hiarch:{name:'HiARCH',role:'Architektura a povolení',copy:'Navrhujeme architekturu a připravujeme povolení. Od prvního záměru po potřebnou dokumentaci.'},hiplan:{name:'HiPLAN',role:'Vlastní developerské projekty',copy:'Realizujeme vlastní developerské projekty.'},hireal:{name:'HiREAL',role:'Realitní činnost',copy:'Věnujeme se realitní činnosti a nabývání nemovitostí.'}};
let projects=[],renderer=null,scene=null,camera=null,selected=-1,entered=false,walking=false,visible=true;
let cameraTarget=new THREE.Vector3(),cameraFrame=0,movementFrame=0,renderFrame=0,frameCount=0;
let yaw=0,pitch=-.05,gesture=null,lastMove=0,selectedLight=null;
const keys=new Set(),tables=[],pickables=[];
const say=text=>status.textContent=text;
const clockEase=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const photo=p=>p.image||'';
const thumb=p=>p.thumbnail||`assets/v4/thumbs/${p.id}.webp`;
function render(){if(!renderer||!visible||document.hidden)return;renderer.render(scene,camera);shell.dataset.frames=String(++frameCount);shell.dataset.cameraZ=camera.position.z.toFixed(2)}
function scheduleRender(){if(!renderer||renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})}
function stopFrames(){cancelAnimationFrame(cameraFrame);cancelAnimationFrame(movementFrame);cameraFrame=0;movementFrame=0;keys.clear();lastMove=0}
function flyTo(position,target,duration=700){
 if(!camera)return;stopFrames();const startP=camera.position.clone(),startT=cameraTarget.clone(),endP=new THREE.Vector3(...position),endT=new THREE.Vector3(...target);let began=null;
 const apply=t=>{camera.position.lerpVectors(startP,endP,t);cameraTarget.lerpVectors(startT,endT,t);camera.lookAt(cameraTarget);render()};
 if(reduced.matches||duration===0){apply(1);return}
 const step=now=>{if(began===null)began=now;const t=Math.min(1,(now-began)/duration);apply(clockEase(t));if(t<1)cameraFrame=requestAnimationFrame(step);else cameraFrame=0};cameraFrame=requestAnimationFrame(step);
}
function overview(){setWalking(false);selected=-1;$('selectedExhibit').hidden=true;updateSelection();entered=true;shell.classList.add('entered');$('entryCard').inert=true;$('entryCard').setAttribute('aria-hidden','true');flyTo(mobile.matches?[0,4.5,27]:[0,4.4,18.7],mobile.matches?[0,-3,-1]:[0,1.55,-1]);say('Přehled všech osmi vitrín. Vyberte stůl nebo projekt ze seznamu.')}
function focusProject(id,scroll=false){
 const i=projects.findIndex(p=>p.id===id);if(i<0)return;selected=i;shell.dataset.selectedProject=id;entered=true;shell.classList.add('entered');$('entryCard').inert=true;$('entryCard').setAttribute('aria-hidden','true');setWalking(false);const p=projects[i],t=tables[i];
 $('selectedExhibit').hidden=false;$('selectedImage').src=thumb(p);$('selectedImage').alt=p.name;$('selectedLocation').textContent=[p.city,p.year].filter(Boolean).join(' · ');$('selectedName').textContent=p.name;
 updateSelection();if(t){const offset=mobile.matches?5.25:4.35;flyTo([t.x*.13,2.85,t.z+offset],[t.x,1.65,t.z],700)}
 if(scroll)shell.scrollIntoView({block:'start',behavior:reduced.matches?'auto':'smooth'});
 document.querySelector('.project-picker').open=false;say(`Vitrína ${i+1} z ${projects.length}: ${p.name}. Hmotová studie podle fotografií.`);
}
function updateSelection(){
 $('tourPosition').textContent=selected<0?'PŘEHLED SÁLU':`STŮL ${selected+1} / ${projects.length}`;
 document.querySelectorAll('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===projects[selected]?.id)));
 tables.forEach((t,i)=>{t.rim.material.color.set(i===selected?0xe7b56f:0x93b38a);t.rim.material.opacity=i===selected?.95:.18});
 if(selectedLight&&selected>=0){const t=tables[selected];selectedLight.position.set(t.x,5,t.z+.1);selectedLight.target.position.set(t.x,1.3,t.z);renderer.shadowMap.needsUpdate=true}
 scheduleRender();
}
function setWalking(value){
 walking=value;shell.classList.toggle('walking',value);$('walkPad').hidden=!value;$('walkToggle').setAttribute('aria-pressed',String(value));$('walkToggle').innerHTML=value?'Ukončit chůzi <span>×</span>':'Procházet sál <span>↗</span>';
 keys.clear();cancelAnimationFrame(movementFrame);movementFrame=0;lastMove=0;
 if(value){entered=true;shell.classList.add('entered');$('entryCard').inert=true;$('entryCard').setAttribute('aria-hidden','true');selected=-1;$('selectedExhibit').hidden=true;updateSelection();yaw=0;pitch=-.05;flyTo([0,2.35,10.2],[0,1.9,-8],650);say('Chůze zapnutá. WASD nebo šipky, tažením se rozhlédnete.');host.focus({preventScroll:true})}
}
function moveLoop(now){
 if(!walking||!keys.size||!visible||document.hidden){movementFrame=0;lastMove=0;return}
 cancelAnimationFrame(cameraFrame);cameraFrame=0;const dt=lastMove?Math.min(.035,(now-lastMove)/1000):.016;lastMove=now;let f=0,s=0;
 if(keys.has('forward'))f+=1;if(keys.has('back'))f-=1;if(keys.has('left'))s-=1;if(keys.has('right'))s+=1;
 const speed=2.7*dt;camera.position.x=THREE.MathUtils.clamp(camera.position.x+(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,-1.28,1.28);camera.position.z=THREE.MathUtils.clamp(camera.position.z+(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed,-10.6,12.1);camera.position.y=2.35;
 lookFromWalk();render();movementFrame=requestAnimationFrame(moveLoop);
}
function lookFromWalk(){cameraTarget.set(camera.position.x-Math.sin(yaw)*Math.cos(pitch)*8,camera.position.y+Math.sin(pitch)*8,camera.position.z-Math.cos(yaw)*Math.cos(pitch)*8);camera.lookAt(cameraTarget)}
function startStep(key){if(!walking)setWalking(true);keys.add(key);if(!movementFrame)moveLoop(performance.now())}
function openCompany(id){const c=companies[id];if(!c)return;$('companyDialogBody').innerHTML=`<article class="company-profile"><span class="eyebrow">${esc(c.role)}</span><h2>${esc(c.name)}</h2><p>${esc(c.copy)}</p><a href="mailto:info@hiarch.cz">Kontaktovat skupinu ↗</a></article>`;if(!$('companyDialog').open)$('companyDialog').showModal()}
function openProject(id){
 const p=projects.find(p=>p.id===id);if(!p)return;const labels={housing:'Bydlení',public:'Veřejné stavby',commercial:'Komerční stavby'};const gallery=(p.gallery||[]).filter(s=>s!==p.image);
 $('projectDialogBody').innerHTML=`<div class="project-detail-grid"><img src="${esc(photo(p))}" alt="${esc(p.name)}"><div class="project-detail-copy"><span class="eyebrow">${esc(p.city)} / PROJEKT</span><h2>${esc(p.name)}</h2><p>${esc(p.summary||'')}</p><div class="detail-facts"><div><dt>Lokalita</dt><dd>${esc(p.city)}</dd></div><div><dt>Rok</dt><dd>${esc(p.year||'Neuveden')}</dd></div><div><dt>Typ</dt><dd>${esc(labels[p.type]||p.type)}</dd></div><div><dt>Stav</dt><dd>${esc(p.status||'Neuveden')}</dd></div></div><button class="participation" type="button" data-company="hiarch">V portfoliu HiARCH ↗</button><p><span class="study-label">Hmotová studie podle fotografií</span></p><p>Maketa představuje základní objem a charakter stavby. Fotografii projektu vidíte vedle ní.</p></div></div>${gallery.length?`<div class="project-gallery">${gallery.map(src=>`<img src="${esc(src)}" loading="lazy" alt="${esc(p.name)} — další pohled">`).join('')}</div>`:''}`;
 if(!$('projectDialog').open)$('projectDialog').showModal();
}
function buildInterface(){
 $('pickerCount').textContent=String(projects.length);
 $('exhibitPicker').innerHTML=projects.map((p,i)=>`<button type="button" data-focus="${esc(p.id)}"><img src="${esc(thumb(p))}" alt="" loading="lazy" data-fallback="${esc(photo(p))}"><span><b>${esc(p.name)}</b><small>${esc(p.city)}</small></span><span class="picker-index">${String(i+1).padStart(2,'0')}</span></button>`).join('');
 $('projectIndex').innerHTML=projects.map((p,i)=>`<article class="project-card"><button type="button" data-open="${esc(p.id)}"><img src="${esc(p.preview||photo(p))}" alt="${esc(p.name)}" loading="lazy"><span><b>VITRÍNA ${String(i+1).padStart(2,'0')}</b><b>${esc(p.year||'')}</b></span><h3>${esc(p.name)}</h3><p>${esc(p.city)}</p></button><div class="card-actions"><button type="button" data-focus="${esc(p.id)}" data-scroll>Najít ve výstavě ↗</button><button type="button" data-open="${esc(p.id)}">Fotografie a informace ↗</button></div></article>`).join('');
 document.querySelectorAll('img[data-fallback]').forEach(img=>img.addEventListener('error',()=>{img.src=img.dataset.fallback},{once:true}));
}
function textureText(lines,{width=1024,height=256,color='#e1efd9',glow=false}={}){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.clearRect(0,0,width,height);x.textAlign='center';x.textBaseline='middle';
 lines.forEach((line,i)=>{let size=height/(lines.length===1?1.7:3.5);x.font=`500 ${size}px "Space Grotesk", sans-serif`;while(x.measureText(line).width>width*.92){size-=2;x.font=`500 ${size}px "Space Grotesk", sans-serif`}x.fillStyle=color;if(glow){x.shadowColor=color;x.shadowBlur=height*.065}x.fillText(line,width/2,height*(i+.5)/lines.length);if(glow){x.shadowBlur=0;x.fillText(line,width/2,height*(i+.5)/lines.length)}});
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy()>2?2:1;return t;
}
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.03,...extra})}
function box(w,h,d,x,y,z,material,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function glowPlane(w,h,x,y,z,text,color='#dceccc'){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:textureText([text],{glow:true,color}),transparent:true,depthWrite:false,toneMapped:false}));m.position.set(x,y,z);scene.add(m);return m;
}
function buildRoom(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x17251f);scene.fog=new THREE.Fog(0x17251f,26,60);
 camera=new THREE.PerspectiveCamera(mobile.matches?60:52,1,.1,100);camera.position.set(0,mobile.matches?4.5:3.2,mobile.matches?27.5:18.5);cameraTarget.set(0,mobile.matches?-3:1.6,-.5);camera.lookAt(cameraTarget);
 scene.add(new THREE.HemisphereLight(0xe2edce,0x303a2f,1.7));const sun=new THREE.DirectionalLight(0xffe4bd,2.0);sun.position.set(-5,8,10);sun.castShadow=false;sun.shadow.mapSize.set(mobile.matches?512:1024,mobile.matches?512:1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.025;sun.shadow.bias=-.0004;scene.add(sun);
 const floor=box(14,.15,37,0,-.08,2,mat(0x4d5a50));floor.castShadow=false;
 const wall=mat(0x2d3b33),stone=mat(0x566052),metal=mat(0x232d24,{metalness:.3,roughness:.6});
 box(14,.12,26,0,5.56,-.8,wall);box(.18,5.6,29,-7,2.8,.3,wall);box(.18,5.6,29,7,2.8,.3,wall);box(14,5.6,.2,0,2.8,-14.1,wall);
 for(const x of [-5.8,-1.95,1.95,5.8])box(.045,4.4,.03,x,2.5,-13.95,mat(0x67735d));
 box(2.5,5.1,.2,-5.9,2.55,12,stone);box(2.5,5.1,.2,5.9,2.55,12,stone);box(12,.45,.6,0,5.35,12,metal);
 const portal=mat(0x91ad82,{emissive:0x54744b,emissiveIntensity:.6,roughness:.35});box(.14,5.1,.15,-4.55,2.55,11.7,portal);box(.14,5.1,.15,4.55,2.55,11.7,portal);box(9.25,.14,.15,0,5.08,11.7,portal);
 glowPlane(8.2,.65,0,4.72,11.58,'HiARCH  /  HiPLAN  /  HiREAL','#e2f2d6');
 const brandMat=new THREE.MeshBasicMaterial({color:0xb5d7a5,toneMapped:false});
 for(const [x,y,size] of [[-5.35,2.8,1.0],[-5.05,2.5,1.0],[-4.75,2.2,1.0]]){box(.055,size,.055,x,y,-13.89,brandMat);box(size,.055,.055,x+size/2-.025,y+size/2,-13.89,brandMat)}
 for(const [id,name,x] of [['hiarch','HiARCH',-2.7],['hiplan','HiPLAN',.5],['hireal','HiREAL',3.7]]){const m=glowPlane(2.5,.75,x,3.05,-13.88,name,'#d6efc8');m.userData.companyId=id;pickables.push(m)}
 glowPlane(9,.46,.2,1.95,-13.87,'ARCHITEKTURA     /     VLASTNÍ PROJEKTY     /     REALITY','#9eb98e');
 for(const x of [-3.4,3.4])box(.09,.09,23,x,5.15,-.5,metal);
 const tableTop=mat(0xc4c6b2,{roughness:.65});const baseMat=mat(0x989e8c);const glassMat=new THREE.LineBasicMaterial({color:0xd3e6c3,transparent:true,opacity:.18});
 const poolCanvas=document.createElement('canvas');poolCanvas.width=64;poolCanvas.height=64;const pc=poolCanvas.getContext('2d');const gradient=pc.createRadialGradient(32,32,1,32,32,31);gradient.addColorStop(0,'rgba(230,240,190,.9)');gradient.addColorStop(.35,'rgba(223,232,182,.35)');gradient.addColorStop(1,'rgba(223,232,182,0)');pc.fillStyle=gradient;pc.fillRect(0,0,64,64);const poolTexture=new THREE.CanvasTexture(poolCanvas);poolTexture.colorSpace=THREE.SRGBColorSpace;
 projects.forEach((p,i)=>{
  const x=i%2===0?-3.4:3.4,z=7.2-Math.floor(i/2)*4.6+(i%2?.8:0);const group=new THREE.Group();group.position.set(x,0,z);group.userData.projectId=p.id;scene.add(group);
  box(2.25,.78,1.55,0,.42,0,baseMat,group);box(2.65,.1,1.95,0,.86,0,tableTop,group);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.67,.115,1.97)),new THREE.LineBasicMaterial({color:0x93b38a,transparent:true,opacity:.18}));edge.position.y=.86;group.add(edge);
  const pool=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.8),new THREE.MeshBasicMaterial({map:poolTexture,transparent:true,opacity:.38,depthWrite:false,toneMapped:false}));pool.rotation.x=-Math.PI/2;pool.position.y=.921;group.add(pool);
  const model=makeProjectModel(p.id,THREE);const b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());const scale=Math.min(2.0/Math.max(.1,size.x),1.25/Math.max(.1,size.z),1.65/Math.max(.1,size.y));model.traverse(o=>{if(o.isMesh&&o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{m.transparent=true;m.opacity=.24;m.depthWrite=false;if(m.emissive){m.emissive.set(0x477a5b);m.emissiveIntensity=.55}});o.castShadow=false}else if(o.isLineSegments&&o.material){o.material.color.set(0xd1f6d5);o.material.opacity=.95;o.material.toneMapped=false}});model.scale.setScalar(scale);model.position.set(-center.x*scale,.94-b.min.y*scale,-center.z*scale);group.add(model);
  const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.55,2.05,1.8)),glassMat);cage.position.y=1.95;group.add(cage);
  const plaque=new THREE.Mesh(new THREE.PlaneGeometry(2.28,.49),new THREE.MeshBasicMaterial({map:textureText([p.name,p.city],{width:1024,height:256,color:'#edf3e1'}),transparent:true,toneMapped:false}));plaque.position.set(0,.72,1.001);plaque.rotation.x=-.08;group.add(plaque);
  const plaqueBack=box(2.4,.52,.04,0,.72,.97,metal,group);plaqueBack.castShadow=false;
  group.traverse(o=>{o.userData.projectId=p.id;if(o.isMesh)o.receiveShadow=true});pickables.push(group);
  const fixture=box(.35,.18,.35,x,5.0,z,metal);fixture.castShadow=false;
  const beam=new THREE.Mesh(new THREE.ConeGeometry(1.35,4.0,20,1,true),new THREE.MeshBasicMaterial({color:0xc8dda7,transparent:true,opacity:.023,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));beam.position.set(x,2.95,z);scene.add(beam);
  tables.push({x,z,group,rim:edge,model});
 });
 selectedLight=new THREE.SpotLight(0xe4efc7,24,12,.48,.8,1.3);selectedLight.position.set(-3.4,5,7.2);selectedLight.target.position.set(-3.4,1.2,7.2);selectedLight.castShadow=true;selectedLight.shadow.mapSize.set(512,512);selectedLight.shadow.normalBias=.02;scene.add(selectedLight,selectedLight.target);
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
}
function pick(event){
 if(!renderer)return;const r=host.getBoundingClientRect();const v=new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(v,camera);const hits=ray.intersectObjects(pickables,true);
 if(hits.length){let o=hits[0].object;while(o&&!o.userData.projectId&&!o.userData.companyId)o=o.parent;if(o?.userData.companyId){openCompany(o.userData.companyId);return}if(o?.userData.projectId){focusProject(o.userData.projectId);return}}
 if(!entered){focusProject(projects[0]?.id);return}
 if(walking){const point=new THREE.Vector3();ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point);if(Math.abs(point.x)<1.5){const z=THREE.MathUtils.clamp(point.z,-10.6,12.1);flyTo([THREE.MathUtils.clamp(point.x,-1.28,1.28),2.35,z],[point.x,2.0,z-8],500)}}
}
function setFallback(){shell.dataset.renderer='html';$('museumFallback').hidden=false;say('Projekty jsou dostupné v přehledu pod galerií.');$('museumEnter').disabled=true}
async function init(){
 try{const response=await fetch('assets/v4/projects.json');if(!response.ok)throw Error();const data=await response.json();projects=data.projects||[];if(!projects.length)throw Error();buildInterface()}catch{setFallback();say('Projektové podklady se nepodařilo načíst. Obnovte stránku.');return}
 await document.fonts.ready;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile.matches?1.25:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);buildRoom();shell.dataset.renderer='webgl';shell.dataset.exhibits=String(tables.length);shell.dataset.roomReady='true';say('Výstavní sál je připravený.');const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();scheduleRender()};new ResizeObserver(resize).observe(host);resize();renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stopFrames();setFallback()});}
 catch(error){console.warn('Museum 3D unavailable; project index retained.',error);setFallback()}
}
// Interface works independently of the 3D canvas.
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.company){openCompany(b.dataset.company);return}if(b.dataset.focus){focusProject(b.dataset.focus,b.hasAttribute('data-scroll'));return}if(b.dataset.open){openProject(b.dataset.open);return}if(b.hasAttribute('data-close'))b.closest('dialog')?.close()});
$('museumEnter').addEventListener('click',()=>focusProject(projects[0]?.id));$('overviewButton').addEventListener('click',overview);$('walkToggle').addEventListener('click',()=>setWalking(!walking));$('nextExhibit').addEventListener('click',()=>focusProject(projects[(selected+1+projects.length)%projects.length]?.id));$('previousExhibit').addEventListener('click',()=>focusProject(projects[selected<0?projects.length-1:(selected-1+projects.length)%projects.length]?.id));$('openProject').addEventListener('click',()=>{if(selected>=0)openProject(projects[selected].id)});
for(const dialog of document.querySelectorAll('dialog')){dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});dialog.addEventListener('close',scheduleRender)}
const keyMap={w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',d:'right',arrowright:'right'};
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const key=keyMap[event.key.toLowerCase()];if(!key)return;if(walking){event.preventDefault();startStep(key)}else if(document.activeElement===host&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();const i=event.key==='ArrowRight'?selected+1:selected-1;focusProject(projects[(i+projects.length)%projects.length].id)}});
document.addEventListener('keyup',event=>{const key=keyMap[event.key.toLowerCase()];if(key)keys.delete(key)});
for(const button of document.querySelectorAll('[data-step]')){button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);startStep(button.dataset.step)});const end=()=>keys.delete(button.dataset.step);button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end)}
host.addEventListener('pointerdown',event=>{if(event.button>0)return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};host.focus({preventScroll:true});if(walking)host.setPointerCapture(event.pointerId)});
host.addEventListener('pointermove',event=>{if(!gesture||gesture.id!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.abs(dx)+Math.abs(dy)>8)gesture.dragged=true;if(walking){cancelAnimationFrame(cameraFrame);cameraFrame=0;yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-.37,.3);lookFromWalk();scheduleRender();host.classList.add('is-dragging');gesture.x=event.clientX;gesture.y=event.clientY}});
host.addEventListener('pointerup',event=>{const g=gesture;gesture=null;host.classList.remove('is-dragging');if(g&&!g.dragged)pick(event)});host.addEventListener('pointercancel',()=>{gesture=null;host.classList.remove('is-dragging')});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stopFrames();else scheduleRender()},{threshold:.03}).observe(shell);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFrames();else scheduleRender()});window.addEventListener('blur',()=>{keys.clear()});
init();
