import {FontLoader} from './assets/vendor/FontLoader.js';
import fontData from './assets/v7/brand/space-grotesk-logo.typeface.js';
const brandFont=new FontLoader().parse(fontData);

export function makeBrandSign({THREE,name='HiARCH',portal=false,accent='#8ca487'}){
 const group=new THREE.Group();group.name=portal?'Backlit entrance identity':`${name} · raised metal identity`;
 const width=portal?7.8:3.65,height=portal?1.45:1.2;
 const bronze=new THREE.MeshStandardMaterial({color:0xb39a70,metalness:.83,roughness:.24,envMapIntensity:1.15});
 const face=new THREE.MeshStandardMaterial({color:0x2d3b33,roughness:.64,metalness:.12});
 const edge=new THREE.MeshStandardMaterial({color:0x161f1b,roughness:.55,metalness:.48});
 const light=new THREE.MeshBasicMaterial({color:accent,toneMapped:false,transparent:true,opacity:.85});
 const letters=new THREE.MeshStandardMaterial({color:0xe4d6b5,metalness:.71,roughness:.27,envMapIntensity:1.25,emissive:0x8a7450,emissiveIntensity:.025});
 function rectShape(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s}
 function plate(w,h,d,z,mat,r=.035){const geometry=new THREE.ExtrudeGeometry(rectShape(w,h,r),{depth:d,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:6});const mesh=new THREE.Mesh(geometry,mat);mesh.position.z=z;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh}
 function box(w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh}
 plate(width,height,.14,-.06,edge,.045);plate(width-.065,height-.065,.045,.09,bronze,.035);plate(width-.15,height-.15,.025,.145,face,.025);
 for(const side of [-1,1]){box(width-.23,.012,.024,0,side*(height/2-.10),.181,light);box(.012,height-.22,.024,side*(width/2-.10),0,.181,light)}
 function mark(cx,cy,size){for(let i=0;i<3;i++){const o=i*size*.18;box(size*.055,size*.66,.055,cx+o-size*.29,cy-o,.22,bronze);box(size*.66,size*.055,.055,cx+o,cy-o+size*.3,.22,bronze)}}
 function word(text,x,y,w,h){const shapes=brandFont.generateShapes(text,1);const flat=new THREE.ShapeGeometry(shapes);flat.computeBoundingBox();const b=flat.boundingBox,scale=Math.min(w/(b.max.x-b.min.x),h/(b.max.y-b.min.y)),cx=(b.max.x+b.min.x)/2,cy=(b.max.y+b.min.y)/2;flat.dispose();
  const geometry=new THREE.ExtrudeGeometry(shapes,{depth:(portal?.065:.045)/scale,bevelEnabled:true,bevelThickness:.005/scale,bevelSize:.003/scale,bevelSegments:2,curveSegments:7});geometry.translate(-cx,-cy,0);
  const back=new THREE.Mesh(geometry,light);back.scale.setScalar(scale*1.035);back.position.set(x,y,.185);group.add(back);
  const raised=new THREE.Mesh(geometry,letters);raised.scale.setScalar(scale);raised.position.set(x,y,.211);raised.castShadow=true;raised.receiveShadow=true;group.add(raised);
 }
 if(portal){mark(0,.43,.38);word('HiARCH',-2.3,-.05,2.04,.40);word('HiPLAN',0,-.05,2.04,.40);word('HiREAL',2.3,-.05,2.04,.40);for(const x of [-1.17,1.17])box(.012,.58,.025,x,-.06,.2,bronze)}
 else{mark(-1.18,0,.53);word(['HiARCH','HiPLAN','HiREAL'].includes(name)?name:'HiARCH',.29,.035,2.02,.43);box(1.88,.026,.025,.29,-.31,.20,light)}
 // A soft light spill behind the raised letters, separate from the solid metal faces.
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.font=`600 ${portal?95:130}px "Space Grotesk"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=24;ctx.fillText(portal?'HiARCH   HiPLAN   HiREAL':name,512,128,930);
 const haloMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),color:accent,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const halo=new THREE.Mesh(new THREE.PlaneGeometry(width-.3,height-.28),haloMaterial);halo.position.z=.178;group.add(halo);
 function setLighting({preset='evening',color=accent,intensity=1}={}){const amount=Math.max(0,Math.min(1.5,Number(intensity)||0));light.color.set(preset==='neon'?color:accent);light.opacity=preset==='day'?.18:.75;haloMaterial.color.set(preset==='neon'?color:accent);haloMaterial.opacity=(preset==='day'?.04:preset==='neon'?.72:.40)*amount;letters.emissiveIntensity=preset==='day'?.015:.07;face.color.set(preset==='day'?0x34443a:0x1f2c25)}
 setLighting();return {group,setLighting};
}
