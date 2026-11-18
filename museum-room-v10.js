import {placeExhibitModel} from './museum-placement-v19.js?v=23.0';
import {createPlinthContact} from './museum-plinth-contact-v22.js';
import {loadGallerySurfaces} from './museum-surfaces-v20.js';
import {hangGalleryPictures} from './museum-pictures-v20.js?v=24.0';
import {instanceGalleryFittings} from './museum-performance-v20.js';
import { mergeGeometries } from './assets/vendor/BufferGeometryUtils.js';
import { addFixedExhibitLights } from './museum-fixed-lights-v16.js?v=24.0';
import { RectAreaLightUniformsLib } from './assets/vendor/RectAreaLightUniformsLib.js';
import { makeBrandSign, getMarbleFinish } from './museum-brand-v12.js?v=21.0';
import { addExhibitUplighting } from './museum-exhibit-lighting-v16.js?v=21.0';
import { addGalleryFinishes } from './museum-room-finishes-v18.js?v=24.0';
let rectAreaInitialised = false;

export function buildGalleryRoom({ THREE, renderer, projects, makeProjectModel, labelTexture, artworks = [], requestRender }) {
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
    wall: material(0xF0EEE8), wallPanel: material(0xE7E4DC),
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
  const {limestone,terrazzo,wood}=loadGallerySurfaces(THREE,renderer,requestRender);
  mats.wood.map=wood;
  Object.assign(mats.wall,{map:limestone.map,normalMap:limestone.normalMap});mats.wall.normalScale.set(0.22,0.22);
  Object.assign(mats.wallPanel,{map:limestone.map,normalMap:limestone.normalMap});mats.wallPanel.normalScale.set(0.19,0.19);
  Object.assign(mats.plinth,{map:limestone.map,normalMap:limestone.normalMap});mats.plinth.normalScale.set(0.14,0.14);
  const floor = box(19.5, 0.28, 36, 0, -0.15, 0, mats.stone, scene, { castShadow: false });
  // Honed terrazzo takes highlights from the existing fixtures and room probe.
  // One opaque surface keeps the depth buffer intact and needs no second camera.
  const floorSurface=new THREE.Mesh(new THREE.PlaneGeometry(19.5,36),new THREE.MeshStandardMaterial({
    color:0xffffff,map:terrazzo.map,normalMap:terrazzo.normalMap,roughness:.42,metalness:.055
  }));
  floorSurface.material.normalScale.set(.17,.17);
  floorSurface.rotation.x=-Math.PI/2;
  floorSurface.position.y=.001;
  floorSurface.receiveShadow=true;
  scene.add(floorSurface);
  // Thin brass inlays frame the central aisle in the same floor plane.
  const inlayParts=[];
  for(const [halfWidth,halfDepth] of [[8.72,16.52],[3.30,15.88]]){
    for(const side of [-1,1]){
      inlayParts.push(new THREE.BoxGeometry(.024,.006,halfDepth*2).translate(side*halfWidth,.005,0));
      inlayParts.push(new THREE.BoxGeometry(halfWidth*2,.006,.024).translate(0,.005,side*halfDepth));
    }
  }
  const inlayGeometry=mergeGeometries(inlayParts,false);
  inlayParts.forEach(part=>part.dispose());
  const inlayMaterial=material(0xA58C62,{roughness:.48,metalness:.48});
  const inlays=new THREE.Mesh(inlayGeometry,inlayMaterial);
  inlays.name='Inlaid brass floor borders';inlays.raycast=()=>{};scene.add(inlays);
  const grout=new THREE.LineBasicMaterial({color:0xbfb7a9,transparent:true,opacity:.15});
  const joints=[];
  for(let x=-9.75;x<=9.751;x+=3) joints.push(x,.004,-18,x,.004,18);
  for(let z=-18;z<=18.001;z+=3) joints.push(-9.75,.004,z,9.75,.004,z);
  const jointGeometry=new THREE.BufferGeometry();
  jointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(joints,3));
  scene.add(new THREE.LineSegments(jointGeometry,grout));

  // Gallery envelope: 19.5 × 36 m, 7.2 m clear height.
  box(19.5, 0.3, 36, 0, 7.2, 0, mats.ceiling, scene, { castShadow: false });
  // Solid textured west wall; the east elevation retains the real salon opening.
  const westWall=box(.34,7.2,36,-9.58,3.6,0,mats.wall);westWall.name='Restored solid west wall';
  box(.34,7.2,1.8,9.58,3.6,-17.10,mats.wall);
  box(.34,7.2,31.4,9.58,3.6,2.30,mats.wall);
  box(.34,2.7,2.8,9.58,5.85,-14.8,mats.wall);
  box(19.5, 7.2, 0.36, 0, 3.6, -17.82, mats.wall);
  // Front wall is open between the two full-height entrance jambs.
  box(5.95, 7.2, 0.36, -6.775, 3.6, 17.82, mats.wall);
  box(5.95, 7.2, 0.36, 6.775, 3.6, 17.82, mats.wall);
  box(7.5, 1.42, 0.36, 0, 6.49, 17.82, mats.wall);

  // Softsage reveals along the wall/ceiling junction.
  const ledMaterial = new THREE.MeshBasicMaterial({ color: sageLight, toneMapped: false });
  box(0.035, 0.06, 31, -9.31, 6.74, 0, ledMaterial, scene, { castShadow: false, receiveShadow: false });
  box(0.035, 0.06, 31, 9.31, 6.74, 0, ledMaterial, scene, { castShadow: false, receiveShadow: false });
  box(15.8, 0.06, 0.035, 0, 6.74, -17.54, ledMaterial, scene, { castShadow: false, receiveShadow: false });

  const ceilingGlow=new THREE.MeshBasicMaterial({color:0xF4E7CF,toneMapped:false});
  const sconceGlow=new THREE.MeshBasicMaterial({color:0xE6E2D6,toneMapped:true});
  for(const side of [-1,1])for(const z of [16.45]){
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
  key.shadow.camera.left = -15; key.shadow.camera.right = 15;
  key.shadow.camera.top = 23; key.shadow.camera.bottom = -23;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 70;
  key.shadow.normalBias = 0.035; key.shadow.bias = -0.00025;
  scene.add(key);

  // The entrance is architecture: deep stone returns, a recessed bronze door and
  // three detached marble shields. Repeated flutes join the static batches below.
  const marble=getMarbleFinish(THREE);
  mats.stoneLight.map=marble.map;mats.stoneLight.roughness=.38;
  mats.plaque.color.setHex(0x21392C);mats.plaque.roughness=.55;
  const portalStone=material(0xE6E3D9,{map:marble.map,roughness:.37,metalness:.025,emissiveMap:marble.map,emissive:0xD0C5AC,emissiveIntensity:.035});
  const facadeStone=material(0xA5B0A3,{map:limestone.map,roughness:.74,emissive:0x768471,emissiveIntensity:.018});
  const portalEdge=material(0x34443A,{roughness:.56,metalness:.12});
  const portalLED=new THREE.MeshBasicMaterial({color:0xF0D2A1,toneMapped:false});
  for(const side of [-1,1]){
    box(5.08,7.22,.28,side*7.13,3.58,18.07,facadeStone,scene,{castShadow:false});
    box(.67,7.3,.95,side*4.16,3.58,18.15,portalEdge,scene,{castShadow:false});
    box(.51,7.23,.84,side*4.16,3.58,18.25,portalStone,scene,{castShadow:false});
    box(.035,5.65,.055,side*3.86,2.88,18.38,portalLED,scene,{castShadow:false,receiveShadow:false});
    box(.045,7.1,.085,side*4.47,3.57,18.24,mats.bronze,scene,{castShadow:false});
    for(let i=0;i<17;i++)box(.035,6.68,.115,side*(4.96+i*.26),3.60,18.275,facadeStone,scene,{castShadow:false});
    // Recessed foot lights reveal the mass of the stone without a shadow map each.
    box(.29,.08,.24,side*4.16,.15,18.77,portalEdge,scene,{castShadow:false});
    box(.21,.018,.16,side*4.16,.20,18.77,portalLED,scene,{castShadow:false,receiveShadow:false});
  }
  box(8.88,1.40,.94,0,6.50,18.15,portalEdge,scene,{castShadow:false});
  box(8.79,1.28,.77,0,6.51,18.24,portalStone,scene,{castShadow:false});
  box(7.61,.045,.58,0,5.81,17.98,mats.bronze,scene,{castShadow:false});
  box(7.55,.018,.055,0,5.772,18.15,portalLED,scene,{castShadow:false,receiveShadow:false});
  const threshold=material(0xAFB3A4,{map:terrazzo.map,roughness:.59,metalness:.035});
  const forecourt=material(0x4D594F,{map:terrazzo.map,roughness:.88,envMapIntensity:.1});
  box(30,.12,24,0,-.36,29.96,forecourt,scene,{castShadow:false});
  box(10.20,.18,4.10,0,-.16,20.02,threshold,scene,{castShadow:false});
  box(10.27,.045,4.16,0,-.24,20.02,portalEdge,scene,{castShadow:false});
  for(const side of [-1,1])box(.018,.012,3.85,side*4.92,-.061,20.02,mats.bronze,scene,{castShadow:false});
  // One soft, unshadowed architectural light serves the whole facade.
  const entranceFill=new THREE.RectAreaLight(0xFFF0D8,5.2,8.8,4.4);
  entranceFill.position.set(1.6,6.6,23.2);entranceFill.lookAt(0,3.2,18.3);scene.add(entranceFill);
  scene.userData.entranceDesign='illuminated-marble-triptych-v21';

  // Recessed sliding double glass doors, opened by the cinematic entrance.
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
    // Each door moves as one object; its repeated metal pieces share a draw.
    const doorParts=new Map();
    for(const mesh of [...pivot.children]){
      if(mesh.material.transparent)continue;
      mesh.updateMatrix();
      const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);
      if(!doorParts.has(mesh.material))doorParts.set(mesh.material,[]);
      doorParts.get(mesh.material).push(geometry);
      pivot.remove(mesh);mesh.geometry.dispose();
    }
    for(const [finish,geometries] of doorParts){
      const mesh=new THREE.Mesh(mergeGeometries(geometries,false),finish);
      geometries.forEach(geometry=>geometry.dispose());
      mesh.castShadow=true;mesh.receiveShadow=true;pivot.add(mesh);
    }
    doors.push(pivot);
    return pivot;
  }
  const leftDoor = buildDoor(-1);
  const rightDoor = buildDoor(1);
  const portalSign=makeBrandSign({THREE,name:'HiARCH · HiPLAN · HiREAL',portal:true,accent:'#8ca487'});
  portalSign.group.position.set(0,6.49,18.77);scene.add(portalSign.group);brandSigns.push(portalSign);
  // Mechanical hinges and mullion lines stay slim against the glass.
  for (const x of [-3.78, 3.78]) {
    for (const y of [0.55, 2.88, 5.2]) {
      const hinge = box(0.11, 0.22, 0.12, x, y, 17.62, mats.bronze, scene, { castShadow: false });
      hinge.userData.doorHardware = true;
    }
  }

  // All three company plaques share the rear wall and their existing hit targets.
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
    benches.push({id,object:group,seat:[x,1.16,z],lookAt:[0,1.9,3.5],approach:[x-side*1.25,1.6,z],halfWidth:.62,halfDepth:1.40});
  }
  const pictures=hangGalleryPictures({THREE,scene,box,mats,artworks,labelTexture});
  pickables.push(...pictures.pickables);
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
    const texture = labelTexture(lines, { width: textureWidth, height: textureHeight, color: '#EFE7D4', fontFamily: 'Space Grotesk, Manrope, sans-serif' });
    if (texture && 'colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    if (texture && renderer?.capabilities?.getMaxAnisotropy) texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  }

  // A shared, bevelled stone cap catches the grazing gallery light on its edge.
  const capShape=new THREE.Shape(),capW=3.8,capD=2.7,capR=.045;
  capShape.moveTo(-capW/2+capR,-capD/2);capShape.lineTo(capW/2-capR,-capD/2);capShape.quadraticCurveTo(capW/2,-capD/2,capW/2,-capD/2+capR);capShape.lineTo(capW/2,capD/2-capR);capShape.quadraticCurveTo(capW/2,capD/2,capW/2-capR,capD/2);capShape.lineTo(-capW/2+capR,capD/2);capShape.quadraticCurveTo(-capW/2,capD/2,-capW/2,capD/2-capR);capShape.lineTo(-capW/2,-capD/2+capR);capShape.quadraticCurveTo(-capW/2,-capD/2,-capW/2+capR,-capD/2);
  const capGeometry=new THREE.ExtrudeGeometry(capShape,{depth:.145,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:4});
  const capUv=capGeometry.getAttribute('uv');for(let i=0;i<capUv.count;i++)capUv.setXY(i,(capUv.getX(i)+capW/2)/capW,(capUv.getY(i)+capD/2)/capD);capGeometry.rotateX(-Math.PI/2);

  const capBaseY=.805;
  capGeometry.computeBoundingBox();
  const capTopY=capBaseY+capGeometry.boundingBox.max.y;
  const contact=createPlinthContact(THREE,mats.stoneLight,capGeometry,projects,capW,capD,requestRender);
  const badgeTexture=labelTexture(['HiARCH'],{width:256,height:64,color:'#F5F0E6'});
  badgeTexture.colorSpace=THREE.SRGBColorSpace;
  const badgeMaterial=new THREE.MeshBasicMaterial({map:badgeTexture,transparent:true,depthWrite:false,toneMapped:false});
  for (let index = 0; index < projects.length; index++) {
    const project = projects[index];
    const featured = project.id === 'koupelni';
    const [x, z] = featured ? positions[0] : (smallerPositions[smallerPositionIndex++] || [0, -15 + ((index - 7) * 2.6)]);
    const width = 3.8;
    const depth = 2.7;
    const height = 0.8;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.projectId = project.id;
    scene.add(group);

    // A recessed bronze toe and shadow gap make the limestone exhibition slab float.
    box(width - 0.45, 0.09, depth - 0.45, 0, 0.045, 0, mats.bronze, group, { castShadow: false });
    box(width - 0.38, 0.58, depth - 0.38, 0, 0.38, 0, mats.plinth, group);
    for(const side of [-1,1])box(.018,.49,.018,side*(width/2-.225),.39,depth/2-.185,mats.bronze,group,{castShadow:false});
    box(width - 0.31, 0.075, depth - 0.31, 0, 0.71, 0, mats.darkGap, group, { castShadow: false });
    const cap=new THREE.Mesh(capGeometry,contact.material);cap.position.y=capBaseY;cap.castShadow=true;cap.receiveShadow=true;group.add(cap);
    const rimMaterial = new THREE.LineBasicMaterial({ color: warmRimColors[index % warmRimColors.length], transparent: true, opacity: 0.34, depthTest: true });
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.012, 0.018, depth + 0.012)), rimMaterial);
    rim.position.set(0, 0.95, 0);
    group.add(rim);
    rim.userData.projectId = project.id;

    const model = makeProjectModel(project.id, THREE);
    const placement=placeExhibitModel(model,project.id,THREE,capTopY),{size,fit}=placement;
    group.add(model);
    setProjectIdTree(model, project.id);

    const plaqueDepth = (depth-.38)/2+.007;
    const plaqueWidth = width * .67;
    const plaqueX = .22;
    const plaqueBacking = box(plaqueWidth, 0.36, 0.025, plaqueX, 0.51, plaqueDepth, mats.plaque, group, { castShadow: false });
    plaqueBacking.userData.projectId = project.id;
    const labelWidth = plaqueWidth * 0.92;
    const labelHeight = 0.26;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(labelWidth, labelHeight), labelMaterial(project, labelWidth, labelHeight));
    plaque.position.set(plaqueX, 0.51, plaqueDepth + 0.015);
    plaque.renderOrder = 3;
    group.add(plaque);
    plaque.userData.projectId = project.id;

    // HiARCH badge is a separate company target, intentionally without projectId.
    if (project.source?.includes('hiarch.cz') || project.id === 'koupelni') {
      const badgeX = -width * .37;
      const badge = box(0.58, 0.22, 0.045, badgeX, 0.51, (depth-.38)/2+.012, mats.bronzeLight, group, { castShadow: false });
      badge.userData.companyId = 'hiarch';
      const badgeLabel=new THREE.Mesh(new THREE.PlaneGeometry(.5,.12),badgeMaterial);
      badgeLabel.position.set(badgeX, 0.51, (depth-.38)/2+.037);
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
        const xOffset = [-0.22, 0.018, 0.243][hotspotIndex]*placement.scaledSize.x;
        sphere.position.set(xOffset, capTopY+.095 + modelHeight * (hotspotIndex === 1 ? 0.86 : 0.72), Math.max(0.2, modelDepth * 0.39));
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
    tables.push({ x, z, group, rim, model, featured, hotspots, width, depth, ...placement });
  }

  const roomFinishes=addGalleryFinishes({THREE,scene,box,limestone,mats,recessedAquarium:false,fullAquarium:false,chessOpening:true,mapOnRight:true});
  const exhibitUplight=addExhibitUplighting({THREE,tables});

  const fixedLights=addFixedExhibitLights({THREE,scene,tables});


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
  // One broad, close grazing rail lights the three reliefs without extra shadow maps.
  const letteringLight=new THREE.RectAreaLight(0xffe8c7,7.5,15.3,.24);
  letteringLight.name='Rear wall · lettering light';
  letteringLight.position.set(0,4.46,-16.72);
  letteringLight.lookAt(0,3.12,-17.20);
  scene.add(letteringLight);
  const coveSpill=new THREE.PointLight(0x21CF9D,0,10,2);coveSpill.position.set(0,6.35,2.2);scene.add(coveSpill);
  const accentMaterial=new THREE.MeshBasicMaterial({color:0xB8D4B9,toneMapped:false});
  const poolCanvas=document.createElement('canvas');poolCanvas.width=poolCanvas.height=128;
  const pc=poolCanvas.getContext('2d'),poolGradient=pc.createRadialGradient(64,64,8,64,64,63);
  poolGradient.addColorStop(0,'rgba(255,255,255,.32)');poolGradient.addColorStop(.42,'rgba(255,255,255,.13)');poolGradient.addColorStop(1,'rgba(255,255,255,0)');pc.fillStyle=poolGradient;pc.fillRect(0,0,128,128);
  const poolTexture=new THREE.CanvasTexture(poolCanvas);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const gc=glowCanvas.getContext('2d'),gr=gc.createRadialGradient(64,64,2,64,64,63);
  gr.addColorStop(0,'rgba(43,56,49,.58)');gr.addColorStop(.42,'rgba(43,56,49,.25)');gr.addColorStop(1,'rgba(43,56,49,0)');
  gc.fillStyle=gr;gc.fillRect(0,0,128,128);const contactTexture=new THREE.CanvasTexture(glowCanvas);
  const frameParts=[];
  for(const side of [-1,1]){
    frameParts.push(new THREE.BoxGeometry(3.65,.018,.025).translate(0,.785,side*1.24));
    frameParts.push(new THREE.BoxGeometry(.025,.018,2.48).translate(side*1.715,.785,0));
  }
  const ledFrameGeometry=mergeGeometries(frameParts,false);frameParts.forEach(g=>g.dispose());
  const poolMaterial=new THREE.MeshBasicMaterial({map:poolTexture,color:0x59dda5,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const contactMaterial=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity:.30,depthWrite:false});
  for(const [material,y,sx,sz] of [[contactMaterial,.008,1.55,1.55],[poolMaterial,.012,1.9,2.1]]){
    const marks=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,tables.length);
    const pose=new THREE.Object3D();pose.rotation.x=-Math.PI/2;
    for(const [i,table] of tables.entries()){
      pose.position.set(table.x,y,table.z);pose.scale.set(table.width*sx,table.depth*sz,1);pose.updateMatrix();
      marks.setMatrixAt(i,pose.matrix);
    }
    marks.renderOrder=material===contactMaterial?0:1;
    marks.instanceMatrix.needsUpdate=true;
    marks.raycast=()=>{};scene.add(marks);
  }
  const ledFrames=new THREE.InstancedMesh(ledFrameGeometry,accentMaterial,tables.length);
  const ledFrameMatrix=new THREE.Matrix4();
  tables.forEach((table,index)=>ledFrames.setMatrixAt(index,ledFrameMatrix.makeTranslation(table.x,0,table.z)));
  ledFrames.instanceMatrix.needsUpdate=true;ledFrames.raycast=()=>{};scene.add(ledFrames);
  const modes={
    day:{wall:0xC7C4B9,panel:0xBEBEB1,floor:0xB0B2A6,ceiling:0x65766A,bg:0x98A99D,h:.8,k:1.45,s:18,front:7,wash:6,contact:.30},
    evening:{wall:0x101712,panel:0x141D16,floor:0x18201A,ceiling:0x040705,bg:0x020503,h:.012,k:.025,s:26,front:.25,wash:18,contact:.48},
    neon:{wall:0x09110D,panel:0x101A13,floor:0x101B14,ceiling:0x030604,bg:0x010302,h:.008,k:.015,s:23,front:.18,wash:15,contact:.48}
  };
  const baseEnvironment=new WeakMap();
  let environmentFactor=1;
  function setEnvironmentFor(object){
    for(const mat of Array.isArray(object.material)?object.material:[object.material]){
      if(!mat?.isMeshStandardMaterial)continue;
      if(!baseEnvironment.has(mat))baseEnvironment.set(mat,mat.envMapIntensity);
      const minimum=mat.userData.galleryModelMaterial?(mat.transparent?.30:.15):0;
      mat.envMapIntensity=baseEnvironment.get(mat)*Math.max(minimum,environmentFactor);
    }
  }
  function setLighting({preset='evening',color='#a9dcc6',intensity=1}={}){
    const m=modes[preset]||modes.evening,c=new THREE.Color(color),amount=Math.max(0,Math.min(1.5,Number(intensity)||0));
    const vivid=c.clone(),hsl={};vivid.getHSL(hsl);vivid.setHSL(hsl.h,Math.max(.78,hsl.s),.48);
    mats.wall.color.set(m.wall);mats.wallPanel.color.set(m.panel);
    mats.ceiling.color.set(m.ceiling);floorSurface.material.color.set(m.floor);mats.plinth.color.set(preset==='day'?0x34483B:0x26382D);
    mats.wall.envMapIntensity=preset==='day'?.42:.12;mats.wallPanel.envMapIntensity=preset==='day'?.42:.12;
    mats.ceiling.envMapIntensity=preset==='day'?.35:.08;floorSurface.material.envMapIntensity=preset==='day'?.55:.15;
    scene.background.set(m.bg);scene.fog.color.set(m.bg);
    // The room must not remain illuminated by the bright environment map at night.
    environmentFactor=preset==='day'?1:.045;
    scene.traverse(setEnvironmentFor);
    mats.wall.envMapIntensity=preset==='day'?.42:.012;mats.wallPanel.envMapIntensity=preset==='day'?.42:.012;
    mats.ceiling.envMapIntensity=preset==='day'?.35:.005;floorSurface.material.envMapIntensity=preset==='day'?.55:.025;
    mats.plaque.emissive.setHex(0xC3B590);mats.plaque.emissiveIntensity=preset==='day'?0:.025;
    pictures.setLighting(preset);
    key.castShadow=true;hemi.intensity=m.h;key.intensity=preset==='day'?m.k:.06;fixedLights.setLighting({preset,color,intensity:amount});
    poolMaterial.color.copy(preset==='neon'?vivid:new THREE.Color(0xE4C48D));
    poolMaterial.opacity=preset==='neon'?.26*amount:.09*amount;
    poolMaterial.visible=preset!=='day'&&amount>0;
    frontFill.intensity=m.front;letteringLight.intensity=preset==='day'?4.5:preset==='neon'?6.3:7.5;
    frontFill.color.set(preset==='neon'?0xE9F7F4:0xF8F1E5);
    letteringLight.color.set(preset==='neon'?0xeff3e8:0xffe9c9);
    coveSpill.color.copy(vivid);
    coveSpill.intensity=preset==='neon'?.65*amount:0;
    ledMaterial.color.copy(preset==='neon'?vivid:c).lerp(new THREE.Color(0xE7F2E3),preset==='neon'?.04:.45).multiplyScalar(preset==='day'?.32+amount*.28:preset==='neon'?.65+amount*.95:.55+amount*.45);
    accentMaterial.color.copy(preset==='neon'?vivid:c).lerp(new THREE.Color(0xCEDFCE),preset==='neon'?.02:.24).multiplyScalar(preset==='day'?.25+amount*.30:preset==='neon'?.6+amount*.9:.5+amount*.35);
    ceilingGlow.color.copy(preset==='neon'?vivid:new THREE.Color(0xF1E9D9)).multiplyScalar(preset==='day'?.35+amount*.25:preset==='neon'?.20+amount*.45:.24+amount*.19);
    sconceGlow.color.set(preset==='neon'?0xB5D9D0:0xECE7D9).multiplyScalar(preset==='day'?.55:preset==='neon'?.28+amount*.40:.24+amount*.20);
    benchLed.color.copy(preset==='neon'?vivid:c).lerp(new THREE.Color(0xDCE8D9),preset==='neon'?.12:.55).multiplyScalar(preset==='neon'?.36+amount*.34:.45+amount*.15);
    mats.glass.opacity=preset==='day'?.2:.12;
    grout.color.set(preset==='day'?0xBFB7A9:0x6C8170);grout.opacity=preset==='day'?.15:preset==='neon'?.035:.025;
    inlayMaterial.envMapIntensity=preset==='day'?.52:.10;
    inlayMaterial.emissive.setHex(0x9E8352);inlayMaterial.emissiveIntensity=preset==='day'?0:.018;
    contactMaterial.opacity=m.contact;
    tables.forEach(table=>{table.rim.material.color.copy(preset==='neon'?vivid:new THREE.Color(0xBB9D6A));table.rim.material.opacity=preset==='day'?.38:.7});
    brandSigns.forEach(sign=>sign.setLighting({preset,color,intensity:amount}));
    roomFinishes.setLighting({preset,color,intensity:amount});
    scene.userData.allExhibitLighting=exhibitUplight.setLighting({preset,color,intensity:amount});
    portalStone.envMapIntensity=preset==='day'?.65:.22;
    facadeStone.envMapIntensity=preset==='day'?.35:.12;
    threshold.envMapIntensity=preset==='day'?.35:.12;
    forecourt.envMapIntensity=preset==='day'?.2:.045;
    portalStone.emissiveIntensity=preset==='day'?.01:.045;
    facadeStone.emissiveIntensity=preset==='day'?0:.028;
    entranceFill.intensity=preset==='day'?4.0:preset==='neon'?4.5:5.2;
    portalLED.color.copy(preset==='neon'?vivid:new THREE.Color(0xF0D2A1)).multiplyScalar(preset==='day'?.55:preset==='neon'?1.15+amount*.6:.85+amount*.3);
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
    const first=members[0];
    let batch;
    if(first.material.map===limestone.map){
      // Map stone in metres before merging. A narrow pilaster and a 36 m wall
      // now share the same grain size instead of stretching one image to each.
      const parts=members.map(mesh=>{
        const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
        for(let i=0;i<positions.count;i++){
          const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
          const nx=normals.getX(i),ny=normals.getY(i),nz=normals.getZ(i);
          if(Math.abs(nx)>.5)uv.setXY(i,-Math.sign(nx)*z/4.4,y/6.4);
          else if(Math.abs(ny)>.5)uv.setXY(i,x/4.4,-Math.sign(ny)*z/6.4);
          else uv.setXY(i,Math.sign(nz)*x/4.4,y/6.4);
        }
        return geometry;
      });
      batch=new THREE.Mesh(mergeGeometries(parts,false),first.material);
      parts.forEach(part=>part.dispose());
    }else{
      batch=new THREE.InstancedMesh(unitBox,first.material,members.length);
      members.forEach((mesh,index)=>{
        const p=mesh.geometry.parameters;
        const matrix=mesh.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(p.width,p.height,p.depth));
        batch.setMatrixAt(index,matrix);
      });
      batch.instanceMatrix.needsUpdate=true;
    }
    batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.frustumCulled=true;
    members.forEach(mesh=>{
      scene.remove(mesh);mesh.geometry.dispose();
    });
    scene.add(batch);staticBatchCount++;staticPartsMerged+=members.length;
  }
  if(!staticBatchCount)unitBox.dispose();
  scene.userData.fittings=instanceGalleryFittings(THREE,scene,tables,benches,capGeometry);
  scene.userData.staticArchitecture={batches:staticBatchCount,parts:staticPartsMerged};

  function releaseModel(model){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      geometries.add(mesh.geometry);
      for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
        materials.add(material);
        for(const value of Object.values(material))if(value?.isTexture&&value!==material.envMap)textures.add(value);
      }
    });
    // Each downloaded tier owns its GLB resources. The decoded template can upload again on a return visit.
    for(const resource of [...materials,...geometries,...textures])resource.dispose();
  }
  function replaceModel(id,tier){
    const table=tables.find(t=>t.group.userData.projectId===id);
    if(!table||table.model.userData.assetTier===tier)return false;
    const model=makeProjectModel(id,THREE);if(model.userData.loading)return false;
    const placement=placeExhibitModel(model,id,THREE,capTopY),old=table.model;
    setProjectIdTree(model,id);table.group.remove(old);table.group.add(model);table.model=model;Object.assign(table,placement);
    table.group.updateWorldMatrix(true,true);scene.userData.allExhibitLighting=exhibitUplight.replaceTable(table);
    table.model.traverse(setEnvironmentFor);
    contact.show(id);
    releaseModel(old);
    renderer.shadowMap.needsUpdate=true;return true;
  }
  return { scene, tables, benches, pickables, doors, fixedLights, replaceModel, setLighting, loadPlinthContact:contact.load };
}
