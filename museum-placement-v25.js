// The Blender hall is in metres, displayed at two world units per metre.
// Client buildings are in metres: .02 world/m gives a physical scale of 1:100.
export const WORLD_UNITS_PER_METRE=2;
export const EXHIBIT_SCALE=WORLD_UNITS_PER_METRE/100;
export const MODEL_METRIC_SIZES=Object.freeze({
  koupelni:[42.64574,28.53363,28.04933],
  hustopece:[53.3427734,10.472168,39.828125],transped:[30.0117,12.7292,12.84],
  wurmova:[13.8701,11.1412,17.8447],bystrc:[30.8083,9.0731,28.2034],
  selska84:[18.1509,11.76,22.4795],ivancice:[88.0200,12.5,20.23],
  nebovidy:[46.6115,11.7666,21.6929]
});
export const EXHIBIT_POSITIONS=[[-2.65,7.8],[-5.6,-2],[5.6,-2],[-5.6,-7],[5.6,-7],[-5.6,-12],[5.6,-12],[0,-12]];
export const KOUPLENI_MODEL_NOTE='Měřítko 1:100 · rozměry Koupelní jsou odhadnuté podle fotografií.';
export function plinthSize(id){const s=MODEL_METRIC_SIZES[id];return {width:Math.max(1.45,1.35+s[0]*.022),depth:Math.max(1.08,.88+s[2]*.020)}}
export function placeExhibitModel(model,id,THREE,surfaceY=2.1){
  model.scale.setScalar(1);model.position.set(0,0,0);model.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(model);
  const metresPerUnit=id==='koupelni'?(model.userData.metresPerUnit||3/.223):1;
  if(bounds.isEmpty()){
    const s=MODEL_METRIC_SIZES[id];
    bounds.set(new THREE.Vector3(-s[0]/2,0,-s[2]/2),new THREE.Vector3(s[0]/2,s[1],s[2]/2));
  }
  const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const fit=EXHIBIT_SCALE*metresPerUnit;
  model.scale.setScalar(fit);model.position.set(-center.x*fit,surfaceY-bounds.min.y*fit,-center.z*fit);
  const scaledSize=size.clone().multiplyScalar(fit);
  model.userData.displayPlacement={mode:'1:100',metresPerWorldUnit:.5,scaleDenominator:100,dimensionBasis:id==='koupelni'?'photo-estimate':'client-model-metres',fit,displaySize:scaledSize.toArray(),sourceSize:size.toArray(),metresPerUnit};
  return {fit,size,scaledSize,modelHeight:scaledSize.y,targetY:surfaceY+scaledSize.y*.48,focusRadius:scaledSize.length()*.5};
}
const streetBearing={koupelni:-30,hustopece:149,transped:30,wurmova:-30.72,bystrc:28,selska84:55,ivancice:38,nebovidy:34};

export function exhibitOrbitFitDistance(table,target,direction,projection,THREE,isMobile){
  const size=table.scaledSize,base=table.targetY-size.y*.48;
  const right=new THREE.Vector3(0,1,0).cross(direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right);
  const tanV=Math.tan(THREE.MathUtils.degToRad(projection.fov)*.5);
  const tanH=tanV*projection.aspect*(isMobile?.80:.69);
  const corner=new THREE.Vector3();
  let distance=projection.near;
  for(const x of [-size.x/2,size.x/2])for(const y of [base,base+size.y])for(const z of [-size.z/2,size.z/2]){
    corner.set(table.x+x-target.x,y-target.y,table.z+z-target.z);
    const depth=corner.dot(direction),horizontal=Math.abs(corner.dot(right))/tanH;
    const vertical=Math.abs(corner.dot(up))/(tanV*.77);
    distance=Math.max(distance,depth+Math.max(horizontal,vertical,projection.near));
  }
  return distance;
}

export function exhibitView(table,camera,THREE,isMobile=false){
  const id=table.group.userData.projectId,angle=THREE.MathUtils.degToRad(id==='wurmova'&&isMobile?-29.66:(streetBearing[id]??30));
  const dx=Math.sin(angle),dz=Math.cos(angle),size=table.scaledSize;
  const target=new THREE.Vector3(table.x,table.targetY,table.z),base=table.targetY-size.y*.48;
  const eyeHeight=base+Math.max(.028,size.y*.27);
  const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov)*.5),tanH=tanV*camera.aspect;
  let distance=Math.max(.5,table.focusRadius*1.4);
  for(const x of [-size.x/2,size.x/2])for(const z of [-size.z/2,size.z/2]){
    const depth=x*dx+z*dz,horizontal=Math.abs(x*dz-z*dx)/(tanH*(isMobile?.80:.69)),vertical=size.y*.54/(tanV*.77);
    distance=Math.max(distance,depth+Math.max(horizontal,vertical));
  }
  const wallX=(dx>0?8.9:-8.9)-table.x,wallZ=(dz>0?17.05:-17.05)-table.z;
  if(Math.abs(dx)>.001)distance=Math.min(distance,wallX/dx);
  if(Math.abs(dz)>.001)distance=Math.min(distance,wallZ/dz);
  return {target,position:new THREE.Vector3(table.x+dx*distance,eyeHeight,table.z+dz*distance)};
}
