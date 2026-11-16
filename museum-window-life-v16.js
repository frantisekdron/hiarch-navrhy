// A single instanced interior pass sits on verified glazing surfaces only.
// The rooms are illustrative; no new openings or facade photographs are added.
export function createWindowLife({THREE:T,scene,layouts={}}){
 const capacity=1100,geometry=new T.PlaneGeometry(1,1),seeds=new Float32Array(capacity),kinds=new Float32Array(capacity),tables=new Map();
 geometry.setAttribute('windowSeed',new T.InstancedBufferAttribute(seeds,1));geometry.setAttribute('windowKind',new T.InstancedBufferAttribute(kinds,1));
 const uniforms={uTime:{value:0},uNight:{value:1},uMotion:{value:0}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:true,
 vertexShader:`attribute float windowSeed;
 attribute float windowKind;
 varying vec2 vUv;
 varying vec3 vEye;
 varying float vSeed;
 varying float vKind;
 void main(){
  mat4 world=modelMatrix*instanceMatrix;
  vec3 x=world[0].xyz,y=world[1].xyz,n=world[2].xyz;
  vec3 eye=cameraPosition-world[3].xyz;
  float w=max(length(x),.0001),h=max(length(y),.0001);
  vEye=vec3(dot(eye,x/w)/w,dot(eye,y/h)/h,abs(dot(eye,normalize(n)))/min(w,h));
  vUv=uv;vSeed=windowSeed;vKind=windowKind;
  gl_Position=projectionMatrix*viewMatrix*world*vec4(position,1.0);
 }`,
 fragmentShader:`uniform float uTime,uNight,uMotion;
 varying vec2 vUv;
 varying vec3 vEye;
 varying float vSeed,vKind;
 float rnd(float x){return fract(sin(x*123.17+31.13)*43758.5453);}
 float rect(vec2 p,vec2 c,vec2 halfSize){vec2 d=abs(p-c)-halfSize;return 1.0-smoothstep(-.006,.006,max(d.x,d.y));}
 void main(){
  vec2 uv=vUv;float seed=vSeed;
  // Sheltered street-level entrance glazing only reflects the dim street.
  if(vKind>2.5&&vKind<3.5){
   float grazing=1.0-abs(normalize(vEye).z);
   vec3 glass=mix(vec3(.009,.014,.016),vec3(.050,.069,.072),grazing);
   glass+=vec3(.012,.016,.017)*smoothstep(.45,.72,uv.y+.15*grazing);
   gl_FragColor=vec4(glass,mix(.90,.88,uNight));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   return;
  }
  vec3 origin=vec3(uv-.5,0.0),dir=normalize(origin-vec3(vEye.xy,max(.05,vEye.z)));
  vec3 t=vec3(abs(dir.x)>.001?(sign(dir.x)*.50-origin.x)/dir.x:100000.0,abs(dir.y)>.001?(sign(dir.y)*.50-origin.y)/dir.y:100000.0,-.74/min(dir.z,-.001));
  float depth=min(t.x,min(t.y,t.z));vec3 p=origin+dir*depth;
  float back=step(t.z,min(t.x,t.y)+.0001),floorFace=step(t.y,min(t.x,t.z)+.0001)*step(dir.y,0.0);
  vec3 plaster=mix(vec3(.37,.34,.27),vec3(.61,.59,.49),rnd(seed+2.0));
  vec3 interior=plaster*(back>.5?.78:.45);
  if(floorFace>.5)interior=mix(vec3(.16,.12,.08),vec3(.27,.22,.14),.5+.5*sin(p.x*53.0));
  if(back>.5){
   float skirting=1.0-smoothstep(.015,.035,abs(p.y+.43));interior=mix(interior,vec3(.15,.13,.10),skirting*.7);
   float sofa=rect(p.xy,vec2(rnd(seed+6.0)*.20-.10,-.32),vec2(.27,.105));
   interior=mix(interior,mix(vec3(.12,.19,.15),vec3(.22,.17,.12),rnd(seed+8.0)),sofa);
   float art=rect(p.xy,vec2(-.25,.17),vec2(.09,.12));interior=mix(interior,vec3(.22,.27,.23),art*.8);
  }
  float roomKind=vKind>3.5?0.0:vKind;
  float probability=roomKind<.5?.42:roomKind<1.5?.25:.12;
  float cycleTime=(uTime+90.0*rnd(seed+3.0))/70.0;
  float tick=floor(cycleTime),blend=smoothstep(0.0,.07,fract(cycleTime));
  float before=step(rnd(seed+tick*7.0-7.0),probability),after=step(rnd(seed+tick*7.0),probability);
  float occupied=mix(before,after,blend);
  float nightLight=uNight*occupied;
  vec3 warm=mix(vec3(1.0,.65,.32),vec3(.94,.84,.65),rnd(seed+12.0));
  vec3 color=interior*mix(vec3(.16,.20,.22),warm*2.45,nightLight);
  vec2 wallUv=back>.5?p.xy:vec2(p.z/.74+.5,p.y);
  float tvEligible=step(.80,rnd(seed+16.0))*step(roomKind,1.1),tv=rect(wallUv,vec2(.13,.08),vec2(.18,.105));
  float screen=rect(wallUv,vec2(.13,.08),vec2(.165,.09));
  color=mix(color,vec3(.008,.012,.014),tv*tvEligible*.9);
  vec3 screenColor=mix(vec3(.08,.24,.44),vec3(.23,.39,.53),.5+.5*sin(uTime*.71+seed*7.0+wallUv.y*13.0));
  color+=screen*tvEligible*uNight*screenColor*1.40;
  float sway=sin(uTime*.42+seed*5.0)*.009;
  float spread=.10+rnd(seed+19.0)*.14;
  float bow=sin(uv.y*3.14159)*.045;
  float curtain=1.0-smoothstep(spread+bow+sway-.009,spread+bow+sway+.009,uv.x);
  curtain=max(curtain,smoothstep(1.0-spread-bow+sway-.009,1.0-spread-bow+sway+.009,uv.x));
  float pleats=.78+.15*cos(uv.x*102.0+sway*30.0);
  vec3 fabric=mix(vec3(.055,.067,.065),warm*.92,nightLight)*pleats;
  if(roomKind>1.5)curtain*=.35;
  color=mix(color,fabric,curtain*.88);
  float border=1.0-smoothstep(.009,.030,min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)));
  color=mix(color,vec3(.012,.017,.018),border*.85);
  float reflection=pow(max(0.0,1.0-abs(uv.x-.78-uv.y*.20)*8.0),7.0);
  color+=vec3(.025,.035,.039)*reflection*(1.0-nightLight*.7);
  float opacity=mix(.36,.89,uNight);
  if(vKind>3.5){
   float skyline=smoothstep(.22,.88,uv.y+.10*normalize(vEye).x);
   vec3 bayReflection=mix(vec3(.035,.077,.078),vec3(.144,.241,.223),skyline);
   color=mix(bayReflection,color,uNight);
   opacity=mix(.73,opacity,uNight);
  }
  gl_FragColor=vec4(color,opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.name='Verified window interiors V16';mesh.frustumCulled=false;mesh.renderOrder=2;mesh.castShadow=false;mesh.receiveShadow=false;mesh.raycast=()=>{};mesh.userData.decorativeLife=true;scene.add(mesh);
 const temp=new T.Matrix4(),normal=new T.Vector3(),q=new T.Quaternion(),zAxis=new T.Vector3(0,0,1);let disposed=false;
 function rebuild(){
  let count=0;
  for(const {table,windows} of tables.values()){
   const id=table.group.userData.projectId,kind=['koupelni','wurmova','selska84','ivancice'].includes(id)?0:['transped','nebovidy'].includes(id)?1:2;
   for(const w of windows){
    if(count===capacity)break;
    normal.fromArray(w.n).normalize();q.setFromUnitVectors(zAxis,normal);
    temp.compose(new T.Vector3(...w.c).addScaledVector(normal,.0006),q,new T.Vector3(w.w,w.h,1));
    mesh.setMatrixAt(count,temp);
    seeds[count]=w.seed;
    kinds[count]=w.kind==='sheltered-entry'?3:w.kind==='street-bay'?4:kind;
    count++;
   }
  }
  mesh.count=count;mesh.instanceMatrix.needsUpdate=true;geometry.attributes.windowSeed.needsUpdate=true;geometry.attributes.windowKind.needsUpdate=true;mesh.computeBoundingSphere();
 }
 function addTable(table){
  const id=table.group.userData.projectId;if(table.model.userData.loading||tables.has(id))return false;table.model.updateWorldMatrix(true,true);const windows=[];
  if(id==='koupelni'){
   table.model.traverse(o=>{if(!o.isInstancedMesh||o.name!=='Recessed physical glazing')return;for(let i=0;i<o.count;i++){
    o.getMatrixAt(i,temp);const matrix=o.matrixWorld.clone().multiply(temp),scale=new T.Vector3().setFromMatrixScale(matrix),c=new T.Vector3(0,0,.5).applyMatrix4(matrix),n=new T.Vector3(0,0,1).transformDirection(matrix);
    windows.push({c:c.toArray(),n:n.toArray(),w:scale.x*.97,h:scale.y*.97,seed:windows.length*.61803398875+13.0});
   }});
  }else for(const [i,w] of (layouts[id]||[]).entries()){
   const c=new T.Vector3(...w.c).applyMatrix4(table.model.matrixWorld),n=new T.Vector3(...w.n).transformDirection(table.model.matrixWorld),s=new T.Vector3().setFromMatrixScale(table.model.matrixWorld);
   windows.push({c:c.toArray(),n:n.toArray(),w:w.w*s.x*.97,h:w.h*s.y*.97,seed:w.seed+id.length*19.0,kind:w.kind});
  }
  tables.set(id,{table,windows});rebuild();return true;
 }
 function setLighting({preset='evening'}={}){uniforms.uNight.value=preset==='day'?0:1}
 function update(time,{animate=false}={}){uniforms.uTime.value=Number.isFinite(time)?time:0;uniforms.uMotion.value=animate?1:0}
 function stats(){return {windows:mesh.count,projects:Object.fromEntries([...tables].map(([id,r])=>[id,r.windows.length])),drawCalls:1,triangles:mesh.count*2,night:uniforms.uNight.value}}
 return {addTable,setLighting,update,stats,mesh,dispose(){if(disposed)return;disposed=true;scene.remove(mesh);mesh.dispose();geometry.dispose();material.dispose();tables.clear()}};
}
