import { mergeGeometries } from './assets/vendor/BufferGeometryUtils.js';

// Static lounge seating; no aquarium geometry or animation.
export function addGalleryLounge({ THREE: T, scene, pickables, requestRender = () => {} }) {
  const group = new T.Group(); group.name = 'Gallery seating V19'; scene.add(group);
  const materials = [], geometries = new Set(), batches = new Map();
  const mat = (color, extra = {}) => { const m = new T.MeshStandardMaterial({ color, roughness: .48, ...extra }); materials.push(m); return m; };
  const bronze = mat(0x8c7144, { metalness: .78, roughness: .27 });
  const velvet = mat(0x234d40, { roughness: .89, metalness: .03, emissive:0x173B29, emissiveIntensity:.035 });
  const piping = mat(0x62816a, { roughness: .65 });
  const warm = new T.MeshBasicMaterial({ color: 0xb1a77b }); materials.push(warm);
  function bake(parent, material, geometry, position = [0,0,0], scale = [1,1,1], rotation = [0,0,0]) {
    const mesh = new T.Mesh(geometry); mesh.position.fromArray(position); mesh.scale.fromArray(scale); mesh.rotation.set(...rotation); mesh.updateMatrix();
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); g.deleteAttribute('uv'); g.applyMatrix4(mesh.matrix); geometry.dispose();
    let byMaterial = batches.get(parent); if (!byMaterial) batches.set(parent, byMaterial = new Map());
    if (!byMaterial.has(material)) byMaterial.set(material, []); byMaterial.get(material).push(g);
  }
  const box = (p,m,s,v) => bake(p,m,new T.BoxGeometry(...s),v);
  function tube(p,m,points,r=.018) { bake(p,m,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),18,r,5,false)); }
  function ellipsoid(p,m,v,s) { bake(p,m,new T.SphereGeometry(1,12,8),v,s); }
  const benches = [], obstacles = [];
  for (const side of [-1,1]) {
    const seatGroup = new T.Group(), x = side*8.42, z = .8, id = `lounge-${side < 0 ? 'left' : 'right'}`;
    seatGroup.position.set(x,0,z); seatGroup.scale.x=side; group.add(seatGroup);
    seatGroup.userData.seatId=id;
    // The back is on the wall side; the open seat faces the centre of the room.
    for (const zz of [-.89,.89]) for(const xx of [-.27,.27]) box(seatGroup,bronze,[.055,.39,.055],[xx,.195,zz]);
    box(seatGroup,bronze,[.73,.085,2.12],[0,.405,0]);
    const shape = new T.Shape(); shape.moveTo(-.34,-.95); shape.lineTo(.24,-.95); shape.quadraticCurveTo(.37,-.95,.37,-.82); shape.lineTo(.37,.82); shape.quadraticCurveTo(.37,.95,.24,.95); shape.lineTo(-.34,.95); shape.quadraticCurveTo(-.43,.95,-.43,.84); shape.lineTo(-.43,-.84); shape.quadraticCurveTo(-.43,-.95,-.34,-.95);
    bake(seatGroup,velvet,new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:2,curveSegments:5}),[0,.48,0],[1,1,1],[-Math.PI/2,0,0]);
    tube(seatGroup,velvet,[[.28,.70,-.92],[.34,.83,-.63],[.35,.88,0],[.34,.83,.63],[.28,.70,.92]],.185);
    tube(seatGroup,piping,[[.23,.88,-.92],[.30,1.00,-.63],[.32,1.065,0],[.30,1.00,.63],[.23,.88,.92]],.012);
    for(const zz of [-1.01,1.01]) {
      tube(seatGroup,bronze,[[-.31,.42,zz],[-.36,.64,zz],[-.20,.79,zz],[.08,.73,zz],[.29,.84,zz]],.025);
      ellipsoid(seatGroup,velvet,[-.06,.745,zz],[.29,.065,.075]);
      tube(seatGroup,bronze,[[.31,.42,zz],[.39,.58,zz],[.36,.90,zz],[.27,1.02,zz]],.015);
    }
    box(seatGroup,warm,[.012,.012,1.76],[-.30,.31,0]);
    seatGroup.traverse(o=>o.userData.seatId=id); pickables.push(seatGroup);
    benches.push({id,object:seatGroup,seat:[x-side*.10,1.20,z],lookAt:[0,1.75,z],approach:[x-side*1.15,1.6,z],halfWidth:.56,halfDepth:1.12});
    obstacles.push({x,z,halfWidth:.56,halfDepth:1.12});
  }
  for(const [parent,byMaterial] of batches) for(const [material,gs] of byMaterial) {
    const geometry=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());geometries.add(geometry);
    const mesh=new T.Mesh(geometry,material);mesh.receiveShadow=false;mesh.castShadow=false; if(parent.userData.seatId)mesh.userData.seatId=parent.userData.seatId;parent.add(mesh);
  }
  let disposed=false;
  function setLighting({preset,intensity=1}={}){
    const amount=T.MathUtils.clamp(Number.isFinite(intensity)?intensity:1,0,2);
    warm.color.set(0xb1a77b).multiplyScalar(.72+amount*.16);
    velvet.envMapIntensity=preset==='day'?.85:.28;velvet.emissiveIntensity=preset==='day'?0:.07;
    bronze.envMapIntensity=preset==='day'?.9:.50;piping.envMapIntensity=preset==='day'?.6:.30;requestRender();
  }
  function dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const bench of benches){const i=pickables.indexOf(bench.object);if(i>=0)pickables.splice(i,1)}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}
  group.userData.loungeVersion=19;
  return {group,benches,obstacles,setLighting,dispose};
}
