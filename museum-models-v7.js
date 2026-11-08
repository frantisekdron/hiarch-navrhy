import {makeProjectModel as existingModel} from './museum-models-v5.js';
import {compactStaticModel} from './museum-optimize-v7.js';

// Rectilinear architectural study. Every opening is a real hole in a 3D wall;
// photographs are references only, never projected over a facade.
export function makeProjectModel(id,THREE,reference={}){
 if(id!=='koupelni')return compactStaticModel(existingModel(id,THREE),THREE);
 const model=new THREE.Group();model.name='Koupelní 2 · geometric architectural study';model.userData.modelId=id;model.userData.detailLevel='solid-facades';
 const W=2.8,D=1.08,H=1.72,Y=.14;
 function grain(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),im=ctx.createImageData(128,128);let seed=73051;for(let i=0;i<im.data.length;i+=4){seed=(seed*16807)%2147483647;const v=236+(seed%16);im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,3);return t}
 const fine=grain();
 const plaster=new THREE.MeshStandardMaterial({color:0xf0eee4,map:fine,bumpMap:fine,bumpScale:.00035,roughness:.85,envMapIntensity:.35});
 const grey=new THREE.MeshStandardMaterial({color:0x8d958d,map:fine,roughness:.87,envMapIntensity:.26});
 const graphite=new THREE.MeshStandardMaterial({color:0x4e544f,map:fine,roughness:.82,envMapIntensity:.3});
 const frame=new THREE.MeshStandardMaterial({color:0xb9beb7,roughness:.33,metalness:.65,envMapIntensity:.8});
 const glass=new THREE.MeshPhysicalMaterial({color:0x314853,roughness:.18,metalness:.22,clearcoat:1,clearcoatRoughness:.14,envMapIntensity:.85});
 const dark=new THREE.MeshStandardMaterial({color:0x293331,roughness:.94,envMapIntensity:.15});
 const roof=new THREE.MeshStandardMaterial({color:0x989b90,map:fine,roughness:.98,envMapIntensity:.15});
 const ochre=new THREE.MeshStandardMaterial({color:0xcac364,roughness:.66,metalness:.05});
 const brass=new THREE.MeshStandardMaterial({color:0xb1a484,metalness:.7,roughness:.4});
 function box(w,h,d,x,y,z,mat,parent=model){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 const unitBox=new THREE.BoxGeometry(1,1,1);
 function instances(items,mat,parent,name){if(!items.length)return;const mesh=new THREE.InstancedMesh(unitBox,mat,items.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();items.forEach((a,i)=>{matrix.compose(new THREE.Vector3(a[3],a[4],a[5]),q,new THREE.Vector3(a[0],a[1],a[2]));mesh.setMatrixAt(i,matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;parent.add(mesh);return mesh}
 function rectangle(x1,y1,x2,y2){const p=new THREE.Path();p.moveTo(x1,y1);p.lineTo(x1,y2);p.lineTo(x2,y2);p.lineTo(x2,y1);p.closePath();return p}
 function wallShape(width,height,openings){const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(width/2,height);s.lineTo(-width/2,height);s.closePath();for(const o of openings)s.holes.push(rectangle(o.x-o.w/2,o.y-o.h/2,o.x+o.w/2,o.y+o.h/2));return s}
 const front=[],back=[],side=[];
 const rows=Array.from({length:6},(_,i)=>.38+i*.223);
 // Measured narrow glazing modules from the rectified northern long wing.
 const slots=[[.052,.088],[.11,.137],[.173,.199],[.296,.33],[.419,.453],[.465,.492],[.545,.581],[.721,.758],[.798,.834],[.92,.949],[.972,.994]];
 for(const [ri,y] of rows.entries())for(const [a,b] of slots){
  const u=(a+b)/2,w=(b-a)*.49*W;
  front.push({x:(.51+.49*u-.5)*W,y,w,h:.145,row:ri});
  back.push({x:(.49*u-.5)*W,y,w,h:.145,row:ri});
 }
 // Three wider street windows; the opposite short wing is mostly a blank wall.
 for(const [ri,y] of rows.entries())if(ri>0){
  for(const [a,b] of [[.198,.353],[.399,.552],[.683,.831]])front.push({x:(.32*(a+b)/2-.5)*W,y,w:(b-a)*.32*W,h:.145,row:ri});
  for(const u of [.105,.31])back.push({x:(.68+.32*u-.5)*W,y,w:.075,h:.145,row:ri});
 }
 for(const y of rows)front.push({x:-.085*W,y,w:.15,h:.046,core:true});
 for(const u of [.09,.27,.45,.63,.81,.95]){
  front.push({x:(.51+.49*u-.5)*W,y:.13,w:.10,h:.18,ground:true});
  back.push({x:(.49*u-.5)*W,y:.13,w:.10,h:.18,ground:true});
 }
 // A single restrained return-wall window column follows the original axonometry.
 for(const y of [.16,.44,.72,1,1.28,1.56])side.push({x:-.36,y,w:.075,h:.17,row:0});
 function facade(width,openings,position,angle,isLong=false,coreX=0){
  const group=new THREE.Group();group.position.set(...position);group.rotation.y=angle;model.add(group);
  const geometry=new THREE.ExtrudeGeometry(wallShape(width,H,openings),{depth:.042,bevelEnabled:false,curveSegments:1,steps:1});const shell=new THREE.Mesh(geometry,plaster);shell.position.z=-.042;shell.castShadow=true;shell.receiveShadow=true;group.add(shell);
  if(isLong){
   const stripWidth=.19*W,stripOpenings=openings.filter(o=>o.core).map(o=>({...o,x:o.x-coreX}));
   const s=new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape(stripWidth,H+.055,stripOpenings),{depth:.045,bevelEnabled:false,curveSegments:1}),graphite);s.position.set(coreX,0,.001);s.castShadow=true;s.receiveShadow=true;group.add(s);
   for(const ri of [0,1,2,3,4,5])for(const [left,right] of [[-width/2,coreX-stripWidth/2],[coreX+stripWidth/2,width/2]]){
    const isLongWing=(right-left)>width*.4;if(!isLongWing&&(angle===Math.PI||ri%2===1))continue;
    const cy=rows[ri],hh=.19,ww=right-left,arr=openings.filter(o=>!o.core&&Math.abs(o.y-cy)<.01&&o.x>left&&o.x<right).map(o=>({...o,x:o.x-(left+right)/2,y:o.y-cy+hh/2}));
    const panel=new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape(ww,hh,arr),{depth:.002,bevelEnabled:false,curveSegments:1}),grey);panel.position.set((left+right)/2,cy-hh/2,.001);panel.receiveShadow=true;group.add(panel);
   }
  }
  if(isLong){const ground=openings.filter(o=>o.ground).map(o=>({...o}));const g=new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape(width,.25,ground),{depth:.003,bevelEnabled:false,curveSegments:1}),graphite);g.position.z=.002;g.receiveShadow=true;group.add(g)}
  if(isLong&&angle===Math.PI){const cx=coreX-.055,yy=H*.9;for(const a of [[.034,.008,0,0],[.008,.029,.017,-.015],[.034,.008,0,-.03],[.008,.026,-.017,-.045],[.034,.008,0,-.06],[.008,.068,.04,-.03],[.030,.008,.05,-.06]])box(a[0],a[1],.006,cx+a[2],yy+a[3],.05,ochre,group)}
  const frames=[],panes=[],reveals=[],sills=[],interiors=[];
  for(const [i,o] of openings.entries()){
   const z=o.core?.045:0,f=.007;
   panes.push([o.w-.012,o.h-.011,.006,o.x,o.y,z-.019]);
   interiors.push([o.w-.006,o.h-.006,.006,o.x,o.y,z-.035]);
   frames.push([o.w+.01,f,.025,o.x,o.y+o.h/2,z+.002],[o.w+.01,f,.025,o.x,o.y-o.h/2,z+.002],[f,o.h,.025,o.x-o.w/2,o.y,z+.002],[f,o.h,.025,o.x+o.w/2,o.y,z+.002]);
   if(!o.core&&o.w>.085)frames.push([.004,o.h-.01,.018,o.x,o.y,z+.003]);
   reveals.push([.006,o.h,.035,o.x-o.w/2+.004,o.y,z-.018],[.006,o.h,.035,o.x+o.w/2-.004,o.y,z-.018]);
   sills.push([o.w+.022,.006,.043,o.x,o.y-o.h/2-.006,z+.009]);
  }
  if(isLong){const fins=[[.5,.768],[.5],[.255,.5],[.255,.768],[.5],[.5,.768]];for(let r=0;r<6;r++)for(const u of fins[r]){const origin=angle===Math.PI?0:.51,x=(origin+.49*u-.5)*W;const fin=box(.014,.16,.048,x,rows[r],.027,ochre,group);fin.rotation.y=.18}}
  instances(interiors,dark,group,'Deep interiors');instances(panes,glass,group,'Recessed physical glazing');instances(frames,frame,group,'Aluminium window frames');instances(reveals,grey,group,'Masonry window reveals');instances(sills,plaster,group,'Overhanging sills');
  return group;
 }
 facade(W,front,[0,Y,D/2],0,true,-.085*W);
 facade(W,back,[0,Y,-D/2],Math.PI,true,.085*W);
 facade(D,side,[W/2,Y,0],Math.PI/2);
 facade(D,side.map(o=>({...o,x:-o.x})),[-W/2,Y,0],-Math.PI/2);
 // Ground floor, roof membrane, upstands, and the service volume all have actual depth.
 box(W,.13,D,0,.075,0,graphite);box(W,.055,D,0,H+Y+.015,0,plaster);
 box(W-.06,.008,D-.06,0,H+Y+.048,0,roof);
 for(const z of [-D/2,D/2])box(W+.012,.048,.025,0,H+Y+.063,z,plaster);
 for(const x of [-W/2,W/2])box(.025,.048,D,x,H+Y+.063,0,plaster);
 box(.38,.18,.31,-.12,H+Y+.16,-.15,plaster);
 box(.34,.008,.29,-.12,H+Y+.257,-.15,frame);
 for(const x of [-.24,-.12,0]){box(.105,.075,.007,x,H+Y+.17,.009,glass);box(.004,.084,.012,x+.055,H+Y+.17,.014,frame)}
 // The street wing is raised on the ground-floor structure, as the photographs show.
 const wing=new THREE.Group();wing.position.set(-.94,0,D/2+.32);model.add(wing);
 box(1.03,.035,.75,0,.16,0,plaster,wing);box(1.03,.29,.75,0,.44,0,graphite,wing);box(1.07,.035,.79,0,.605,0,plaster,wing);
 for(const x of [-.43,0,.43])box(.035,.22,.045,x,.19,.30,plaster,wing);
 for(const x of [-.36,-.12,.12,.36]){box(.16,.16,.006,x,.44,.379,glass,wing);for(const side of [-1,1])box(.006,.17,.015,x+side*.083,.44,.385,frame,wing)}
 // Low entrance canopy, inset doors and a shallow run of physical steps.
 box(.95,.026,.38,.20,.30,D/2+.27,plaster);
 for(const x of [-.15,.15,.45]){box(.018,.28,.018,x,.14,D/2+.39,brass);box(.19,.235,.008,x,.14,D/2+.015,glass)}
 for(let i=0;i<3;i++)box(.64,.018,.16-i*.025,.22,.018+i*.018,D/2+.48-i*.025,grey);
 box(.48,.28,.5,1.20,.26,.45,graphite);box(.51,.025,.53,1.20,.412,.45,plaster);
 // A thin, properly flat presentation base rather than a skewed photo cutout.
 box(3.17,.028,2.04,-.02,.014,.19,dark);
 model.userData.geometrySource='Original photographs, rectified facade measurements and project axonometry; geometric study';model.userData.facadePhotoPlanes=0;
 model.userData.windowCount=front.length+back.length+side.length*2;
 return model;
}
