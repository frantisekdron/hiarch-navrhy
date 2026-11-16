import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';

// Every exhibit owns a permanent ceiling fixture. Nothing here accepts a
// selected index or moves with the camera. A single shared room shadow suffices.
export function addFixedExhibitLights({THREE,scene,tables}){
 const lights=[],cones=[];
 const bronze=new THREE.MeshStandardMaterial({color:0x7E7054,metalness:.64,roughness:.36});
 const lens=new THREE.MeshBasicMaterial({color:0xFFF0D5,toneMapped:false});
 const heads=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.145,.22,12),bronze,tables.length);
 const lenses=new THREE.InstancedMesh(new THREE.CylinderGeometry(.133,.133,.014,12),lens,tables.length);
 const matrix=new THREE.Matrix4();
 const beamMaterial=new THREE.MeshBasicMaterial({color:0xFFE4BE,transparent:true,opacity:.024,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,toneMapped:false});
 for(const [index,table] of tables.entries()){
  const light=new THREE.SpotLight(0xFFF0DA,10,10,.42,.80,1.6);
  light.name=`exhibit-ceiling-${table.group.userData.projectId}`;
  light.position.set(table.x-.95,6.60,table.z+1.50);light.target.position.set(table.x,1.45,table.z);light.castShadow=false;
  scene.add(light,light.target);lights.push(light);
  matrix.makeTranslation(light.position.x,6.70,light.position.z);heads.setMatrixAt(index,matrix);
  matrix.makeTranslation(light.position.x,6.58,light.position.z);lenses.setMatrixAt(index,matrix);
  const end=new THREE.Vector3(table.x,1.45,table.z),axis=light.position.clone().sub(end),mid=light.position.clone().add(end).multiplyScalar(.5);
  const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());
  const cone=new THREE.ConeGeometry(1.52,axis.length(),24,1,true);
  cone.applyMatrix4(new THREE.Matrix4().compose(mid,rotation,new THREE.Vector3(1,1,1)));cones.push(cone);
 }
 heads.instanceMatrix.needsUpdate=true;lenses.instanceMatrix.needsUpdate=true;scene.add(heads,lenses);
 const beams=new THREE.Mesh(mergeGeometries(cones,false),beamMaterial);cones.forEach(g=>g.dispose());beams.raycast=()=>{};scene.add(beams);
 function setLighting({preset='evening',color='#a9dcc6',intensity=1}={}){
  const amount=Math.max(0,Math.min(1.5,Number(intensity)||0));
  for(const light of lights){light.color.set(preset==='day'?0xFFF7EB:preset==='neon'?0xF4F7FF:0xFFECD6);light.intensity=preset==='day'?13:preset==='neon'?14:15}
  beamMaterial.color.set(preset==='neon'?color:0xFFE4BE);lens.color.set(preset==='neon'?color:0xFFF0D5);
  beamMaterial.opacity=preset==='day'?0:preset==='neon'?.010*amount:.010;
  scene.userData.fixedExhibitLights=lights.map(light=>({id:light.name.replace('exhibit-ceiling-',''),position:light.position.toArray(),target:light.target.position.toArray(),intensity:light.intensity,shadow:light.castShadow}));
 }
 setLighting();return {lights,setLighting};
}
