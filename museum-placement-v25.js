import { roomOrbitDistance } from './museum-touch-v25.js?v=25.0';
// The Blender hall is in metres, displayed at two world units per metre.
// All buildings and their site works share one display scale in the authored hall.
export const WORLD_UNITS_PER_METRE=2;
export const DISPLAY_DENOMINATOR=35;
export const EXHIBIT_SCALE=WORLD_UNITS_PER_METRE/DISPLAY_DENOMINATOR;
export const DISPLAY_SCALE_LABEL=`1:${DISPLAY_DENOMINATOR}`;
export const MODEL_METRIC_SIZES=Object.freeze({
  koupelni:[42.64574,28.53363,28.04933],
  hustopece:[53.3427734,10.472168,39.828125],transped:[30.0117,12.7292,12.84],
  wurmova:[13.8701,11.1412,17.8447],bystrc:[30.8083,9.0731,28.2034],
  selska84:[18.1509,11.76,22.4795],ivancice:[88.0200,12.5,20.23],
  nebovidy:[46.6115,11.7666,21.6929]
});
export const EXHIBIT_POSITIONS=[[-2.65,7.8],[-5.6,-2],[4.0,-2],[-5.6,-7],[5.6,-7],[-5.6,-12],[5.6,-12],[0,-12]];
export const KOUPLENI_MODEL_NOTE=`Měřítko ${DISPLAY_SCALE_LABEL} · rozměry Koupelní jsou odhadnuté podle fotografií.`;
// The street and quay pieces share the exhibit origin, including asymmetric approaches.
const SITE_HALF_EXTENTS={hustopece:[30,30],transped:[28,16],bystrc:[16,14.65]};
export function plinthSize(id){
  const [width,,depth]=MODEL_METRIC_SIZES[id];
  const [siteX,siteZ]=SITE_HALF_EXTENTS[id] || [0,0];
  return {
    width:Math.max(1.45,1.35+width*.022,Math.max(width,2*siteX)*EXHIBIT_SCALE+.24),
    depth:Math.max(1.08,.88+depth*.020,Math.max(depth,2*siteZ)*EXHIBIT_SCALE+.24)
  };
}
export function placeExhibitModel(model,id,THREE,surfaceY=2.1){
  model.scale.setScalar(1);model.position.set(0,0,0);model.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(model);
  const metresPerUnit=id==='koupelni'?(model.userData.metresPerUnit||3/.223):1;
  if(bounds.isEmpty()){
    const s=MODEL_METRIC_SIZES[id];
    bounds.set(new THREE.Vector3(-s[0]/2,0,-s[2]/2),new THREE.Vector3(s[0]/2,s[1],s[2]/2));
  }
  const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const fit=EXHIBIT_SCALE*metresPerUnit;
  model.scale.setScalar(fit);model.position.set(-center.x*fit,surfaceY-bounds.min.y*fit,-center.z*fit);
  const scaledSize=size.clone().multiplyScalar(fit);
  model.userData.displayPlacement={mode:DISPLAY_SCALE_LABEL,metresPerWorldUnit:.5,scaleDenominator:DISPLAY_DENOMINATOR,dimensionBasis:id==='koupelni'?'photo-estimate':'client-model-metres',fit,displaySize:scaledSize.toArray(),sourceSize:size.toArray(),metresPerUnit};
  return {fit,size,scaledSize,modelHeight:scaledSize.y,targetY:surfaceY+scaledSize.y*.48,focusRadius:scaledSize.length()*.5};
}
const streetBearing = {
  koupelni: -30, hustopece: -157, transped: 29, wurmova: -30.72,
  bystrc: -31, selska84: 55, ivancice: -25, nebovidy: 34
};
const approachPitch = { hustopece: 25, transped: 11, bystrc: 22 };

// Trunk and planter envelopes inside the hall. Blender maps (x, y) in metres to
// (2x, -2y) in the horizontal plane of the gallery.
const indoorPlanters = [[-7.4, -15.26, 3.55], [8, -9.24, 3]];

function framingLimits(projection, isMobile) {
  const portrait = projection.aspect < .8;
  // The pager and the gallery tools reserve more vertical space on short screens.
  const short = (isMobile && !portrait) || projection.aspect > 2;
  return [portrait ? .91 : .88, short ? .49 : portrait ? .69 : .82, short ? .49 : portrait ? .69 : .74];
}

// A conservative polygon enclosing the plan of both Hustopeče model tiers.
// The rectangle includes wide empty corners around the rotating wings.
const hustopeceOutline = [
  [.4502, -.0366], [.5021, .1058], [.4789, .2370], [.2568, .5017],
  [.2558, .5021], [-.4218, .3826], [-.5015, .3157], [-.5103, .2915],
  [-.3965, -.3542], [-.2887, -.4827], [-.2248, -.5059], [-.0783, -.4801]
];

function exhibitCorners(table, THREE) {
  const { x, z, scaledSize: size } = table;
  const base = table.targetY - size.y * .48;
  if (table.group.userData.projectId === 'hustopece') {
    return hustopeceOutline.flatMap(([dx, dz]) => [base, base + size.y].map(y =>
      new THREE.Vector3(x + dx * size.x, y, z + dz * size.z)));
  }
  const corners = [];
  for (const dx of [-size.x / 2, size.x / 2]) {
    for (const dy of [0, size.y]) {
      for (const dz of [-size.z / 2, size.z / 2]) {
        corners.push(new THREE.Vector3(x + dx, base + dy, z + dz));
      }
    }
  }
  return corners;
}

function viewObstacles(table, neighbours, THREE) {
  const box = (x, z, halfWidth, halfDepth, base, top) => new THREE.Box3(
    new THREE.Vector3(x - halfWidth, base, z - halfDepth),
    new THREE.Vector3(x + halfWidth, top, z + halfDepth)
  );
  const obstacles = indoorPlanters.flatMap(([x, z, top]) => [
    box(x, z, .52, .52, 0, .94),
    box(x, z, .23, .23, .92, top)
  ]);
  for (const other of neighbours) {
    if (other === table) continue;
    const { x, z, width, depth, scaledSize: size } = other;
    const base = other.targetY - size.y * .48;
    obstacles.push(new THREE.Box3().setFromPoints(exhibitCorners(other, THREE)));
    if (width && depth) obstacles.push(box(x, z, width / 2, depth / 2, 0, base));
  }
  return obstacles;
}

function obscuredPoints(position, points, obstacles, THREE) {
  const ray = new THREE.Ray(position);
  const hit = new THREE.Vector3();
  let obscured = 0;
  for (const point of points) {
    const distance = ray.direction.subVectors(point, position).length();
    ray.direction.multiplyScalar(1 / distance);
    if (obstacles.some(box => box.containsPoint(position) ||
      (ray.intersectBox(box, hit) && hit.distanceTo(position) < distance))) obscured++;
  }
  return obscured;
}

function fitCorners(corners, target, direction, projection, THREE, horizontalMargin, topMargin, bottomMargin) {
  const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right);
  const tanV = Math.tan(THREE.MathUtils.degToRad(projection.fov) / 2);
  const tanH = tanV * projection.aspect;
  const delta = new THREE.Vector3();
  let distance = projection.near;
  for (const corner of corners) {
    delta.subVectors(corner, target);
    const depth = delta.dot(direction);
    const horizontal = Math.abs(delta.dot(right)) / (tanH * horizontalMargin);
    const height = delta.dot(up);
    const vertical = Math.abs(height) / (tanV * (height > 0 ? topMargin : bottomMargin));
    distance = Math.max(distance, depth + Math.max(horizontal, vertical, projection.near));
  }
  return distance;
}

export function exhibitOrbitFitDistance(table, target, direction, projection, THREE, isMobile) {
  const [horizontal, top, bottom] = framingLimits(projection, isMobile);
  return fitCorners(exhibitCorners(table, THREE), target, direction, projection, THREE, horizontal, top, bottom);
}

export function exhibitView(table, camera, THREE, isMobile = false, neighbours = []) {
  const id = table.group.userData.projectId;
  const bearing = id === 'wurmova' && isMobile ? -29.66 : (streetBearing[id] ?? 30);
  const target = new THREE.Vector3(table.x, table.targetY, table.z);
  target.y += table.scaledSize.y * (approachPitch[id] ? -.17 : .07);
  const corners = exhibitCorners(table, THREE);
  const obstacles = viewObstacles(table, neighbours, THREE);
  const visibilityPoints = [target, ...corners];
  const [horizontal, top, bottom] = framingLimits(camera, isMobile);
  const fixedPitch = approachPitch[id];
  const eyeY = table.targetY + Math.max(.028, table.scaledSize.y * .27) - table.scaledSize.y * .48;
  const eyeOffset = eyeY - target.y;
  const minDistance = table.focusRadius + .045;

  function tryBearing(degrees) {
    const angle = THREE.MathUtils.degToRad(degrees);
    const x = Math.sin(angle), z = Math.cos(angle);
    const direction = new THREE.Vector3(x, 0, z);
    let pitch = fixedPitch ? THREE.MathUtils.degToRad(fixedPitch) : 0;
    let fit;
    // Solve for street-level eye height after the perspective distance is known.
    const passes = fixedPitch ? 1 : 4;
    for (let pass = 0; pass < passes; pass++) {
      direction.set(x * Math.cos(pitch), Math.sin(pitch), z * Math.cos(pitch));
      fit = Math.max(minDistance, fitCorners(corners, target, direction, camera, THREE, horizontal, top, bottom));
      if (!fixedPitch) pitch = Math.asin(THREE.MathUtils.clamp(eyeOffset / fit, -.19, .19));
    }
    const distance = roomOrbitDistance(target, direction, fit);
    const fullViewDistance = fitCorners(corners, target, direction, camera, THREE, .97, top, bottom);
    const position = target.clone().addScaledVector(direction, distance);
    const obscured = obscuredPoints(position, visibilityPoints, obstacles, THREE);
    return { position, obscured, fits: distance + .0001 >= Math.max(minDistance, fullViewDistance),
      coverage: distance / fit };
  }

  let view = tryBearing(bearing);
  // Preserve the street angle when its framing and sightlines are clear.
  // Search the nearest alternatives first, preferring the central aisle on a tie.
  if (!view.fits || view.obscured) {
    const aisleAngle = table.x === 0 ? 0 : -Math.sign(table.x) * 90;
    const towardAisle = ((aisleAngle - bearing + 540) % 360) - 180;
    const sign = Math.sign(towardAisle) || 1;
    for (let step = 4; step <= 180; step += 4) {
      for (const turn of [sign, -sign]) {
        const candidate = tryBearing(bearing + turn * step);
        if (candidate.fits && !candidate.obscured) return { target, position: candidate.position };
        if (candidate.fits && !view.fits || candidate.fits === view.fits &&
          (candidate.obscured < view.obscured || candidate.obscured === view.obscured && candidate.coverage > view.coverage)) {
          view = candidate;
        }
      }
    }
  }
  return { target, position: view.position };
}
