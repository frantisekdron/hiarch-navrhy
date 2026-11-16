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
export function exhibitView(table,camera,THREE,isMobile=false){
 const targetY=table.targetY||1.95,side=table.x< -1?1:table.x>1?-1:1;
 if(table.group?.userData.projectId==='wurmova'){
  // The street photograph looks up the left flank toward the bay on the +Z facade.
  const position=new THREE.Vector3(table.x-2.05,1.30,table.z+(isMobile?3.60:3.45));
  return {position,target:new THREE.Vector3(table.x,targetY,table.z)};
 }
 const offset=table.featured?(isMobile?2.55:4.4):Math.abs(table.x)>1?side*(isMobile?2.65:3.1):(isMobile?1.7:1.8);
 const forward=table.featured?(isMobile?4.6:5.4):(isMobile?4.3:4.6);
 return {position:new THREE.Vector3(table.x+offset,targetY+(isMobile?1.2:1.4),table.z+forward),target:new THREE.Vector3(table.x,targetY,table.z)};
}
