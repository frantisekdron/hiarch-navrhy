// A diffuse uplight contribution for every exhibit. One stable shader program
// variant, shared textures and uniform changes only; no light/shadow per table.
export function addExhibitUplighting({THREE,tables}){
 const records=[];let current={};
 function install(table){
  table.group.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(table.model);
  const uniforms={
   uGalleryBase:{value:bounds.isEmpty()?1.035:bounds.min.y},
   uGalleryHeight:{value:bounds.isEmpty()?2:Math.max(.1,bounds.max.y-bounds.min.y)},
   uGalleryColor:{value:new THREE.Color(0xEBCB9B)},
   uGalleryStrength:{value:0}
  };
  const clones=new Map();let meshes=0;
  const decorate=source=>{
   if(!source?.isMeshStandardMaterial||source.opacity<.65||source.transmission>.05)return source;
   if(clones.has(source))return clones.get(source);
   const material=source.clone(),originalCompile=source.onBeforeCompile,originalKey=source.customProgramCacheKey();
   material.onBeforeCompile=(shader,renderer)=>{
    originalCompile.call(material,shader,renderer);
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
uniform float uGalleryBase;
uniform float uGalleryHeight;
varying float vGalleryHeight;`);
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
vec4 galleryPosition=vec4(transformed,1.0);
#ifdef USE_BATCHING
 galleryPosition=batchingMatrix*galleryPosition;
#endif
#ifdef USE_INSTANCING
 galleryPosition=instanceMatrix*galleryPosition;
#endif
vGalleryHeight=((modelMatrix*galleryPosition).y-uGalleryBase)/uGalleryHeight;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform vec3 uGalleryColor;
uniform float uGalleryStrength;
varying float vGalleryHeight;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
// LED bounce falls off up the facade, respects its base colour and keeps roofs
// and glazing from turning into a uniformly glowing, textureless model.
float galleryHeight=clamp(vGalleryHeight,0.0,1.0);
float galleryFalloff=.018+.982*pow(1.0-galleryHeight,3.1);
vec3 galleryNormal=inverseTransformDirection(normal,viewMatrix);
float galleryFacade=.12+.88*(1.0-abs(galleryNormal.y));
totalEmissiveRadiance+=diffuseColor.rgb*uGalleryColor*uGalleryStrength*galleryFalloff*galleryFacade;`);
   };
   material.customProgramCacheKey=()=>originalKey+'|hiarch-plinth-uplight-v21';
   clones.set(source,material);return material;
  };
  table.model.traverse(object=>{
   if(!object.isMesh)return;
   const original=object.material;
   object.material=Array.isArray(original)?original.map(decorate):decorate(original);
   if(Array.isArray(object.material)?object.material.some((m,i)=>m!==original[i]):object.material!==original)meshes++;
  });
  records.push({id:table.group.userData.projectId,uniforms,meshes});
 }
 tables.forEach(install);
 function setLighting({preset='evening',color='#a9dcc6',intensity=1}={}){
  current={preset,color,intensity};
  const amount=Math.max(0,Math.min(1.5,Number(intensity)||0));
  const tint=new THREE.Color(preset==='neon'?color:0xEBCB9B);
  if(preset==='neon'){const h={};tint.getHSL(h);tint.setHSL(h.h,Math.max(.8,h.s),.48)}
  const strength=preset==='day'?0:preset==='neon'?.40*amount:.10*amount;
  for(const record of records){record.uniforms.uGalleryColor.value.copy(tint);record.uniforms.uGalleryStrength.value=strength}
  return {preset,count:strength>0?records.filter(r=>r.meshes>0).length:0,total:records.length,meshes:records.reduce((sum,r)=>sum+r.meshes,0),strength};
 }
 return {setLighting,records,replaceTable(table){const i=records.findIndex(r=>r.id===table.group.userData.projectId);if(i>=0)records.splice(i,1);install(table);return setLighting(current)}};
}
