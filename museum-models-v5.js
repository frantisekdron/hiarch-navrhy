import {makeProjectModel as makeV4Model} from './museum-models-v4.js';

// A photographic massing study: proportions and facade rhythms are interpretive,
// while the visible elements come from the supplied Koupelní 2 / Bystrc photos.
export function makeProjectModel(id, THREE, textures={}) {
  if(id!=='koupelni'&&id!=='bystrc')return makeV4Model(id,THREE);
  const group=new THREE.Group();
  group.userData.modelId=id;
  group.userData['data-model-id']=id;
  const ivory=new THREE.MeshStandardMaterial({color:0xE7EEE2,roughness:.88,metalness:0});
  const white=new THREE.MeshStandardMaterial({color:0xF4F7EE,roughness:.78,metalness:0});
  const sage=new THREE.MeshStandardMaterial({color:0xA9BFA9,roughness:.84,metalness:0});
  const graphite=new THREE.MeshStandardMaterial({color:0x364A42,roughness:.94,metalness:0});
  const windowMat=new THREE.MeshStandardMaterial({color:0x334D4D,roughness:.53,metalness:.02});
  const ochre=new THREE.MeshStandardMaterial({color:0xD8C46A,roughness:.83,metalness:0});
  const lineMat=new THREE.LineBasicMaterial({color:0xEFFFE5,transparent:true,opacity:.78});
  const subtleLine=new THREE.LineBasicMaterial({color:0xBBD4BB,transparent:true,opacity:.54});
  function box(w,h,d,x,y,z,mat=ivory,outline=true){
    const g=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);
    if(outline){const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),lineMat);e.position.copy(m.position);group.add(e)}
    return m;
  }
  function line(points,mat=subtleLine){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));group.add(new THREE.Line(g,mat))}
  function facadePlane(w,h,x,y,z,material){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);group.add(mesh);return mesh}
  function window(w,h,x,y,z){
    facadePlane(w,h,x,y,z,windowMat);
    const e=.007;
    line([[x-w/2-e,y-h/2-e,z+.003],[x+w/2+e,y-h/2-e,z+.003],[x+w/2+e,y+h/2+e,z+.003],[x-w/2-e,y+h/2+e,z+.003],[x-w/2-e,y-h/2-e,z+.003]],lineMat);
  }
  function applyTexture(texture,w,h,x,y,z,rotationY=0){
    if(!texture?.isTexture)return false;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide});
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);plane.position.set(x,y,z);plane.rotation.y=rotationY;group.add(plane);return true;
  }
  if(id==='koupelni'){
    // Main white bar, elevated charcoal circulation bay, and low projecting wing.
    box(1.9,.035,1.08,0,.018,0,graphite,false);
    box(1.55,.17,.66,.03,.155,-.09,graphite);
    box(1.55,1.17,.62,.03,.825,-.09,ivory);
    box(.51,1.18,.635,-.49,.825,-.09,white,false);
    box(.78,1.18,.635,.40,.825,-.09,white,false);
    box(.28,1.31,.67,-.155,.805,-.073,graphite);
    // The flat roof and slightly higher central parapet are visible in both photos.
    box(1.57,.035,.65,.03,1.435,-.09,white);
    box(.30,.045,.68,-.155,1.475,-.073,graphite);
    box(.31,.13,.23,.29,1.515,-.27,sage,false);
    // A lower dark pavilion projects toward the viewer at the left of the front view.
    box(.69,.39,.55,-.65,.34,.315,graphite);
    box(.70,.035,.57,-.65,.545,.315,ivory);
    box(.49,.11,.012,-.65,.38,.596,windowMat,false);
    for(const x of [-.82,-.66,-.50])line([[x,.325,.605],[x,.435,.605]],lineMat);
    // A low side volume and forecourt apron are legible in the aerial view.
    box(.36,.28,.48,.77,.24,.05,graphite);
    box(.40,.027,.49,.77,.395,.05,ivory);
    box(.42,.018,.49,.65,.055,.36,sage,false);
    const frontZ=.231;
    const hasMain=applyTexture(textures.main,1.53,1.15,.03,.825,frontZ+.005);
    if(!hasMain){
      const floors=[.35,.54,.73,.92,1.11,1.30];
      for(const y of floors){
        for(const x of [-.61,-.40,.11,.29,.47,.65])window(.105,.092,x,y,frontZ+.011);
        // Thin ochre reveals are visible among the right facade bays.
        if(y===.54||y===.92)box(.018,.11,.017,.37,y,frontZ+.02,ochre,false);
      }
    }
    // Dark central strip carries narrow horizontal windows rather than a grid.
    for(const y of [.33,.59,.85,1.11])window(.105,.035,-.155,y,.268);
    const hasSide=applyTexture(textures.side,.60,1.15,.812,.825,-.09,Math.PI/2);
    if(!hasSide){
      for(const y of [.43,.75,1.07]){
        const g=new THREE.BoxGeometry(.012,.095,.085),m=new THREE.Mesh(g,windowMat);m.position.set(.821,y,-.15);group.add(m);
      }
    }
    // Only a route edge and outline are shown; the photographs do not establish stall count.
    line([[-.94,.049,.50],[.90,.049,.50],[.90,.049,-.45],[-.94,.049,-.45],[-.94,.049,.50]],subtleLine);
    line([[-.88,.049,.43],[-.45,.049,.43],[-.22,.049,.54],[.52,.049,.54]],subtleLine);
    return group;
  }
  // Bystrc: low waterside terminal, diagonal gangway with rail, and a pointed tensile roof.
  box(1.9,.035,1.08,0,.018,0,graphite,false);
  box(1.49,.30,.43,-.14,.235,-.23,ivory);
  box(1.54,.025,.47,-.14,.40,-.23,white);
  box(.54,.13,.012,-.48,.235,.002,windowMat,false);
  box(.22,.12,.012,.06,.235,.002,windowMat,false);
  // The bridge advances from the terminal toward the viewer at an angle.
  const gangway=box(1.48,.035,.18,.16,.15,.31,sage,false);gangway.rotation.y=-.27;
  const railMaterial=new THREE.LineBasicMaterial({color:0xdceadf,transparent:true,opacity:.82});
  for(const sideSign of [-1,1]){
    const z=.31+sideSign*.10;
    line([[-.56,.36,z-.20],[.88,.36,z+.20]],railMaterial);
    for(const u of [-.45,-.08,.29,.66])line([[u,.16,z+u*.27],[u,.36,z+u*.27]],railMaterial);
  }
  // Tension canopy: one high peak and a smooth fall to its edge, not a sinusoidal roof.
  const radial=20,rings=5,vertices=[],indices=[],cx=.39,cz=-.045;
  for(let r=0;r<=rings;r++)for(let i=0;i<radial;i++){
    const t=r/rings,a=i/radial*Math.PI*2;
    const x=cx+Math.cos(a)*.57*t,z=cz+Math.sin(a)*.39*t;
    const y=1.17-.61*Math.pow(t,1.26);
    vertices.push(x,y,z);
  }
  for(let r=0;r<rings;r++)for(let i=0;i<radial;i++){
    const a=r*radial+i,b=r*radial+(i+1)%radial,c=(r+1)*radial+i,d=(r+1)*radial+(i+1)%radial;
    indices.push(a,c,b,b,c,d);
  }
  const canopyGeometry=new THREE.BufferGeometry();canopyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));canopyGeometry.setIndex(indices);canopyGeometry.computeVertexNormals();
  const canopyMat=new THREE.MeshPhysicalMaterial({color:0xf2f6ec,roughness:.68,metalness:0,transparent:true,opacity:.91,side:THREE.DoubleSide});
  const roof=new THREE.Mesh(canopyGeometry,canopyMat);roof.castShadow=true;group.add(roof);
  const mast=box(.018,1.08,.018,cx,.59,cz,white,false);mast.castShadow=true;
  for(const [x,z] of [[-.09,-.04],[.77,-.05],[.30,.26]]){
    const pole=box(.014,.54,.014,x,.31,z,white,false);pole.castShadow=true;
  }
  line([[cx,1.19,cz],[cx,1.47,cz]],lineMat);
  return group;
}
