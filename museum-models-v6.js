import {makeProjectModel as baseModel} from './museum-models-v5.js';

// The showcase retains the photographic massing. Window assemblies add physical depth.
export function makeProjectModel(id,THREE,textures={}){
 const group=baseModel(id,THREE);if(id!=='koupelni')return group;
 group.userData.detailLevel='showcase';group.traverse(o=>{if(o.isLine)o.visible=false});
 const glass=new THREE.MeshPhysicalMaterial({color:0x263e4b,roughness:.16,metalness:.32,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.85});
 const aluminium=new THREE.MeshStandardMaterial({color:0x757c7a,roughness:.32,metalness:.67});
 const reveal=new THREE.MeshStandardMaterial({color:0x202a2d,roughness:.8,metalness:.05});
 const sill=new THREE.MeshStandardMaterial({color:0xe0e1da,roughness:.62,metalness:.15});
 const graphite=new THREE.MeshStandardMaterial({color:0x55514b,roughness:.86,metalness:.02,envMapIntensity:.16});
 const warmMetal=new THREE.MeshStandardMaterial({color:0xa89970,roughness:.36,metalness:.75});
 function grainTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),d=x.createImageData(128,128);let seed=92743;for(let i=0;i<d.data.length;i+=4){seed=(seed*16807)%2147483647;const v=232+(seed%19);d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,4);return t}
 const plasterTexture=grainTexture();
 const plaster=new THREE.MeshStandardMaterial({color:0xe6e2d8,map:plasterTexture,bumpMap:plasterTexture,bumpScale:.00065,roughness:.91,envMapIntensity:.25});
 const greyPlaster=new THREE.MeshStandardMaterial({color:0x999a90,map:plasterTexture,bumpMap:plasterTexture,bumpScale:.0006,roughness:.92,envMapIntensity:.18});
 const windows=[];
 group.traverse(o=>{
  if(!o.isMesh||!o.geometry?.parameters)return;
  const p=o.geometry.parameters;
  if(o.geometry.type==='PlaneGeometry'&&p.width<.15&&p.height<.12&&o.position.z>.23){windows.push({x:o.position.x,y:o.position.y,z:o.position.z,w:p.width,h:p.height});o.visible=false}
  if(o.material?.color?.getHex()===0x364a42)o.material=graphite;
  if([0xE7EEE2,0xF4F7EE].includes(o.material?.color?.getHex()))o.material=plaster;
  if(o.geometry.type==='BoxGeometry'&&p.depth<=.018&&p.width>=.35&&p.height<.2)o.material=glass;
 });
 const frames=[],recesses=[],panes=[],sills=[];
 for(const w of windows){
  recesses.push([w.w+.014,w.h+.014,.014,w.x,w.y,w.z+.001]);
  panes.push([w.w,w.h,.003,w.x,w.y,w.z+.012]);
  const f=.005;
  frames.push([w.w+.019,f,.016,w.x,w.y+w.h/2+.004,w.z+.022],[w.w+.019,f,.016,w.x,w.y-w.h/2-.004,w.z+.022],[f,w.h+.013,.016,w.x-w.w/2-.005,w.y,w.z+.022],[f,w.h+.013,.016,w.x+w.w/2+.005,w.y,w.z+.022]);
  if(w.h>.06)frames.push([.003,w.h,.008,w.x,w.y,w.z+.023]);
  sills.push([w.w+.025,.005,.028,w.x,w.y-w.h/2-.009,w.z+.019]);
 }
 function instances(items,material,name){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,items.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();items.forEach((v,i)=>{m.compose(new THREE.Vector3(v[3],v[4],v[5]),q,new THREE.Vector3(v[0],v[1],v[2]));mesh.setMatrixAt(i,m)});mesh.instanceMatrix.needsUpdate=true;mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh}
 instances(recesses,reveal,'Dark window reveals');instances(panes,glass,'Reflective glazing');instances(frames,aluminium,'Aluminium window frames');instances(sills,sill,'Projected window sills');
 function box(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
 // Alternate grey facade bands and opened ochre shutters follow the street photograph.
 for(const y of [.35,.73,1.11]){box(.46,.113,.004,-.50,y,.237,greyPlaster);box(.71,.113,.004,.405,y,.237,greyPlaster)}
 const shutters=new THREE.MeshStandardMaterial({color:0xc8ba50,roughness:.65,metalness:.1});
 for(const [x,y] of [[.37,.54],[.55,.73],[.73,1.11],[.37,1.30]]){const shutter=box(.025,.112,.005,x,y,.263,shutters);shutter.rotation.y=.40}
 // Fine roof recesses, side-wall reveals and an inset base give the model a built scale.
 const roofing=new THREE.MeshStandardMaterial({color:0x777b75,map:plasterTexture,roughness:.98,envMapIntensity:.1});
 box(1.49,.005,.57,.03,1.455,-.09,roofing);
 for(const y of [.43,.75,1.07]){box(.009,.112,.104,.819,y,-.15,reveal);box(.012,.095,.085,.826,y,-.15,glass)}
 // Copings, roof edge flashing and the visible rooftop service volume.
 for(const z of [-.412,.237])box(1.59,.012,.014,.03,1.461,z,aluminium);
 for(const x of [-.765,.825])box(.014,.012,.65,x,1.461,-.088,aluminium);
 box(.265,.048,.008,.29,1.525,-.15,glass);
 for(const x of [.20,.29,.38])box(.004,.052,.011,x,1.525,-.143,aluminium);
 const vents=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.009,.052,8),warmMetal,6);const matrix=new THREE.Matrix4();
 [[-.64,-.18],[-.4,-.23],[.16,-.28],[.53,-.28],[.63,.05],[-.48,.1]].forEach(([x,z],i)=>{matrix.makeTranslation(x,1.48,z);vents.setMatrixAt(i,matrix)});vents.castShadow=true;group.add(vents);
 // The opposite facade is projected from the genuine aerial photograph.
 if(textures.north){const wall=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.18),new THREE.MeshStandardMaterial({map:textures.north,roughness:.72,metalness:.02,envMapIntensity:.3}));wall.position.set(.03,.825,-.416);wall.rotation.y=Math.PI;wall.receiveShadow=true;group.add(wall)}
 // Recessed glazing in the lower wing and thin structural mullions.
 for(const x of [-.84,-.72,-.60,-.48])box(.004,.106,.012,x,.38,.61,aluminium);
 box(.72,.008,.045,-.65,.552,.315,aluminium);
 group.userData.windowAssemblies=windows.length;
 return group;
}
