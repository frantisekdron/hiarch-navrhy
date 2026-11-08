// A physical wall atlas for the museum scene. All map points are municipality-level.
export function addWallMap({THREE,scene,geo,projects,pickables,labelTexture}) {
  if(!THREE||!scene||!Array.isArray(projects)||typeof labelTexture!=='function')throw new TypeError('addWallMap requires THREE, scene, projects and labelTexture');
  const group=new THREE.Group();group.name='HiARCH wall atlas';group.position.set(-9.25,3.3,7);group.rotation.y=Math.PI/2;group.userData.wallMap=true;scene.add(group);
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.9,metalness:0,...extra});
  const dark=material(0x343e36),ivory=material(0xe9e7db),sheet=material(0xdce2d5),land=material(0xa8bba5),divider=material(0xa5aa97),amber=material(0xd9ad6f),dot=material(0x7c967f,{emissive:0x375b42,emissiveIntensity:.24});
  function box(w,h,d,x,y,z,mat,parent=group){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function text(lines,w,h,x,y,z,color='#343e36',pixelWidth=512,pixelHeight=128){
    const texture=labelTexture(lines,{width:Math.max(256,Math.round(pixelWidth)),height:Math.max(64,Math.round(pixelHeight)),color,fontFamily:'Space Grotesk, Manrope, sans-serif'});
    if(texture&&'colorSpace'in texture&&THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));m.position.set(x,y,z);m.renderOrder=5;group.add(m);return m;
  }
  box(7.5,4.6,.12,0,0,0,dark);
  box(7.32,4.42,.025,0,0,.072,ivory);
  box(3.54,2.55,.015,-1.83,.05,.09,sheet);
  box(.018,3.67,.02,-.07,-.15,.101,divider);
  text(['ATLAS MÍST'],2.15,.38,-2.45,1.88,.105,'#35463b',512,96);
  text(['PROJEKTY'],2.06,.36,1.66,1.88,.105,'#35463b',512,96);
  text(['BODY NA ÚROVNI OBCÍ'],2.84,.25,-1.82,-1.88,.105,'#617464',512,80);
  const projectToMap=(lon,lat)=>({x:-1.83+(lon-15.55)*.64*.72,y:.11+(lat-49.85)*.72});
  function pathFor(coords,PathType){const path=new PathType();coords.forEach((p,i)=>{const q=projectToMap(p[0],p[1]);i?path.lineTo(q.x,q.y):path.moveTo(q.x,q.y)});return path}
  const features=geo?.type==='FeatureCollection'?geo.features:geo?.type==='Feature'?[geo]:[];
  for(const feature of features){const geometry=feature.geometry,polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
    for(const rings of polygons){if(!rings?.length)continue;const shape=pathFor(rings[0],THREE.Shape);for(const hole of rings.slice(1))shape.holes.push(pathFor(hole,THREE.Path));const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),land);mesh.position.z=.112;mesh.receiveShadow=true;group.add(mesh);
      for(const ring of rings){const points=ring.map(p=>{const q=projectToMap(p[0],p[1]);return new THREE.Vector3(q.x,q.y,.118)});const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xeef5e7,transparent:true,opacity:.85}));group.add(outline)}
    }
  }
  // Municipality dots are geographic anchors; the eight project labels remain separate.
  const municipalities=new Map();
  for(const p of projects){if(!Array.isArray(p.coordinates)||p.coordinates.length<2)continue;const key=p.city||`${p.coordinates[0]},${p.coordinates[1]}`;if(!municipalities.has(key))municipalities.set(key,p.coordinates)}
  for(const [city,coordinates] of municipalities){const q=projectToMap(coordinates[0],coordinates[1]);const ring=new THREE.Mesh(new THREE.RingGeometry(.029,.042,24),new THREE.MeshBasicMaterial({color:0xf0ead9,side:THREE.DoubleSide}));ring.position.set(q.x,q.y,.128);group.add(ring);const point=new THREE.Mesh(new THREE.CircleGeometry(.018,20),dot);point.position.set(q.x,q.y,.13);point.userData.municipality=city;group.add(point)}
  const pins=[];
  projects.slice(0,8).forEach((p,i)=>{
    const y=1.43-i*.415;
    const backing=box(3.27,.355,.015,1.77,y,.112,i%2?material(0xf0f0e7):material(0xf8f8ee));
    backing.userData.projectId=p.id;
    box(.038,.29,.018,.22,y,.127,amber);
    const name=p.name||p.id,city=p.city||'';
    const label=text([name,city],2.84,.31,1.83,y,.134,'#33443a',768,128);
    label.name=`Wall map project: ${name}`;label.userData.projectId=p.id;
    pins.push({id:p.id,object:label});
    if(Array.isArray(pickables))pickables.push(label);
  });
  group.updateMatrixWorld(true);
  return {group,pins,lookFrom:[-1.2,3.6,8],lookAt:[-9.25,3.3,7.0]};
}
