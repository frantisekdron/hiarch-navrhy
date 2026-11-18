import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';

export function addGalleryFinishes({THREE,scene,box,limestone,mats,recessedAquarium=false,fullAquarium=false,chessOpening=false,mapOnRight=false}){
 // The wall bays, plinths and mouldings share the offline limestone image.
 const map=limestone.map;
 mats.wall.map=map;mats.wall.normalScale.set(.14,.14);mats.wall.emissiveMap=map;
 mats.wallPanel.map=map;mats.wallPanel.normalScale.set(.14,.14);mats.wallPanel.emissiveMap=map;
 const stone=new THREE.MeshStandardMaterial({color:0xCAD0BF,map,normalMap:limestone.normalMap,roughness:.74,metalness:.025,emissiveMap:map,emissive:0xA4B49A,emissiveIntensity:.012});
 stone.normalScale.set(.11,.11);
 const metal=new THREE.MeshStandardMaterial({color:0xA38B61,roughness:.42,metalness:.68,emissive:0x88764C,emissiveIntensity:.025});
 const shadow=new THREE.MeshStandardMaterial({color:0x17251C,roughness:.82});
 const led=new THREE.MeshBasicMaterial({color:0xF0D3A8,toneMapped:false});
 const washCanvas=document.createElement('canvas');washCanvas.width=4;washCanvas.height=128;
 const washContext=washCanvas.getContext('2d'),washGradient=washContext.createLinearGradient(0,0,0,128);
 washGradient.addColorStop(0,'rgba(255,255,255,.8)');
 washGradient.addColorStop(.24,'rgba(255,255,255,.32)');
 washGradient.addColorStop(1,'rgba(255,255,255,0)');
 washContext.fillStyle=washGradient;washContext.fillRect(0,0,4,128);
 const wallWash=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(washCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xC5CBB8,toneMapped:false});
 const ribs=[],trims=[],diffusers=[],wallWashes=[];
 const bayZ=[13.8,7.1,.5,-6.4,-14.1];
 for(const side of fullAquarium?[1]:[-1,1]){
  const lowerSegments=chessOpening&&side>0?[[-17.4,-16.24],[-13.36,17.2]]:[[-17.4,17.2]];
  for(const [from,to]of lowerSegments){const len=to-from,centre=(from+to)/2;
   box(.23,.15,len,side*9.29,.15,centre,shadow,scene,{castShadow:false});
  }
  // Stepped cornices and a continuous recessed light slot give the wall real depth.
  box(.44,.22,34.6,side*9.16,6.48,-.1,stone,scene,{castShadow:false});
  box(.31,.11,34.6,side*9.19,6.67,-.1,metal,scene,{castShadow:false});
  box(.045,.035,34.35,side*8.95,6.35,-.1,led,scene,{castShadow:false,receiveShadow:false});
  // A softly lit upper frieze reveals the mineral texture in the otherwise dark room.
  const wash=new THREE.PlaneGeometry(34.5,.94);
  wash.rotateY(-side*Math.PI/2);wash.translate(side*9.398,5.95,-.1);wallWashes.push(wash);
  for(const z of bayZ){
   if(side>0&&(z===13.8||(chessOpening&&z===-14.1)))continue;
   // The left map bay keeps its entire panel unobstructed.
   if(side<0&&((!mapOnRight&&z===7.1)||(recessedAquarium&&z===13.8)))continue;
   box(.22,5.17,.34,side*9.25,3.70,z,shadow,scene,{castShadow:false});
   box(.23,5.12,.22,side*9.20,3.72,z,stone,scene,{castShadow:false});
   for(const d of [-.09,.09])box(.025,4.98,.022,side*9.068,3.72,z+d,metal,scene,{castShadow:false});
   box(.34,.12,.43,side*9.16,1.20,z,stone,scene,{castShadow:false});
   box(.37,.13,.46,side*9.14,6.20,z,stone,scene,{castShadow:false});
  }
 }
 const washMesh=new THREE.Mesh(mergeGeometries(wallWashes,false),wallWash);
 wallWashes.forEach(geometry=>geometry.dispose());washMesh.raycast=()=>{};scene.add(washMesh);
 // Five shallow vault ribs soften the flat box; geometry is shared in three draws.
 for(const z of bayZ){
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-9.12,6.23,z),new THREE.Vector3(0,7.53,z),new THREE.Vector3(9.12,6.23,z));
  ribs.push(new THREE.TubeGeometry(curve,32,.075,6,false));
  const trimCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-9.12,6.24,z+.084),new THREE.Vector3(0,7.54,z+.084),new THREE.Vector3(9.12,6.24,z+.084));
  trims.push(new THREE.TubeGeometry(trimCurve,32,.016,4,false));
  const glowCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-9.12,6.20,z-.067),new THREE.Vector3(0,7.50,z-.067),new THREE.Vector3(9.12,6.20,z-.067));
  diffusers.push(new THREE.TubeGeometry(glowCurve,32,.011,4,false));
 }
 for(const [geometries,material] of [[ribs,stone],[trims,metal],[diffusers,led]]){
  const mesh=new THREE.Mesh(mergeGeometries(geometries,false),material);geometries.forEach(g=>g.dispose());
  mesh.castShadow=false;mesh.receiveShadow=false;scene.add(mesh);
 }
 // The same stepped finish ties the rear identity wall into the side elevations.
 box(18.3,.23,.36,0,6.47,-17.48,stone,scene,{castShadow:false});
 box(18.1,.035,.032,0,6.32,-17.28,led,scene,{castShadow:false,receiveShadow:false});
 function setLighting({preset='evening',color='#a9dcc6',intensity=1}={}){
  const amount=Math.max(0,Math.min(1.5,Number(intensity)||0)),tint=new THREE.Color(preset==='neon'?color:0xF0D3A8);
  if(preset==='neon'){const h={};tint.getHSL(h);tint.setHSL(h.h,Math.max(.8,h.s),.46)}
  led.color.copy(tint).multiplyScalar(preset==='day'?.4:preset==='neon'?.8+amount*.55:.50+amount*.25);
  stone.color.set(preset==='day'?0xDDD6C4:0x59634F);
  stone.emissiveIntensity=preset==='day'?0:.055;
  // Low, material-coloured bounce keeps the wall texture legible while the
  // actual gallery stays dark; it cannot wash out the illuminated exhibits.
  for(const surface of [mats.wall,mats.wallPanel]){surface.emissive.setHex(0xA1AF94);surface.emissiveIntensity=preset==='day'?0:preset==='neon'?.028:.040}
  stone.envMapIntensity=preset==='day'?.4:.08;
  metal.envMapIntensity=preset==='day'?.7:.22;metal.emissiveIntensity=preset==='day'?.015:.075;
  wallWash.color.copy(preset==='neon'?tint:new THREE.Color(0xD6CDB5));
  wallWash.opacity=preset==='day'?.10:preset==='neon'?.11+amount*.10:.12;
 }
 scene.userData.roomFinish='mineral-stone-brass-inlays-v24';
 return {setLighting};
}
