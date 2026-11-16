import {makeProjectModel as createStudy} from './museum-koupelni-v16.js?v=16.0';
import {compactStaticModel} from './museum-optimize-v7.js';

export function makeProjectModel(id,THREE,reference={}){
 const model=createStudy(id,THREE,reference);if(id!=='koupelni')return model;
 // Keep instanced window transforms/names intact for the window-life overlay.
 // Only immutable facade, roof and sill meshes are combined by exact material.
 model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert();
 const ordinary=[],retainedGeometry=new Set();model.traverse(o=>{if(o.isInstancedMesh)retainedGeometry.add(o.geometry);else if(o.isMesh&&!Array.isArray(o.material))ordinary.push(o)});
 const staticParts=new THREE.Group();
 for(const source of ordinary){const copy=new THREE.Mesh(source.geometry,source.material);copy.applyMatrix4(inverse.clone().multiply(source.matrixWorld));copy.castShadow=source.castShadow;copy.receiveShadow=source.receiveShadow;staticParts.add(copy)}
 const batched=compactStaticModel(staticParts,THREE);batched.name='Batched solid facades and roof';
 const oldGeometries=new Set(ordinary.map(o=>o.geometry));for(const source of ordinary)source.removeFromParent();
 model.add(batched);for(const geometry of oldGeometries)if(!retainedGeometry.has(geometry))geometry.dispose();
 model.userData.staticBatches={before:ordinary.length,after:batched.children.length};
 model.userData.detailLevel='physical-facades-batched-v18';return model;
}
