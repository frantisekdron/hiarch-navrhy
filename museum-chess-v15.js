import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';

// A permanent piece of furniture, with a small instanced chess set. Rules/AI
// are deliberately separate and loaded only when somebody sits down to play.
export function createChessExhibit({THREE,scene,pickables,requestRender=()=>{},position=[-3.4,0,12.3]}){
 const group=new THREE.Group();group.name='Secession chess salon';group.position.fromArray(position);scene.add(group);
 const sq=.112,boardY=.942,resources=new Set(),textures=new Set(),batches=new Map(),piecePools=new Map();let disposed=false;
 const own=g=>(resources.add(g),g);
 function mineral(){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#e4dece';x.fillRect(0,0,256,256);
  for(let i=0;i<12;i++){x.beginPath();x.moveTo(-40+i*33,0);x.bezierCurveTo(i*32+35,60,i*32-12,145,i*32+110,256);x.strokeStyle=i%2?'rgba(104,123,99,.16)':'rgba(154,131,80,.18)';x.lineWidth=i%3?1.2:3;x.stroke()}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;textures.add(map);return map;
 }
 const marbleMap=mineral();
 const bronze=new THREE.MeshStandardMaterial({color:0xA48B5B,metalness:.75,roughness:.3,emissive:0x75603B,emissiveIntensity:.035});
 const stone=new THREE.MeshStandardMaterial({color:0xC4CCB8,map:marbleMap,roughness:.33,metalness:.04,emissiveMap:marbleMap,emissive:0xA49A75,emissiveIntensity:.025});
 const dark=new THREE.MeshStandardMaterial({color:0x142E23,roughness:.5,metalness:.18,emissive:0x294431,emissiveIntensity:.04});
 const velvet=new THREE.MeshStandardMaterial({color:0x355B46,roughness:.94,emissive:0x28452E,emissiveIntensity:.04});
 const whiteTile=new THREE.MeshStandardMaterial({color:0xF0E4C8,map:marbleMap,roughness:.38,metalness:.025});
 const blackTile=new THREE.MeshStandardMaterial({color:0x3D5641,map:marbleMap,roughness:.33,metalness:.09});
 const pieceMats={w:new THREE.MeshPhysicalMaterial({color:0xE9DDBF,roughness:.27,metalness:.12,clearcoat:.35,clearcoatRoughness:.25,emissive:0xB8A176,emissiveIntensity:.04}),b:new THREE.MeshPhysicalMaterial({color:0x203A2B,roughness:.25,metalness:.45,clearcoat:.32,emissive:0x49634B,emissiveIntensity:.08})};
 const led=new THREE.MeshBasicMaterial({color:0xEDD29C,toneMapped:false});
 function add(geometry,material,x=0,y=0,z=0,rotation=null){
  let g=geometry.index?geometry.toNonIndexed():geometry;if(g!==geometry)geometry.dispose();
  if(rotation)g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)));
  g.translate(x,y,z);g.clearGroups();if(!batches.has(material))batches.set(material,[]);batches.get(material).push(g);
 }
 function box(w,h,d,x,y,z,mat){add(new THREE.BoxGeometry(w,h,d),mat,x,y,z)}
 function ring(r,t,y,mat,z=0,x=0){add(new THREE.TorusGeometry(r,t,6,48),mat,x,y,z,[-Math.PI/2,0,0])}
 // A stepped marble pedestal, brass fluting and a rounded stone top.
 add(new THREE.CylinderGeometry(.44,.51,.065,48),bronze,0,.035,0);
 add(new THREE.CylinderGeometry(.34,.42,.63,40),dark,0,.38,0);
 for(let i=0;i<16;i++){const a=i*Math.PI/8;add(new THREE.CylinderGeometry(.011,.011,.56,6),bronze,Math.sin(a)*.355,.39,Math.cos(a)*.355)}
 ring(.37,.015,.69,bronze);add(new THREE.CylinderGeometry(.73,.55,.065,56),dark,0,.744,0);
 add(new THREE.CylinderGeometry(.79,.79,.083,64),stone,0,.823,0);ring(.789,.009,.855,bronze);
 ring(.65,.009,.737,led);
 box(1.025,.042,1.025,0,.889,0,bronze);box(1.004,.025,1.004,0,.918,0,dark);
 const tileGeometry=own(new THREE.BoxGeometry(sq-.001,.012,sq-.001));
 const tileMeshes=[];
 for(const [parity,mat] of [[0,blackTile],[1,whiteTile]]){
  const mesh=new THREE.InstancedMesh(tileGeometry,mat,32);mesh.userData.chessSquares=[];let index=0;
  for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++)if((file+rank)%2===parity){
   mesh.setMatrixAt(index,new THREE.Matrix4().makeTranslation((file-3.5)*sq,boardY-.006,(3.5-rank)*sq));
   mesh.userData.chessSquares[index]=String.fromCharCode(97+file)+(rank+1);index++;
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;group.add(mesh);pickables.push(mesh);tileMeshes.push(mesh);
 }
 // Two club chairs keep the central entrance axis clear.
 for(const side of [-1,1]){
  const z=side*1.22;
  for(const x of [-.29,.29])for(const dz of [-.28,.28])add(new THREE.CylinderGeometry(.018,.015,.47,8),bronze,x,.235,z+dz);
  const cushion=new THREE.Shape();cushion.moveTo(-.28,-.35);cushion.lineTo(.28,-.35);cushion.quadraticCurveTo(.37,-.35,.37,-.26);cushion.lineTo(.37,.26);cushion.quadraticCurveTo(.37,.35,.28,.35);cushion.lineTo(-.28,.35);cushion.quadraticCurveTo(-.37,.35,-.37,.26);cushion.lineTo(-.37,-.26);cushion.quadraticCurveTo(-.37,-.35,-.28,-.35);
  add(new THREE.ExtrudeGeometry(cushion,{depth:.09,bevelEnabled:true,bevelSize:.018,bevelThickness:.014,bevelSegments:2,curveSegments:5}),velvet,0,.55,z,[-Math.PI/2,0,0]);
  const back=new THREE.Shape();back.moveTo(-.34,.54);back.lineTo(-.34,1.10);back.quadraticCurveTo(-.34,1.20,-.24,1.22);back.quadraticCurveTo(0,1.29,.24,1.22);back.quadraticCurveTo(.34,1.20,.34,1.10);back.lineTo(.34,.54);back.closePath();
  add(new THREE.ExtrudeGeometry(back,{depth:.085,bevelEnabled:true,bevelSize:.020,bevelThickness:.015,bevelSegments:2,curveSegments:6}),velvet,0,0,z+side*.31-.0425);
  const frame=new THREE.CatmullRomCurve3([new THREE.Vector3(-.37,.54,z+side*.31),new THREE.Vector3(-.37,1.1,z+side*.31),new THREE.Vector3(-.26,1.25,z+side*.31),new THREE.Vector3(0,1.30,z+side*.31),new THREE.Vector3(.26,1.25,z+side*.31),new THREE.Vector3(.37,1.1,z+side*.31),new THREE.Vector3(.37,.54,z+side*.31)]);
  add(new THREE.TubeGeometry(frame,32,.012,6,false),bronze);
  for(const x of [-.38,.38]){
   const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(x,.49,z-.29),new THREE.Vector3(x,.90,z-.34),new THREE.Vector3(x,.92,z+.32),new THREE.Vector3(x,.49,z+.32));
   add(new THREE.TubeGeometry(curve,18,.016,6,false),bronze);
  }
 }
 // Small stained-glass reading lamp: one low-cost warm area light, no shadow map.
 add(new THREE.CylinderGeometry(.07,.085,.022,24),bronze,.67,.879,0);
 const neck=new THREE.CubicBezierCurve3(new THREE.Vector3(.67,.89,0),new THREE.Vector3(.89,1.40,0),new THREE.Vector3(.75,1.62,0),new THREE.Vector3(.49,1.46,0));
 add(new THREE.TubeGeometry(neck,24,.009,6,false),bronze);
 const glass=new THREE.MeshStandardMaterial({color:0x83A47A,roughness:.36,metalness:.1,emissive:0xE3B66E,emissiveIntensity:.40,side:THREE.DoubleSide});
 add(new THREE.ConeGeometry(.145,.095,32,1,true),glass,.49,1.445,0);ring(.145,.006,1.398,bronze,0,.49);
 const tableLight=new THREE.RectAreaLight(0xFFE4BB,4.0,1.0,1.0);tableLight.position.set(.24,1.75,0);tableLight.rotation.x=-Math.PI/2;group.add(tableLight);
 for(const [material,parts] of batches){const geometry=own(mergeGeometries(parts,false));parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh)}
 const capTarget=new THREE.Mesh(own(new THREE.CylinderGeometry(.79,.79,.084,64)),new THREE.MeshBasicMaterial({visible:false}));capTarget.position.y=.823;capTarget.userData.chessTable=true;group.add(capTarget);pickables.push(capTarget);

 const shapeGeometry=type=>{
  const parts=[];const lathe=points=>new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),18);
  parts.push(lathe([[0,0],[.037,0],[.041,.008],[.037,.014],[.031,.018],[.028,.024],[.016,.038],[.013,.052],[.019,.061]]));
  if(type==='p')parts.push(new THREE.SphereGeometry(.023,16,10).translate(0,.080,0));
  else if(type==='r'){
   parts.push(lathe([[.019,.058],[.022,.08],[.031,.09],[.031,.108],[.021,.108],[.021,.094]]));
   for(let i=0;i<6;i++){const a=i*Math.PI/3;parts.push(new THREE.BoxGeometry(.019,.018,.018).translate(Math.cos(a)*.027,.112,Math.sin(a)*.027))}
  }else if(type==='n'){
   const h=new THREE.Shape();h.moveTo(-.022,.05);h.bezierCurveTo(-.035,.085,-.020,.129,-.006,.141);h.lineTo(.003,.125);h.lineTo(.025,.112);h.lineTo(.036,.086);h.lineTo(.028,.075);h.lineTo(.004,.086);h.lineTo(.011,.055);h.closePath();
   const g=new THREE.ExtrudeGeometry(h,{depth:.023,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,curveSegments:5});g.translate(0,0,-.0115);g.rotateY(Math.PI/2);parts.push(g);
  }else if(type==='b'){
   parts.push(lathe([[.019,.059],[.018,.071],[.012,.079]]));
   const h=new THREE.Shape();h.moveTo(-.017,.076);h.quadraticCurveTo(-.030,.105,0,.137);h.lineTo(.011,.120);h.lineTo(-.003,.100);h.lineTo(.003,.095);h.lineTo(.018,.111);h.quadraticCurveTo(.028,.092,.016,.076);h.closePath();
   const g=new THREE.ExtrudeGeometry(h,{depth:.021,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,curveSegments:5});g.translate(0,0,-.0105);g.rotateY(Math.PI/2);parts.push(g);
  }else{
   parts.push(lathe([[.019,.059],[.014,.075],[.012,.093],[.017,.112],[.027,.119],[.028,.125],[.020,.131]]));
   if(type==='q'){for(let i=0;i<7;i++){const a=i*Math.PI*2/7;parts.push(new THREE.SphereGeometry(.0065,8,6).translate(Math.cos(a)*.021,.137,Math.sin(a)*.021))}parts.push(new THREE.SphereGeometry(.009,10,8).translate(0,.143,0))}
   else{parts.push(new THREE.BoxGeometry(.011,.038,.010).translate(0,.150,0));parts.push(new THREE.BoxGeometry(.035,.010,.010).translate(0,.153,0))}
  }
  const flat=parts.map(g=>{if(g.index){const f=g.toNonIndexed();g.dispose();return f}return g});const merged=own(mergeGeometries(flat,false));flat.forEach(g=>g.dispose());return merged;
 };
 for(const type of ['p','n','b','r','q','k']){
  const geometry=shapeGeometry(type);
  for(const color of ['w','b']){const mesh=new THREE.InstancedMesh(geometry,pieceMats[color],16);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.chessSquares=[];group.add(mesh);piecePools.set(color+type,mesh);pickables.push(mesh)}
 }
 const collarGeometry=own(new THREE.TorusGeometry(.034,.0024,5,18));collarGeometry.rotateX(-Math.PI/2);
 const collars=new THREE.InstancedMesh(collarGeometry,bronze,32);group.add(collars);
 const selectedMat=new THREE.MeshBasicMaterial({color:0xE7C47D,transparent:true,opacity:.38,depthWrite:false});
 const legalMat=new THREE.MeshBasicMaterial({color:0xA1CDAA,transparent:true,opacity:.8,depthWrite:false});
 const selectedTiles=new THREE.InstancedMesh(own(new THREE.PlaneGeometry(sq*.96,sq*.96)),selectedMat,4);selectedTiles.count=0;group.add(selectedTiles);
 const legalTiles=new THREE.InstancedMesh(own(new THREE.RingGeometry(.009,.014,16)),legalMat,32);legalTiles.count=0;group.add(legalTiles);
 function xy(square){return {x:(square.charCodeAt(0)-97-3.5)*sq,z:(3.5-(Number(square[1])-1))*sq}}
 function placeHints(mesh,squares){mesh.count=Math.min(squares.length,mesh.instanceMatrix.count);squares.slice(0,mesh.count).forEach((square,i)=>{const p=xy(square),matrix=new THREE.Matrix4().makeRotationX(-Math.PI/2);matrix.setPosition(p.x,boardY+.003,p.z);mesh.setMatrixAt(i,matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 function setBoard(board,{selected=null,legal=[],lastMove=null}={}){
  for(const mesh of piecePools.values()){mesh.count=0;mesh.userData.chessSquares=[]}
  let collarCount=0;
  for(const piece of board||[]){
   const mesh=piecePools.get(piece.color+piece.type);if(!mesh)continue;const p=xy(piece.square),matrix=new THREE.Matrix4().makeRotationY(piece.color==='b'?Math.PI:0);matrix.setPosition(p.x,boardY,p.z);
   const i=mesh.count++;mesh.setMatrixAt(i,matrix);mesh.userData.chessSquares[i]=piece.square;
   const collarMatrix=new THREE.Matrix4().makeTranslation(p.x,boardY+.015,p.z);collars.setMatrixAt(collarCount++,collarMatrix);
  }
  for(const mesh of piecePools.values()){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
  collars.count=collarCount;collars.instanceMatrix.needsUpdate=true;collars.computeBoundingSphere();
  placeHints(selectedTiles,selected?[selected]:lastMove?[lastMove.from,lastMove.to]:[]);placeHints(legalTiles,[...new Set(legal.map(m=>typeof m==='string'?m:m.to))]);
  group.userData.pieceCount=board?.length||0;requestRender();
 }
 function squareFromHit(hit){return hit?.object?.userData?.chessSquares?.[hit.instanceId]||null}
 function setLighting({preset='evening',color='#a9dcc6',intensity=1}={}){
  const amount=Math.max(0,Math.min(1.5,Number(intensity)||0));
  led.color.set(preset==='neon'?color:0xEDD29C).multiplyScalar(preset==='day'?.45:.6+amount*.5);
  pieceMats.w.envMapIntensity=preset==='day'?1.0:.65;pieceMats.b.envMapIntensity=preset==='day'?1.1:.85;
  pieceMats.w.emissiveIntensity=preset==='day'?.01:.10;pieceMats.b.emissiveIntensity=preset==='day'?.02:.20;
  bronze.envMapIntensity=preset==='day'?.9:.45;stone.emissiveIntensity=preset==='day'?0:.04;
  tableLight.intensity=preset==='day'?2.0:2.4;glass.emissiveIntensity=preset==='day'?.08:.30;
 }
 const startBoard=[];for(let file=0;file<8;file++){for(const [color,rank,type] of [['w',2,'p'],['b',7,'p'],['w',1,'rnbqkbnr'[file]],['b',8,'rnbqkbnr'[file]]])startBoard.push({square:String.fromCharCode(97+file)+rank,color,type})}setBoard(startBoard);setLighting();
 const [cx,,cz]=position;
 return {group,setBoard,setLighting,squareFromHit,lookAt:[cx,.96,cz],lookFrom:[cx+.55,2.40,cz+1.70],mobileLookFrom:[cx,2.30,cz+.75],obstacles:[{x:cx,z:cz,halfWidth:.87,halfDepth:.87},{x:cx,z:cz-1.22,halfWidth:.44,halfDepth:.45},{x:cx,z:cz+1.22,halfWidth:.44,halfDepth:.45}],dispose(){if(disposed)return;disposed=true;scene.remove(group);for(const mesh of [...piecePools.values(),...tileMeshes,capTarget]){const i=pickables.indexOf(mesh);if(i>=0)pickables.splice(i,1)}resources.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());const materials=new Set();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});materials.forEach(m=>m.dispose())}};
}
