import { RectAreaLightUniformsLib } from './assets/vendor/RectAreaLightUniformsLib.js';
import { Reflector } from './assets/vendor/Reflector.js';
import { makeBrandSign } from './museum-brand-v9.js';
let rectAreaInitialised = false;

export function buildGalleryRoom({ THREE, renderer, projects, makeProjectModel, labelTexture, artworks = [] }) {
  if (!THREE || !Array.isArray(projects) || typeof makeProjectModel !== 'function' || typeof labelTexture !== 'function') {
    throw new TypeError('buildGalleryRoom requires THREE, projects, makeProjectModel and labelTexture.');
  }
  if (!rectAreaInitialised) { RectAreaLightUniformsLib.init(); rectAreaInitialised = true; }

  const scene = new THREE.Scene();
  const pickables = [],brandSigns=[];
  const stone = 0xD9D2C5;
  const ivory = 0xF2EFE7;
  const paper = 0xE7E1D5;
  const graphite = 0x383A35;
  const bronze = 0x8E7959;
  const bronzeLight = 0xB09A72;
  const sage = 0x879581;
  const sageLight = 0xA7B09B;
  scene.background = new THREE.Color(0xECE8DF);
  scene.fog = new THREE.Fog(0xECE8DF, 45, 86);

  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.82, metalness: 0.02, ...options
  });
  const mats = {
    wall: material(0xF0EEE8), wallPanel: material(0xE7E4DC), wallReveal: material(0xC8C0B2),
    floor: material(0xDCD8CF), ceiling: material(0xE8E5DF), graphite: material(graphite),
    stone: material(0xDAD7D0), stoneLight: material(0xF3F0E9), bronze: material(bronze, { metalness: 0.62, roughness: 0.39 }),
    bronzeLight: material(bronzeLight, { metalness: 0.56, roughness: 0.32 }),
    glass: material(0xB8C0B3, { transparent: true, opacity: 0.2, roughness: 0.24, metalness: 0.08, depthWrite: false, side: THREE.DoubleSide }),
    led: new THREE.MeshBasicMaterial({ color: 0xBDCCB2, toneMapped: false }),
    plaque: material(0xEDE8DE, { roughness: 0.56 }),
    glassHandle: material(0xA88D62, { metalness: 0.8, roughness: 0.24 }),
    wood: material(0x796051, { roughness: 0.56, metalness: 0.02 }),
    plinth: material(0xE2DED4, { roughness: 0.57, metalness: 0.02 }),
    darkGap: material(0x373F3B, { roughness: 0.88 })
  };

  function box(w, h, d, x, y, z, mat, parent = scene, { castShadow = true, receiveShadow = true } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    parent.add(mesh);
    return mesh;
  }
  function line(points, mat) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
    const mesh = new THREE.Line(geometry, mat);
    scene.add(mesh);
    return mesh;
  }
  function makeLabel(lines, width, height, x, y, z, color = '#403D35', rotationY = 0) {
    const texture = labelTexture(lines, { width: Math.max(256,Math.round(width*160)), height: Math.max(64,Math.round(height*160)), color, fontFamily: 'Space Grotesk, Manrope, sans-serif' });
    if (texture && 'colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    if (texture && renderer?.capabilities?.getMaxAnisotropy) texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
    }));
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.renderOrder = 3;
    scene.add(mesh);
    return mesh;
  }

  // Procedural mineral finishes. Both color and fine normal maps are local canvas textures.
  function mineralFinish(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const terrazzo = kind === 'terrazzo';
    ctx.fillStyle = terrazzo ? '#dedbd3' : '#eceae3'; ctx.fillRect(0, 0, 512, 512);
    let seed = terrazzo ? 40271 : 73019;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    // Low contrast mineral fragments sit inside the surface instead of becoming confetti.
    for (let i = 0; i < (terrazzo ? 1350 : 2400); i++) {
      const x = random() * 512, y = random() * 512;
      const r = terrazzo ? 0.9 + random() * 3.1 : 0.6 + random() * 2.9;
      const palette = terrazzo ? ['#e5e1d8','#cbd0c4','#c1c9bf','#cfc8bc','#dedbd1'] : ['#f7f4ed','#d1cec5','#c9ccc3'];
      ctx.fillStyle = palette[Math.floor(random() * palette.length)];
      ctx.globalAlpha = terrazzo ? 0.18 + random() * 0.12 : 0.20 + random() * 0.18;
      ctx.beginPath(); ctx.ellipse(x, y, r * (0.6 + random()), r * (0.45 + random() * 0.5), random() * 3.14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!terrazzo) {
      for(let i=0;i<44;i++){
        const x=random()*512,y=random()*512,r=8+random()*28;
        ctx.fillStyle=random()>.5?'rgba(255,254,246,.075)':'rgba(116,113,102,.038)';
        ctx.beginPath();ctx.ellipse(x,y,r,r*(.25+random()*.45),random()*3.14,0,Math.PI*2);ctx.fill();
      }
      ctx.strokeStyle = 'rgba(122,121,109,.09)'; ctx.lineWidth = 1.1;
      for (let i = 0; i < 17; i++) { const x = random() * 512, y = random() * 512; ctx.beginPath(); ctx.moveTo(x,y); ctx.bezierCurveTo(x+16,y+8,x-12,y+30,x+24,y+50); ctx.stroke(); }
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(terrazzo ? 6.5 : 2.2, terrazzo ? 12 : 3.2);
    map.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    const normalCanvas = document.createElement('canvas'); normalCanvas.width = normalCanvas.height = 256;
    const nc = normalCanvas.getContext('2d'), pixels = nc.createImageData(256,256);
    const noise = new Float32Array(256*256);
    for (let i=0;i<noise.length;i++) noise[i]=random();
    const sample=(x,y)=>noise[((y+256)&255)*256+((x+256)&255)];
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4, strength=terrazzo?11:12;
      pixels.data[i]=Math.round(128+(sample(x-1,y)-sample(x+1,y))*strength);
      pixels.data[i+1]=Math.round(128+(sample(x,y-1)-sample(x,y+1))*strength);
      pixels.data[i+2]=255;pixels.data[i+3]=255;
    }
    nc.putImageData(pixels,0,0);
    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS=normalMap.wrapT=THREE.RepeatWrapping;normalMap.repeat.copy(map.repeat);
    return {map,normalMap};
  }
  function woodGrain(){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#C8B39D';ctx.fillRect(0,0,256,512);
    let seed=61783;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
    for(let i=0;i<210;i++){
      const x=random()*256,y=random()*512,width=.3+random()*2.2;
      ctx.strokeStyle=random()>.48?'rgba(65,40,28,.13)':'rgba(255,241,218,.16)';ctx.lineWidth=width;
      ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+random()*3-1.5,y+130,x+random()*4-2,y+260,x+random()*3-1.5,y+480);ctx.stroke();
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1,4);
    map.anisotropy=Math.min(4,renderer?.capabilities?.getMaxAnisotropy?.()||1);return map;
  }
  mats.wood.map=woodGrain();
  const limestone=mineralFinish('limestone'), terrazzo=mineralFinish('terrazzo');
  Object.assign(mats.wall,{map:limestone.map,normalMap:limestone.normalMap});mats.wall.normalScale.set(0.22,0.22);
  Object.assign(mats.wallPanel,{map:limestone.map,normalMap:limestone.normalMap});mats.wallPanel.normalScale.set(0.19,0.19);
  Object.assign(mats.plinth,{map:limestone.map,normalMap:limestone.normalMap});mats.plinth.normalScale.set(0.14,0.14);
  const floor = box(19.5, 0.28, 36, 0, -0.15, 0, mats.stone, scene, { castShadow: false });
  const reflectiveFloor=window.innerWidth>1000&&!navigator.connection?.saveData&&!matchMedia('(prefers-reduced-data: reduce)').matches;
  const floorSurface = new THREE.Mesh(new THREE.PlaneGeometry(19.5, 36),new THREE.MeshPhysicalMaterial({
    color:0xffffff,map:terrazzo.map,normalMap:terrazzo.normalMap,roughness:.34,metalness:.035,
    clearcoat:.3,clearcoatRoughness:.28,transparent:reflectiveFloor,opacity:reflectiveFloor?.88:1,depthWrite:!reflectiveFloor
  }));
  floorSurface.material.normalScale.set(0.22,0.22);
  floorSurface.rotation.x = -Math.PI / 2;
  floorSurface.position.y = 0.001;
  floorSurface.receiveShadow = true;
  scene.add(floorSurface);
  if(reflectiveFloor){
    const mirror=new Reflector(new THREE.PlaneGeometry(19.5,36),{
      textureWidth:512,textureHeight:256,clipBias:.003,multisample:0,color:0x788078
    });
    mirror.rotation.x=-Math.PI/2;mirror.position.y=.0005;
    const renderReflection=mirror.onBeforeRender;
    mirror.onBeforeRender=function(...args){
      const wasVisible=floorSurface.visible;floorSurface.visible=false;
      try{return renderReflection.apply(this,args)}finally{floorSurface.visible=wasVisible}
    };
    scene.add(mirror);
  }
  scene.userData.reflectiveFloor=reflectiveFloor;
  // Recessed stone joints create broad real tile modules rather than a technical grid.
  const grout = new THREE.LineBasicMaterial({ color: 0xBFB7A9, transparent: true, opacity: 0.22 });
  for (let x = -9.75; x <= 9.751; x += 3) line([[x, 0.004, -18], [x, 0.004, 18]], grout);
  for (let z = -18; z <= 18.001; z += 3) line([[-9.75, 0.004, z], [9.75, 0.004, z]], grout);

  // Gallery envelope: 19.5 × 36 m, 7.2 m clear height.
  box(19.5, 0.3, 36, 0, 7.2, 0, mats.ceiling, scene, { castShadow: false });
  box(0.34, 7.2, 36, -9.58, 3.6, 0, mats.wall);
  box(0.34, 7.2, 36, 9.58, 3.6, 0, mats.wall);
  box(19.5, 7.2, 0.36, 0, 3.6, -17.82, mats.wall);
  // Front wall is open between the two full-height entrance jambs.
  box(5.95, 7.2, 0.36, -6.775, 3.6, 17.82, mats.wall);
  box(5.95, 7.2, 0.36, 6.775, 3.6, 17.82, mats.wall);
  box(7.5, 1.42, 0.36, 0, 6.49, 17.82, mats.wall);

  // Stone wall panels, fine shadow gaps, and restrained bronze picture rails.
  const rail = new THREE.MeshStandardMaterial({ color: bronze, metalness: 0.55, roughness: 0.44 });
  for (const side of [-1, 1]) {
    const x = side * 9.39;
    for (const z of [-14, -9.2, -4.4, 0.4, 5.2, 10]) {
      box(0.045, 4.6, 0.025, x, 3.03, z, mats.wallReveal, scene, { castShadow: false, receiveShadow: false });
      box(0.04, 0.035, 3.6, x - side * 0.025, 5.18, z + 2.25, rail, scene, { castShadow: false, receiveShadow: false });
      box(0.04, 0.035, 3.6, x - side * 0.025, 0.92, z + 2.25, rail, scene, { castShadow: false, receiveShadow: false });
    }
  }
  for (const x of [-7.1, -3.55, 0, 3.55, 7.1]) {
    box(0.035, 4.9, 0.04, x, 3.2, -17.61, mats.wallReveal, scene, { castShadow: false, receiveShadow: false });
  }
  // Softsage reveals along the wall/ceiling junction.
  const ledMaterial = new THREE.MeshBasicMaterial({ color: sageLight, toneMapped: false });
  box(0.035, 0.06, 31, -9.31, 6.74, 0, ledMaterial, scene, { castShadow: false, receiveShadow: false });
  box(0.035, 0.06, 31, 9.31, 6.74, 0, ledMaterial, scene, { castShadow: false, receiveShadow: false });
  box(15.8, 0.06, 0.035, 0, 6.74, -17.54, ledMaterial, scene, { castShadow: false, receiveShadow: false });

  const ceilingGlow=new THREE.MeshBasicMaterial({color:0xF4E7CF,toneMapped:false});
  const sconceGlow=new THREE.MeshBasicMaterial({color:0xE6E2D6,toneMapped:true});
  for(const side of [-1,1])for(const z of [-15.65,15.65]){
    box(.065,1.12,.20,side*9.22,4.40,z,mats.bronze,scene,{castShadow:false,receiveShadow:false});
    box(.025,.83,.10,side*9.15,4.40,z,sconceGlow,scene,{castShadow:false,receiveShadow:false});
  }
  // Slatted ceiling and three continuous bronze lighting tracks use two draw calls.
  const slatGeometry = new THREE.BoxGeometry(0.075, 0.14, 34.2);
  const slatCount = 31, slats = new THREE.InstancedMesh(slatGeometry, mats.wood, slatCount);
  const slatMatrix = new THREE.Matrix4();
  for(let i=0;i<slatCount;i++){slatMatrix.makeTranslation(-8.75+i*(17.5/(slatCount-1)),6.99,-0.15);slats.setMatrixAt(i,slatMatrix)}
  slats.instanceMatrix.needsUpdate=true;slats.castShadow=false;slats.receiveShadow=false;scene.add(slats);
  // Ceiling linear fixtures, warm metal bodies with diffused light strips.
  for (const x of [-5.5, 0, 5.5]) {
    box(0.16, 0.08, 24, x, 7.015, -1.5, mats.bronze, scene, { castShadow: false, receiveShadow: false });
    box(0.055, 0.025, 22, x, 6.962, -1.5, ceilingGlow, scene, { castShadow: false, receiveShadow: false });
  }
  // The deep timber cornice gives the pale envelope a deliberate architectural edge.
  for(const side of [-1,1]) box(0.19,0.29,34.4,side*9.27,6.94,-0.1,mats.wood,scene,{castShadow:false,receiveShadow:false});
  box(18.5,0.29,0.2,0,6.94,-17.45,mats.wood,scene,{castShadow:false,receiveShadow:false});

  const hemi=new THREE.HemisphereLight(0xFFF9EF,0x77887A,0.8);scene.add(hemi);
  const key = new THREE.DirectionalLight(0xFFF7E9, 1.8);
  key.position.set(-7, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(matchMedia('(max-width:650px)').matches?512:1024, matchMedia('(max-width:650px)').matches?512:1024);
  key.shadow.camera.left = -13; key.shadow.camera.right = 13;
  key.shadow.camera.top = 11; key.shadow.camera.bottom = -11;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 42;
  key.shadow.normalBias = 0.035; key.shadow.bias = -0.00025;
  scene.add(key);

  // Entry portal and hinged double glass doors, ready for the root to open on entry.
  const doorWidth = 3.75, doorHeight = 5.8, doorZ = 17.55;
  const frameX = doorWidth;
  box(0.13, doorHeight, 0.13, -frameX, doorHeight / 2, doorZ, mats.bronzeLight);
  box(0.13, doorHeight, 0.13, frameX, doorHeight / 2, doorZ, mats.bronzeLight);
  box(doorWidth * 2 + 0.13, 0.15, 0.16, 0, doorHeight - 0.075, doorZ, mats.bronzeLight);
  box(doorWidth * 2 + 0.35, 0.055, 0.24, 0, 0.05, doorZ, mats.bronze);
  const doors = [];
  function buildDoor(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side < 0 ? -doorWidth : doorWidth, 0, doorZ);
    scene.add(pivot);
    const centerX = side < 0 ? doorWidth / 2 : -doorWidth / 2;
    const glass = box(doorWidth - 0.15, doorHeight - 0.15, 0.065, centerX, doorHeight / 2, 0, mats.glass, pivot, { castShadow: false, receiveShadow: false });
    glass.material = mats.glass;
    for (const x of [side < 0 ? 0.045 : -0.045, side < 0 ? doorWidth - 0.045 : -doorWidth + 0.045]) {
      box(0.07, doorHeight, 0.085, x, doorHeight / 2, 0, mats.bronzeLight, pivot);
    }
    box(doorWidth, 0.075, 0.09, centerX, 0.05, 0, mats.bronzeLight, pivot);
    box(doorWidth, 0.075, 0.09, centerX, doorHeight - 0.05, 0, mats.bronzeLight, pivot);
    const handleX = side < 0 ? doorWidth - 0.35 : -doorWidth + 0.35;
    box(0.045, 0.13, 0.09, handleX, 2.85, 0.075, mats.bronze, pivot);
    box(0.045, 0.13, 0.09, handleX, 3.17, 0.075, mats.bronze, pivot);
    box(0.055, 0.55, 0.055, handleX, 3.01, 0.1, mats.glassHandle, pivot);
    pivot.userData.doorSide = side < 0 ? 'left' : 'right';
    doors.push(pivot);
    return pivot;
  }
  const leftDoor = buildDoor(-1);
  const rightDoor = buildDoor(1);
  const portalSign=makeBrandSign({THREE,name:'HiARCH · HiPLAN · HiREAL',portal:true,accent:'#8ca487'});
  portalSign.group.position.set(0,6.35,17.97);scene.add(portalSign.group);brandSigns.push(portalSign);
  // Mechanical hinges and mullion lines stay slim against the glass.
  for (const x of [-3.78, 3.78]) {
    for (const y of [0.55, 2.88, 5.2]) {
      const hinge = box(0.11, 0.22, 0.12, x, y, 17.62, mats.bronze, scene, { castShadow: false });
      hinge.userData.doorHardware = true;
    }
  }

  // Signature mark and company wordmarks on the back wall.
  const logoGroup = new THREE.Group();
  logoGroup.position.set(-4.5, 4.65, -17.54);
  scene.add(logoGroup);
  const logoBars = [
    [0.1, 0, 0.03, 1.15, 0.04], [0.1, 0.56, 0.03, 0.04, 1.16],
    [0.6, 0.5, 0.03, 1.12, 0.04], [0.6, 1.02, 0.03, 0.04, 1.04],
    [1.12, 1, 0.03, 1.06, 0.04], [1.12, 1.5, 0.03, 0.04, 1.0]
  ];
  for (const [x, y, z, w, h] of logoBars) box(w, h, 0.045, x + w / 2, y + h / 2, z, mats.bronze, logoGroup, { castShadow: false, receiveShadow: false });
  for (const [companyId, name, x] of [['hiarch', 'HiARCH', -5.5], ['hiplan', 'HiPLAN', 0], ['hireal', 'HiREAL', 5.5]]) {
    const sign=makeBrandSign({THREE,name,portal:false,accent:'#8ca487'});
    sign.group.position.set(x,3.1,-17.50);
    sign.group.traverse(object=>{object.userData.companyId=companyId});
    scene.add(sign.group);pickables.push(sign.group);brandSigns.push(sign);
  }

  const positions = [
    [0, 3.5], [-5.6, -2], [5.6, -2], [-5.6, -7], [5.6, -7], [-5.6, -12], [5.6, -12], [0, -12]
  ];
  const smallerPositions = positions.slice(1);
  let smallerPositionIndex = 0;
  const tables = [];
  const benches = [];
  // Two seats sit beyond the wall map and artwork bays, clear of the central route.
  const benchLed=new THREE.MeshBasicMaterial({color:0xA9BEAA,toneMapped:true});
  const sageSeat=material(0xA8B5A4,{roughness:.92,metalness:0});
  const seatShape=new THREE.Shape(),sw=.82,sl=1.52,r=.10;
  seatShape.moveTo(-sw/2+r,-sl/2);seatShape.lineTo(sw/2-r,-sl/2);seatShape.quadraticCurveTo(sw/2,-sl/2,sw/2,-sl/2+r);
  seatShape.lineTo(sw/2,sl/2-r);seatShape.quadraticCurveTo(sw/2,sl/2,sw/2-r,sl/2);
  seatShape.lineTo(-sw/2+r,sl/2);seatShape.quadraticCurveTo(-sw/2,sl/2,-sw/2,sl/2-r);
  seatShape.lineTo(-sw/2,-sl/2+r);seatShape.quadraticCurveTo(-sw/2,-sl/2,-sw/2+r,-sl/2);
  const cushionGeometry=new THREE.ExtrudeGeometry(seatShape,{depth:.065,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:2,curveSegments:3});
  for(const side of [-1,1]){
    const id=side<0?'bench-left':'bench-right',x=side*7.35,z=14.15;
    const group=new THREE.Group();group.position.set(x,0,z);group.userData.seatId=id;scene.add(group);
    for(const sx of [-.39,.39])for(const sz of [-1.14,1.14])box(.075,.43,.075,sx,.215,sz,mats.bronze,group);
    for(const sx of [-.45,.45])box(.055,.075,2.55,sx,.455,0,mats.bronze,group);
    for(const sz of [-1.255,1.255])box(.91,.075,.055,0,.455,sz,mats.bronze,group);
    for(let i=0;i<6;i++)box(.105,.07,2.42,-.35+i*.14,.52,0,mats.wood,group,{castShadow:true,receiveShadow:true});
    const cushion=new THREE.Mesh(cushionGeometry,sageSeat);cushion.rotation.x=-Math.PI/2;cushion.position.set(0,.555,0);cushion.castShadow=true;cushion.receiveShadow=true;group.add(cushion);
    box(.79,.025,1.50,0,.556,0,mats.wood,group,{castShadow:false,receiveShadow:false});
    // The narrow diffuser reads as joinery lighting rather than a halo or glow sphere.
    for(const sx of [-.31,.31])box(.022,.018,2.14,sx,.322,0,benchLed,group,{castShadow:false,receiveShadow:false});
    group.traverse(object=>{object.userData.seatId=id});pickables.push(group);
    benches.push({id,object:group,seat:[x,1.16,z],lookAt:[0,1.9,3.5],approach:[x-side*1.25,1.6,z]});
  }
  // Six supplied artworks: four photographs at right, two verified project drawings at left.
  // The left bays start south of the wall map, whose board occupies z = 3.25…10.75.
  const artEntries=artworks.slice(0,6);
  const leftIds=['floor-5np','axonometry'];
  const leftEntries=leftIds.map(id=>artEntries.find(art=>art.id===id)).filter(Boolean);
  const rightEntries=artEntries.filter(art=>!leftIds.includes(art.id));
  const artGlowMaterials=[],artPrints=[];
  const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=256;
  const haloContext=haloCanvas.getContext('2d'),halo=haloContext.createRadialGradient(128,58,14,128,100,188);
  halo.addColorStop(0,'rgba(255,255,255,.62)');halo.addColorStop(.52,'rgba(255,255,255,.22)');halo.addColorStop(1,'rgba(255,255,255,0)');
  haloContext.fillStyle=halo;haloContext.fillRect(0,0,256,256);
  const haloTexture=new THREE.CanvasTexture(haloCanvas);
  function hangArtwork(art,side,z,frameDepth=4.7){
    if(!art?.texture)return;
    const id=art.id||`artwork-${side}-${z}`;
    const haloMaterial=new THREE.MeshBasicMaterial({map:haloTexture,color:0xF0DBBB,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
    const haloPlane=new THREE.Mesh(new THREE.PlaneGeometry(frameDepth+1.25,5.05),haloMaterial);
    haloPlane.rotation.y=-side*Math.PI/2;haloPlane.position.set(side*9.36,3.46,z);scene.add(haloPlane);artGlowMaterials.push(haloMaterial);
    box(.075,3.34,frameDepth,side*9.27,3.38,z,mats.wood,scene,{castShadow:false,receiveShadow:false});
    box(.09,3.18,frameDepth-.16,side*9.205,3.38,z,mats.bronze,scene,{castShadow:false,receiveShadow:false});
    box(.055,3.03,frameDepth-.32,side*9.135,3.38,z,mats.stoneLight,scene,{castShadow:false,receiveShadow:false});
    const maxWidth=frameDepth-.58,maxHeight=2.52;
    const image=art.texture.image,ratio=image?.width&&image?.height?image.width/image.height:1.55;
    const width=Math.min(maxWidth,maxHeight*ratio),height=Math.min(maxHeight,maxWidth/ratio);
    const photo=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:art.texture,side:THREE.DoubleSide,toneMapped:true}));
    artPrints.push(photo.material);photo.rotation.y=-side*Math.PI/2;photo.position.set(side*9.08,3.46,z);photo.userData.artworkId=id;photo.renderOrder=3;scene.add(photo);pickables.push(photo);
    const titleTexture=labelTexture([String(art.title||''),String(art.subtitle||'')],{width:768,height:128,color:'#554D42',fontFamily:'Space Grotesk, Manrope, sans-serif'});
    if(titleTexture&&'colorSpace'in titleTexture)titleTexture.colorSpace=THREE.SRGBColorSpace;
    const caption=new THREE.Mesh(new THREE.PlaneGeometry(frameDepth-.36,.30),new THREE.MeshBasicMaterial({map:titleTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    caption.rotation.y=-side*Math.PI/2;caption.position.set(side*9.075,1.53,z);caption.userData.artworkId=id;caption.renderOrder=3;scene.add(caption);pickables.push(caption);
    box(.14,.075,frameDepth-.24,side*9.03,5.18,z,mats.bronze,scene,{castShadow:false,receiveShadow:false});
    box(.025,.022,frameDepth-.5,side*8.95,5.14,z,new THREE.MeshBasicMaterial({color:0xD8D6CA,toneMapped:true}),scene,{castShadow:false,receiveShadow:false});
  }
  const rightCenters=rightEntries.length>4?[12.8,7.7,2.6,-2.5,-7.6,-12.7]:[10,4,-3,-10];
  rightEntries.forEach((art,index)=>hangArtwork(art,1,rightCenters[index],rightEntries.length>4?4.05:4.7));
  leftEntries.forEach((art,index)=>hangArtwork(art,-1,[-3,-10][index]));
  const warmRimColors = [0xA68E5D, 0x86927D, 0x9D8966, 0x83917D, 0xA08D69, 0x85907D, 0xA48F67, 0x87947F];
  const hotspotDefinitions = [
    ['facade', 0x8E9B7E], ['conversion', 0xB89657], ['hiarch', 0x9CA98D]
  ];
  function setProjectIdTree(root, id) {
    root.traverse((object) => {
      if (!object.userData.companyId) object.userData.projectId = id;
    });
  }
  function labelMaterial(project, planeWidth, planeHeight) {
    const lines = [String(project.name || project.id || 'Projekt'), String(project.city || '')];
    const textureWidth = 1200;
    const textureHeight = Math.max(160, Math.round(textureWidth * planeHeight / planeWidth));
    const texture = labelTexture(lines, { width: textureWidth, height: textureHeight, color: '#393931', fontFamily: 'Space Grotesk, Manrope, sans-serif' });
    if (texture && 'colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    if (texture && renderer?.capabilities?.getMaxAnisotropy) texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  }

  for (let index = 0; index < projects.length; index++) {
    const project = projects[index];
    const featured = project.id === 'koupelni';
    const [x, z] = featured ? positions[0] : (smallerPositions[smallerPositionIndex++] || [0, -15 + ((index - 7) * 2.6)]);
    const width = featured ? 3.8 : 2.6;
    const depth = featured ? 2.7 : 1.8;
    const height = 0.8;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.projectId = project.id;
    scene.add(group);

    // A recessed bronze toe and shadow gap make the limestone exhibition slab float.
    box(width - 0.35, 0.08, depth - 0.35, 0, 0.04, 0, mats.bronze, group, { castShadow: false });
    box(width - 0.30, 0.58, depth - 0.30, 0, 0.38, 0, mats.plinth, group);
    box(width - 0.31, 0.075, depth - 0.31, 0, 0.71, 0, mats.darkGap, group, { castShadow: false });
    box(width, 0.15, depth, 0, 0.875, 0, mats.stoneLight, group);
    const rimMaterial = new THREE.LineBasicMaterial({ color: warmRimColors[index % warmRimColors.length], transparent: true, opacity: 0.34, depthTest: true });
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.012, 0.018, depth + 0.012)), rimMaterial);
    rim.position.set(0, 0.95, 0);
    group.add(rim);
    rim.userData.projectId = project.id;

    const model = makeProjectModel(project.id, THREE);
    model.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const fit = featured
      ? Math.min(3.15 / Math.max(size.x, 0.01), 2.0 / Math.max(size.z, 0.01), 2.5 / Math.max(size.y, 0.01))
      : Math.min(2.12 / Math.max(size.x, 0.01), 1.3 / Math.max(size.z, 0.01), 1.65 / Math.max(size.y, 0.01));
    model.scale.setScalar(fit);
    model.position.set(-center.x * fit, 1.035 - bounds.min.y * fit, -center.z * fit);
    group.add(model);
    setProjectIdTree(model, project.id);

    const plaqueDepth = depth / 2 + 0.035;
    const plaqueWidth = featured ? width * 0.58 : width * 0.72;
    const plaqueX = featured ? width * 0.16 : 0;
    const plaqueBacking = box(plaqueWidth, 0.48, 0.055, plaqueX, 0.57, plaqueDepth, mats.plaque, group, { castShadow: false });
    plaqueBacking.userData.projectId = project.id;
    const labelWidth = plaqueWidth * 0.92;
    const labelHeight = 0.34;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(labelWidth, labelHeight), labelMaterial(project, labelWidth, labelHeight));
    plaque.position.set(plaqueX, 0.57, plaqueDepth + 0.031);
    plaque.renderOrder = 3;
    group.add(plaque);
    plaque.userData.projectId = project.id;

    // HiARCH badge is a separate company target, intentionally without projectId.
    if (index === 0 && project.id === 'koupelni') {
      const badgeX = -width * 0.35;
      const badge = box(0.58, 0.22, 0.045, badgeX, 0.59, (depth - 0.28) / 2 + 0.035, mats.bronzeLight, group, { castShadow: false });
      badge.userData.companyId = 'hiarch';
      const badgeTexture = labelTexture(['HiARCH'], { width: 512, height: 128, color: '#F5F0E6', fontFamily: 'Space Grotesk, Manrope, sans-serif' });
      if (badgeTexture && 'colorSpace' in badgeTexture && THREE.SRGBColorSpace) badgeTexture.colorSpace = THREE.SRGBColorSpace;
      const badgeLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({
        map: badgeTexture,
        transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
      }));
      badgeLabel.position.set(badgeX, 0.59, (depth - 0.28) / 2 + 0.062);
      badgeLabel.userData.companyId = 'hiarch';
      group.add(badgeLabel);
      pickables.push(badge, badgeLabel);
    }

    const hotspots = [];
    if (featured) {
      const modelHeight = size.y * fit;
      const modelDepth = size.z * fit;
      hotspotDefinitions.forEach(([key, color], hotspotIndex) => {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.2, roughness: 0.42, metalness: 0.04
        }));
        const xOffset = [-0.62, 0.05, 0.68][hotspotIndex];
        sphere.position.set(xOffset, 1.13 + modelHeight * (hotspotIndex === 1 ? 0.86 : 0.72), Math.max(0.2, modelDepth * 0.39));
        sphere.visible=false;
        sphere.userData.annotationId = key;
        sphere.userData.projectId = project.id;
        group.add(sphere);
        hotspots.push({ key, object: sphere });
      });
    }

    group.traverse((object) => {
      if (object !== group && !object.userData.companyId) object.userData.projectId = project.id;
    });
    group.userData.projectId = project.id;
    pickables.push(group);
    tables.push({ x, z, group, rim, model, featured, hotspots });
  }

  // Unique selected spotlight; root updates its position/target and renders on demand.
  const selectedLight = new THREE.SpotLight(0xFFE4BE, 34, 15, 0.48, 0.72, 1.45);
  selectedLight.position.set(0, 6.5, 7.5);
  selectedLight.castShadow = true;
  const shadowSize=matchMedia('(max-width:650px)').matches?512:1024;selectedLight.shadow.mapSize.set(shadowSize,shadowSize);selectedLight.shadow.radius=3;
  selectedLight.shadow.camera.near = 0.4;
  selectedLight.shadow.camera.far = 22;
  selectedLight.shadow.normalBias = 0.018;
  selectedLight.shadow.bias = -0.00035;
  selectedLight.target.position.set(0, 1.2, 3.5);
  scene.add(selectedLight, selectedLight.target);
  const selectedRimLight=new THREE.SpotLight(0x68E3BE,0,14,.58,.86,1.5);
  selectedRimLight.position.set(2.9,4.9,1);selectedRimLight.target.position.set(0,2,3.5);selectedRimLight.castShadow=false;
  scene.add(selectedRimLight,selectedRimLight.target);


  // Bright, room-shaped reflection environment; finishes remain legible from behind.
  const envFaces=[];
  for(let i=0;i<6;i++){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
    ctx.fillStyle=i===3?'#737b74':'#7d8780';ctx.fillRect(0,0,128,128);
    ctx.fillStyle='#dfdfd5';ctx.fillRect(i%2?18:82,25,18,54);
    ctx.fillStyle='#657169';ctx.fillRect(0,111,128,6);envFaces.push(c);
  }
  const env=new THREE.CubeTexture(envFaces);env.colorSpace=THREE.SRGBColorSpace;env.needsUpdate=true;
  let pmrem;
  try {
    pmrem=new THREE.PMREMGenerator(renderer);
    const environmentTarget=pmrem.fromCubemap(env);
    scene.environment=environmentTarget.texture;
    scene.userData.environmentRenderTarget=environmentTarget;
    env.dispose();
  } catch(error) {
    scene.environment=env;
    console.warn('Gallery PMREM unavailable; original cubemap retained.',error);
  } finally { pmrem?.dispose(); }
  for(const table of tables)for(const h of table.hotspots||[])h.object.raycast=()=>{};

  // Broad front key and rear fill generate soft metal/glass reflections without extra shadow maps.
  const frontFill=new THREE.RectAreaLight(0xF8F1E5,7,3,4);
  frontFill.position.set(-3.45,4.7,6.7);frontFill.lookAt(0,1.7,3.5);scene.add(frontFill);
  const rearFill=new THREE.RectAreaLight(0xE6F0EB,3.5,3,3);
  rearFill.position.set(3.25,4.25,.4);rearFill.lookAt(0,1.7,3.5);scene.add(rearFill);
  const tableWashes=[];
  for(const [x,z] of [[-5.6,-7],[5.6,-7],[0,-12]]){
    const wash=new THREE.SpotLight(0xFFF1DC,0,13,.79,.9,1.45);
    wash.position.set(x,6.45,z);wash.target.position.set(x,1.18,z);wash.castShadow=false;
    scene.add(wash,wash.target);tableWashes.push(wash);
  }
  const plinthSpill=new THREE.PointLight(0x21CF9D,0,5.6,2);plinthSpill.position.set(0,.62,3.5);scene.add(plinthSpill);
  const coveSpill=new THREE.PointLight(0x21CF9D,0,10,2);coveSpill.position.set(0,6.35,2.2);scene.add(coveSpill);
  const accentMaterial=new THREE.MeshBasicMaterial({color:0xB8D4B9,toneMapped:false});
  const contacts=[],lightPools=[];
  const poolCanvas=document.createElement('canvas');poolCanvas.width=poolCanvas.height=128;
  const pc=poolCanvas.getContext('2d'),poolGradient=pc.createRadialGradient(64,64,8,64,64,63);
  poolGradient.addColorStop(0,'rgba(255,255,255,.32)');poolGradient.addColorStop(.42,'rgba(255,255,255,.13)');poolGradient.addColorStop(1,'rgba(255,255,255,0)');pc.fillStyle=poolGradient;pc.fillRect(0,0,128,128);
  const poolTexture=new THREE.CanvasTexture(poolCanvas);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const gc=glowCanvas.getContext('2d'),gr=gc.createRadialGradient(64,64,2,64,64,63);
  gr.addColorStop(0,'rgba(43,56,49,.58)');gr.addColorStop(.42,'rgba(43,56,49,.25)');gr.addColorStop(1,'rgba(43,56,49,0)');
  gc.fillStyle=gr;gc.fillRect(0,0,128,128);const contactTexture=new THREE.CanvasTexture(glowCanvas);
  for(const table of tables){
    const w=table.featured?3.8:2.6,d=table.featured?2.7:1.8;
    for(const side of [-1,1]){
      box(w-.10,.015,.025,0,.765,side*(d/2-.07),accentMaterial,table.group,{castShadow:false,receiveShadow:false});
      box(.025,.015,d-.12,side*(w/2-.07),.765,0,accentMaterial,table.group,{castShadow:false,receiveShadow:false});
    }
    const poolMat=new THREE.MeshBasicMaterial({map:poolTexture,color:0x59DDA5,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(w*1.9,d*2.1),poolMat);pool.rotation.x=-Math.PI/2;pool.position.set(table.x,.012,table.z);pool.raycast=()=>{};scene.add(pool);lightPools.push(poolMat);
    const contactMat=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity:.30,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const contact=new THREE.Mesh(new THREE.PlaneGeometry(w*1.55,d*1.55),contactMat);
    contact.rotation.x=-Math.PI/2;contact.position.set(table.x,.008,table.z);scene.add(contact);contacts.push(contactMat);
    box(.26,.13,.26,table.x,6.78,table.z,mats.bronze,scene,{castShadow:false,receiveShadow:false});
    box(.20,.018,.20,table.x,6.70,table.z,ceilingGlow,scene,{castShadow:false,receiveShadow:false});
  }
  const modes={
    day:{wall:0xA0AAA0,panel:0x97A398,floor:0xB0B2A6,ceiling:0xAEBBB0,bg:0x98A99D,h:.8,k:1.45,s:18,front:7,rear:3.5,wash:6,contact:.30},
    evening:{wall:0x101712,panel:0x141D16,floor:0x18201A,ceiling:0x040705,bg:0x020503,h:.012,k:.025,s:26,front:.8,rear:.30,wash:9,contact:.48},
    neon:{wall:0x09110D,panel:0x101A13,floor:0x101B14,ceiling:0x030604,bg:0x010302,h:.008,k:.015,s:23,front:.45,rear:.28,wash:7,contact:.48}
  };
  const baseEnvironment=new Map();
  function setLighting({preset='evening',color='#a9dcc6',intensity=1}={}){
    const m=modes[preset]||modes.evening,c=new THREE.Color(color),amount=Math.max(0,Math.min(1.5,Number(intensity)||0));
    const vivid=c.clone(),hsl={};vivid.getHSL(hsl);vivid.setHSL(hsl.h,Math.max(.78,hsl.s),.48);
    mats.wall.color.set(m.wall);mats.wallPanel.color.set(m.panel);mats.wallReveal.color.set(m.panel).multiplyScalar(.83);
    mats.ceiling.color.set(m.ceiling);floorSurface.material.color.set(m.floor);mats.plinth.color.set(preset==='day'?0xD5D8CF:0x46564C);
    mats.wall.envMapIntensity=preset==='day'?.42:.12;mats.wallPanel.envMapIntensity=preset==='day'?.42:.12;
    mats.ceiling.envMapIntensity=preset==='day'?.35:.08;floorSurface.material.envMapIntensity=preset==='day'?.55:.15;
    scene.background.set(m.bg);scene.fog.color.set(m.bg);
    // The room must not remain illuminated by the bright environment map at night.
    scene.traverse(object=>{for(const mat of Array.isArray(object.material)?object.material:[object.material]){if(!mat?.isMeshStandardMaterial)continue;if(!baseEnvironment.has(mat))baseEnvironment.set(mat,mat.envMapIntensity);mat.envMapIntensity=baseEnvironment.get(mat)*(preset==='day'?1:.045)}});
    mats.wall.envMapIntensity=preset==='day'?.42:.012;mats.wallPanel.envMapIntensity=preset==='day'?.42:.012;
    mats.ceiling.envMapIntensity=preset==='day'?.35:.005;floorSurface.material.envMapIntensity=preset==='day'?.55:.025;
    mats.plaque.emissive.setHex(0xC3B590);mats.plaque.emissiveIntensity=preset==='day'?0:.10;
    artPrints.forEach(mat=>mat.color.setScalar(preset==='day'?1:preset==='neon'?.65:.72));
    key.castShadow=preset==='day';hemi.intensity=m.h;key.intensity=m.k;selectedLight.intensity=m.s;
    selectedRimLight.color.copy(preset==='neon'?vivid:new THREE.Color(0xF3C68E));selectedRimLight.intensity=preset==='day'?0:preset==='neon'?9*amount:2.5;
    lightPools.forEach(mat=>{mat.color.copy(preset==='neon'?vivid:new THREE.Color(0xE4C48D));mat.opacity=preset==='day'?0:preset==='neon'?.65*amount:.10});
    selectedLight.color.set(preset==='neon'?0xE9F4FF:0xFFF0D8);
    frontFill.intensity=m.front;rearFill.intensity=m.rear;
    frontFill.color.set(preset==='neon'?0xE9F7F4:0xF8F1E5);
    rearFill.color.set(preset==='neon'?0xC9E8DD:0xE6F0EB);
    tableWashes.forEach((wash,index)=>{wash.intensity=m.wash*(index===2?.7:1);wash.color.set(preset==='neon'?0xE6F2ED:0xFFF1DC)});
    plinthSpill.color.copy(vivid);coveSpill.color.copy(vivid);
    plinthSpill.intensity=preset==='day'?0:preset==='neon'?14*amount:1.5;
    coveSpill.intensity=preset==='neon'?2.8*amount:0;
    ledMaterial.color.copy(preset==='neon'?vivid:c).lerp(new THREE.Color(0xE7F2E3),preset==='neon'?.04:.45).multiplyScalar(preset==='day'?.32+amount*.28:preset==='neon'?.65+amount*.95:.55+amount*.45);
    accentMaterial.color.copy(preset==='neon'?vivid:c).lerp(new THREE.Color(0xCEDFCE),preset==='neon'?.02:.24).multiplyScalar(preset==='day'?.25+amount*.30:preset==='neon'?.6+amount*.9:.5+amount*.35);
    ceilingGlow.color.copy(preset==='neon'?vivid:new THREE.Color(0xF1E9D9)).multiplyScalar(preset==='day'?.35+amount*.25:preset==='neon'?.20+amount*.45:.24+amount*.19);
    sconceGlow.color.set(preset==='neon'?0xB5D9D0:0xECE7D9).multiplyScalar(preset==='day'?.55:preset==='neon'?.28+amount*.40:.24+amount*.20);
    benchLed.color.copy(preset==='neon'?vivid:c).lerp(new THREE.Color(0xDCE8D9),preset==='neon'?.12:.55).multiplyScalar(preset==='neon'?.36+amount*.34:.45+amount*.15);
    artGlowMaterials.forEach(mat=>{mat.opacity=preset==='day'?.035:preset==='neon'?.65*amount:.16;mat.color.copy(preset==='neon'?vivid:new THREE.Color(0xF0DBBB))});
    mats.glass.opacity=preset==='day'?.2:.12;
    grout.color.set(preset==='day'?0xBFB7A9:0x6C8170);grout.opacity=preset==='day'?.22:preset==='neon'?.065:.035;
    contacts.forEach(mat=>{mat.opacity=m.contact});
    brandSigns.forEach(sign=>sign.setLighting({preset,color,intensity:amount}));
    if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;
  }
  setLighting();

  // Repeated, immobile envelope pieces share one unit box and one draw call per material/shadow state.
  // Groups for doors, tables and seats, plus all pickable art, stay as individual objects.
  const unitBox=new THREE.BoxGeometry(1,1,1),batches=new Map();
  scene.updateMatrixWorld(true);
  for(const object of [...scene.children]){
    if(!object.isMesh||object.isInstancedMesh||object.geometry?.type!=='BoxGeometry'||
       Object.keys(object.userData).length||object.renderOrder!==0||Array.isArray(object.material))continue;
    const p=object.geometry.parameters;if(!p||!Number.isFinite(p.width)||!Number.isFinite(p.height)||!Number.isFinite(p.depth))continue;
    const key=[object.material.uuid,Number(object.castShadow),Number(object.receiveShadow)].join(':');
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);
  }
  let staticBatchCount=0,staticPartsMerged=0;
  for(const members of batches.values()){
    if(members.length<3)continue;
    const first=members[0],batch=new THREE.InstancedMesh(unitBox,first.material,members.length);
    batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.frustumCulled=false;
    members.forEach((mesh,index)=>{
      const p=mesh.geometry.parameters;
      const matrix=mesh.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(p.width,p.height,p.depth));
      batch.setMatrixAt(index,matrix);
      scene.remove(mesh);mesh.geometry.dispose();
    });
    batch.instanceMatrix.needsUpdate=true;scene.add(batch);staticBatchCount++;staticPartsMerged+=members.length;
  }
  if(!staticBatchCount)unitBox.dispose();
  scene.userData.staticArchitecture={batches:staticBatchCount,parts:staticPartsMerged};

  return { scene, tables, benches, pickables, doors, selectedLight, selectedRimLight, setLighting };
}
