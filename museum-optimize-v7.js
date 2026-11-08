// Collapse static museum-model geometry into a few material batches. Source objects
// are never modified; unknown object/geometry features leave the model untouched.
export function compactStaticModel(group, THREE) {
  if (!group?.isGroup || !THREE?.BufferGeometry) return group;
  group.updateMatrixWorld(true);
  const inverseRoot = group.matrixWorld.clone().invert();
  const batches = new Map();
  let unsupported = false;

  function schemaOf(geometry) {
    const names = Object.keys(geometry.attributes).sort();
    if (!names.includes('position')) return null;
    const parts = [];
    for (const name of names) {
      const attr = geometry.attributes[name];
      if (!attr?.isBufferAttribute || attr.isInterleavedBufferAttribute || !attr.array ||
          !Number.isInteger(attr.itemSize) || attr.itemSize < 1) return null;
      parts.push(`${name}:${attr.itemSize}:${attr.normalized}:${attr.array.constructor.name}`);
    }
    return parts.join('|');
  }

  function isSupported(object) {
    if (object === group) return true;
    if (object.isGroup || (object.isObject3D && !object.isMesh && !object.isLine &&
        object.type === 'Object3D')) return object.renderOrder === 0 &&
          Object.keys(object.userData || {}).length === 0;
    if (!(object.isMesh || object.isLine)) return false;
    if (object.isInstancedMesh || object.isSkinnedMesh || object.isBatchedMesh ||
        Array.isArray(object.material) || !object.material?.uuid ||
        !object.geometry?.isBufferGeometry || object.morphTargetInfluences ||
        Object.keys(object.geometry.morphAttributes || {}).length ||
        object.geometry.morphTargetsRelative || Object.keys(object.userData || {}).length) return false;
    const geo = object.geometry;
    const schema = schemaOf(geo);
    if (!schema || (geo.index && (!geo.index.isBufferAttribute || geo.index.isInterleavedBufferAttribute))) return false;
    const limit = geo.index ? geo.index.count : geo.getAttribute('position').count;
    const start = geo.drawRange.start;
    const end = Math.min(limit, start + geo.drawRange.count);
    if (!Number.isInteger(start) || start < 0 || start > limit || end < start) return false;
    if (object.isMesh && (end - start) % 3 !== 0) return false;
    if (object.isLineSegments && (end - start) % 2 !== 0) return false;
    return true;
  }

  group.traverse(object => {
    if (unsupported || object === group) return;
    if (!isSupported(object)) { unsupported = true; return; }
    if (!object.isMesh && !object.isLine) return;
    // A hidden parent cannot be combined with a visible sibling without changing visibility.
    for (let p = object; p && p !== group; p = p.parent) {
      if (!p.visible) { unsupported = true; return; }
    }
    const kind = object.isMesh ? 'mesh' : 'line';
    const schema = schemaOf(object.geometry);
    const key = [kind, object.material.uuid, object.castShadow, object.receiveShadow,
      object.renderOrder, object.layers.mask, object.frustumCulled, schema].join('::');
    if (!batches.has(key)) batches.set(key, { kind, material: object.material, first: object, pieces: [] });
    batches.get(key).pieces.push(object);
  });
  if (unsupported) return group;

  function copyRange(source, start, count) {
    const clipped = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(source.attributes)) {
      const lo = start * attr.itemSize;
      const hi = (start + count) * attr.itemSize;
      const next = new THREE.BufferAttribute(attr.array.slice(lo, hi), attr.itemSize, attr.normalized);
      next.setUsage(attr.usage);
      clipped.setAttribute(name, next);
    }
    return clipped;
  }

  function swapMirroredTriangles(geometry) {
    const count = geometry.getAttribute('position').count;
    for (const attr of Object.values(geometry.attributes)) {
      const data = attr.array, size = attr.itemSize;
      for (let vertex = 0; vertex < count; vertex += 3) {
        const a = (vertex + 1) * size, b = (vertex + 2) * size;
        for (let component = 0; component < size; component++) {
          const tmp = data[a + component];
          data[a + component] = data[b + component];
          data[b + component] = tmp;
        }
      }
      attr.needsUpdate = true;
    }
  }

  function meshPiece(object) {
    const original = object.geometry;
    const expanded = original.index ? original.toNonIndexed() : original.clone();
    const limit = expanded.getAttribute('position').count;
    const start = original.drawRange.start;
    const count = Math.min(limit - start, original.drawRange.count);
    const geometry = copyRange(expanded, start, count);
    expanded.dispose();
    const local = inverseRoot.clone().multiply(object.matrixWorld);
    geometry.applyMatrix4(local);
    if (local.determinant() < 0) swapMirroredTriangles(geometry);
    return geometry;
  }

  function linePiece(object) {
    const source = object.geometry;
    const full = source.index ? source.index.array : null;
    const length = full ? source.index.count : source.getAttribute('position').count;
    const start = source.drawRange.start;
    const count = Math.min(length - start, source.drawRange.count);
    const sequence = Array.from({ length: count }, (_, i) => full ? full[start + i] : start + i);
    const pairs = [];
    if (object.isLineSegments) {
      for (let i = 0; i + 1 < sequence.length; i += 2) pairs.push(sequence[i], sequence[i + 1]);
    } else {
      for (let i = 0; i + 1 < sequence.length; i++) pairs.push(sequence[i], sequence[i + 1]);
      if (object.isLineLoop && sequence.length > 1) pairs.push(sequence[sequence.length - 1], sequence[0]);
    }
    const geometry = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(source.attributes)) {
      const size = attr.itemSize, data = new attr.array.constructor(pairs.length * size);
      for (let i = 0; i < pairs.length; i++) {
        const from = pairs[i] * size, to = i * size;
        for (let j = 0; j < size; j++) data[to + j] = attr.array[from + j];
      }
      const next = new THREE.BufferAttribute(data, size, attr.normalized);
      next.setUsage(attr.usage);
      geometry.setAttribute(name, next);
    }
    geometry.applyMatrix4(inverseRoot.clone().multiply(object.matrixWorld));
    return geometry;
  }

  function concatenate(pieces) {
    const merged = new THREE.BufferGeometry();
    const names = Object.keys(pieces[0].attributes);
    for (const name of names) {
      const sample = pieces[0].getAttribute(name);
      const size = sample.itemSize;
      const total = pieces.reduce((sum, piece) => sum + piece.getAttribute(name).array.length, 0);
      const joined = new sample.array.constructor(total);
      let offset = 0;
      for (const piece of pieces) {
        const data = piece.getAttribute(name).array;
        joined.set(data, offset);
        offset += data.length;
      }
      const attribute = new THREE.BufferAttribute(joined, size, sample.normalized);
      attribute.setUsage(sample.usage);
      merged.setAttribute(name, attribute);
    }
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }

  const optimized = new THREE.Group();
  optimized.copy(group, false);
  for (const batch of batches.values()) {
    const pieces = batch.pieces.map(object => batch.kind === 'mesh' ? meshPiece(object) : linePiece(object));
    const geometry = concatenate(pieces);
    for (const piece of pieces) piece.dispose();
    const child = batch.kind === 'mesh' ? new THREE.Mesh(geometry, batch.material) : new THREE.LineSegments(geometry, batch.material);
    child.name = batch.first.name;
    child.castShadow = batch.first.castShadow;
    child.receiveShadow = batch.first.receiveShadow;
    child.renderOrder = batch.first.renderOrder;
    child.layers.mask = batch.first.layers.mask;
    child.frustumCulled = batch.first.frustumCulled;
    optimized.add(child);
  }
  return optimized;
}
