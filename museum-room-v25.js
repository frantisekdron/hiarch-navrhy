import { PICK_LAYER } from './museum-performance-v25.js?v=25.0';
import { RectAreaLightUniformsLib } from './assets/vendor/RectAreaLightUniformsLib.js';
import { addExhibitUplighting } from './museum-exhibit-lighting-v16.js?v=21.0';
import {
  EXHIBIT_POSITIONS, MODEL_METRIC_SIZES, WORLD_UNITS_PER_METRE,
  placeExhibitModel, plinthSize
} from './museum-placement-v25.js';

const assetDirectory = new URL('./assets/v25/', import.meta.url);
const exhibitIds = Object.keys(MODEL_METRIC_SIZES);
const capTop = 2.1;
let areaLightLibraryReady = false;
const studioNames = { hiarch: 'HiARCH', hiplan: 'HiPLAN', hireal: 'HiREAL', entrance: 'HiARCH  ·  HiPLAN  ·  HiREAL' };
const lightLevels = {
  day: { sky: 0xC5B6A0, hemisphere: .78, sun: .62, spots: 15, environment: .68, park: 1, print: 1, fixture: .58 },
  evening: { sky: 0x171815, hemisphere: .045, sun: 0, spots: 27, environment: .14, park: .018, print: .80, fixture: 1.25 },
  neon: { sky: 0x101512, hemisphere: .032, sun: 0, spots: 23, environment: .12, park: .008, print: .70, fixture: 1.15 }
};

function assetUrl(name) {
  return new URL(name, name.startsWith('assets/') ? import.meta.url : assetDirectory).href;
}

export async function loadIndustrialAssets({ THREE, mobile = false }) {
  const [response, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    fetch(new URL('scene.json', assetDirectory)),
    import('./assets/vendor/GLTFLoader.js'),
    import('./assets/vendor/meshopt_decoder.module.js')
  ]);
  if (!response.ok) throw new Error(`Industrial gallery manifest: HTTP ${response.status}`);
  const metadata = await response.json();
  if (metadata.revision !== 25 || metadata.hall?.rootScale !== WORLD_UNITS_PER_METRE) {
    throw new Error('Industrial gallery manifest has an unsupported scale or revision.');
  }
  const textures = new THREE.TextureLoader();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const mobileAtlas = typeof mobile === 'boolean' ? mobile : mobile.matches;
  const atlas = mobileAtlas ? metadata.lightmap.mobile : metadata.lightmap.desktop;
  const [gltf, lightmap, foliage] = await Promise.all([
    loader.loadAsync(assetUrl(metadata.hall.url)),
    textures.loadAsync(assetUrl(atlas)),
    textures.loadAsync(assetUrl(metadata.foliage.url))
  ]);
  lightmap.channel = metadata.lightmap.uvChannel;
  lightmap.flipY = metadata.lightmap.flipY;
  lightmap.colorSpace = THREE.SRGBColorSpace;
  foliage.colorSpace = THREE.NoColorSpace;
  return { root: gltf.scene, metadata, lightmap, foliage };
}

function named(root, name) {
  const object = root.getObjectByName(name);
  if (!object) throw new Error(`Industrial gallery GLB is missing ${name}.`);
  return object;
}

function meshMaterials(object) {
  return Array.isArray(object.material) ? object.material : [object.material];
}

function mapMaterials(mesh, transform) {
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(transform) : transform(mesh.material);
}

function prepareParkMaterials(root) {
  const park = root.getObjectByName('Environment_Park');
  const materials = new Map();
  park?.traverse(mesh => {
    if (!mesh.isMesh) return;
    mapMaterials(mesh, source => {
      if (!materials.has(source)) {
        const material = source.clone();
        material.fog = false;
        material.toneMapped = false;
        materials.set(source, {
          material, color: material.color?.clone(), emissiveIntensity: material.emissiveIntensity
        });
      }
      return materials.get(source).material;
    });
  });
  return [...materials.values()];
}

function configureEnvironment(THREE, renderer, scene) {
  if (!renderer || typeof document === 'undefined') return;
  const faces = Array.from({ length: 6 }, (_, face) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = face === 3 ? '#776461' : '#7d705f';
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = '#e4d5bf';
    context.fillRect(face % 2 ? 9 : 42, 8, 13, 31);
    context.fillStyle = '#514435';
    context.fillRect(0, 53, 64, 11);
    return canvas;
  });
  const cube = new THREE.CubeTexture(faces);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.needsUpdate = true;
  let pmrem;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromCubemap(cube);
    scene.environment = target.texture;
    scene.userData.environmentRenderTarget = target;
    cube.dispose();
  } catch {
    scene.environment = cube;
  } finally {
    pmrem?.dispose();
  }
}

function textPlane(THREE, labelTexture, lines, width, height, color = '#f6e5cb') {
  const map = labelTexture(lines, { width: 768, height: Math.max(88, Math.round(768 * height / width)), color });
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function addPrints(THREE, parent, pickables, anchors, artworks, scope, metres = false) {
  const scale = metres ? 1 / WORLD_UNITS_PER_METRE : 1;
  const prints = [];
  for (const anchor of anchors.filter(item => item.scope === scope)) {
    const art = artworks.find(item => item.id === anchor.id);
    if (!art?.texture) continue;
    const material = new THREE.MeshBasicMaterial({ map: art.texture });
    const print = new THREE.Mesh(new THREE.PlaneGeometry(anchor.width * scale, anchor.height * scale), material);
    print.name = art.title;
    print.position.fromArray(anchor.position).multiplyScalar(scale);
    print.rotation.y = anchor.rotationY;
    print.userData.artworkId = anchor.id;
    parent.add(print);
    pickables.push(print);
    prints.push(print);
  }
  return prints;
}

function pickProxy(THREE, parent, material, width, height, depth, y, data) {
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  proxy.layers.set(PICK_LAYER);
  proxy.position.y = y;
  Object.assign(proxy.userData, data);
  parent.add(proxy);
  return proxy;
}

function placeModel(THREE, model, id) {
  const placement = placeExhibitModel(model, id, THREE, capTop);
  model.traverse(node => {
    node.userData.projectId = id;
    node.castShadow = node.receiveShadow = false;
  });
  return placement;
}

function disposeModel(model) {
  const resources = new Set();
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    resources.add(mesh.geometry);
    for (const material of meshMaterials(mesh)) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture && value !== material.envMap) resources.add(value);
      }
    }
  });
  // A decoded tier retains its CPU data. Three can reupload it if revisited.
  for (const resource of resources) resource.dispose();
}

function ownModelMaterials(model) {
  const materials = new Set();
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    for (const material of meshMaterials(mesh)) if (material.userData.galleryModelMaterial) materials.add(material);
  });
  return materials;
}

function releaseUplightInputs(model, inputs) {
  model.traverse(mesh => {
    if (mesh.isMesh) for (const material of meshMaterials(mesh)) inputs.delete(material);
  });
  for (const material of inputs) material.dispose();
}

function contactTexture(THREE) {
  const size = 48;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
      const px = (y * size + x) * 4;
      pixels.fill(Math.round(255 * Math.max(0, 1 - r) ** 1.65), px, px + 4);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function prepareHall(THREE, root, lightmap, foliage, domain) {
  const baked = new Set(), furniture = new Set(), leaves = [];
  const time = { value: 0 }, goboStrength = { value: 0 };
  const bounds = new THREE.Vector4(...domain);
  const floor = named(root, 'Baked_Floor');
  const variants = new Map();
  let batches = 0;

  function finish(source, kind) {
    const key = `${source.id}/${kind}`;
    if (variants.has(key)) return variants.get(key);
    const material = source.clone();
    variants.set(key, material);
    const usesDayBake = kind !== 'leaves' && lightmap && material.isMeshStandardMaterial;
    if (usesDayBake) {
      material.lightMap = lightmap;
      baked.add(material);
    }
    if (kind === 'baked' && !usesDayBake) return material;
    material.customProgramCacheKey = () => `industrial-${kind}-${usesDayBake ? 'day-bake' : 'runtime'}-v25`;
    material.onBeforeCompile = shader => {
      if (usesDayBake) {
        // Cycles baked the diffuse response with unit albedo, including its Lambert factor.
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_end>', `#include <lights_fragment_end>
          #ifdef USE_LIGHTMAP
            if (lightMapIntensity > 0.0) {
              reflectedLight.directDiffuse = vec3(0.0);
              reflectedLight.indirectDiffuse = lightMapIrradiance * material.diffuseColor;
            }
          #endif`
        );
      }
      if (kind === 'baked') return;
      shader.uniforms.uIndustrialTime = time;
      if (kind === 'leaves') {
        shader.vertexShader = `uniform float uIndustrialTime;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>', `#include <begin_vertex>
          float galleryLeaf = clamp((transformed.y - 0.5) * 0.42, 0.0, 1.0);
          float galleryPhase = transformed.x * 0.51 + transformed.z * 0.47;
          transformed.x += 0.035 * galleryLeaf * sin(uIndustrialTime * 1.38 + galleryPhase);
          transformed.z += 0.022 * galleryLeaf * sin(uIndustrialTime * 0.92 - galleryPhase);`
        );
        return;
      }
      shader.uniforms.uIndustrialGobo = { value: foliage };
      shader.uniforms.uIndustrialBounds = { value: bounds };
      shader.uniforms.uIndustrialGoboStrength = goboStrength;
      shader.vertexShader = `varying vec2 vIndustrialFloor;\n${shader.vertexShader}`.replace(
        '#include <worldpos_vertex>', `#include <worldpos_vertex>
        vIndustrialFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`
      );
      shader.fragmentShader = `uniform sampler2D uIndustrialGobo;
        uniform vec4 uIndustrialBounds;
        uniform float uIndustrialTime;
        uniform float uIndustrialGoboStrength;
        varying vec2 vIndustrialFloor;\n${shader.fragmentShader}`.replace(
        '#include <opaque_fragment>', `if (uIndustrialGoboStrength > 0.0) {
          vec2 span = uIndustrialBounds.zw - uIndustrialBounds.xy;
          vec2 goboUV = (vIndustrialFloor - uIndustrialBounds.xy) / span;
          goboUV.y = 1.0 - goboUV.y;
          goboUV += vec2(sin(uIndustrialTime * 0.62) * 0.003, sin(uIndustrialTime * 0.87) * 0.0015);
          outgoingLight *= 1.0 - texture2D(uIndustrialGobo, clamp(goboUV, 0.0, 1.0)).r * uIndustrialGoboStrength;
        }
        #include <opaque_fragment>`
      );
    };
    return material;
  }

  function visit(node, kind = '') {
    if (node === floor) kind = foliage ? 'floor' : 'baked';
    else if (node.name.startsWith('Baked_') && kind !== 'floor') kind = 'baked';
    else if (node.name.startsWith('Garden_Leaves') || node.name.startsWith('Leaf_')) kind = 'leaves';
    if (node.isMesh) {
      batches++;
      node.castShadow = node.receiveShadow = false;
      if (kind === 'leaves') leaves.push(node);
      if (lightmap && (kind === 'baked' || kind === 'floor') && !node.geometry.hasAttribute('uv1')) {
        throw new Error(`Industrial gallery mesh ${node.name} is missing UV1.`);
      }
      if ((kind && node.geometry.hasAttribute('uv1')) || kind === 'leaves') {
        mapMaterials(node, material => finish(material, kind));
      }
      meshMaterials(node).forEach(material => furniture.add(material));
    }
    for (const child of node.children) visit(child, kind);
  }

  visit(root);
  if (lightmap && !baked.size) throw new Error('Industrial gallery has no baked meshes with UV1.');
  root.updateWorldMatrix(true, true);
  const visibleBounds = [floor, ...leaves].map(mesh => new THREE.Box3().setFromObject(mesh).expandByScalar(.08));
  const frustum = new THREE.Frustum(), cameraProjection = new THREE.Matrix4();
  return {
    baked, furniture, batches, goboStrength, time,
    animated: !!foliage || leaves.length > 0,
    inView(camera) {
      if (!camera) return true;
      camera.updateWorldMatrix(true, false);
      frustum.setFromProjectionMatrix(cameraProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      return visibleBounds.some(box => frustum.intersectsBox(box));
    }
  };
}

function glowMaterials(THREE, object) {
  const materials = new Set();
  const clones = new Map();
  object.traverse(mesh => {
    if (!mesh.isMesh) return;
    mapMaterials(mesh, source => {
      if (clones.has(source)) return clones.get(source);
      const material = source.emissive ? source.clone() : new THREE.MeshStandardMaterial({ color: 0x35291d, roughness: .48 });
      clones.set(source, material);
      materials.add(material);
      return material;
    });
  });
  return materials;
}

function setGlow(materials, tint, amount) {
  for (const material of materials) {
    material.emissive.copy(tint);
    material.emissiveIntensity = amount;
  }
}

export function buildGalleryRoom({
  THREE, renderer, projects, makeProjectModel, labelTexture, artworks = [],
  requestRender = () => {}, industrialAssets
}) {
  const { root, metadata, lightmap, foliage } = industrialAssets;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(lightLevels.day.sky);
  scene.fog = new THREE.Fog(lightLevels.day.sky, 47, 110);
  root.scale.setScalar(WORLD_UNITS_PER_METRE);
  root.name = 'Industrial gallery · Blender';

  const salon = new THREE.Group();
  salon.name = 'Industrial chess salon · Blender';
  salon.scale.setScalar(WORLD_UNITS_PER_METRE);
  const salonNames = [metadata.salon.root, metadata.salon.portal || 'Salon_Portal', ...metadata.salon.doors.map(door => door.name)];
  for (const name of salonNames) salon.add(named(root, name));
  industrialAssets.salon = salon;
  scene.add(root);

  const doors = metadata.doors.map(record => {
    const door = named(root, record.name);
    door.userData.doorSide = record.side;
    door.userData.slideDistance = record.travelMetres;
    return door;
  });
  const pickables = [], plinthGlows = [];
  const proxyMaterial = new THREE.MeshBasicMaterial();
  const tables = exhibitIds.map((id, index) => {
    const project = projects.find(item => item.id === id);
    const authored = metadata.tables.find(item => item.id === id);
    const [x, z] = EXHIBIT_POSITIONS[index];
    const { width, depth } = plinthSize(id);
    const expected = { x, z, width, depth, surfaceY: capTop };
    if (!project || !authored || Object.entries(expected).some(([key, value]) =>
      !Number.isFinite(authored[key]) || Math.abs(authored[key] - value) > .002
    )) {
      throw new Error(`Industrial gallery plinth geometry does not match the 1:100 placement for ${id}.`);
    }

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.projectId = id;
    scene.add(group);
    pickProxy(THREE, group, proxyMaterial, width, capTop, depth, capTop / 2, { projectId: id });
    const linked = /^https?:\/\/(?:[^/]+\.)?hiarch\.cz(?:\/|$)/i.test(project.source || '');
    const plaqueWidth = Math.min(width - .075, .97), plaqueX = linked ? -plaqueWidth * .115 : 0;
    const plaque = textPlane(THREE, labelTexture, [project.name], plaqueWidth * (linked ? .72 : 1), .12);
    plaque.position.set(plaqueX, 1.95, depth / 2 + .007);
    plaque.userData.projectId = id;
    group.add(plaque);
    if (linked) {
      const label = textPlane(THREE, labelTexture, ['HiARCH'], plaqueWidth * .23, .12, '#e8bb82');
      label.position.set(plaqueWidth * .37, 1.95, plaque.position.z);
      label.userData.companyId = 'hiarch';
      group.add(label);
    }

    const model = makeProjectModel(id, THREE);
    const placement = placeModel(THREE, model, id);
    group.add(model);
    pickables.push(group);
    plinthGlows.push(glowMaterials(THREE, named(root, authored.glow || `Glow_Plinth_${id}`)));
    return { x, z, group, model, featured: id === 'koupelni', hotspots: [], width, depth, ...placement };
  });

  const benches = metadata.benches.map(record => {
    const object = new THREE.Group();
    object.position.set(record.x, 0, record.z);
    object.userData.seatId = record.id;
    pickProxy(THREE, object, proxyMaterial, record.halfWidth * 2, 1.52, record.halfDepth * 2, .76, object.userData);
    pickables.push(object);
    scene.add(object);
    return { ...record, object };
  });

  const prints = addPrints(THREE, scene, pickables, metadata.artworks, artworks, 'hall');
  for (const brand of metadata.brands) {
    const caption = textPlane(THREE, labelTexture, [studioNames[brand.id]], brand.width * .90, brand.height * .79);
    caption.position.fromArray(brand.position);
    caption.rotation.y = brand.rotationY;
    if (brand.id !== 'entrance') {
      caption.userData.companyId = brand.id;
      pickables.push(caption);
    }
    scene.add(caption);
  }

  const fixtureGlow = glowMaterials(THREE, named(root, 'Glow_Fixtures'));
  const parkMaterials = prepareParkMaterials(root);
  const hall = prepareHall(THREE, root, lightmap, foliage, metadata.foliage.domain);
  configureEnvironment(THREE, renderer, scene);
  const hemisphere = new THREE.HemisphereLight(0xFFF0D6, 0x9A7762);
  const sun = new THREE.DirectionalLight(0xFFE0B4);
  sun.position.set(7.5, 10, 5.2);
  scene.add(hemisphere, sun);

  const fixtures = metadata.fixtures.map(({ id, position, target }) => {
    const light = new THREE.SpotLight(0xFFF0D8, 0, 25, .32, .82, 1.45);
    light.name = id;
    light.position.fromArray(position);
    light.target.position.fromArray(target);
    scene.add(light, light.target);
    return light;
  });
  const fixturePositions = fixtures.map(light => ({
    id: light.name, position: light.position.toArray(), target: light.target.position.toArray(), shadow: false, intensity: 0
  }));
  scene.userData.fixedExhibitLights = fixturePositions;
  scene.userData.staticArchitecture = { batches: hall.batches };
  scene.userData.entranceDesign = 'industrial-steel-sliding-doors-v25';
  scene.userData.roomFinish = hall.baked.size ? 'blender-uv1-day-lightmap-v25' : 'blender-v25';

  const inputs = tables.map(table => ownModelMaterials(table.model));
  const uplighting = addExhibitUplighting({ THREE, tables });
  tables.forEach((table, index) => releaseUplightInputs(table.model, inputs[index]));

  const baseEnvironment = new WeakMap();
  let preset = 'day', environmentLevel = lightLevels.day.environment;
  let contactMaterial, contactGeometry, neonStrength = 0;
  const amber = new THREE.Color(0xFFE1AD), tint = new THREE.Color();

  function updateEnvironment(material) {
    if (!material?.isMeshStandardMaterial) return;
    if (!baseEnvironment.has(material)) baseEnvironment.set(material, material.envMapIntensity);
    material.envMapIntensity = baseEnvironment.get(material) * environmentLevel;
  }

  function updateModelEnvironment(model) {
    model.traverse(mesh => {
      if (mesh.isMesh) meshMaterials(mesh).forEach(updateEnvironment);
    });
  }

  function setUplightCount(state) {
    const illuminated = neonStrength > 0 ? plinthGlows.filter(materials => materials.size).length : 0;
    scene.userData.allExhibitLighting = { ...state, count: illuminated, total: tables.length };
  }

  function setLighting({ preset: mode = 'day', color = '#a9dcc6', intensity = 1 } = {}) {
    preset = Object.hasOwn(lightLevels, mode) ? mode : 'day';
    const level = lightLevels[preset], day = preset === 'day', neon = preset === 'neon';
    const amount = THREE.MathUtils.clamp(Number(intensity) || 0, 0, 1.5);
    scene.background.setHex(level.sky);
    scene.fog.color.copy(scene.background);
    for (const { material, color: originalColor, emissiveIntensity } of parkMaterials) {
      if (originalColor) material.color.copy(originalColor).multiplyScalar(level.park);
      if (Number.isFinite(emissiveIntensity)) material.emissiveIntensity = emissiveIntensity * level.park;
    }
    hemisphere.intensity = level.hemisphere;
    sun.intensity = level.sun;
    environmentLevel = level.environment;
    hall.furniture.forEach(updateEnvironment);
    tables.forEach(table => updateModelEnvironment(table.model));
    for (const material of hall.baked) material.lightMapIntensity = day ? (metadata.lightmap.gain ?? 1) : 0;
    hall.goboStrength.value = day ? .10 : 0;
    if (!day) hall.time.value = 0;
    prints.forEach(print => print.material.color.setScalar(level.print));
    fixtures.forEach((light, index) => {
      light.intensity = level.spots;
      light.color.setHex(neon ? 0xFFF2EE : 0xFFF0D8);
      fixturePositions[index].intensity = light.intensity;
    });
    setGlow(fixtureGlow, amber, level.fixture);
    tint.set(neon ? color : amber);
    if (neon) {
      const hsl = tint.getHSL({});
      tint.setHSL(hsl.h, Math.max(.78, hsl.s), .49);
    }
    neonStrength = (day ? 0 : neon ? 1.65 : .36) * amount;
    plinthGlows.forEach(materials => setGlow(materials, tint, neonStrength));
    setUplightCount(uplighting.setLighting({ preset, color, intensity: amount }));
    if (contactMaterial) contactMaterial.opacity = day ? .25 : .16;
    requestRender();
  }

  function updateContact(table) {
    if (!contactMaterial) return;
    if (!table.contact) {
      table.contact = new THREE.Mesh(contactGeometry, contactMaterial);
      table.contact.position.y = capTop + .002;
      table.contact.rotation.x = -Math.PI / 2;
      table.contact.raycast = () => {};
      table.group.add(table.contact);
    }
    table.contact.visible = !table.model.userData.loading;
    table.contact.scale.set(table.scaledSize.x + .16, table.scaledSize.z + .16, 1);
  }

  function loadPlinthContact() {
    if (contactMaterial) return;
    contactGeometry = new THREE.PlaneGeometry(1, 1);
    contactMaterial = new THREE.MeshBasicMaterial({
      alphaMap: contactTexture(THREE), color: 0x2D2219, depthWrite: false,
      transparent: true, opacity: preset === 'day' ? .25 : .16
    });
    tables.forEach(updateContact);
    requestRender();
  }

  function replaceModel(id, tier) {
    const table = tables.find(item => item.group.userData.projectId === id);
    if (!table || table.featured || table.model.userData.assetTier === tier) return false;
    const model = makeProjectModel(id, THREE);
    if (model.userData.loading) return false;
    const previous = table.model, inputs = ownModelMaterials(model);
    Object.assign(table, placeModel(THREE, model, id), { model });
    table.group.remove(previous);
    table.group.add(model);
    setUplightCount(uplighting.replaceTable(table));
    releaseUplightInputs(model, inputs);
    updateModelEnvironment(model);
    updateContact(table);
    disposeModel(previous);
    requestRender();
    return true;
  }

  function hasVisibleAtmosphere(camera) {
    if (preset !== 'day' || !hall.animated) return false;
    for (let ancestor = root; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false;
    return hall.inView(camera);
  }

  function updateAtmosphere(timeSeconds, { animate = true } = {}) {
    if (!animate || preset !== 'day' || !hall.animated || !Number.isFinite(timeSeconds)) return false;
    hall.time.value = timeSeconds;
    return true;
  }

  setLighting();
  return { scene, tables, benches, pickables, doors, replaceModel, setLighting, loadPlinthContact, updateAtmosphere, hasVisibleAtmosphere };
}

export function addIndustrialSalon({
  THREE, scene, pickables, industrialAssets, artworks = [], labelTexture, requestRender = () => {}
}) {
  // The separately loaded chess table has one rectangular task light.
  if (!areaLightLibraryReady) {
    RectAreaLightUniformsLib.init();
    areaLightLibraryReady = true;
  }
  const { metadata, salon: group } = industrialAssets;
  const config = metadata.salon;
  const interior = named(group, config.root);
  const portal = named(group, config.portal || 'Salon_Portal');
  const doors = config.doors.map(record => {
    const door = named(group, record.name);
    door.userData.hingeSign = record.hingeSign;
    door.userData.closedY = door.rotation.y;
    return door;
  });
  const targets = [portal, ...doors];
  const prints = addPrints(THREE, interior, pickables, metadata.artworks, artworks, 'salon', true);
  if (labelTexture && config.label) {
    const { width, height, position, rotationY } = config.label;
    const label = textPlane(THREE, labelTexture, ['ŠACHOVÝ SALONEK'], width / 2, height / 2);
    label.position.fromArray(position).multiplyScalar(.5);
    label.rotation.y = rotationY;
    portal.add(label);
  }
  for (const target of targets) {
    target.traverse(object => {
      if (object === target || object.isMesh) object.userData.chessPortal = true;
    });
  }
  pickables.push(...targets);

  const tint = new THREE.Color(0xFFDEAC);
  const glow = glowMaterials(THREE, named(interior, 'Glow_Salon'));
  const lights = (config.lights || [[14.2, 5.7, -12.6], [15.7, 5.7, -17.1]]).map(position => {
    const light = new THREE.PointLight(tint, 0, 14, 1.65);
    light.position.fromArray(position).multiplyScalar(.5);
    group.add(light);
    return light;
  });
  scene.add(group);
  const state = group.userData.chessSalon = { doorOpen: 0, interiorVisible: true };
  let power = 12, disposed = false;

  function setDoorOpen(value, redraw = true) {
    const amount = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    for (const door of doors) {
      door.rotation.y = door.userData.closedY + door.userData.hingeSign * amount * Math.PI / 2;
      door.userData.doorOpen = amount;
    }
    state.doorOpen = amount;
    if (redraw) requestRender();
  }

  function setInteriorVisible(visible) {
    interior.visible = state.interiorVisible = !!visible;
    lights.forEach(light => { light.intensity = visible ? power : 0; });
    requestRender();
  }

  function setLighting({ preset = 'day', intensity = 1 } = {}) {
    power = preset === 'day' ? 18 : 24 + THREE.MathUtils.clamp(Number(intensity) || 0, 0, 1.5) * 3;
    setGlow(glow, tint, preset === 'day' ? .62 : 1.16);
    prints.forEach(print => print.material.color.setScalar(preset === 'day' ? .95 : .78));
    lights.forEach(light => { light.intensity = state.interiorVisible ? power : 0; });
    requestRender();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    for (const target of [...targets, ...prints]) {
      const index = pickables.indexOf(target);
      if (index >= 0) pickables.splice(index, 1);
    }
    const resources = new Set();
    group.traverse(object => {
      if (!object.isMesh) return;
      resources.add(object.geometry);
      meshMaterials(object).forEach(material => resources.add(material));
    });
    for (const resource of resources) resource.dispose();
  }

  setDoorOpen(0, false);
  setLighting();
  return { group, setDoorOpen, setLighting, setInteriorVisible, doorTargets: doors, bounds: config.bounds, entrance: config.entrance, dispose };
}
