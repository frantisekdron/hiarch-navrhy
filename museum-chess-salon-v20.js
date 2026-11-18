import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';

// East wing coordinates: local +Z enters the salon, local +X points south.
export function addChessSalon({THREE:T,scene,pickables,labelTexture,artworks=[],requestRender=()=>{}}){
 const group=new T.Group();group.name='Vienna Secession chess salon V20';group.position.set(9.58,0,-14.8);group.rotation.y=Math.PI/2;scene.add(group);
 const resources=new Set(),materials=new Set(),ownedTextures=new Set(),batches=new Map(),targets=[];
 const interior=new T.Group();interior.name='V20 salon interior';group.add(interior);
 const width=8.8,depth=9.5,height=7.2,openingWidth=2.8,openingHeight=4.5;
 group.userData.chessSalon={version:20,width,depth,height,openingWidth,openingHeight,doorOpen:0,worldBounds:{min:[9.58,0,-19.2],max:[19.08,7.2,-10.4]},fixtures:2};
 function mat(color,extra={}){const m=new T.MeshStandardMaterial({color,roughness:.54,...extra});materials.add(m);return m;}
 const green=mat(0x263e34,{roughness:.49,metalness:.05}),marble=mat(0xcac3a8,{roughness:.38,metalness:.04});
 const darkMarble=mat(0x31483c,{roughness:.23,metalness:.13}),bronze=mat(0x9d8354,{roughness:.28,metalness:.77});
 const wall=mat(0xd3d0b6,{roughness:.92,emissive:0x9f9177,emissiveIntensity:.045}),ceiling=mat(0xccc5ab,{roughness:.85}),wood=mat(0x654a38,{roughness:.43,emissive:0x9d7967,emissiveIntensity:.055});
 const parquet=mat(0x70533e,{roughness:.48,emissive:0x70533e,emissiveIntensity:.23});
 const screen=mat(0x294336,{roughness:.64,metalness:.13,emissive:0x294336,emissiveIntensity:.65});
 // Small local maps load on first visible frame. Four compact locally authored maps; no runtime procedural rendering.
 let textureLoadStarted=false,disposed=false;
 function loadInteriorTextures(){
  if(textureLoadStarted||disposed||typeof document==='undefined')return;
  textureLoadStarted=true;
  const loader=new T.TextureLoader();
  const finishes=[[wood,'walnut'],[wall,'plaster'],[screen,'secession-screen'],[parquet,'parquet']];
  for(const [material,name] of finishes){
   const url=new URL('./assets/v20/salon/'+name+'.webp',import.meta.url);
   const texture=loader.load(url.href,loaded=>{
    if(disposed){loaded.dispose();return;}
    if(material!==wall)material.color.setHex(0xffffff);
    if(material===parquet||material===screen)material.emissive.setHex(0xffffff);
    material.map=loaded;
    material.emissiveMap=loaded;
    material.needsUpdate=true;
    requestRender();
   },undefined,()=>requestRender());
   texture.colorSpace=T.SRGBColorSpace;
   texture.anisotropy=2;
   ownedTextures.add(texture);
  }
 }
 const luminous=new T.MeshBasicMaterial({color:0xdac69a});materials.add(luminous);
 const glass=mat(0xf4ead5,{roughness:.64,metalness:0,vertexColors:true,emissive:0xffe4bb,emissiveIntensity:.30});
 function bake(parent,material,geometry,p=[0,0,0],s=[1,1,1],r=[0,0,0]){
  const temp=new T.Object3D();temp.position.fromArray(p);temp.scale.fromArray(s);temp.rotation.set(...r);temp.updateMatrix();
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();
  if(material===glass){const pos=g.attributes.position,c=[];for(let i=0;i<pos.count;i++){const y=pos.getY(i),x=pos.getX(i);const scatter=.74+.22*(1-y)*.5+.035*x;c.push(scatter,scatter*.97,scatter*.89);}g.setAttribute('color',new T.Float32BufferAttribute(c,3));}
  g.applyMatrix4(temp.matrix);geometry.dispose();
  if(!batches.has(parent))batches.set(parent,new Map());const byMat=batches.get(parent);if(!byMat.has(material))byMat.set(material,[]);byMat.get(material).push(g);
 }
 const box=(parent,m,w,h,d,x,y,z)=>bake(parent,m,new T.BoxGeometry(w,h,d),[x,y,z]);
 function tube(parent,m,points,r=.025,segments=22){bake(parent,m,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,6,false));}
 function ring(parent,m,r,t,x,y,z){bake(parent,m,new T.TorusGeometry(r,t,6,r<.2?12:48),[x,y,z],[1,1,1],[-Math.PI/2,0,0]);}
 const portal=new T.Group();portal.name='Marble and brass chess portal';portal.position.z=-.55;portal.userData.chessPortal=true;group.add(portal);
 // Floor and continuous outer shell. The front wall is explicitly split around a 2.8×4.5m hole.
 box(interior,parquet,width,.05,depth,0,.025,depth/2);
 for(const x of [-4.03,4.03])box(interior,marble,.34,.006,9.12,x,.053,4.75);
 for(const z of [.35,9.15])box(interior,marble,8.4,.006,.34,0,.053,z);
 for(const x of [-3.83,3.83])box(interior,bronze,.018,.008,8.55,x,.056,4.75);
 for(const z of [.53,8.97])box(interior,bronze,7.68,.008,.018,0,.056,z);
 // A thin radial marquetry ring centres the furniture without duplicating its board.
 // The brass lines and timber medallion are inlays flush with the parquet.
 for(const [radius,band,material] of [[2.02,.041,marble],[2.10,.011,bronze]]){
  const inlay=new T.RingGeometry(radius-band/2,radius+band/2,72);
  bake(interior,material,inlay,[0,.054,5.92],[1,1,1],[-Math.PI/2,0,0]);
 }
 for(let i=0;i<12;i++){const a=i*Math.PI/6;bake(interior,marble,new T.BoxGeometry(.13,.005,.13),[Math.sin(a)*2.10,.061,5.92+Math.cos(a)*2.10],[1,1,1],[0,a+Math.PI/4,0]);}
 for(const x of [-4.31,4.31]){
  box(interior,wall,.18,height,depth,x,height/2,depth/2);
  box(interior,wood,.055,1.25,9.15,x-Math.sign(x)*.12,.675,4.75);
  box(interior,bronze,.035,.035,9.15,x-Math.sign(x)*.16,1.32,4.75);
  box(interior,marble,.20,.22,9.25,x-Math.sign(x)*.08,.16,4.75);
 }
 box(interior,wall,8.44,height,.18,0,height/2,9.41);
 box(interior,wood,8.33,1.25,.05,0,.675,9.29);box(interior,bronze,8.33,.035,.035,0,1.32,9.25);
 for(const x of [-2.9,2.9])box(interior,wall,3.0,height,.18,x,height/2,.09);
 box(interior,wall,openingWidth,height-openingHeight,.18,0,openingHeight+(height-openingHeight)/2,.20);
 // Pilasters are intentionally outside the clear entrance and artwork bays.
 for(const side of [-1,1])for(const z of [.64,8.87]){
  const x=side*4.10;
  box(interior,green,.22,5.85,.30,x,3.20,z);box(interior,bronze,.035,5.50,.325,x-side*.13,3.20,z);
  box(interior,marble,.38,.28,.47,x,.39,z);box(interior,marble,.37,.23,.48,x,6.20,z);
  for(const dz of [-.085,.085])box(interior,bronze,.035,5.2,.012,x-side*.15,3.2,z+dz);
 }
 // Rear furnishing: built-in walnut credenza and original inlaid botanical screen.
 box(interior,wood,6.7,.78,.66,0,.53,8.91);
 box(interior,marble,6.82,.09,.75,0,.965,8.88);
 for(const x of [-2.65,-1.32,0,1.32,2.65]){
  box(interior,bronze,.016,.55,.022,x,.52,8.565);
  box(interior,bronze,.10,.025,.045,x+.34,.66,8.53);
 }
 box(interior,green,6.52,4.5,.09,0,3.64,9.22);
 box(interior,bronze,6.57,.035,.12,0,1.385,9.15);
 box(interior,bronze,6.57,.035,.12,0,5.895,9.15);
 const screenPlane=new T.Mesh(new T.PlaneGeometry(6.4,4.4),screen);screenPlane.position.set(0,3.64,9.15);screenPlane.rotation.y=Math.PI;screenPlane.name='Original botanical brass inlay';resources.add(screenPlane.geometry);interior.add(screenPlane);
 // Slim low lounge banquettes leave the centre aisle and both plans unobstructed.
 const leather=mat(0x3c5040,{roughness:.72,emissive:0x16271c,emissiveIntensity:.16});
 for(const side of [-1,1]){
  box(interior,wood,.84,.22,2.12,side*3.62,.38,7.72);
  box(interior,leather,.79,.18,2.03,side*3.62,.59,7.72);
  box(interior,wood,.12,.88,2.12,side*4.0,.72,7.72);
  box(interior,leather,.13,.50,1.95,side*3.91,.93,7.72);
  for(const z of [6.74,8.70]){box(interior,wood,.86,.12,.09,side*3.62,.85,z);box(interior,bronze,.035,.52,.035,side*3.27,.58,z);}
 }
 // Three coffers along the room, with a lifted centre and narrow bronze bead.
 box(interior,ceiling,width,.14,depth,0,7.13,4.75);
 for(const x of [-4.11,4.11]){box(interior,marble,.35,.25,9.1,x,6.83,4.75);box(interior,bronze,.055,.045,9.1,x-Math.sign(x)*.12,6.66,4.75);}
 for(const z of [.36,3.29,6.22,9.14])box(interior,marble,8.25,.20,.17,0,6.88,z);
 for(const x of [-1.37,1.37])box(interior,marble,.12,.18,8.90,x,6.89,4.75);
 for(const x of [-2.74,0,2.74])for(const z of [1.83,4.76,7.69]){
  box(interior,green,2.53,.025,2.68,x,7.035,z);
  for(const xx of [-1.16,1.16])box(interior,bronze,.018,.025,2.44,x+xx,7.01,z);
  for(const zz of [-1.21,1.21])box(interior,bronze,2.34,.025,.018,x,7.01,z+zz);
 }
 // Pompous but slender portal: green marble jambs, bronze edges, lintel and fan motif.
 for(const side of [-1,1]){
  const x=side*1.65;
  box(portal,green,.48,4.64,.40,x,2.40,.24);box(portal,marble,.48,.26,.52,x,.18,.26);box(portal,marble,.62,.24,.52,x,4.63,.26);
  box(portal,bronze,.045,4.22,.44,side*1.425,2.32,.24);
  for(const dx of [-.13,.13])box(portal,bronze,.018,3.95,.025,x+dx,2.36,.025);
 }
 box(portal,green,3.88,.64,.44,0,4.89,.25);box(portal,bronze,4.04,.065,.49,0,5.23,.25);box(portal,marble,4.15,.15,.54,0,5.34,.27);
 for(const d of [-1,0,1])tube(portal,bronze,[[d*.48,5.44,.22],[d*.69,5.70,.22],[d*.80,5.98,.22]],.018,12);
 const label=labelTexture?.(['ŠACHOVÝ SALONEK'],{width:1024,height:160,color:'#eadcba',fontFamily:'Space Grotesk, Manrope, sans-serif'});
 if(label){ownedTextures.add(label);label.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:label,transparent:true,depthWrite:false,side:T.DoubleSide});materials.add(m);const plaque=new T.Mesh(new T.PlaneGeometry(3.10,.44),m);resources.add(plaque.geometry);plaque.position.set(0,4.89,.018);plaque.rotation.y=Math.PI;plaque.name='ŠACHOVÝ SALONEK';plaque.userData.chessPortal=true;portal.add(plaque);}
 const doors=[];
 for(const side of [-1,1]){
  const door=new T.Group();door.position.set(side*1.52,.10,.25);door.userData.chessPortal=true;door.userData.hingeSide=side;door.name=side<0?'Chess portal left leaf':'Chess portal right leaf';group.add(door);doors.push(door);
  const center=-side*.755;
  box(door,wood,1.51,4.28,.09,center,2.14,0);
  for(const y of [.21,2.0,4.08])box(door,bronze,1.35,.045,.106,center,y,0);
  for(const x of [center-.64,center+.64])box(door,bronze,.035,4.08,.106,x,2.14,0);
  for(const y of [1.02,3.02]){
   box(door,green,1.15,1.50,.11,center,y,.005);
   for(const dx of [-.53,.53])box(door,bronze,.018,1.35,.125,center+dx,y,0);
   for(const dy of [-.65,.65])box(door,bronze,1.08,.018,.125,center,y+dy,0);
  }
  // Curved bronze fan grille and leaf-like centre, mirrored on each real door leaf.
  for(const d of [-1,0,1])tube(door,bronze,[[center,2.35,-.075],[center+d*.21,2.73,-.085],[center+d*.38,3.40,-.075]],.014,14);
  const hx=-side*1.37;
  for(const face of [-1,1]){
   box(door,bronze,.10,.30,.025,hx,1.92,face*.07);
   tube(door,bronze,[[hx,1.80,face*.065],[hx,1.80,face*.085],[hx,2.04,face*.085],[hx,2.04,face*.065]],.018,10);
  }
  for(const y of [.42,2.14,3.86])bake(door,bronze,new T.CylinderGeometry(.045,.045,.17,10),[0,y,0]);
 }
 // Low suspended opal chandelier: visible from the doorway, with real opaque shades.
 const cz=5.92;
 bake(interior,bronze,new T.CylinderGeometry(.045,.045,2.28,10),[0,5.93,cz]);
 bake(interior,bronze,new T.CylinderGeometry(.24,.32,.10,24),[0,7.02,cz]);
 ring(interior,bronze,1.18,.038,0,4.72,cz);
 ring(interior,bronze,.61,.025,0,4.19,cz);
 bake(interior,glass,new T.SphereGeometry(1,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),[0,4.2,cz],[.66,.42,.66]);
 ring(interior,bronze,.66,.025,0,4.2,cz);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,x=Math.cos(a),z=Math.sin(a);
  tube(interior,bronze,[[0,4.96,cz],[x*.46,4.82,cz+z*.46],[x*1.18,4.72,cz+z*1.18],[x*1.12,4.38,cz+z*1.12]],.022,10);
  bake(interior,glass,new T.SphereGeometry(1,12,8),[x*1.12,4.38,cz+z*1.12],[.18,.28,.18]);
  ring(interior,bronze,.125,.016,x*1.12,4.58,cz+z*1.12);
  bake(interior,bronze,new T.CylinderGeometry(.085,.115,.11,10),[x*1.12,4.65,cz+z*1.12]);
 }
 const mainLight=new T.RectAreaLight(0xffe3b3,4.5,3.8,3.8);mainLight.position.set(0,4.12,cz);mainLight.rotation.x=-Math.PI/2;interior.add(mainLight);
 const entryLight=new T.RectAreaLight(0xe3e3cd,2.5,2.8,2.0);entryLight.position.set(0,4.8,-1.35);entryLight.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),new T.Vector3(0,-2.3,1.60).normalize());interior.add(entryLight);
 // Two verified supplied plan textures; artwork maps remain externally owned.
 for(const [index,id] of ['floor-5np','axonometry'].entries()){
  const art=artworks.find(a=>a.id===id);if(!art?.texture)continue;
  const side=index===0?-1:1,x=side*4.155,z=5.15,frameW=4.3,frameH=3.15;
  box(interior,green,.065,frameH+.18,frameW+.18,x,3.50,z);box(interior,bronze,.08,frameH,frameW,x-side*.045,3.50,z);box(interior,marble,.045,frameH-.12,frameW-.12,x-side*.10,3.50,z);
  const image=art.texture.image,ratio=art.width&&art.height?art.width/art.height:image?.width&&image?.height?image.width/image.height:1.55,w=Math.min(3.88,2.63*ratio),h=Math.min(2.63,3.88/ratio);
  const m=new T.MeshBasicMaterial({map:art.texture,side:T.DoubleSide});materials.add(m);const plane=new T.Mesh(new T.PlaneGeometry(w,h),m);resources.add(plane.geometry);plane.rotation.y=-side*Math.PI/2;plane.position.set(x-side*.135,3.55,z);plane.userData.artworkId=id;plane.name=`Chess salon ${id}`;interior.add(plane);targets.push(plane);pickables.push(plane);
 }
 for(const [parent,byMat] of batches)for(const [material,parts] of byMat){const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());resources.add(geometry);const mesh=new T.Mesh(geometry,material);mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);}
 for(const target of [portal,...doors]){target.traverse(o=>o.userData.chessPortal=true);targets.push(target);pickables.push(target);}
 const bounds={min:[9.58,0,-19.2],max:[19.08,7.2,-10.4]};
 function setDoorOpen(value,redraw=true){const t=T.MathUtils.clamp(Number.isFinite(value)?value:0,0,1);doors.forEach(door=>{door.rotation.y=door.userData.hingeSide*t*Math.PI/2;door.userData.doorOpen=t;});group.userData.chessSalon.doorOpen=t;if(t>0)loadInteriorTextures();if(redraw)requestRender();}
 function setInteriorVisible(visible){interior.visible=!!visible;group.userData.chessSalon.interiorVisible=!!visible;if(visible)loadInteriorTextures();requestRender();}
 function setLighting({preset='evening',intensity=1}={}){const amount=T.MathUtils.clamp(Number.isFinite(intensity)?intensity:1,0,1.5);mainLight.intensity=preset==='day'?3.0:4.0+amount*.65;entryLight.intensity=preset==='day'?2.6:3.5+amount*.5;glass.emissiveIntensity=preset==='day'?.12:preset==='evening'?.34:.28;screen.emissiveIntensity=preset==='day'?.30:preset==='evening'?.72:.58;parquet.emissiveIntensity=preset==='day'?.10:.23;luminous.color.set(preset==='day'?0xa8af98:0xdac69a);requestRender();}
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const target of targets){const i=pickables.indexOf(target);if(i>=0)pickables.splice(i,1);}resources.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());ownedTextures.forEach(t=>t.dispose());}
 setDoorOpen(0);group.userData.chessSalon.interiorVisible=true;
 return {group,setDoorOpen,setLighting,setInteriorVisible,doorTargets:doors,bounds,entrance:{outside:[3.4,2.8,-14.8],lookAt:[9.58,2.8,-14.8],inside:[11.9,2.35,-14.8],insideLookAt:[15.5,1.2,-14.8]},dispose};
}
