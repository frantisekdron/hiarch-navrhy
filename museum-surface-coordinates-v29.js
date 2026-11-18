// This uses the authored UV0 for finishes and leaves the shared daylight atlas on UV1.
export function setFinishRepeat(texture, u, v) {
  texture.repeat.set(u, v);
  // glTF already converted Blender v to 1-v. Preserve that order when scaling.
  texture.offset.set(0, 1 - v);
}

export function alignRoofMaps(material, {x, y, z}) {
  // U follows the actual joints along the hall, while V measures distance on the slope.
  const along = .84 / .87 * z;
  const across = .87 / .84 * Math.hypot(x, y * 1.90 / 4.80);
  const copies = new Map();
  for (const slot of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
    const texture = material[slot];
    if (!texture) continue;
    if (!copies.has(texture)) {
      const copy = texture.clone();
      copy.matrixAutoUpdate = false;
      copy.matrix.set(0, -along, along, across, 0, 1, 0, 0, 1);
      copies.set(texture, copy);
    }
    material[slot] = copies.get(texture);
  }
}

export function projectMineral(material, model, grain, tileMetres, gain, offset, bumpScale = 0) {
  const originalCompile = material.onBeforeCompile;
  const originalKey = material.customProgramCacheKey();
  const shaderCoordinates = model.matrixWorld.clone();
  const metresPerUnit = model.userData.metresPerUnit ?? 1;
  material.customProgramCacheKey = () => `${originalKey}|v29-model-metric-bump:${Boolean(bumpScale)}`;
  material.map = null;
  material.bumpMap = bumpScale ? grain : null;
  material.bumpScale = bumpScale;
  material.onBeforeCompile = function (shader, renderer) {
    originalCompile.call(this, shader, renderer);
    // Gallery mounts are static once installed. Derive the inverse after placement,
    // leaving the surface scale tied to the real project through every camera view.
    model.updateWorldMatrix(true, false);
    shaderCoordinates.copy(model.matrixWorld).invert();
    shader.uniforms.uMineralModelInverse = { value: shaderCoordinates };
    shader.uniforms.uMineralRepeats = { value: metresPerUnit / tileMetres };
    shader.uniforms.uMineralGrain = { value: grain };
    shader.uniforms.uMineralTint = { value: [gain, offset] };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      uniform mat4 uMineralModelInverse;
      uniform float uMineralRepeats;
      varying vec3 vMineralPosition;
    `).replace('#include <worldpos_vertex>', `
      #include <worldpos_vertex>
      vec4 mineralPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mineralPosition = instanceMatrix * mineralPosition;
      #endif
      vMineralPosition = (uMineralModelInverse * modelMatrix * mineralPosition).xyz * uMineralRepeats;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform sampler2D uMineralGrain;
      uniform vec2 uMineralTint;
      varying vec3 vMineralPosition;
      vec2 mineralPlane(vec3 point, vec3 face) {
        if (face.x >= max(face.y, face.z)) return point.zy;
        if (face.y >= face.z) return point.xz;
        return point.xy;
      }
      vec3 mineralFace() {
        return abs(cross(dFdx(vMineralPosition), dFdy(vMineralPosition)));
      }
      vec2 mineralUV(vec3 face) {
        vec2 uv = mineralPlane(vMineralPosition, face);
        return vec2(uv.x, 1.0 - uv.y);
      }
    `).replace('#include <map_fragment>', `
      #include <map_fragment>
      vec3 mineralNormal = mineralFace();
      vec2 mineralTextureUV = mineralUV(mineralNormal);
      vec2 mineralDerivativeX = mineralPlane(dFdx(vMineralPosition), mineralNormal) * vec2(1.0, -1.0);
      vec2 mineralDerivativeY = mineralPlane(dFdy(vMineralPosition), mineralNormal) * vec2(1.0, -1.0);
      float mineralSample = textureGrad(uMineralGrain, mineralTextureUV, mineralDerivativeX, mineralDerivativeY).r;
      diffuseColor.rgb *= uMineralTint.y + uMineralTint.x * mineralSample;
    `);
    if (!bumpScale) return;
    // Keep Three's perturbNormalArb and its front-face handling. Supply metric
    // samples in place of its original UV derivatives, which were box-dependent.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      float mineralHeightX = textureGrad(bumpMap, mineralTextureUV + mineralDerivativeX, mineralDerivativeX, mineralDerivativeY).r;
      float mineralHeightY = textureGrad(bumpMap, mineralTextureUV + mineralDerivativeY, mineralDerivativeX, mineralDerivativeY).r;
      vec2 mineralDelta = bumpScale * (vec2(mineralHeightX, mineralHeightY) - vec2(mineralSample));
      normal = perturbNormalArb(-vViewPosition, normal, mineralDelta, faceDirection);
    `);
  };
}
