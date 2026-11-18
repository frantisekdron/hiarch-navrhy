// Relief uses the same UVs and maps already supplied by the projects.
// Finish values are limited to surfaces identified in their project photos.
const sourceRelief = {
  hustopece: {
    Material_0013: [.00038, .87], // Mineral surfacing
    Material_0017: [.00055, .74], // Timber boards
    Material_0022: [.00048, .88], // Paving
    Material_0023: [.00062, .73], // Horizontal timber boards
    Material_0216: [.00058, .74]  // Vertical timber boards
  },
  bystrc: {
    Material_0006: [.00035, .86], // Concrete
    Material_0021: [.00045, .86], // Masonry
    Material_0025: [.00080, .46], // Profiled metal
    Material_0031: [.00055, .78]  // Deck boards
  },
  wurmova: {
    'Wurmova original photo roof tiles': [.00088, .77]
  }
};

const frameFinishes = {
  wurmova: { Material_0002: [.45, .16] },
  nebovidy: { Material_0004: [.46, .11, .24] }, // The same dark metal is used for entrance panels
  selska84: { Material_0012: [.49, .11] },
  ivancice: { Material_0006: [.48, .13] }
};

// Architectural planes use their geometric face normals. The imported smoothed
// corner normals otherwise spill onto adjacent wall and window-reveal triangles.
const planarSurfaces = {
  nebovidy: {
    Material_0009: .22, // White plaster and recessed reveals
    Material_0010: .18, // Upper grey plaster
    Material_0012: .22  // Recessed ground floor
  },
  bystrc: {
    Material_0021: .35, // Masonry
    Material_0024: .20, // Pavilion roof planes
    Material_0028: .30, // Edge and wall panels
    Material_0029: .26, // Pavilion wall cladding
    'LOD opaque 06': .30 // Corresponding preview edge and panel faces
  }
};

function transpedCladding(material) {
  // Photos 02–05 show the dark upper storeys clad in broad horizontal panels.
  // This adds the shallow photographed joints only to the upper vertical faces
  // of the existing graphite wall material, in source model metres.
  material.color.multiplyScalar(1.19);
  material.roughness = .57;
  material.metalness = .10;
  const sourceHook = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    sourceHook.call(material, shader, renderer);
    shader.vertexShader = 'varying vec3 vPanelPosition;\nvarying vec3 vPanelNormal;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vPanelPosition = position;
        vPanelNormal = normal;`);
    shader.fragmentShader = 'varying vec3 vPanelPosition;\nvarying vec3 vPanelNormal;\n' +
      shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float panelY = (vPanelPosition.y - 5.62) / 0.94;
        float panelCoverage = max(fwidth(panelY), .003);
        float jointDistance = abs(fract(panelY + .5) - .5);
        float jointTone = (1.0 - smoothstep(.008, .017 + panelCoverage, jointDistance))
          * (1.0 - smoothstep(.05, .24, panelCoverage));
        float wall = (1.0 - smoothstep(.04, .33, abs(normalize(vPanelNormal).y)))
          * smoothstep(5.75, 5.96, vPanelPosition.y);
        diffuseColor.rgb *= 1.0 - .29 * jointTone * wall;`);
  };
  material.customProgramCacheKey = () => 'hiarch-v30-transped-upper-cladding';
}

export function applyExhibitSurfaceDetail(model, id, { anisotropy = 4 } = {}) {
  const seen = new Set();
  const projectRelief = sourceRelief[id] || {};
  const projectFrames = frameFinishes[id] || {};
  const projectPlanes = planarSurfaces[id] || {};
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // Blended glass and reference figures have no volumetric shadow in the depth map.
    if (materials.every(material => material?.transparent && !material.alphaTest)) mesh.castShadow = false;
    for (const material of materials) {
      if (!material?.isMeshStandardMaterial || seen.has(material)) continue;
      seen.add(material);
      const name = material.name.replace(/\.\d{3}$/, '');
      if (material.map && material.map.anisotropy < anisotropy) {
        material.map.anisotropy = anisotropy;
        material.map.needsUpdate = true;
      }
      if (material.transparent) continue;
      const plane = projectPlanes[name];
      if (plane !== undefined) material.flatShading = true;
      if (material.aoMap && plane !== undefined) material.aoMapIntensity = Math.min(material.aoMapIntensity, plane);
      const relief = projectRelief[name];
      if (relief && material.map && !material.normalMap && !material.bumpMap && mesh.geometry.hasAttribute('uv')) {
        material.bumpMap = material.map;
        material.bumpScale = relief[0];
        material.roughness = relief[1];
      }
      const frame = projectFrames[name];
      if (frame) {
        material.roughness = frame[0];
        material.metalness = frame[1];
        if (material.aoMap && frame[2] !== undefined) material.aoMapIntensity = Math.min(material.aoMapIntensity, frame[2]);
      }
      if (id === 'transped' && name === 'Material_0007') transpedCladding(material);
      if (id === 'transped' && name === 'Material_0043') {
        // The fine vertical ribbing is already present in the source geometry.
        material.roughness = .48;
        material.metalness = .20;
        material.envMapIntensity = .68;
      }
    }
  });
  return model;
}
