// Each tile is a hemispherical visibility bake from the opaque geometry of that exhibit.
// The eight stone caps already share a single instanced draw.
const tiles=['koupelni','hustopece','transped','wurmova','bystrc','selska84','ivancice','nebovidy'];
export function createPlinthContact(THREE,source,geometry,projects,width,depth,onReady){
 const material=source.clone();
 const layers=new THREE.InstancedBufferAttribute(new Float32Array(projects.length).fill(-1),1);
 geometry.setAttribute('contactTile',layers);
 const lookup=new Map(projects.map((project,index)=>[project.id,index]));
 const atlas={value:null};
 const strength={value:0};
 let started=false;
 function show(id){
  const index=lookup.get(id),tile=tiles.indexOf(id);
  if(index===undefined||tile<0)return;
  if(layers.getX(index)!==tile){layers.setX(index,tile);layers.needsUpdate=true}
 }
 function load(){
  if(started)return;
  started=true;
  new THREE.TextureLoader().load(new URL('./assets/v22/plinth-contact.webp',import.meta.url).href,texture=>{
   texture.colorSpace=THREE.NoColorSpace;
   atlas.value=texture;
   strength.value=.56;
   onReady?.();
  },undefined,()=>{});
 }
 const original=material.onBeforeCompile,baseKey=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  original.call(material,shader,renderer);
  shader.uniforms.uPlinthAtlas=atlas;
  shader.uniforms.uPlinthStrength=strength;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   attribute float contactTile;
   varying vec3 vPlinthContact;`);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec2 localUV=clamp(vec2(position.x/${width.toFixed(4)},position.z/${depth.toFixed(4)})+.5,0.0,1.0);
   vec2 tile=vec2(mod(max(contactTile,0.0),4.0),floor(max(contactTile,0.0)/4.0));
   vPlinthContact=vec3((tile.x+localUV.x)*.25,1.0-(tile.y+localUV.y)*.5,
                       step(-.5,contactTile)*step(.91,normal.y));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform sampler2D uPlinthAtlas;
   uniform float uPlinthStrength;
   varying vec3 vPlinthContact;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   diffuseColor.rgb *= 1.0-uPlinthStrength*vPlinthContact.z*texture2D(uPlinthAtlas,vPlinthContact.xy).r;`);
 };
 material.customProgramCacheKey=()=>baseKey+'|plinth-contact-v22';
 show('koupelni');
 return {material,show,load};
}
