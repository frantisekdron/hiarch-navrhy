// Keep the visual batch and the original pick targets separate. This layer is
// raycast only; no camera or shadow light renders a second copy of the fittings.
export const PICK_LAYER = 1;

export function instanceGalleryFittings(THREE, scene, tables, benches, capGeometry) {
  const unitBox=new THREE.BoxGeometry(1,1,1);
  const batches=new Map();
  for(const group of [...tables.map(t=>t.group),...benches.map(b=>b.object)]) {
    group.updateWorldMatrix(true,true);
    for(const mesh of group.children) {
      const box=mesh.geometry?.type==='BoxGeometry';
      if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.visible||(!box&&mesh.geometry!==capGeometry)) continue;
      if(Array.isArray(mesh.material)||mesh.material.transparent) continue;
      const geometry=box?unitBox:capGeometry;
      const key=[geometry.uuid,mesh.material.uuid,mesh.castShadow,mesh.receiveShadow].join('/');
      if(!batches.has(key)) batches.set(key,{geometry,meshes:[]});
      batches.get(key).meshes.push(mesh);
    }
  }
  let batched=0, originals=0;
  for(const {geometry,meshes} of batches.values()) {
    if(meshes.length<3) continue;
    const first=meshes[0], batch=new THREE.InstancedMesh(geometry,first.material,meshes.length);
    batch.castShadow=first.castShadow;
    batch.receiveShadow=first.receiveShadow;
    batch.name='Repeated plinth or seat fittings';
    const matrix=new THREE.Matrix4(), scale=new THREE.Matrix4();
    for(const [i,mesh] of meshes.entries()) {
      matrix.copy(mesh.matrixWorld);
      if(geometry===unitBox) {
        const {width,height,depth}=mesh.geometry.parameters;
        matrix.multiply(scale.makeScale(width,height,depth));
      }
      batch.setMatrixAt(i,matrix);
      mesh.layers.set(PICK_LAYER);
      // Three's shadow traversal tests the camera layers; keep proxies out of
      // both the render list and any subsequently rebuilt shadow map.
      mesh.castShadow=false;
    }
    batch.instanceMatrix.needsUpdate=true;
    batch.computeBoundingSphere();
    scene.add(batch);
    originals+=meshes.length;
    batched++;
  }
  if(!batched) unitBox.dispose();
  return {originals,batches:batched};
}

// Geometry beyond the east wall is reachable only through the physical opening.
// Three's raycaster also returns hits under invisible groups, so test both.
export function reachableHit(hit,eye,door,limit,space) {
  if(hit.distance>limit) return false;
  for(let node=hit.object;node;node=node.parent) if(!node.visible) return false;
  const point=hit.point, wall=space.portal[0];
  if((eye.x-wall)*(point.x-wall)>=0) return true;
  const t=(wall-eye.x)/(point.x-eye.x);
  const y=eye.y+(point.y-eye.y)*t,z=eye.z+(point.z-eye.z)*t;
  if(hit.object.userData.chessPortal && Math.abs(point.x-wall)<1.9) return true;
  return door>.001 && Math.abs(z-space.portal[2])<=space.doorHalf && y>=0 && y<=4.5;
}

export function galleryPixelRatio(deviceRatio,width,height,mobile,limited) {
  const budget=limited?850000:mobile?1050000:1500000;
  const byArea=Math.sqrt(budget/Math.max(1,width*height));
  return Math.min(deviceRatio||1,limited?1:1.35,byArea);
}

export function galleryFieldOfView(width,height,stage,playingChess,walking=false) {
  // Preserve the doorway composition on tall screens by holding the horizontal walking FOV.
  const aspect=width/Math.max(height,1);
  const portraitWalk=2*Math.atan(Math.tan(31*Math.PI/180)/aspect)*180/Math.PI;
  const base=width<650?(aspect<.8?(walking?Math.min(110,portraitWalk):84):68):walking?68:52;
  return stage==='inside'&&!playingChess ? Math.max(base,72) : base;
}
