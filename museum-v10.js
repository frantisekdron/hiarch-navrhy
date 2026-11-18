import {exhibitView} from './museum-placement-v19.js?v=23.0';
import {addChessSalon} from './museum-chess-salon-v20.js?v=24.0';
import {PICK_LAYER,reachableHit,galleryPixelRatio,galleryFieldOfView} from './museum-performance-v20.js';
import {isWalkableRegion,navigationBounds} from './museum-salon-navigation-v18.js?v=18.0';
import {createWindowLife} from './museum-window-life-v16.js?v=21.0';
import {addGalleryLounge} from './museum-lounge-v19.js?v=19.0';
import {createChessExhibit} from './museum-chess-v15.js?v=18.0';
import * as THREE from './assets/vendor/three.module.min.js';
import {makeProjectModel,loadClientModels,getModelState,prioritizeModel,setModelLoadingPaused} from './museum-models-v22.js?v=24.0';
import {buildGalleryRoom} from './museum-room-v10.js?v=24.0';
import {addWallMap} from './museum-wallmap-v18.js?v=18.0';
import {OrbitControls} from './assets/vendor/OrbitControls.js';
import {bindGalleryTouch, roomOrbitDistance} from './museum-touch-v11.js?v=11.0';
import {findPath} from './fd-pathfinding-v8.js';
import {bindMovePad} from './museum-input-v8.js?v=11.0';

const $=id=>document.getElementById(id);
const shell=$('museum'),host=$('museumCanvas'),status=$('museumStatus');
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:650px), (pointer:coarse) and (max-height:520px)');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const companies={hiarch:{name:'HiARCH',role:'Architektura a povolení',copy:'Navrhujeme architekturu a připravujeme povolení. Od prvního záměru po potřebnou dokumentaci.'},hiplan:{name:'HiPLAN',role:'Vlastní developerské projekty',copy:'Realizujeme vlastní developerské projekty.'},hireal:{name:'HiREAL',role:'Realitní činnost',copy:'Věnujeme se realitní činnosti a nabývání nemovitostí.'}};
let projects=[],renderer=null,scene=null,camera=null,selected=-1,entered=false,walking=false,visible=true;
let cameraTarget=new THREE.Vector3(),cameraFrame=0,movementFrame=0,renderFrame=0,frameCount=0;
let yaw=0,pitch=-.05,gesture=null,lastMove=0;
let controls=null,doors=[],doorProgress=0,activeNote=null,completeEntry=null;
let mapMode=false,wallMap=null,czGeo=null,facadeTextures={},lightRig=null,lastProject='koupelni',artworks=[],benches=[],seatMode=null;
let loadPlinthContact=null,galleryMapLight=null,installModel=null,chessSalon=null,salonStage='none',salonDoor=0,salonTransit=false;const mapColors=new Map();
let lounge=null,chessExhibit=null,chessSession=null,chessMode=false,chessLoading=null,chessSelected=null,chessLevel='medium',chessFocus='e2',chessKeyboard=false,chessFen='',promotionMove=null,sceneObstacles=[],ambientTimer=0;
let windowLife=null,windowLayouts={},lifePlay=!reduced.matches,lifeUserChoice=false,lifeTime=0,lifeLast=0;
const viewFrustum=new THREE.Frustum(),viewProjection=new THREE.Matrix4();
const portalBounds=new THREE.Box3(new THREE.Vector3(9.0,0,-16.45),new THREE.Vector3(9.77,4.65,-13.15));
const windowBounds=new THREE.Sphere(new THREE.Vector3(),2.2);
let pendingEntry=false;
let galleryRoot=null,salonVisible=false,visitStarted=false,pendingProject=null,contextLost=false,pausedByBlur=false;
const limitedDevice=(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||!!navigator.connection?.saveData;
let lightWasChosen=false;
const lighting={preset:'evening',color:'#a9dcc6',intensity:1};
const noteContent={facade:{title:'Průčelí a členění',copy:'Světlou hlavní hmotu člení tmavé svislé pásy a pravidelný rytmus oken. Podobu modelu porovnáte se skutečnými fotografiemi v detailu.'},conversion:{title:'Nové využití objektu',copy:'Rekonstrukce bývalé administrativní budovy na polyfunkční dům. Projekt propojuje bydlení s kancelářskými prostory a službami v přízemí.'},hiarch:{title:'HiARCH',copy:'Projekt je součástí portfolia ateliéru HiARCH.'}};
const keys=new Set(),tables=[],pickables=[];
let touchController=null, touchMode='select', touchRadius=0, pinchRadius=0;
const desktopOffset=new THREE.Vector3();
const orbitDirection=new THREE.Vector3(), orbitUp=new THREE.Vector3(0,1,0);
let finishFlight=null;
let padController=null,navSide=0,navForward=0,route=null;
let hitRoots=[],hoverRoots=[];
const tableBounds=new WeakMap();
let modelStatusSuffix='',statusMessage='';
let nearbyModel=null;
function updateExhibitDetail(){
 if(!entered)return;
 let wanted=null;
 if(!mapMode&&!seatMode&&!chessMode&&salonStage==='none'){
   if(!walking)wanted=projects[selected]?.id||null;
   else if(!navigator.connection?.saveData){
     // A wider release radius avoids repeated switches on the edge of a display.
     let nearest=Infinity;
     for(const table of tables){
       const id=table.group.userData.projectId;
       if(id!=='hustopece'&&id!=='bystrc')continue;
       const dx=camera.position.x-table.x,dz=camera.position.z-table.z,d2=dx*dx+dz*dz;
       const limit=id===nearbyModel?4.25:3.15;
       if(d2<limit*limit&&d2<nearest){nearest=d2;wanted=id}
     }
   }
 }
 nearbyModel=wanted;
 prioritizeModel(wanted);
}
const say=text=>{statusMessage=text;status.textContent=text+modelStatusSuffix};
const clockEase=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const thumb=p=>p.thumbnail||`assets/v4/thumbs/${p.id}.webp`;
function updateRoomVisibility(){
 camera.updateMatrixWorld();
 viewFrustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 const inside=camera.position.x>9.72 && camera.position.z> -19.2 && camera.position.z< -10.4;
 const doorwayInSight=viewFrustum.intersectsBox(portalBounds);
 galleryRoot.visible=!inside||doorwayInSight;
 const show=inside||(salonDoor>0&&doorwayInSight);
 if(show!==salonVisible){
   salonVisible=show;chessSalon.setInteriorVisible(show);
   if(chessExhibit)chessExhibit.group.visible=show;
 }
}
function render(){
 if(renderFrame){cancelAnimationFrame(renderFrame);renderFrame=0}
 if(!renderer||!camera||contextLost||!visible||document.hidden||document.querySelector('dialog[open]'))return;
 updateRoomVisibility();
 updateExhibitDetail();
 const movingWindows=lifePlay&&!pausedByBlur&&hasVisibleWindows();
 const now=performance.now()/1000;
 if(movingWindows&&lifeLast)lifeTime+=Math.min(.4,Math.max(0,now-lifeLast));
 lifeLast=movingWindows?now:0;
 windowLife?.update(lifeTime,{animate:movingWindows});
 renderer.render(scene,camera);
 if(!frameCount)shell.dataset.firstFrameMs=performance.now().toFixed(1);
 shell.dataset.frames=String(++frameCount);
 shell.dataset.drawCalls=String(renderer.info.render.calls);
 shell.dataset.triangles=String(renderer.info.render.triangles);
 shell.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
 shell.dataset.lifeTime=lifeTime.toFixed(2);
 shell.dataset.routeActive=String(!!route);shell.dataset.seated=seatMode||'';
 shell.dataset.cameraY=camera.position.y.toFixed(3);shell.dataset.lookYaw=yaw.toFixed(4);
 shell.dataset.lookPitch=pitch.toFixed(4);shell.dataset.cameraZ=camera.position.z.toFixed(2);shell.dataset.cameraX=camera.position.x.toFixed(2);
 shell.dataset.cameraAngle=Math.atan2(camera.position.x-cameraTarget.x,camera.position.z-cameraTarget.z).toFixed(3);
 if(mapMode)updateWallMap();
 if(walking&&!salonTransit){
   if(camera.position.x>9.75&&salonStage!=='inside')setSalonStage('inside');
   else if(camera.position.x<8.5&&salonStage==='inside')setSalonStage('none');
 }
 if(movingWindows)startAmbientMotion();else stopAmbientMotion();
}
function scheduleRender(){if(!renderer||renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})}
function stopFrames(){salonTransit=false;cancelAnimationFrame(cameraFrame);cancelAnimationFrame(movementFrame);cameraFrame=0;movementFrame=0;keys.clear();route=null;finishFlight=null;touchController?.reset();padController?.reset();lastMove=0;if(completeEntry){const finish=completeEntry;completeEntry=null;finish()}}
function doorPose(){doors.forEach(d=>{const side=d.userData.doorSide==='left'?-1:1;d.rotation.y=0;d.position.x=(d.userData.closedX??side*3.75)+side*doorProgress*3.6})}
function syncControls(){
 if(!controls)return;
 controls.target.copy(cameraTarget);
 const orbiting=selected>=0&&!walking&&!mapMode&&!seatMode&&!chessMode;
 controls.enabled=orbiting;
 controls.minPolarAngle=orbiting?.22:0;
 controls.maxPolarAngle=orbiting?1.77:Math.PI;
 const freeView=mapMode||walking||seatMode||chessMode;
 controls.minDistance=freeView?.5:2.3;
 controls.maxDistance=freeView?40:9;
 controls.update();
}
function flyTo(position,target,duration=850,onComplete=null){
 if(!camera)return;stopFrames();touchRadius=0;if(controls)controls.enabled=false;const startP=camera.position.clone(),startT=cameraTarget.clone(),endP=new THREE.Vector3(...position),endT=new THREE.Vector3(...target),doorStart=doorProgress;let began=null,completed=false;
 const apply=t=>{camera.position.lerpVectors(startP,endP,t);cameraTarget.lerpVectors(startT,endT,t);camera.lookAt(cameraTarget);if(entered){doorProgress=doorStart+(1-doorStart)*t;doorPose()}render();if(t===1){if(walking||seatMode){const direction=cameraTarget.clone().sub(camera.position).normalize();yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(THREE.MathUtils.clamp(direction.y,-1,1))}syncControls();if(!completed){completed=true;onComplete?.()}}};
 if(reduced.matches||duration===0){apply(1);return}
 finishFlight=()=>apply(1);
 const step=now=>{if(began===null)began=now;const t=Math.min(1,(now-began)/duration);if(t<1){apply(clockEase(t));cameraFrame=requestAnimationFrame(step)}else{cameraFrame=0;finishFlight=null;apply(1)}};cameraFrame=requestAnimationFrame(step);
}
function startVisitAssets(){
 if(visitStarted||!camera||contextLost)return;
 visitStarted=true;
 loadPlinthContact?.();
 const loader=new THREE.ImageLoader();
 for(const art of artworks){
   loader.load(art.preview||art.image,image=>{
     art.previewReady=true;
     // WebGL2 texture storage has a fixed size after the first upload.
     art.texture.dispose();
     art.texture.image=image;art.texture.needsUpdate=true;scheduleRender();
   },undefined,()=>{art.previewFailed=true;});
 }
 syncModelLoading();
 shell.dataset.modelLoadStartMs=performance.now().toFixed(1);
 loadClientModels(THREE,{onUpdate:updateModelProgress}).then(()=>{
   shell.dataset.modelsCompleteMs=performance.now().toFixed(1);
 });
}
function markEntered(){
 startVisitAssets();
 entered=true;shell.classList.add('entered');
 host.setAttribute('role','group');host.setAttribute('aria-label','Výstavní sál. Vyberte stůl kliknutím nebo použijte nástěnnou mapu.');host.removeAttribute('aria-disabled');
 if(shell.dataset.entryComplete!=='false')document.body.classList.remove('gallery-at-entry');
}
function overview(){if(camera?.position.x>9.6||salonTransit){leaveSalon(overview);return}setSalonStage('none');setWalking(false);selected=-1;activeNote=null;$('selectedExhibit').hidden=true;updateSelection();markEntered();flyTo(mobile.matches?[0,5.2,23]:[0,4.3,15],[0,1.5,-3]);say('Celý sál. Klikněte na vitrínu, nebo na volnou podlahu pro přechod.')}
function enterGallery(){
 if(entered||!camera||!tables.length)return;
 shell.dataset.entryComplete='false';
 const from=camera.position.clone(),fromTarget=cameraTarget.clone();stopFrames();selected=-1;activeNote=null;mapMode=false;seatMode=null;markEntered();controls.enabled=false;
 if(!lightWasChosen&&lighting.preset!=='day'){lighting.preset='day';applyLighting()}
 updateSelection();$('selectedExhibit').hidden=true;$('navigationMode').textContent='Vstup do galerie';say('Dveře se otevírají. Vstupujete do výstavního sálu.');
 // Stop just inside the entrance, within the walkable floor. No exhibit is selected.
 const end=new THREE.Vector3(0,2.35,14.6),target=new THREE.Vector3(0,2.35-Math.sin(.05)*8,14.6-Math.cos(.05)*8);
 const curve=new THREE.CatmullRomCurve3([from,new THREE.Vector3(0,2.9,22),new THREE.Vector3(0,2.5,18.2),end],false,'centripetal');
 completeEntry=()=>{doorProgress=1;doorPose();camera.position.copy(end);cameraTarget.copy(target);camera.lookAt(cameraTarget);renderer.shadowMap.needsUpdate=true;setWalking(true,true);shell.dataset.entryComplete='true';markEntered();say($('walkHelp').textContent);scheduleRender()};
 // Opening the doors is an explicit visitor action, including in reduced-motion mode.
 shell.dataset.entryComplete='false';const duration=2400;let began=null;
 const step=now=>{if(began===null)began=now;const t=Math.min(1,(now-began)/duration),open=clockEase(Math.min(1,t/.47)),move=clockEase(Math.max(0,Math.min(1,(t-.12)/.88)));doorProgress=open;doorPose();camera.position.copy(curve.getPoint(move));cameraTarget.lerpVectors(fromTarget,target,clockEase(t));camera.lookAt(cameraTarget);render();if(t<1)cameraFrame=requestAnimationFrame(step);else{cameraFrame=0;const finish=completeEntry;completeEntry=null;finish?.()}};
 cameraFrame=requestAnimationFrame(step);
}
function focusProject(id,scroll=false,move=true,duration=900){
 if(!camera||contextLost){
   if(shell.dataset.renderer==='html')openProject(id);else pendingProject={id,scroll};
   return;
 }
 if(camera&&(camera.position.x>9.6||salonTransit)){leaveSalon(()=>focusProject(id,scroll,move,duration));return}setSalonStage('none');
 const i=projects.findIndex(p=>p.id===id);if(i<0)return;
 if(!lightWasChosen&&lighting.preset!=='day'){lighting.preset='day';applyLighting()}
 prioritizeModel(id,{retry:true});mapMode=false;seatMode=null;lastProject=id;activeNote=null;selected=i;shell.dataset.selectedProject=id;markEntered();setWalking(false);const p=projects[i],t=tables[i];
 $('selectedExhibit').hidden=false;$('selectedImage').src=thumb(p);$('selectedImage').alt=p.name;$('selectedLocation').textContent=[p.city,p.year].filter(Boolean).join(' · ');$('selectedName').textContent=p.name;$('selectedScale').textContent='';
 updateSelection();if(t&&move){const view=exhibitView(t,camera,THREE,mobile.matches);flyTo(view.position.toArray(),view.target.toArray(),duration)}
 if(scroll||(move&&shell.getBoundingClientRect().top < -host.clientHeight*.17)){
   shell.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
 }
 document.querySelector('.project-picker').open=false;say(`Vitrína ${i+1} z ${projects.length}: ${p.name}. Tahem do stran můžete vitrínu obejít.`);
}
function updateSelection(){syncMapLighting();$('walkPad').hidden=!entered||(!walking&&!mobile.matches)||mapMode||!!seatMode||chessMode;$('orbitToolbar').hidden=mobile.matches||!entered||walking||mapMode||!!seatMode||chessMode||selected<0;$('projectPager').hidden=!entered||selected<0||mapMode||chessMode||!!seatMode;$('walkToggle').hidden=walking&&selected<0;$('pagerName').textContent=selected>=0?projects[selected]?.name:'Vybrat projekt';$('pagerDetail').disabled=selected<0;$('pagerScale').textContent='Fotografie a detail ↗';shell.dataset.mode=chessMode?'chess':mapMode?'map':seatMode?'seated':walking?'walk':selected>=0?'orbit':'entry';shell.dataset.selectedProject=selected>=0?(projects[selected]?.id||''):'';
 $('walkHelp').textContent=walking&&selected<0?(mobile.matches?'Projděte si galerii. Šipkami se pohybujte, tahem do stran se rozhlížejte. Klepnutím vyberte stavbu.':'Projděte si galerii. Šipky nebo WASD: pohyb · tažení myší: rozhlížení · kliknutí na stavbu: prohlídka modelu.'):
 mobile.matches?(seatMode?'Tahem do stran se rozhlédněte. Svisle posouváte stránku.':walking?'Šipkou uděláte krok. Tahem do stran se rozhlédnete.':'Svisle posouváte stránku · do stran otáčíte model · dvěma prsty přibližujete.'):(seatMode?'Tažením nebo šipkami se rozhlédněte · tlačítkem Vstát pokračujete':walking?'Šipky / WASD: chůze · tažení myší: rozhlížení · klik: výběr':selected>=0&&!mapMode&&!seatMode?'Tažením otáčejte model. Šipky ← → otáčejí, + / − přibližují.':'Klikněte na projekt a prohlédněte si model.');
 if($('navigationMode'))$('navigationMode').textContent=chessMode?'Šachy':mapMode?'Mapa projektů':seatMode?'Pohled z lavičky':walking?'Chůze galerií':selected>=0?'Obcházení vitríny':'Vstup do galerie';
 $('tourPosition').textContent=selected<0?'PŘEHLED SÁLU':`STŮL ${selected+1} / ${projects.length}`;
 document.querySelectorAll('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===projects[selected]?.id)));
 syncSalonUI();updateHotspots();updateWallMap();scheduleRender();
}
function clearFloor(x,z){return isWalkableRegion(x,z,salonDoor>=.999)&&benches.every(b=>Math.abs(x-b.seat[0])>(b.halfWidth||.62)+.15||Math.abs(z-b.seat[2])>(b.halfDepth||1.40)+.15)&&sceneObstacles.every(o=>Math.abs(x-o.x)>o.halfWidth+.18||Math.abs(z-o.z)>o.halfDepth+.18)&&tables.every(t=>Math.abs(x-t.x)>((t.width||3.8)/2+.35)||Math.abs(z-t.z)>((t.depth||2.7)/2+.35))}
function walkPosition(x,z){const b=navigationBounds(salonDoor>=.999);x=THREE.MathUtils.clamp(x,b[0],b[2]);z=THREE.MathUtils.clamp(z,b[1],b[3]);return clearFloor(x,z)?[x,z]:null}
function setWalking(value,keepPosition=false){
 if(chessMode){chessMode=false;shell.classList.remove('playing-chess');$('chessPanel').hidden=true;chessSelected=null;promotionMove=null;if(chessSession)chessExhibit.setBoard(chessSession.state().board,{lastMove:chessSession.state().lastMove});}walking=value;seatMode=null;mapMode=false;activeNote=null;shell.classList.toggle('walking',value);$('walkPad').hidden=!entered||!value;$('walkToggle').setAttribute('aria-pressed',String(value));$('walkToggle').innerHTML=value?'Prohlédnout model <span>↗</span>':'Procházet sál <span>↗</span>';if(controls)controls.enabled=!value&&selected>=0;
 keys.clear();cancelAnimationFrame(movementFrame);movementFrame=0;lastMove=0;
 if(value){markEntered();$('selectedExhibit').hidden=true;let pos=keepPosition?walkPosition(camera.position.x,camera.position.z):null;const direction=cameraTarget.clone().sub(camera.position);yaw=keepPosition?Math.atan2(-direction.x,-direction.z):0;pitch=keepPosition?Math.asin(THREE.MathUtils.clamp(direction.clone().normalize().y,-.7,.7)):-.05;const x=pos?pos[0]:0,z=pos?pos[1]:12.4;flyTo([x,2.35,z],[x-Math.sin(yaw)*Math.cos(pitch)*8,2.35+Math.sin(pitch)*8,z-Math.cos(yaw)*Math.cos(pitch)*8],keepPosition?0:600);say('Pohyb: šipky nebo palcový ovladač. Rozhlížení: tažením. Klikněte na model, obraz nebo volnou podlahu.');host.focus({preventScroll:true})}
 updateSelection();
}
function orbitAction(action){
 if(!camera||selected<0||walking||mapMode||seatMode)return;
 if(action==='reset'){focusProject(projects[selected].id);return}
 const offset=camera.position.clone().sub(cameraTarget),distance=offset.length();
 if(action==='left'||action==='right')offset.applyAxisAngle(new THREE.Vector3(0,1,0),action==='left'?-.26:.26);
 if(action==='near'||action==='far')offset.multiplyScalar(action==='near'?.78:1.28);
 const min=controls?.minDistance??2.5,max=controls?.maxDistance??6;
 const radius=THREE.MathUtils.clamp(offset.length(),min,max);
 offset.normalize();offset.multiplyScalar(roomOrbitDistance(cameraTarget,offset,radius));
 const next=cameraTarget.clone().add(offset);
 flyTo(next.toArray(),cameraTarget.toArray(),reduced.matches?0:260);
}
function ensureMovement(){if(!movementFrame&&walking)movementFrame=requestAnimationFrame(moveLoop)}
function moveLoop(now){
 movementFrame=0;
 if(!walking||!visible||document.hidden||document.querySelector('dialog[open]')){lastMove=0;return}
 const dt=lastMove?Math.min(.035,(now-lastMove)/1000):.016;lastMove=now;
 if(keys.has('turnLeft'))yaw+=dt*1.35;if(keys.has('turnRight'))yaw-=dt*1.35;
 let f=navForward+(keys.has('forward')?1:0)-(keys.has('back')?1:0),side=navSide+(keys.has('right')?1:0)-(keys.has('left')?1:0);
 if(f||side){route=null;cancelAnimationFrame(cameraFrame);cameraFrame=0;finishFlight=null;const norm=Math.max(1,Math.hypot(f,side)),speed=2.7*dt/norm;const b=navigationBounds(salonDoor>=.999),nx=THREE.MathUtils.clamp(camera.position.x+(-Math.sin(yaw)*f+Math.cos(yaw)*side)*speed,b[0],b[2]),nz=THREE.MathUtils.clamp(camera.position.z+(-Math.cos(yaw)*f-Math.sin(yaw)*side)*speed,b[1],b[3]);if(clearFloor(nx,camera.position.z))camera.position.x=nx;if(clearFloor(camera.position.x,nz))camera.position.z=nz;}
 if(route){let distance=3.5*dt;while(route&&distance>0){const target=route[0],dx=target[0]-camera.position.x,dz=target[1]-camera.position.z,length=Math.hypot(dx,dz);if(length<=distance){camera.position.x=target[0];camera.position.z=target[1];distance-=length;route.shift();if(!route.length)route=null}else{camera.position.x+=dx/length*distance;camera.position.z+=dz/length*distance;distance=0}}}
 camera.position.y=2.35;lookFromWalk();render();
 if(keys.size||navForward||navSide||route)ensureMovement();else lastMove=0;
}
function floorReach(ax,az,bx,bz){const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.08));for(let i=0;i<=steps;i++){const x=ax+(bx-ax)*i/steps,z=az+(bz-az)*i/steps;if(!clearFloor(x,z))return false}return true}
function walkTo(x,z){if(!walking)setWalking(true,true);stopFrames();const result=findPath({reach:floorReach},[camera.position.x,camera.position.z],[x,z],{cell:.25,bounds:navigationBounds(salonDoor>=.999),snap:.25,maxChecks:25000});route=result.points.slice(1);shell.dataset.routePoints=String(route.length);if(!route.length)return;say(result.complete?'Přecházíte na vybrané místo. Šipkou nebo tažením můžete změnit směr.':'K tomuto místu není volný průchod. Přesun k nejbližšímu volnému místu.');ensureMovement()}
function lookFromWalk(){cameraTarget.set(camera.position.x-Math.sin(yaw)*Math.cos(pitch)*8,camera.position.y+Math.sin(pitch)*8,camera.position.z-Math.cos(yaw)*Math.cos(pitch)*8);camera.lookAt(cameraTarget)}
function startStep(key){if(!walking)setWalking(true,true);keys.add(key);ensureMovement()}
function openCompany(id){suspendNavigation();const c=companies[id];if(!c)return;$('companyDialogBody').innerHTML=`<article class="company-profile"><span class="eyebrow">${esc(c.role)}</span><h2>${esc(c.name)}</h2><p>${esc(c.copy)}</p><a href="mailto:info@hiarch.cz">Kontaktovat skupinu ↗</a></article>`;if(!$('companyDialog').open)$('companyDialog').showModal()}
function projectPageUrl(id){
 const path='projekty/'+encodeURIComponent(id)+'.html';
 if(!lightWasChosen||lighting.preset==='day')return path;
 return path+'?svetlo='+(lighting.preset==='evening'?'noc':'neon');
}
function openProject(id){
 if(!projects.some(project=>project.id===id))return;
 suspendNavigation();
 location.assign(projectPageUrl(id));
}
function syncProjectLinks(){
 for(const card of document.querySelectorAll('[data-project-card]')){
   card.querySelector('.project-card-link').href=projectPageUrl(card.dataset.projectCard);
 }
}
function buildInterface(){
 $('pickerCount').textContent=String(projects.length);
 $('exhibitPicker').innerHTML=projects.map((p,i)=>`<button type="button" data-focus="${esc(p.id)}"><img src="${esc(thumb(p))}" alt="" loading="lazy"><span><b>${esc(p.name)}</b><small>${esc(p.city)}</small></span><span class="picker-index">${String(i+1).padStart(2,'0')}</span></button>`).join('');
 syncProjectLinks();
}
function textureText(lines,{width=1024,height=256,color='#e1efd9',glow=false}={}){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.clearRect(0,0,width,height);x.textAlign='center';x.textBaseline='middle';
 lines.forEach((line,i)=>{let size=height/(lines.length===1?1.7:3.5);x.font=`500 ${size}px "Space Grotesk", sans-serif`;while(size>8&&x.measureText(line).width>width*.92){size-=2;x.font=`500 ${size}px "Space Grotesk", sans-serif`}x.fillStyle=color;if(glow){x.shadowColor=color;x.shadowBlur=height*.065}x.fillText(line,width/2,height*(i+.5)/lines.length);if(glow){x.shadowBlur=0;x.fillText(line,width/2,height*(i+.5)/lines.length)}});
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy()>2?2:1;return t;
}
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.03,...extra})}
function box(w,h,d,x,y,z,material,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function glowPlane(w,h,x,y,z,text,color='#dceccc'){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:textureText([text],{glow:true,color}),transparent:true,depthWrite:false,toneMapped:false}));m.position.set(x,y,z);scene.add(m);return m;
}
function buildRoom(){
 const room=buildGalleryRoom({THREE,renderer,projects,makeProjectModel:(id,T)=>makeProjectModel(id,T,facadeTextures),labelTexture:textureText,artworks,requestRender:scheduleRender});scene=room.scene;benches=room.benches||[];windowLife=createWindowLife({THREE,scene,layouts:windowLayouts});tables.length=0;shell.dataset.floorReflections='room-probe';shell.dataset.floorMirrorPasses='0';shell.dataset.architectureBatches=String(scene.userData.staticArchitecture?.batches||0);shell.dataset.entranceDesign=scene.userData.entranceDesign||'';shell.dataset.modelWindows=String(room.tables.find(t=>t.featured)?.model?.userData.windowCount||0);tables.push(...room.tables);tables.forEach(addLifeTable);shell.dataset.modelSizing='fit-to-plinth';shell.dataset.modelPlacement=JSON.stringify(tables.map(t=>({id:t.group.userData.projectId,...t.model.userData.displayPlacement})));shell.dataset.koupelniBatches=JSON.stringify(tables[0].model.userData.staticBatches);syncLifeButton();pickables.push(...room.pickables);doors=room.doors;doors.forEach(d=>d.userData.closedX=d.position.x);installModel=room.replaceModel;loadPlinthContact=room.loadPlinthContact;lightRig=room.setLighting;wallMap=addWallMap({THREE,scene,geo:czGeo,projects,pickables,labelTexture:textureText});const mapLight=galleryMapLight=new THREE.PointLight(0xf4f4dd,5,7,2);mapLight.position.set(8.3,5.1,12);scene.add(mapLight);lounge=addGalleryLounge({THREE,scene,pickables,requestRender:scheduleRender});benches.push(...lounge.benches);// All opaque room contents can be skipped behind the salon wall.
 galleryRoot=new THREE.Group();
 galleryRoot.name='Main gallery';
 for(const object of [...scene.children])if(object.isMesh||object.isGroup||object.isLine)galleryRoot.add(object);
 scene.add(galleryRoot);
 pickables.push(wallMap.group);
 chessSalon=addChessSalon({THREE,scene,pickables,labelTexture:textureText,artworks,requestRender:scheduleRender});
 chessSalon.setInteriorVisible(false);
 updatePickRoots();
 shell.dataset.aquarium='removed';shell.dataset.lifeCars='0';shell.dataset.lifePedestrians='0';shell.dataset.darts='removed';applyLighting();
 camera=new THREE.PerspectiveCamera(mobile.matches?84:52,1,.1,120);camera.position.set(mobile.matches?0:1.85,3.65,mobile.matches?29.4:31.0);cameraTarget.set(0,mobile.matches?3.4:3.1,17.5);camera.lookAt(cameraTarget);doorPose();
 controls=new OrbitControls(camera,renderer.domElement);syncTouchPolicy();controls.enabled=false;controls.enableDamping=false;controls.enablePan=false;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI;controls.rotateSpeed=.65;controls.zoomSpeed=.8;controls.target.copy(cameraTarget);controls.update();controls.addEventListener('change',()=>{
   cameraTarget.copy(controls.target);
   if(controls.enabled&&selected>=0){
     desktopOffset.copy(camera.position).sub(cameraTarget);
     const r=desktopOffset.length();desktopOffset.normalize();
     const safe=roomOrbitDistance(cameraTarget,desktopOffset,r);
     if(r>safe)camera.position.copy(cameraTarget).addScaledVector(desktopOffset,safe);
   }
   scheduleRender();
 });controls.addEventListener('start',()=>{touchRadius=0;cancelAnimationFrame(cameraFrame);cameraFrame=0});
}
function prepareChessTable(){
 if(chessExhibit)return;
 chessExhibit=createChessExhibit({THREE,scene,pickables,requestRender:scheduleRender,position:[15.5,0,-14.8]});
 chessExhibit.setLighting(lighting);
 chessExhibit.group.visible=salonVisible;
 sceneObstacles=chessExhibit.obstacles;
 updatePickRoots();
}
function updateHotspots(){
 const layer=$('hotspotLayer');if(!layer||!camera)return;const show=entered&&!walking&&!mapMode&&!chessMode&&tables[selected]?.featured;layer.hidden=!show;if(!show){$('annotationCard').hidden=true;return}
 if(!layer.children.length)layer.innerHTML='<button class="info-dock-button" data-note="facade" aria-label="Architektura"><span>Architektura</span><i>+</i></button><button class="info-dock-button" data-note="conversion" aria-label="O stavbě"><span>O stavbě</span><i>+</i></button>';
 const card=$('annotationCard');card.hidden=!activeNote;if(activeNote){card.style.left=mobile.matches?'5vw':'3.5vw';card.style.top='auto';card.style.bottom=mobile.matches?'225px':'160px'}
}
function syncMapLighting(){if(galleryMapLight)galleryMapLight.intensity=lighting.preset==='day'||mapMode?5:.3;if(!wallMap)return;wallMap.group.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m?.isMeshBasicMaterial&&!m?.isLineBasicMaterial)continue;if(!mapColors.has(m))mapColors.set(m,m.color.clone());m.color.copy(mapColors.get(m)).multiplyScalar(lighting.preset==='day'||mapMode?1:.27)}})}
function applyLighting(){if(!lightRig)return;lightRig(lighting);chessSalon?.setLighting(lighting);lounge?.setLighting(lighting);chessExhibit?.setLighting(lighting);windowLife?.setLighting(lighting);shell.dataset.litExhibits=String(scene.userData.fixedExhibitLights?.length||0);shell.dataset.neonModels=String(scene.userData.allExhibitLighting?.count||0);shell.dataset.fixturePositions=JSON.stringify(scene.userData.fixedExhibitLights||[]);shell.dataset.exhibitLightStrength=String(scene.userData.allExhibitLighting?.strength||0);shell.dataset.roomFinish=scene.userData.roomFinish||'';syncMapLighting();renderer.toneMappingExposure=lighting.preset==='day'?1.05:lighting.preset==='neon'?.84:.89;shell.dataset.lightingProfile='permanent-fixtures-v14';shell.dataset.lighting=lighting.preset;shell.dataset.ledColor=lighting.color;$('lightingValue').textContent=Math.round(lighting.intensity*100)+' %';document.querySelectorAll('.light-presets button[data-light-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lightPreset===lighting.preset)));document.querySelectorAll('.led-colors button[data-led-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ledColor===lighting.color)));scheduleRender()}
function showWallMap(){if(camera?.position.x>9.6||salonTransit){leaveSalon(showWallMap);return}setSalonStage('none');seatMode=null;if(mapMode){focusProject(lastProject);return}setWalking(false);mapMode=true;activeNote=null;selected=-1;$('selectedExhibit').hidden=true;markEntered();$('walkToggle').innerHTML='Ke vitríně <span>↗</span>';updateSelection();$('wallMapButton').setAttribute('aria-pressed','true');if(wallMap)flyTo(mobile.matches?[-3.8,3.3,12]:wallMap.lookFrom,wallMap.lookAt,850);say('Vyberte projekt na nástěnné mapě. Přesunete se přímo k jeho vitríně.')}
function updateWallMap(){
 const layer=$('wallMapLayer');if(!layer||!camera||!wallMap)return;layer.hidden=!mapMode;$('wallMapButton').setAttribute('aria-pressed',String(mapMode));if(!mapMode)return;
 if(!layer.children.length)layer.innerHTML='<h2>Mapa projektů</h2>'+projects.map(p=>`<button class="map-project-hit" data-focus="${esc(p.id)}" aria-label="Přejít k vitríně ${esc(p.name)}"><b>${esc(p.name)}</b><small>${esc(p.city)}</small><i>↗</i></button>`).join('');
 const v=new THREE.Vector3();for(const pin of wallMap.pins){pin.object.getWorldPosition(v);v.project(camera);const b=layer.querySelector(`[data-focus="${pin.id}"]`);if(!b)continue;b.style.left=`${(v.x+1)*host.clientWidth/2}px`;b.style.top=`${(1-v.y)*host.clientHeight/2}px`;b.hidden=!mobile.matches&&(v.z>1||Math.abs(v.x)>1.05||Math.abs(v.y)>1.05)}
}
function showNote(key){const n=noteContent[key];if(!n)return;activeNote=activeNote===key?null:key;$('annotationCard').innerHTML=`<button class="note-close" data-note-close aria-label="Zavřít popisek">×</button><span class="eyebrow">KOUPELNÍ 2 / DETAIL</span><h3>${esc(n.title)}</h3><p>${esc(n.copy)}</p>${key==='hiarch'?'<button data-company="hiarch" class="note-more">O ateliéru HiARCH ↗</button>':'<button class="note-more" data-open="koupelni">Fotografie projektu ↗</button>'}`;updateHotspots();shell.dataset.annotation=activeNote||''}

function openArtwork(id){suspendNavigation();const art=artworks.find(a=>a.id===id);if(!art)return;$('projectDialogBody').innerHTML=`<article class="artwork-detail"><div class="artwork-image"><img src="${esc(art.image)}" alt="${esc(art.title)}"></div><div><span class="eyebrow">KOUPELNÍ 2 / VÝSTAVNÍ PANEL</span><h2>${esc(art.title)}</h2><p>${esc(art.subtitle)}</p><a href="${esc(art.source)}" target="_blank" rel="noopener">Původní projektové podklady ↗</a></div></article>`;if(!$('projectDialog').open)$('projectDialog').showModal()}
function updatePickRoots(){
 const all=new Set(pickables);
 hitRoots=[...all].filter(object=>{
   for(let parent=object.parent;parent;parent=parent.parent)if(all.has(parent))return false;
   return true;
 });
 hoverRoots=hitRoots.filter(o=>o.userData.artworkId||o.userData.seatId||o.userData.chessPortal||o.userData.wallMap);
 for(const t of tables)if(!tableBounds.has(t.group)){
   tableBounds.set(t.group,new THREE.Box3(
     new THREE.Vector3(t.x-t.width/2-.06,0,t.z-t.depth/2-.06),
     new THREE.Vector3(t.x+t.width/2+.06,3.65,t.z+t.depth/2+.06)));
 }
}
const pickerRay=new THREE.Raycaster(),mousePoint=new THREE.Vector2(),floorPoint=new THREE.Vector3();
const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.025);
pickerRay.layers.enable(PICK_LAYER);
function pointPicker(event){
 const rect=host.getBoundingClientRect();
 mousePoint.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
 pickerRay.setFromCamera(mousePoint,camera);
}
function firstPick(roots,limit=Infinity){
 const candidates=roots.filter(root=>{
   for(let node=root;node;node=node.parent)if(!node.visible)return false;
   const box=tableBounds.get(root);return !box||pickerRay.ray.intersectsBox(box);
 });
 return pickerRay.intersectObjects(candidates,true).find(hit=>reachableHit(hit,camera.position,salonDoor,limit));
}
function hoverExhibit(event){
 if(!renderer||!camera||gesture||!entered||contextLost)return;
 if(chessMode){host.style.cursor='pointer';host.title='Vyberte figuru a potom cílové pole';return}
 pointPicker(event);
 const hit=firstPick(hoverRoots)?.object;
 host.style.cursor=hit?'pointer':'grab';
 host.title=hit?.userData.chessPortal?'Vstoupit do šachového salonku':hit?.userData.artworkId?'Otevřít výstavní panel':hit?.userData.seatId?'Posadit se na lavičku':'';
}
let hoverFrame=0;host.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||gesture||hoverFrame)return;hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;hoverExhibit(event)})});
function sitAtBench(id){if(camera?.position.x>9.6||salonTransit){leaveSalon(()=>sitAtBench(id));return}setSalonStage('none');const bench=benches.find(b=>b.id===id);if(!bench)return;setWalking(false);selected=-1;seatMode=id;markEntered();$('selectedExhibit').hidden=true;updateSelection();$('walkToggle').innerHTML='Vstát a projít galerii <span>↗</span>';flyTo(bench.seat,bench.lookAt,800);host.focus({preventScroll:true});say('Sedíte v galerii. Tažením nebo šipkami se rozhlédněte. Tlačítkem Vstát se vrátíte k chůzi.')}
function pick(event){
 if(!renderer||contextLost)return;if(!entered){enterGallery();return}pointPicker(event);
 const floorHit=pickerRay.ray.intersectPlane(floorPlane,floorPoint);
 const hit=firstPick(hitRoots,floorHit?camera.position.distanceTo(floorHit)+.01:Infinity);
 if(hit){let o=hit.object;while(o&&!o.userData.chessSquares&&!o.userData.chessTable&&!o.userData.chessPortal&&!o.userData.wallMap&&!o.userData.annotationId&&!o.userData.companyId&&!o.userData.projectId&&!o.userData.artworkId&&!o.userData.seatId)o=o.parent;if(o?.userData.chessSquares||o?.userData.chessTable){if(!chessMode)startChess();else handleChessSquare(chessExhibit.squareFromHit(hit));return}if(chessMode)return;if(o?.userData.chessPortal){camera.position.x>9.75?leaveSalon():enterSalon();return}if(o?.userData.wallMap){if(!mapMode)showWallMap();return}if(o?.userData.artworkId){openArtwork(o.userData.artworkId);return}if(o?.userData.seatId){sitAtBench(o.userData.seatId);return}if(o?.userData.annotationId){showNote(o.userData.annotationId);return}if(o?.userData.companyId){openCompany(o.userData.companyId);return}if(o?.userData.projectId){if(!walking&&projects[selected]?.id===o.userData.projectId)openProject(o.userData.projectId);else focusProject(o.userData.projectId);return}}
 if(!entered){focusProject('koupelni');return}
 if(seatMode||chessMode||!floorHit)return;const pos=walkPosition(floorHit.x,floorHit.z);if(!pos)return;walkTo(pos[0],pos[1]);
}
function setSalonStage(stage){salonStage=stage;syncSalonUI()}
function syncSalonUI(){
 const active=salonStage!=='none';shell.dataset.salonStage=salonStage;shell.dataset.salonDoor=salonDoor.toFixed(3);shell.classList.toggle('viewing-salon',active);
 const panel=$('salonPanel');if(!panel)return;panel.hidden=!active||chessMode||mapMode;
 $('salonEnter').hidden=salonStage!=='door';$('salonPlay').hidden=salonStage!=='inside';$('salonEnter').disabled=salonTransit;$('salonPlay').disabled=salonTransit;$('salonExit').disabled=salonTransit;
 $('salonStatus').textContent=salonTransit?'Procházíte dveřmi…':salonStage==='door'?'Vstup do samostatného šachového salonku.':'Projděte se, nebo usedněte k šachům.';
 if(active){$('projectPager').hidden=true;if(salonStage==='door'||salonStage==='transit')$('walkPad').hidden=true;if(!chessMode)$('navigationMode').textContent='Šachový salonek'}
 if(camera){const next=galleryFieldOfView(host.clientWidth,host.clientHeight,salonStage,chessMode);if(camera.fov!==next){camera.fov=next;camera.updateProjectionMatrix();shell.dataset.fov=String(next)}}
}
function focusSalonDoor(){
 if(!chessSalon)return;if(camera.position.x>9.75){returnToSalon();return}
 $('leisureMenu').open=false;setWalking(false);selected=-1;activeNote=null;markEntered();$('selectedExhibit').hidden=true;setSalonStage('door');updateSelection();
 flyTo(chessSalon.entrance.outside,chessSalon.entrance.lookAt,850);say('Šachový salonek. Klikněte na dveře nebo na Vstoupit do salonku.');
}
function beginSalonWalk(){
 walking=true;keys.clear();navSide=navForward=0;lastMove=0;shell.classList.add('walking');$('walkToggle').setAttribute('aria-pressed','true');
 const direction=cameraTarget.clone().sub(camera.position).normalize();yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(THREE.MathUtils.clamp(direction.y,-.7,.7));
 setSalonStage('inside');updateSelection();syncControls();host.focus({preventScroll:true});
}
function salonPassage(enter,after){
 if(!chessSalon||!camera)return;
 if(enter&&shell.getBoundingClientRect().top< -20)shell.scrollIntoView({block:'start',behavior:'instant'});
 prepareChessTable();stopFrames();setWalking(false);selected=-1;activeNote=null;markEntered();$('selectedExhibit').hidden=true;salonTransit=true;setSalonStage('transit');syncControls();
 const start=camera.position.clone(),startTarget=cameraTarget.clone(),outside=new THREE.Vector3(7.9,2.35,-14.8),inside=new THREE.Vector3(10.1,2.35,-14.8),end=enter?inside:outside;
 const target=new THREE.Vector3(...(enter?[15.5,2.6,-14.8]:[0,1.8,-8])),doorStart=salonDoor;
 const points=enter?[start,outside,new THREE.Vector3(9.58,3.1,-14.8),inside]:[start,new THREE.Vector3(10.65,2.5,-14.8),new THREE.Vector3(9.58,2.35,-14.8),outside];
 const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');let done=false,began=null;
 const apply=t=>{if(done)return;salonDoor=doorStart+(1-doorStart)*clockEase(Math.min(1,t/.42));chessSalon.setDoorOpen(salonDoor,false);const move=clockEase(Math.max(0,(t-.14)/.86));camera.position.copy(curve.getPoint(move));cameraTarget.lerpVectors(startTarget,target,clockEase(t));camera.lookAt(cameraTarget);shell.dataset.salonDoor=salonDoor.toFixed(3);render();if(t===1){done=true;salonTransit=false;salonDoor=1;chessSalon.setDoorOpen(1);camera.position.copy(end);cameraTarget.copy(target);camera.lookAt(cameraTarget);renderer.shadowMap.needsUpdate=true;if(enter){beginSalonWalk();say('Šachový salonek. Můžete se projít nebo usednout ke stolu.')}else{setSalonStage('none');updateSelection();syncControls();after?.()}}};
 if(reduced.matches){apply(1);return}
 finishFlight=()=>apply(1);const step=now=>{if(began===null)began=now;const t=Math.min(1,(now-began)/1650);if(t<1){apply(t);cameraFrame=requestAnimationFrame(step)}else{cameraFrame=0;finishFlight=null;apply(1)}};cameraFrame=requestAnimationFrame(step);
}
function enterSalon(){salonPassage(true)}
function leaveSalon(after){salonPassage(false,typeof after==='function'?after:()=>focusProject(lastProject))}
function returnToSalon(){
 if(!chessSalon)return;setWalking(false);selected=-1;setSalonStage('inside');flyTo([10.1,2.35,-14.8],[15.5,2.6,-14.8],650,beginSalonWalk);say('Jste zpět v šachovém salonku.');
}
function hasVisibleWindows(){
 if(!entered||mapMode||seatMode||chessMode||salonStage!=='none')return false;
 for(const table of tables){
   if(table.model.userData.loading)continue;
   windowBounds.center.set(table.x,1.8,table.z);
   if(camera.position.distanceToSquared(windowBounds.center)<225 && viewFrustum.intersectsSphere(windowBounds))return true;
 }
 return false;
}
function stopAmbientMotion(){clearTimeout(ambientTimer);ambientTimer=0}
function startAmbientMotion(){
 if(ambientTimer||cameraFrame||movementFrame||renderFrame)return;
 // Curtains and TVs move slowly. Sleep between changes while the camera is still.
 ambientTimer=setTimeout(()=>{
   ambientTimer=0;
   if(!cameraFrame&&!movementFrame)scheduleRender();
 },mobile.matches||limitedDevice?250:150);
}
function addLifeTable(table){
 if(!table||table.model.userData.loading)return;windowLife?.addTable(table);
 const windows=windowLife?.stats();if(windows){shell.dataset.lifeWindows=String(windows.windows);shell.dataset.lifeProjects=JSON.stringify(windows.projects)}
}
function syncLifeButton(){const b=$('lifeMotion');if(b){b.textContent=lifePlay?'Pozastavit život v oknech':'Rozpohybovat okna';b.setAttribute('aria-pressed',String(lifePlay))}shell.dataset.lifeMotion=String(lifePlay)}
const chessNames={p:'pěšec',n:'jezdec',b:'střelec',r:'věž',q:'dáma',k:'král'};
function buildChessGrid(){
 if($('chessGrid').children.length)return;
 for(let rank=8;rank>=1;rank--){const row=document.createElement('div');row.setAttribute('role','row');for(let file=0;file<8;file++){const square=String.fromCharCode(97+file)+rank,button=document.createElement('button');button.type='button';button.dataset.chessSquare=square;button.setAttribute('role','gridcell');button.setAttribute('aria-label',square);button.tabIndex=square===chessFocus?0:-1;row.append(button)}$('chessGrid').append(row)}
}
function updateChess(state=chessSession?.state()){
 if(!state)return;buildChessGrid();const legal=chessSelected?chessSession.legalMoves(chessSelected):[];
 chessExhibit.setBoard(state.board,{selected:chessSelected||(chessKeyboard?chessFocus:null),legal,lastMove:state.lastMove});
 if(chessFen!==state.fen){chessFen=state.fen;renderer.shadowMap.needsUpdate=true;}
 $('chessStatus').textContent=promotionMove?'Vyberte figuru pro proměnu pěšce.':state.status;
 $('chessSelection').textContent=chessSelected?`${chessSelected.toUpperCase()} · vyberte zvýrazněné cílové pole.`:'Vyberte svou figuru, potom cílové pole.';
 $('chessHistory').textContent=state.history.length?state.history.slice(-6).join('  ·  '):'Začínáte bílými figurami.';
 $('chessUndo').disabled=!state.history.length;$('chessPromotion').hidden=!promotionMove;
 $('chessPanel').querySelectorAll('button[data-chess-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chessLevel===state.level)));
 const bySquare=new Map(state.board.map(piece=>[piece.square,piece]));
 for(const cell of $('chessGrid').querySelectorAll('[data-chess-square]')){const square=cell.dataset.chessSquare,piece=bySquare.get(square);cell.setAttribute('aria-label',`${square}, ${piece?(piece.type==='q'?(piece.color==='w'?'bílá ':'černá '):(piece.type==='r'?(piece.color==='w'?'bílá ':'černá '):(piece.color==='w'?'bílý ':'černý ')))+chessNames[piece.type]:'prázdné pole'}`);cell.setAttribute('aria-selected',String(square===chessSelected));cell.setAttribute('aria-disabled',String(state.thinking||state.gameOver));cell.tabIndex=square===chessFocus?0:-1;}
 shell.dataset.chessFen=state.fen;shell.dataset.chessMoves=String(state.history.length);shell.dataset.chessLevel=state.level;shell.dataset.chessThinking=String(state.thinking);shell.dataset.chessOver=String(state.gameOver);scheduleRender();
}
async function ensureChess(){
 if(chessSession)return chessSession;if(chessLoading)return chessLoading;
 $('chessStatus').textContent='Připravuji šachovnici…';
 chessLoading=import('./museum-chess-engine-v15.js?v=15.0').then(({createChessSession})=>{chessSession=createChessSession({onChange:state=>updateChess(state)});chessSession.setDifficulty(chessLevel);updateChess();return chessSession}).catch(error=>{$('chessStatus').textContent='Šachy se nepodařilo načíst. Zkuste novou partii.';chessLoading=null;return null});return chessLoading;
}
function startChess(){
 if(!chessExhibit)return;if(camera.position.x<9.75){focusSalonDoor();return}setSalonStage('inside');$('leisureMenu').open=false;setWalking(false);selected=-1;mapMode=false;seatMode=null;activeNote=null;chessMode=true;markEntered();$('selectedExhibit').hidden=true;$('chessPanel').hidden=false;shell.classList.add('playing-chess');updateSelection();flyTo(mobile.matches?chessExhibit.mobileLookFrom:chessExhibit.lookFrom,chessExhibit.lookAt,850);ensureChess().then(game=>{if(chessMode&&game)updateChess()});say('Šachy proti počítači. Vyberte obtížnost, potom svou figuru a cílové pole.');
}
function handleChessSquare(square,keyboard=false){
 if(!chessSession||!chessMode)return;chessKeyboard=keyboard;const state=chessSession.state();if(state.thinking||state.gameOver||state.turn!=='w')return;
 if(!square){chessSelected=null;promotionMove=null;updateChess();return}chessFocus=square;
 if(chessSelected){const options=chessSession.legalMoves(chessSelected).filter(move=>move.to===square);if(options.length){if(options.some(move=>move.promotion)){promotionMove={from:chessSelected,to:square};updateChess();return}const from=chessSelected;chessSelected=null;promotionMove=null;chessSession.move(from,square);return}}
 const piece=state.board.find(p=>p.square===square);chessSelected=piece?.color==='w'&&chessSelected!==square?square:null;promotionMove=null;updateChess();
}
document.addEventListener('click',event=>{
 const level=event.target.closest('#chessPanel button[data-chess-level]');if(level){chessLevel=level.dataset.chessLevel;chessSelected=null;promotionMove=null;if(chessSession)chessSession.setDifficulty(chessLevel);else ensureChess();return}
 const promote=event.target.closest('[data-chess-promotion]');if(promote&&promotionMove){const move=promotionMove;promotionMove=null;chessSelected=null;chessSession.move(move.from,move.to,promote.dataset.chessPromotion);return}
 const cell=event.target.closest('[data-chess-square]');if(cell)handleChessSquare(cell.dataset.chessSquare,true);
});
$('chessGrid').addEventListener('keydown',event=>{const cell=event.target.closest('[data-chess-square]');if(!cell)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];if(!delta)return;event.preventDefault();chessKeyboard=true;const file=THREE.MathUtils.clamp(cell.dataset.chessSquare.charCodeAt(0)-97+delta[0],0,7),rank=THREE.MathUtils.clamp(Number(cell.dataset.chessSquare[1])+delta[1],1,8);chessFocus=String.fromCharCode(97+file)+rank;updateChess();$('chessGrid').querySelector(`[data-chess-square="${chessFocus}"]`).focus({preventScroll:true});});
$('chessNew').addEventListener('click',async()=>{const game=await ensureChess();chessSelected=null;promotionMove=null;game?.reset(chessLevel)});
$('chessUndo').addEventListener('click',()=>{chessSelected=null;promotionMove=null;chessSession?.undoTurn()});
$('chessExit').addEventListener('click',returnToSalon);

function updateModelProgress(state){
 const missing=Object.keys(state.errors).length;modelStatusSuffix=missing?` ${missing} ze 7 modelů se nepodařilo načíst. Fotografie jsou v detailu projektu.`:'';
 status.textContent=statusMessage+modelStatusSuffix;
 shell.dataset.detailedModels=['koupelni',...state.fullIds].join(',');
 shell.dataset.loadedModels=state.loadedIds.join(',');shell.dataset.previewModels=state.previewIds.join(',');
 shell.dataset.modelPayloadBytes=String(state.payloadBytes);shell.dataset.modelErrors=Object.keys(state.errors).join(',');
 shell.dataset.modelFallbacks=Object.keys(state.detailErrors).join(',');shell.dataset.modelManifest=String(state.manifestRevision||'loading');shell.dataset.modelsPending=String(state.pendingIds.length);
 if(state.id&&state.loadedIds.includes(state.id)&&installModel?.(state.id,state.previewIds.includes(state.id)?'preview':'full')){addLifeTable(tables.find(t=>t.group.userData.projectId===state.id));shell.dataset.modelPlacement=JSON.stringify(tables.map(t=>({id:t.group.userData.projectId,...t.model.userData.displayPlacement})));shell.dataset.neonModels=String(scene.userData.allExhibitLighting?.count||0);scheduleRender()}
 if(state.id){
   const link=document.querySelector('[data-project-card="'+state.id+'"] .card-actions button');
   if(link)link.textContent=state.errors[state.id]?'Znovu načíst 3D model ↻':'Obejít 3D model ↗';
 }
}
function setFallback(){$('entrancePoster').hidden=true;document.body.classList.add('gallery-fallback');shell.dataset.renderer='html';$('museumFallback').hidden=false;say('Projekty jsou dostupné v přehledu pod galerií.');document.body.classList.remove('gallery-at-entry');host.setAttribute('aria-disabled','true')}
async function init(){
 try{const response=await fetch('assets/v6/projects.json?v=21.0');if(!response.ok)throw Error();const data=await response.json();projects=data.projects||[];if(!projects.length)throw Error();}catch{setFallback();say('Projektové podklady se nepodařilo načíst. Obnovte stránku.');return}
 buildInterface();
 const query=new URLSearchParams(location.search);
 const linkedProject=projects.find(p=>p.id===query.get('projekt'));
 const linkedLight=new Map([['den','day'],['noc','evening'],['neon','neon']]).get(query.get('svetlo'));
 if(linkedLight){lighting.preset=linkedLight;lightWasChosen=true;syncProjectLinks()}
 else if(linkedProject)lighting.preset='day';
 try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
   await Promise.all([
     document.fonts.load('500 20px "Space Grotesk"','Výstavní sál · Koupelní 2').catch(()=>{}),
     fetch('assets/v21/window-layouts.json').then(r=>r.json()).then(d=>windowLayouts=d.layouts||{}).catch(()=>{shell.dataset.lifeError='window-layout'}),
     fetch('assets/v2/czech-detailed.geojson').then(r=>r.json()).then(g=>czGeo=g).catch(()=>{}),
     fetch('assets/v7/art/artworks.json?v=20.1').then(r=>r.json()).then(data=>{
       const paper=document.createElement('canvas');paper.width=paper.height=1;
       const ctx=paper.getContext('2d');ctx.fillStyle='#b6ad98';ctx.fillRect(0,0,1,1);
       const loader=new THREE.ImageLoader();
       artworks=data.artworks.map(art=>{
         const texture=new THREE.Texture(paper);
         texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;texture.needsUpdate=true;
         const item={...art,texture};
         // The four prints can already be seen through the entrance glass.
         // A tiny preview in the metadata fills their mounts until the visit starts.
         if(art.miniature)loader.load(art.miniature,image=>{
           if(item.previewReady)return;
           texture.dispose();texture.image=image;texture.needsUpdate=true;
           scheduleRender();
         });
         return item;
       });
     }).catch(()=>{})
   ]);
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);buildRoom();renderer.shadowMap.needsUpdate=true;shell.dataset.renderer='webgl';shell.dataset.exhibits=String(tables.length);shell.dataset.roomReady='true';host.setAttribute('aria-disabled','false');shell.dataset.revision='24.1';shell.dataset.reducedMotion=String(reduced.matches);shell.dataset.artworks=String(artworks.length);shell.dataset.facadeMode='geometric';say('Výstavní sál je připravený.');let lastWidth=0,lastHeight=0,lastMobile=mobile.matches;
 const resize=()=>{
   const w=host.clientWidth,h=host.clientHeight;
   if(!w||!h||(w===lastWidth&&h===lastHeight))return;
   const table=selected>=0&&shell.dataset.mode==='orbit'&&!cameraFrame?tables[selected]:null;
   const previousView=table&&lastWidth?exhibitView(table,camera,THREE,lastMobile):null;
   const atStartView=previousView&&camera.position.distanceToSquared(previousView.position)<.0025;
   lastWidth=w;lastHeight=h;lastMobile=mobile.matches;
   const ratio=galleryPixelRatio(devicePixelRatio,w,h,mobile.matches,limitedDevice);
   renderer.setDrawingBufferSize(w,h,ratio);
   camera.aspect=w/h;camera.fov=galleryFieldOfView(w,h,salonStage,chessMode);
   camera.updateProjectionMatrix();shell.dataset.fov=String(camera.fov);
   if(atStartView){
     const view=exhibitView(table,camera,THREE,mobile.matches);
     camera.position.copy(view.position);cameraTarget.copy(view.target);camera.lookAt(cameraTarget);syncControls();
   }
   // Resizing resets the WebGL drawing buffer. Refill it in this same layout
   // callback so the compositor never sees a resized, undrawn, visible canvas.
   cancelAnimationFrame(renderFrame);renderFrame=0;render();
 };
 new ResizeObserver(resize).observe(host);resize();
 const entryCover=$('entrancePoster');
 const wasFocused=entryCover===document.activeElement;
 const earlyVisit=location.hash==='#vstoupit';
 if(earlyVisit)history.replaceState(history.state,'',location.pathname+location.search);
 entryCover.hidden=true;
 host.removeAttribute('aria-hidden');host.tabIndex=0;
 if(wasFocused)host.focus({preventScroll:true});
 if(pendingProject){const {id,scroll}=pendingProject;pendingProject=null;focusProject(id,scroll);}
 else if(pendingEntry||earlyVisit)enterGallery();
 else if(linkedProject)focusProject(linkedProject.id,false,true,0);
 renderer.domElement.addEventListener('webglcontextlost',event=>{
   event.preventDefault();contextLost=true;syncModelLoading();stopAmbientMotion();stopFrames();setFallback();
 });
 renderer.domElement.addEventListener('webglcontextrestored',()=>{
   contextLost=false;syncModelLoading();shell.dataset.renderer='webgl';$('museumFallback').hidden=true;
   document.body.classList.remove('gallery-fallback');
   document.body.classList.toggle('gallery-at-entry',!entered);
   host.setAttribute('aria-disabled','false');renderer.shadowMap.needsUpdate=true;
   updateSelection();scheduleRender();say('Výstavní sál je připravený.');
 });
 }
 catch(error){console.warn('Museum 3D unavailable; project index retained.',error);setFallback();if(linkedProject)document.querySelector('[data-project-card="'+linkedProject.id+'"]')?.scrollIntoView({block:'center'})}
}
// The canvas reserves only horizontal motion for the gallery. This CSS policy
// also applies to a touchscreen laptop or a phone rotated to landscape.
function syncTouchPolicy(){
 if(renderer)renderer.domElement.style.touchAction='pan-y';
 shell.dataset.touchNavigation='page-scroll';
}
mobile.addEventListener('change',()=>{syncTouchPolicy();if(camera)updateSelection()});
host.addEventListener('wheel',event=>{if((mobile.matches||matchMedia('(pointer:coarse)').matches)&&!event.ctrlKey&&!event.metaKey)event.stopImmediatePropagation()},{capture:true,passive:true});
host.addEventListener('wheel',event=>{if(!walking)return;event.preventDefault();const step=event.deltaY>0?-1:1;const pos=walkPosition(camera.position.x-Math.sin(yaw)*step,camera.position.z-Math.cos(yaw)*step);if(pos)walkTo(...pos)},{passive:false});
$('chessButton').addEventListener('click',focusSalonDoor);$('salonEnter').addEventListener('click',enterSalon);$('salonPlay').addEventListener('click',startChess);$('salonExit').addEventListener('click',()=>leaveSalon());
$('lifeMotion').addEventListener('click',()=>{lifeUserChoice=true;lifePlay=!lifePlay;stopAmbientMotion();lifeLast=0;syncLifeButton();scheduleRender()});
reduced.addEventListener('change',event=>{if(!lifeUserChoice)lifePlay=!event.matches;syncLifeButton();scheduleRender()});
$('wallMapButton').addEventListener('click',showWallMap);$('ledIntensity').addEventListener('input',event=>{lighting.intensity=Number(event.target.value)/100;applyLighting()});
// Before the modules arrive, the ordinary link records the same request in the fragment.
$('entrancePoster').addEventListener('click',event=>{
 event.preventDefault();pendingEntry=true;
 if(camera&&!entered)enterGallery();
});
// Interface works independently of the 3D canvas.
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.lightPreset){lighting.preset=b.dataset.lightPreset;lightWasChosen=true;applyLighting();syncProjectLinks();return}if(b.dataset.ledColor){lighting.color=b.dataset.ledColor;applyLighting();return}if(b.hasAttribute('data-note-close')){activeNote=null;updateHotspots();return}if(b.dataset.note){showNote(b.dataset.note);return}if(b.dataset.company){openCompany(b.dataset.company);return}if(b.dataset.focus){focusProject(b.dataset.focus,b.hasAttribute('data-scroll'));return}if(b.dataset.open){openProject(b.dataset.open);return}if(b.hasAttribute('data-close'))b.closest('dialog')?.close()});
host.addEventListener('keydown',event=>{
 if(!entered&&(event.key==='Enter'||event.key===' ')){event.preventDefault();enterGallery();return}
});$('overviewButton').addEventListener('click',overview);$('walkToggle').addEventListener('click',()=>{if(seatMode){const b=benches.find(b=>b.id===seatMode);seatMode=null;setWalking(true);if(b)flyTo([b.seat[0]+(b.seat[0]<0?1.85:-1.85),2.35,b.approach[2]],[0,1.9,3.5],650);return}if(mapMode){focusProject(lastProject);return}if(walking)focusProject(lastProject);else setWalking(true,true)});$('nextExhibit').addEventListener('click',()=>focusProject(projects[(selected+1+projects.length)%projects.length]?.id));$('previousExhibit').addEventListener('click',()=>focusProject(projects[selected<0?projects.length-1:(selected-1+projects.length)%projects.length]?.id));$('openProject').addEventListener('click',()=>{if(selected>=0)openProject(projects[selected].id)});
$('orbitToolbar').addEventListener('click',event=>{const action=event.target.closest('button[data-orbit]')?.dataset.orbit;if(action)orbitAction(action)});
for(const dialog of document.querySelectorAll('dialog')){dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});dialog.addEventListener('close',scheduleRender)}
// FD Prohlidka bindings: W/S forward/back, A/D strafe, left/right arrows turn.
const keyMap={w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',d:'right',arrowleft:'turnLeft',arrowright:'turnRight'};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&shell.classList.contains('expanded-gallery')){toggleExpanded();return}if(event.metaKey||event.ctrlKey||event.altKey||!entered||!shell.contains(document.activeElement)||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(seatMode){const angles={ArrowLeft:[.12,0],ArrowRight:[-.12,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]},delta=angles[event.key];if(delta){event.preventDefault();yaw+=delta[0];pitch=THREE.MathUtils.clamp(pitch+delta[1],-.8,.7);lookFromWalk();scheduleRender()}return}if(!walking){if(selected<0||mapMode)return;const action=event.key==='ArrowLeft'?'left':event.key==='ArrowRight'?'right':event.key==='+'||event.key==='='?'near':event.key==='-'||event.key==='_'?'far':null;if(action){event.preventDefault();orbitAction(action)}return}const key=keyMap[event.key.toLowerCase()];if(!key)return;event.preventDefault();startStep(key)});
document.addEventListener('keyup',event=>{const key=keyMap[event.key.toLowerCase()];if(key)keys.delete(key)});
padController=bindMovePad({pad:$('walkPad'),onStart:()=>{if(!walking)setWalking(true,true);route=null;host.focus({preventScroll:true})},onChange:(side,forward)=>{navSide=side;navForward=forward;if(side||forward)ensureMovement()},onNudge:(side,forward)=>{const x=camera.position.x+(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*.65,z=camera.position.z+(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*.65;const pos=walkPosition(x,z);if(pos)walkTo(...pos)}});
function applyTouchOrbit(angle){
 orbitDirection.copy(camera.position).sub(cameraTarget).normalize();
 if(angle)orbitDirection.applyAxisAngle(orbitUp,angle);
 const distance=roomOrbitDistance(cameraTarget,orbitDirection,touchRadius);
 camera.position.copy(cameraTarget).addScaledVector(orbitDirection,distance);
 controls.update();
}
touchController=bindGalleryTouch(host,{
 onContact(){
   touchMode=!camera||cameraFrame?'transition':walking?'walk':seatMode?'seated':controls?.enabled?'orbit':'select';
   if(touchMode==='orbit'&&!touchRadius)touchRadius=camera.position.distanceTo(cameraTarget);
 },
 onTurn(dx){
   const angle=-dx*Math.PI*.85/Math.max(host.clientWidth,1);
   if(touchMode==='orbit'&&controls?.enabled)applyTouchOrbit(angle);
   if((touchMode==='walk'&&walking)||(touchMode==='seated'&&seatMode)){route=null;yaw+=angle;lookFromWalk();scheduleRender()}
 },
 onPinchStart(){if(touchMode==='orbit')pinchRadius=camera.position.distanceTo(cameraTarget)},
 onPinch(scale){
   if(touchMode!=='orbit'||!controls?.enabled)return;
   touchRadius=THREE.MathUtils.clamp(pinchRadius*scale,controls.minDistance,controls.maxDistance);
   applyTouchOrbit(0);
 },
 onTap(event){if(camera&&touchMode!=='transition')pick(event)}
});
host.addEventListener('pointerdown',event=>{
 if(event.pointerType==='touch'||event.button>0||gesture)return;
 gesture={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,dragged:false};
 host.focus({preventScroll:true});
 if(walking||seatMode)host.setPointerCapture(event.pointerId);
});
host.addEventListener('pointermove',event=>{
 if(!gesture||gesture.id!==event.pointerId)return;
 const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
 if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>8)gesture.dragged=true;
 if((walking||seatMode)&&gesture.dragged){
   cancelAnimationFrame(cameraFrame);cameraFrame=0;finishFlight=null;route=null;
   yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-.8,.7);
   lookFromWalk();scheduleRender();host.classList.add('is-dragging');
 }
 gesture.x=event.clientX;gesture.y=event.clientY;
});
host.addEventListener('pointerup',event=>{
 if(!gesture||gesture.id!==event.pointerId)return;
 const tap=!gesture.dragged;gesture=null;host.classList.remove('is-dragging');
 if(tap)pick(event);
});
function cancelMouseGesture(event){
 if(gesture?.id===event.pointerId){gesture=null;host.classList.remove('is-dragging')}
}
host.addEventListener('pointercancel',cancelMouseGesture);
host.addEventListener('lostpointercapture',cancelMouseGesture);
function toggleExpanded(){const expand=!shell.classList.contains('expanded-gallery');shell.classList.toggle('expanded-gallery',expand);document.body.classList.toggle('gallery-is-expanded',expand);$('expandGallery').setAttribute('aria-pressed',String(expand));$('expandGallery').setAttribute('aria-label',expand?'Zmenšit galerii':'Rozbalit galerii');host.focus({preventScroll:true})}
$('expandGallery').addEventListener('click',toggleExpanded);
document.querySelector('.mobile-projects-link').addEventListener('click',()=>{if(shell.classList.contains('expanded-gallery'))toggleExpanded()});
$('helpGallery').addEventListener('click',()=>{suspendNavigation();$('navigationHelp').showModal()});
$('pagerPrevious').addEventListener('click',()=>focusProject(projects[selected<0?projects.length-1:(selected-1+projects.length)%projects.length]?.id));
$('pagerNext').addEventListener('click',()=>focusProject(projects[(selected+1+projects.length)%projects.length].id));
$('pagerDetail').addEventListener('click',()=>{if(selected>=0)openProject(projects[selected].id)});
function suspendNavigation(){
 const finish=finishFlight;
 stopAmbientMotion();stopFrames();finish?.();
 gesture=null;host.classList.remove('is-dragging');
}
function syncModelLoading(){
 setModelLoadingPaused(!visible||document.hidden||contextLost);
 shell.dataset.modelLoadingPaused=String(!visible||document.hidden||contextLost);
}
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncModelLoading();if(!visible)suspendNavigation();else{scheduleRender()}},{threshold:.03}).observe(shell);
document.addEventListener('visibilitychange',()=>{syncModelLoading();if(document.hidden)suspendNavigation();else{scheduleRender()}});window.addEventListener('blur',()=>{pausedByBlur=true;suspendNavigation()});window.addEventListener('focus',()=>{pausedByBlur=false;lifeLast=0;scheduleRender()});
init();
