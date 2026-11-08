import * as THREE from './assets/vendor/three.module.min.js';

// Geometry, project pins and labels share this longitude/latitude conversion.
const world = (lon, lat, z=0) => new THREE.Vector3((lon-15.55)*.64, lat-49.85, z);

export function createMapScene(host, geo, stage) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, matchMedia('(max-width:760px)').matches?1.25:1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setClearColor(0xffffff,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  } catch(e) { return null; }
  renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.className='country-canvas';
  host.append(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,80);
  const ambient=new THREE.AmbientLight(0xffffff,1.35);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffffff,1.65);key.position.set(-2.5,3,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.radius=4;key.shadow.bias=-.0003;scene.add(key);
  const fill=new THREE.DirectionalLight(0x9cbaac,.45);fill.position.set(5,-3,4);scene.add(fill);
  const shapes=[];
  function ring(points,ShapeClass){const path=new ShapeClass();points.forEach((p,i)=>{const v=world(p[0],p[1]);i?path.lineTo(v.x,v.y):path.moveTo(v.x,v.y)});return path}
  function addPolygon(rings){if(!rings?.length)return;const shape=ring(rings[0],THREE.Shape);for(let i=1;i<rings.length;i++)shape.holes.push(ring(rings[i],THREE.Path));shapes.push(shape)}
  const features=geo?.type==='FeatureCollection'?geo.features:geo?.type==='Feature'?[geo]:[];
  for(const feature of features){const g=feature.geometry;if(g?.type==='Polygon')addPolygon(g.coordinates);if(g?.type==='MultiPolygon')g.coordinates.forEach(addPolygon)}
  if(!shapes.length){renderer.dispose();renderer.domElement.remove();return null}
  const top=new THREE.MeshStandardMaterial({color:0xE6EDDF,roughness:.95,metalness:0,side:THREE.DoubleSide});
  const side=new THREE.MeshStandardMaterial({color:0x6B8C7A,roughness:1,metalness:0,side:THREE.DoubleSide});
  const glow=new THREE.MeshBasicMaterial({color:0xf6f7f2,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false});
  for(const shape of shapes){
    const geo3=new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:3,steps:1,curveSegments:1});
    const land=new THREE.Mesh(geo3,[top,side]);land.castShadow=true;scene.add(land);
    const edge=new THREE.Mesh(new THREE.ShapeGeometry(shape),glow);edge.position.z=.126;scene.add(edge);
  }
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({color:0x2d574a,opacity:.2}));floor.position.z=-.025;floor.receiveShadow=true;scene.add(floor);
  let mode='space',width=1,height=1;
  function resize(w,h){width=w;height=h;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  function update(view){
    const distance=view.h/(2*Math.tan(THREE.MathUtils.degToRad(20))*view.scale*view.zoom);
    const centerX=-(view.panX+(view.mapOffsetX||0))/(view.scale*view.zoom);
    const centerY=view.panY/(view.scale*.78*view.zoom)+(view.mapOffsetY||0)/(view.scale*view.zoom*.9);
    const pitch=mode==='top'?0:THREE.MathUtils.degToRad(matchMedia('(max-width:760px)').matches?18:30);
    const target=new THREE.Vector3(centerX,centerY,0);
    camera.position.set(centerX,centerY-distance*Math.sin(pitch),distance*Math.cos(pitch));
    camera.up.set(0,1,0);camera.lookAt(target);camera.updateMatrixWorld();
    renderer.render(scene,camera);
  }
  function project(lon,lat){const p=world(lon,lat,.135).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2}}
  function setMode(value){mode=value==='top'?'top':'space'}
  function destroy(){scene.traverse(o=>{if(o.geometry)o.geometry.dispose()});renderer.dispose();renderer.domElement.remove()}
  return {resize,update,project,setMode,destroy};
}
