import { alignRoofMaps, projectMineral, setFinishRepeat } from './museum-surface-coordinates-v29.js?v=29.0';
// The day diffuse atlas uses UV1. These surface maps stay on UV0.
const FINISH_URL = new URL('./assets/v28/finishes/', import.meta.url);
const STONE = new Map([
  ['HonedConcrete', { roughness: .82, normal: .27, environment: 1.88, relief: .30 }],
  ['OiledWalnut', { roughness: 1.13, normal: .40, environment: .95, relief: .45 }],
  ['HoneyTimber', { roughness: .945, normal: .29, environment: .85, relief: .65 }],
  ['ReclaimedBrick', { roughness: 1.0, normal: .85, environment: .72, relief: .90 }]
]);
const METAL = new Map([
  ['BrushedNickel', { metalness: .80, roughness: .31, anisotropy: .38, environment: 1.30 }],
  ['SteelEdge', { metalness: .73, roughness: .34, anisotropy: .30, environment: 1.23 }],
  ['ChampagneBrass', { metalness: .74, roughness: .40, anisotropy: .25, environment: 1.18 }],
  ['IronBlack', { metalness: .58, roughness: .41, anisotropy: .28, environment: .74 }]
]);

export async function loadMaterialFinishes(THREE, mobile, dimensions) {
  const loader = new THREE.TextureLoader();
  const stretch = {
    x: (dimensions?.width ?? 9.6) / 9.6,
    y: (dimensions?.eaves ?? 6.2) / 6.2,
    z: (dimensions?.depth ?? 18) / 18
  };
  async function load(name, repeat = [1, 1], data = false) {
    const texture = await loader.loadAsync(new URL(name, FINISH_URL).href);
    texture.name = 'V28 ' + name;
    texture.flipY = false;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    setFinishRepeat(texture, ...repeat);
    texture.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(data ? 4 : 8, mobile ? 2 : 8);
    return texture;
  }
  async function photographed(prefix, repeat, normalTier = false) {
    const tier = mobile ? '-mobile' : '';
    const [albedo, normal, roughness] = await Promise.all([
      load(prefix + '-albedo' + tier + '.webp', repeat),
      load(prefix + '-normal' + (normalTier ? tier : '') + '.webp', repeat, true),
      load(prefix + '-rough.webp', repeat, true)
    ]);
    return { albedo, normal, roughness };
  }
  const [floor, grain, brick, walnut, leather] = await Promise.all([
    load('honed-floor.jpg', [stretch.x, stretch.z]),
    load('mineral-grain.jpg', [2, 2]),
    photographed('brick', [stretch.x * 1.58 / 1.40, stretch.y * 1.58 / 1.04], true),
    photographed('walnut', [1.13, .92]),
    photographed('leather', [2.5, 2.5])
  ]);
  const surfaces = new Map([
    ['ReclaimedBrick', brick], ['OiledWalnut', walnut], ['Cognac', leather]
  ]);
  return { floor, grain, surfaces, stretch, mobile, textures: new Set([floor, grain]) };
}

export function hasHallFinish(source) {
  return STONE.has(source.name) || METAL.has(source.name) ||
    source.name === 'LimeWash' || source.name === 'ClearGlass' ||
    source.name === 'Cognac';
}

export function refineHallMaterial(THREE, source, finishes, kind) {
  const { name } = source;
  const metal = METAL.get(name);
  // r160 supplies an anisotropic GGX path for the small desktop metal batches.
  // Keep the mobile batches on the Standard path and preserve the same colour.
  const material = metal && !finishes.mobile
    ? THREE.MeshStandardMaterial.prototype.copy.call(new THREE.MeshPhysicalMaterial(), source)
    : source.clone();
  if (metal) {
    if (material.isMeshPhysicalMaterial) {
      material.defines.STANDARD = '';
      material.defines.PHYSICAL = '';
      material.anisotropy = metal.anisotropy;
    }
    material.metalness = metal.metalness;
    material.roughness = metal.roughness;
    material.envMapIntensity = metal.environment;
    if (name === 'IronBlack') material.color.multiplyScalar(.78);
  }
  const stone = STONE.get(name);
  if (stone) {
    material.roughness = material.roughnessMap ? stone.roughness : source.roughness;
    material.normalScale.setScalar(stone.normal);
    material.envMapIntensity = stone.environment;
    for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
      if (!texture) continue;
      texture.anisotropy = finishes.mobile ? 2 : 8;
      texture.needsUpdate = true;
    }
  }
  const surface = finishes.surfaces.get(name);
  if (surface) {
    material.map = surface.albedo;
    material.normalMap = surface.normal;
    material.roughnessMap = surface.roughness;
    material.metalnessMap = null;
    material.metalness = 0;
    material.roughness = 1;
    material.normalScale.setScalar(stone?.normal ?? .36);
    if (name === 'Cognac') material.color.setScalar(1);
  }
  if (name === 'HonedConcrete') {
    material.map = finishes.floor;
    for (const texture of [material.normalMap, material.roughnessMap]) {
      if (texture) setFinishRepeat(texture, finishes.stretch.x, finishes.stretch.z);
    }
  }
  if (name === 'HoneyTimber') {
    material.color.multiplyScalar(1.16);
    if (kind === 'baked') alignRoofMaps(material, finishes.stretch);
    else for (const texture of new Set([material.map, material.normalMap, material.roughnessMap])) {
      if (texture) setFinishRepeat(texture, finishes.stretch.x, finishes.stretch.z);
    }
  }
  if (name === 'LimeWash') {
    material.map = finishes.grain;
    material.bumpMap = finishes.grain;
    material.bumpScale = .018;
    material.color.multiplyScalar(1.06);
  }
  if (name === 'ClearGlass') {
    material.roughness = .16;
    material.metalness = 0;
    material.envMapIntensity = 1.05;
    material.depthWrite = false;
  }
  return material;
}

export function bakedReliefStrength(material) {
  return STONE.get(material.name)?.relief ?? 0;
}

const CAPTURED_ARCHITECTURE = /^(Baked_|Glass_Clear$|Hall_(IronBlack|LimeWash|SteelEdge)$|Annex_Roof$|Environment_Park$|Pane_ClearGlass|Frame_IronBlack)/;
const REFLECTED_SURFACES = {
  HoneyTimber: [ .52, .32, .17 ],
  ReclaimedBrick: [ .37, .22, .13 ],
  LimeWash: [ .62, .54, .43 ],
  HonedConcrete: [ .39, .34, .28 ],
  ClearGlass: [ 1.65, 1.95, 2.16 ],
  IronBlack: [ .055, .058, .054 ],
  SteelEdge: [ .094, .096, .089 ]
};

function projectionGeometry(THREE, root) {
  const floor = root.getObjectByName('Baked_Floor');
  const roof = root.getObjectByName('Baked_Roof');
  if (!floor || !roof?.geometry) return null;
  const { min, max } = new THREE.Box3().setFromObject(floor);
  const origin = new THREE.Vector3((min.x + max.x) * .5, min.y + 3.2, (min.z + max.z) * .5);
  const bounds = new THREE.Vector4(min.x, min.z, max.x, max.z);
  const { position, normal } = roof.geometry.attributes;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(roof.matrixWorld);
  const direction = new THREE.Vector3(), point = new THREE.Vector3();
  const planes = [null, null];
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix);
    if (direction.y < 0) direction.negate();
    if (Math.abs(direction.x) < .05 || Math.abs(direction.z) > .03) continue;
    const side = Number(direction.x > 0);
    if (planes[side]) continue;
    point.fromBufferAttribute(position, i).applyMatrix4(roof.matrixWorld);
    planes[side] = new THREE.Vector4(direction.x, direction.y, direction.z, direction.dot(point));
    if (planes.every(Boolean)) return { origin, bounds, planes };
  }
  return null;
}

export function createRoomProbe(THREE, renderer, scene, root, { mobile }) {
  if (!renderer) return null;
  root.updateWorldMatrix(true, true);
  const projection = projectionGeometry(THREE, root);
  if (!projection) return null;
  const probe = new THREE.Scene();
  probe.background = new THREE.Color().setRGB(.47, .44, .38);
  const materials = new Map();
  const float = renderer.extensions.has('EXT_color_buffer_float') ||
    renderer.extensions.has('EXT_color_buffer_half_float');
  const target = new THREE.WebGLCubeRenderTarget(mobile ? 64 : 128, {
    type: float ? THREE.HalfFloatType : THREE.UnsignedByteType
  });
  let pmrem;
  try {
    root.traverse(mesh => {
      if (!mesh.isMesh || !CAPTURED_ARCHITECTURE.test(mesh.name) || Array.isArray(mesh.material)) return;
      const name = mesh.material.name;
      if (!materials.has(name)) {
        const color = REFLECTED_SURFACES[name] ?? [.25, .23, .20];
        const map = name === 'ParkDay' ? mesh.material.map : null;
        materials.set(name, new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide, toneMapped: false, map,
          color: new THREE.Color().setRGB(...(map ? [1.35, 1.30, 1.22] : color))
        }));
      }
      const reflected = new THREE.Mesh(mesh.geometry, materials.get(name));
      reflected.matrix.copy(mesh.matrixWorld);
      reflected.matrixAutoUpdate = false;
      probe.add(reflected);
    });
    if (!probe.children.length) return null;
    const camera = new THREE.CubeCamera(.03, 180, target);
    camera.position.copy(projection.origin);
    camera.update(renderer, probe);
    pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromCubemap(target.texture);
    scene.environment = environment.texture;
    scene.userData.environmentRenderTarget = environment;
    scene.userData.finishProbe = { size: target.width, quality: float ? 'hdr' : 'ldr', passesPerFrame: 0 };
    return projection;
  } finally {
    pmrem?.dispose();
    target.dispose();
    for (const material of materials.values()) material.dispose();
  }
}

const PROJECT_REFLECTION = `
varying vec3 vFinishWorldPosition;
uniform vec4 uFinishHallBounds;
uniform vec4 uFinishRoofPlanes[2];
uniform vec3 uFinishOrigin;

// Intersect the reflected ray with the walls or either slope of the actual
// gable. Recenter around the location from which the cube was captured.
float finishPlaneDistance(vec3 point, vec3 ray, vec3 plane, float offset) {
  float denom = dot(plane, ray);
  if (denom <= 0.0001) return 1000.0;
  float dist = (offset - dot(plane, point)) / denom;
  return dist > 0.001 ? dist : 1000.0;
}

vec3 finishProjectReflection(vec3 ray) {
  vec3 point = vFinishWorldPosition;
  if (point.x <= uFinishHallBounds.x || point.z <= uFinishHallBounds.y ||
      point.x >= uFinishHallBounds.z || point.z >= uFinishHallBounds.w) return ray;
  float sideX = ray.x > 0.0 ? 1.0 : -1.0;
  float sideZ = ray.z > 0.0 ? 1.0 : -1.0;
  float wallX = ray.x > 0.0 ? uFinishHallBounds.z : -uFinishHallBounds.x;
  float wallZ = ray.z > 0.0 ? uFinishHallBounds.w : -uFinishHallBounds.y;
  float dist = finishPlaneDistance(point,ray,vec3(sideX,0.0,0.0),wallX);
  dist = min(dist,finishPlaneDistance(point,ray,vec3(0.0,0.0,sideZ),wallZ));
  dist = min(dist,finishPlaneDistance(point,ray,uFinishRoofPlanes[0].xyz,uFinishRoofPlanes[0].w));
  dist = min(dist,finishPlaneDistance(point,ray,uFinishRoofPlanes[1].xyz,uFinishRoofPlanes[1].w));
  if (dist >= 999.0) return ray;
  return normalize(point + ray * dist - uFinishOrigin);
}
`;

export function applyFloorReflection(THREE, shader, { origin, bounds, planes }) {
  shader.uniforms.uFinishHallBounds = { value: bounds };
  shader.uniforms.uFinishRoofPlanes = { value: planes };
  shader.uniforms.uFinishOrigin = { value: origin };
  const chunk = THREE.ShaderChunk.envmap_physical_pars_fragment;
  shader.vertexShader = 'varying vec3 vFinishWorldPosition;\n' + shader.vertexShader.replace(
    '#include <worldpos_vertex>',
    '#include <worldpos_vertex>\nvFinishWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;'
  );
  shader.fragmentShader = PROJECT_REFLECTION + shader.fragmentShader.replace(
    '#include <envmap_physical_pars_fragment>',
    chunk.replace('textureCubeUV( envMap, reflectVec, roughness )',
      'textureCubeUV( envMap, finishProjectReflection(reflectVec), roughness )')
  );
}

export function applyHallGlassFresnel(shader) {
  // Angle-dependent visibility preserves the garden and gives panes a grazing
  // reflection. It needs no transmission buffer or second scene render.
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>', `
    float v28Angle = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
    diffuseColor.a += (1.0 - diffuseColor.a) * .23 * pow(1.0 - v28Angle, 3.0);
    #include <opaque_fragment>`
  );
}

export function refineExhibitMaterials(model, id, finishes) {
  const seen = new Set();
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (!material?.isMeshStandardMaterial || seen.has(material)) continue;
      seen.add(material);
      const knownGlass = material.transparent && material.opacity >= .16 && material.opacity <= .59 &&
        (material.roughness <= .25 || material.name.startsWith('LOD transparent'));
      const hex = id === 'koupelni' ? material.color.getHex() : -1;
      if (knownGlass || hex === 0x314853) {
        material.roughness = .17;
        material.metalness = 0;
        material.envMapIntensity = 1.15;
        if (material.isMeshPhysicalMaterial) {
          material.clearcoat = .10;
          material.clearcoatRoughness = .21;
          material.ior = 1.50;
        }
      } else if (hex === 0xb9beb7) {
        material.roughness = .37;
        material.envMapIntensity = .88;
      } else if (hex === 0xf0eee4 || hex === 0x8d958d || hex === 0x4e544f) {
        material.roughness = .83;
        projectMineral(material, model, finishes.grain, .65, 1, 0, .002);
      } else if (hex === 0x989b90) {
        // Only the already-authored flat membrane receives this mineral microfinish.
        material.roughness = .91;
        projectMineral(material, model, finishes.grain, .65, 1, 0, .005);
      } else if (id === 'hustopece' &&
        (material.name === 'Hustopece exterior plaster' || material.name === 'Material_0018')) {
        material.roughness = .87;
        projectMineral(material, model, finishes.grain, 7 / 34, .34, .70);
      }
      if (material.map && material.name === 'Wurmova original photo roof tiles') {
        material.map.anisotropy = finishes.mobile ? 2 : 8;
        material.map.needsUpdate = true;
      }
    }
  });
}

// Keep the real pendant positions and the eight-light budget fixed. The
// beam spreads over the building instead of putting its brightest pool on
// the walkway. Fixture power follows the calibrated distance falloff.
export function calibrateExhibitFixture(THREE, light, table) {
  if (!table) return 1;
  const centreX = table.centerX ?? table.x;
  const centreZ = table.centerZ ?? table.z;
  const size = table.scaledSize;
  const base = table.surfaceY ?? 2.1;
  light.target.position.set(centreX, base + size.y * .66, centreZ);
  const distance = light.position.distanceTo(light.target.position);
  const spread = Math.sqrt(size.x * size.z) * .46;
  light.angle = THREE.MathUtils.clamp(Math.atan2(spread, distance), .29, .57);
  light.penumbra = .76;
  light.distance = distance + Math.max(2.9, size.y * .70);
  return THREE.MathUtils.clamp((distance / 8.6) ** light.decay * 1.45, .78, 2.45);
}
