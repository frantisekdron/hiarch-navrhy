import {FontLoader} from './assets/vendor/FontLoader.js';
import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';
import fontData from './assets/v7/brand/space-grotesk-logo.typeface.js';

const brandFont=new FontLoader().parse(fontData);
let marbleFinish;

// One locally generated finish is shared by the entrance and all four identities.
// No downloaded texture, per-frame noise, normal-map shimmer or extra render pass.
export function getMarbleFinish(THREE){
 if(marbleFinish)return marbleFinish;
 const c=document.createElement('canvas');c.width=c.height=512;
 const ctx=c.getContext('2d');
 ctx.fillStyle='#e5e2d8';ctx.fillRect(0,0,512,512);
 let seed=91271;
 const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
 for(let i=0;i<48;i++){
  const x=random()*512,y=random()*512,r=35+random()*140;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,i%2?'rgba(159,172,158,.105)':'rgba(255,252,240,.22)');
  g.addColorStop(1,'rgba(230,227,214,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<8;i++){
  const start=-280+i*128+random()*35,points=[];
  for(let j=0;j<=26;j++){
   const y=-40+j*24;
   points.push([start+y*.67+Math.sin(y*.018+i)*18+Math.sin(y*.041+i)*6,y]);
  }
  const stroke=(width,color)=>{
   ctx.beginPath();ctx.moveTo(...points[0]);
   for(let k=1;k<points.length;k++)ctx.lineTo(...points[k]);
   ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineJoin='round';ctx.stroke();
  };
  stroke(11,'rgba(123,143,128,.055)');stroke(3.5,'rgba(125,142,128,.11)');
  stroke(.7,'rgba(113,125,112,.31)');
  if(i%2===0){
   const [x,y]=points[9];ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-21,y+38,x-6,y+65,x-50,y+123);
   ctx.lineWidth=.6;ctx.strokeStyle='rgba(139,126,96,.24)';ctx.stroke();
  }
 }
 const pixels=ctx.getImageData(0,0,512,512);
 for(let i=0;i<pixels.data.length;i+=4){const d=(random()-.5)*3;pixels.data[i]+=d;pixels.data[i+1]+=d;pixels.data[i+2]+=d}
 ctx.putImageData(pixels,0,0);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 map.anisotropy=2;
 marbleFinish={map};return marbleFinish;
}

let spillMap;

function getLetteringSpill(THREE){
 if(spillMap)return spillMap;
 const canvas=document.createElement('canvas');
 canvas.width=128;canvas.height=64;
 const ctx=canvas.getContext('2d');
 ctx.save();
 ctx.scale(2,1);
 const light=ctx.createRadialGradient(32,32,3,32,32,32);
 light.addColorStop(0,'rgba(255,255,255,.80)');
 light.addColorStop(.55,'rgba(255,255,255,.58)');
 light.addColorStop(.79,'rgba(255,255,255,.23)');
 light.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=light;
 ctx.fillRect(0,0,64,64);
 ctx.restore();
 spillMap=new THREE.CanvasTexture(canvas);
 return spillMap;
}

export function makeBrandSign({THREE,name='HiARCH',portal=false,accent='#8ca487'}){
 const group=new THREE.Group();
 group.name=portal?'Three carved marble entrance shields':`${name} · marble and bronze relief`;
 const {map}=getMarbleFinish(THREE);
 const marble=new THREE.MeshStandardMaterial({color:0xf4f1e7,map,emissiveMap:map,emissive:0xd7cdb4,emissiveIntensity:.12,roughness:.36,metalness:.025,envMapIntensity:.8});
 const bronze=new THREE.MeshStandardMaterial({color:0xb39a71,metalness:.82,roughness:.3,envMapIntensity:1.1,emissive:0x6e5934,emissiveIntensity:.055});
 const letters=new THREE.MeshStandardMaterial({color:0x293D30,metalness:.2,roughness:.46,envMapIntensity:.65,emissive:0xa5a184,emissiveIntensity:.055});
 const shadow=new THREE.MeshStandardMaterial({color:0x152019,roughness:.8,metalness:.16});
 const led=new THREE.MeshBasicMaterial({color:0xedcda0,toneMapped:false});
 marble.name='Veined marble';
 letters.name='Lit letter faces';
 bronze.name='Brushed bronze returns';
 led.name='Concealed perimeter diffuser';
 const parts=new Map();
 const width=portal?2.29:3.65,height=portal?1.12:1.26;
 function add(geometry,material,x=0,y=0,z=0){
  let g=geometry.index?geometry.toNonIndexed():geometry;
  if(g!==geometry)geometry.dispose();
  g.translate(x,y,z);g.clearGroups();
  if(!parts.has(material))parts.set(material,[]);parts.get(material).push(g);
 }
 function rect(w,h,r){
  const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
  s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
  s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;
 }
 function plate(w,h,d,z,mat,cx,bevel=.015){
  const g=new THREE.ExtrudeGeometry(rect(w,h,.025),{depth:d,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:4});
  const uv=g.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+w/2)/w,(uv.getY(i)+h/2)/h);
  add(g,mat,cx,0,z);
 }
 function box(w,h,d,x,y,z,mat){add(new THREE.BoxGeometry(w,h,d),mat,x,y,z)}
 // Extruded faces take illumination independently of the bronze sides and bevel.
 function relief(geometry,x,y,z){
  for(const range of geometry.groups){
   const piece=new THREE.BufferGeometry();
   for(const name of ['position','normal','uv']){
    const attribute=geometry.getAttribute(name),size=attribute.itemSize;
    const start=range.start*size,end=(range.start+range.count)*size;
    piece.setAttribute(name,new THREE.Float32BufferAttribute(attribute.array.subarray(start,end),size));
   }
   add(piece,range.materialIndex===0?letters:bronze,x,y,z);
  }
  geometry.dispose();
 }
 function mark(cx,cy,size){
  for(let i=0;i<3;i++){
   const o=i*size*.18;
   // Each elbow is a single solid shape. Overlapping box fronts would sparkle
   // at glancing angles, especially on a small phone drawing buffer.
   const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(size*.065,0);
   shape.lineTo(size*.065,size*.585);shape.lineTo(size*.65,size*.585);
   shape.lineTo(size*.65,size*.65);shape.lineTo(0,size*.65);shape.closePath();
   relief(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false,curveSegments:1}),cx+o-size*.325,cy-o-size*.325,.286);
  }
 }
 function word(text,x,y,w,h){
  const shapes=brandFont.generateShapes(text,1),geometry=new THREE.ExtrudeGeometry(shapes,{depth:.105,bevelEnabled:true,bevelThickness:.007,bevelSize:.005,bevelSegments:2,curveSegments:5});
  geometry.computeBoundingBox();const b=geometry.boundingBox;
  const scale=Math.min(w/(b.max.x-b.min.x),h/(b.max.y-b.min.y));
  geometry.translate(-(b.max.x+b.min.x)/2,-(b.max.y+b.min.y)/2,0);geometry.scale(scale,scale,.66);
  relief(geometry,x,y,.296);
 }
 for(const [text,cx] of portal?[['HiARCH',-2.49],['HiPLAN',0],['HiREAL',2.49]]:[[name,0]]){
  // Three clearly separated volumes, suspended off a shadow gap, with a metal return.
  plate(width+.065,height+.065,.115,-.12,shadow,cx,.018);
  plate(width+.025,height+.025,.033,.045,bronze,cx,.012);
  plate(width-.05,height-.05,.19,.075,marble,cx,.021);
  // A concealed perimeter diffuser sits behind the stone, never over its front face.
  for(const side of [-1,1]){
   box(width-.10,.014,.017,cx,side*(height/2-.007),.035,led);
   box(.014,height-.10,.017,cx+side*(width/2-.007),0,.035,led);
  }
  if(portal){mark(cx-.76,.035,.38);word(text,cx+.23,.035,1.53,.32);}
  else{mark(-1.25,.04,.56);word(text,.32,.04,2.02,.43);}
 }
 // A merge per finish keeps the detailed relief to five opaque draws per sign.
 for(const [material,geometries] of parts){
  const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(merged,material);mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
 }
 // One shared low-resolution spill texture; no bloom or additional shadowed lights.
 const haloMaterial=new THREE.MeshBasicMaterial({
  map:getLetteringSpill(THREE),color:0xffdcab,transparent:true,opacity:.34,
  blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
 });
 const positions=portal?[-2.49,0,2.49]:[0];
 const haloParts=[];
 for(const x of positions){const g=new THREE.PlaneGeometry(width*(portal?1.24:1.52),height*(portal?1.65:2.05));g.translate(x,0,-.035);haloParts.push(g)}
 const halos=new THREE.Mesh(mergeGeometries(haloParts,false),haloMaterial);haloParts.forEach(g=>g.dispose());halos.raycast=()=>{};group.add(halos);
 function setLighting({preset='evening',color=accent,intensity=1}={}){
  const amount=Math.max(0,Math.min(1.5,Number(intensity)||0));
  const day=preset==='day',neon=preset==='neon';
  const glow=new THREE.Color(neon?color:0xffd9a3);
  if(neon){const h={};glow.getHSL(h);glow.setHSL(h.h,Math.max(.76,h.s),.57);}
  led.color.copy(glow).multiplyScalar(day?.55:1.12+amount*.36);
  haloMaterial.color.copy(glow);
  haloMaterial.opacity=day?.11:neon?.30+amount*.33:.42;
  // The entry keeps pale stone in daylight. Inside, mineral green offers
  // contrast with the opal faces in all three lighting presets.
  const pale=day&&portal;
  marble.color.setHex(pale?0xf2eee1:portal?0x33493e:0x283d34);
  marble.emissive.setHex(pale?0xd7cdb4:0x32473b);
  marble.emissiveIntensity=pale?.025:day?.06:.19;
  marble.envMapIntensity=day?.68:.34;
  letters.color.setHex(pale?0x203a2e:0xece3ca);
  letters.roughness=pale?.38:.35;
  letters.metalness=pale?.28:.10;
  letters.emissive.setHex(pale?0x17251d:0xffebcf);
  letters.emissiveIntensity=pale?.04:day?.26:neon?.95:1.05;
  letters.envMapIntensity=day?.70:.44;
  bronze.envMapIntensity=day?.85:.55;
  bronze.emissiveIntensity=day?.015:.07;
 }
 setLighting();group.userData.identity={material:'veined marble / satin bronze',shieldCount:portal?3:1,draws:group.children.length};
 return {group,setLighting};
}
