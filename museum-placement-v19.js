// Each exhibit fills its plinth using the original pre-V18 envelope.
// Source dimensions also give pending slots a stable camera target.
export const MODEL_METRIC_SIZES = Object.freeze({
 hustopece:[53.3427734375,10.47216796875,39.828125],
 transped:[30.01171875,12.72900390625,12.83984375],
 wurmova:[13.8701171875,11.141207695007324,17.8447265625],
 bystrc:[30.80859375,9.0732421875,28.203125],
 selska84:[18.150390625,11.759765625,22.4794921875],
 ivancice:[88.02000427246094,12.5,20.230003356933594],
 nebovidy:[46.611328125,11.7666015625,21.693359375]
});
export const KOUPLENI_MODEL_NOTE='Koupelní 2 je prostorová studie podle fotografií a projektových podkladů.';
export function placeExhibitModel(model,id,THREE,surfaceY=.962){
 model.scale.setScalar(1);model.position.set(0,0,0);model.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(model);
 if(bounds.isEmpty()){
  const size=MODEL_METRIC_SIZES[id];if(!size)throw new Error(`Missing dimensions: ${id}`);
  bounds.set(new THREE.Vector3(-size[0]/2,0,-size[2]/2),new THREE.Vector3(size[0]/2,size[1],size[2]/2));
 }
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const fit=Math.min(3.15/Math.max(size.x,.01),2.0/Math.max(size.z,.01),2.5/Math.max(size.y,.01));
 model.scale.setScalar(fit);model.position.set(-center.x*fit,surfaceY-bounds.min.y*fit,-center.z*fit);
 const scaledSize=size.clone().multiplyScalar(fit);
 model.userData.displayPlacement={mode:'fit-to-plinth',fit,displaySize:scaledSize.toArray(),sourceSize:size.toArray()};
 return {fit,size,scaledSize,modelHeight:scaledSize.y,targetY:surfaceY+scaledSize.y*.48,focusRadius:scaledSize.length()*.5};
}
// Azimuth is measured from +Z. Each bearing shows a documented facade or entrance.
const streetBearing = Object.freeze({
 koupelni: -30, hustopece: 149, transped: 30, wurmova: -30.72,
 bystrc: 28, selska84: 55, ivancice: 38, nebovidy: 34
});

export function exhibitView(table,camera,THREE,isMobile=false){
 const id=table.group.userData.projectId;
 const angle=THREE.MathUtils.degToRad(id==='wurmova'&&isMobile?-29.66:(streetBearing[id]??30));
 const dx=Math.sin(angle),dz=Math.cos(angle);
 const size=table.scaledSize;
 const target=new THREE.Vector3(table.x,table.targetY,table.z);
 const base=table.targetY-size.y*.48;
 const eyeHeight=base+Math.min(.34,Math.max(.095,size.y*.27));
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov)*.5);
 const tanH=tanV*camera.aspect;
 // Frame every front corner, including the long Ivančice facade on narrow screens.
 let distance=id==='wurmova'?Math.hypot(2.05,isMobile?3.60:3.45):2.85;
 for(const x of [-size.x/2,size.x/2]){
  for(const z of [-size.z/2,size.z/2]){
   const depth=x*dx+z*dz;
   const horizontal=Math.abs(x*dz-z*dx)/(tanH*(isMobile?.82:.69));
   const vertical=size.y*.54/(tanV*.77);
   distance=Math.max(distance,depth+Math.max(horizontal,vertical));
  }
 }
 const wallX=(dx>0?8.9:-8.9)-table.x,wallZ=(dz>0?17.05:-17.05)-table.z;
 if(Math.abs(dx)>.001)distance=Math.min(distance,wallX/dx);
 if(Math.abs(dz)>.001)distance=Math.min(distance,wallZ/dz);
 return {target,position:new THREE.Vector3(table.x+dx*distance,eyeHeight,table.z+dz*distance)};
}
