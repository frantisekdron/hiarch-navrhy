export function buildGalleryRoom({ THREE, renderer, projects, makeProjectModel, labelTexture }) {
  if (!THREE || !Array.isArray(projects) || typeof makeProjectModel !== 'function' || typeof labelTexture !== 'function') {
    throw new TypeError('buildGalleryRoom requires THREE, projects, makeProjectModel and labelTexture.');
  }

  const scene = new THREE.Scene();
  const stone = 0xD9D2C5;
  const ivory = 0xF2EFE7;
  const paper = 0xE7E1D5;
  const graphite = 0x383A35;
  const bronze = 0x8E7959;
  const bronzeLight = 0xB09A72;
  const sage = 0x879581;
  const sageLight = 0xA7B09B;
  scene.background = new THREE.Color(0xD8D1C4);
  scene.fog = new THREE.Fog(0xD8D1C4, 39, 78);

  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.82, metalness: 0.02, ...options
  });
  const mats = {
    wall: material(0xE7E1D5), wallPanel: material(0xD9D2C5), wallReveal: material(0xC8C0B2),
    floor: material(0xD4CDBF), ceiling: material(0xECE7DE), graphite: material(graphite),
    stone: material(0xC5BDAF), stoneLight: material(0xE3DDD2), bronze: material(bronze, { metalness: 0.62, roughness: 0.39 }),
    bronzeLight: material(bronzeLight, { metalness: 0.56, roughness: 0.32 }),
    glass: material(0xB8C0B3, { transparent: true, opacity: 0.2, roughness: 0.24, metalness: 0.08, depthWrite: false, side: THREE.DoubleSide }),
    led: new THREE.MeshBasicMaterial({ color: 0xBDCCB2, toneMapped: false }),
    plaque: material(0xEDE8DE, { roughness: 0.56 }),
    glassHandle: material(0xA88D62, { metalness: 0.8, roughness: 0.24 })
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

  function makeStoneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d5cfc3'; ctx.fillRect(0, 0, 512, 512);
    let seed = 73019;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 5200; i++) {
      const shade = random() > 0.53 ? 'rgba(255,250,239,.11)' : 'rgba(89,78,62,.045)';
      ctx.fillStyle = shade;
      const size = 1 + Math.floor(random() * 3);
      ctx.fillRect(random() * 512, random() * 512, size * 2, size);
    }
    ctx.strokeStyle = 'rgba(105,97,84,.16)'; ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 509, 509);
    ctx.strokeStyle = 'rgba(255,252,244,.46)'; ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, 501, 501);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6.5, 12);
    texture.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
    return texture;
  }

  const floor = box(19.5, 0.28, 36, 0, -0.15, 0, mats.stone, scene, { castShadow: false });
  const floorSurface = new THREE.Mesh(new THREE.PlaneGeometry(19.5, 36), material(0xffffff, { map: makeStoneTexture(), roughness: 0.9, metalness: 0 }));
  floorSurface.rotation.x = -Math.PI / 2;
  floorSurface.position.y = 0.001;
  floorSurface.receiveShadow = true;
  scene.add(floorSurface);
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

  // Ceiling linear fixtures, warm metal bodies with diffused light strips.
  for (const x of [-5.5, 0, 5.5]) {
    box(0.16, 0.08, 24, x, 7.015, -1.5, mats.bronze, scene, { castShadow: false, receiveShadow: false });
    box(0.055, 0.025, 22, x, 6.962, -1.5, new THREE.MeshBasicMaterial({ color: 0xF4E7CF, toneMapped: false }), scene, { castShadow: false, receiveShadow: false });
  }

  scene.add(new THREE.HemisphereLight(0xFFF8EE, 0x656B5C, 1.35));
  const key = new THREE.DirectionalLight(0xFFF5E6, 1.7);
  key.position.set(-7, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -13; key.shadow.camera.right = 13;
  key.shadow.camera.top = 11; key.shadow.camera.bottom = -11;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 42;
  key.shadow.normalBias = 0.025; key.shadow.bias = -0.00025;
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
  // Portal lettering is on an ivory backing and readable from the room side.
  box(7.15, 0.86, 0.075, 0, 6.42, 17.97, mats.plaque);
  const portalLabel = makeLabel(['HiARCH  ·  HiPLAN  ·  HiREAL'], 7.05, 0.56, 0, 6.42, 18.04, '#554B3C', 0);
  portalLabel.userData.brand = true;
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
  const signature = makeLabel(['HiARCH  /  HiPLAN  /  HiREAL'], 5.2, 0.86, 3.2, 5.62, -17.5, '#403D35');
  signature.userData.brand = true;
  for (const [companyId, name, x] of [['hiarch', 'HiARCH', -5.5], ['hiplan', 'HiPLAN', 0], ['hireal', 'HiREAL', 5.5]]) {
    box(3.65, 1.3, 0.085, x, 3.1, -17.58, mats.plaque, scene, { castShadow: false });
    const wordmark = makeLabel([name], 3.25, 0.7, x, 3.1, -17.525, '#514A3C');
    wordmark.userData.companyId = companyId;
  }

  const positions = [
    [0, 3.5], [-5.6, -2], [5.6, -2], [-5.6, -7], [5.6, -7], [-5.6, -12], [5.6, -12], [0, -12]
  ];
  const smallerPositions = positions.slice(1);
  let smallerPositionIndex = 0;
  const tables = [];
  const pickables = [];
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

    box(width - 0.28, height, depth - 0.28, 0, height / 2, 0, mats.graphite, group);
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
  selectedLight.shadow.mapSize.set(512, 512);
  selectedLight.shadow.camera.near = 0.4;
  selectedLight.shadow.camera.far = 22;
  selectedLight.shadow.normalBias = 0.035;
  selectedLight.shadow.bias = -0.00035;
  selectedLight.target.position.set(0, 1.2, 3.5);
  scene.add(selectedLight, selectedLight.target);

  // Company wordmarks on the back wall are independently pickable and carry no project id.
  const companyPlanes = scene.children.filter((object) => object.userData.companyId);
  pickables.push(...companyPlanes);
  return { scene, tables, pickables, doors, selectedLight };
}
