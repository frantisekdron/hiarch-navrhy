// Touches starting on the canvas use one recognizer. Mouse and pen events
// continue to OrbitControls. Native vertical pans may cancel the whole stream.
export function bindGalleryTouch(host, {onContact, onTurn, onPinchStart, onPinch, onTap}) {
  const points = new Map();
  const slop = 8;
  let mode = 'idle';
  let initialSpan = 0;
  let pinchFrame = 0;
  let pinchActive = false;

  function span() {
    const [a, b] = points.values();
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function clearPinch() {
    cancelAnimationFrame(pinchFrame);
    pinchFrame = 0;
    pinchActive = false;
  }
  function reset() {
    clearPinch();
    points.clear();
    mode = 'idle';
  }
  function updatePinch() {
    pinchFrame = 0;
    if (mode !== 'pinch' || points.size !== 2) return;
    const current = span();
    if (initialSpan < 1 || current < 1) return;
    if (!pinchActive && Math.abs(current - initialSpan) < 4) return;
    pinchActive = true;
    onPinch(initialSpan / current);
  }
  function down(event) {
    if (points.has(event.pointerId)) return;
    const x = event.clientX, y = event.clientY;
    points.set(event.pointerId, {x, y, startX: x, startY: y});
    if (points.size === 1) {
      mode = 'pending';
      onContact();
    } else if (points.size === 2 && (mode === 'pending' || mode === 'turn')) {
      mode = 'pinch';
      initialSpan = span();
      onPinchStart();
    } else {
      mode = 'ignore';
      clearPinch();
    }
  }
  function move(event) {
    const p = points.get(event.pointerId);
    if (!p) return;
    const previousX = p.x;
    p.x = event.clientX;
    p.y = event.clientY;
    if (mode === 'pending') {
      const x = Math.abs(p.x - p.startX), y = Math.abs(p.y - p.startY);
      if (Math.max(x, y) < slop) return;
      // Diagonal and vertical starts belong to the page, even after reversal.
      mode = x > 1.25 * y ? 'turn' : 'page';
      if (mode === 'turn') onTurn(p.x - p.startX);
    } else if (mode === 'turn') {
      onTurn(p.x - previousX);
    } else if (mode === 'pinch' && !pinchFrame) {
      // Sample the pair together, once both contacts have moved this frame.
      pinchFrame = requestAnimationFrame(updatePinch);
    }
  }
  function finish(event) {
    const p = points.get(event.pointerId);
    if (!p) return;
    const released = event.type === 'pointerup';
    const tap = released && mode === 'pending'
      && Math.hypot(event.clientX - p.startX, event.clientY - p.startY) < slop;
    if (released && mode === 'pinch' && pinchFrame) {
      cancelAnimationFrame(pinchFrame);
      updatePinch();
    }
    clearPinch();
    points.delete(event.pointerId);
    // Once a second finger or cancellation was involved, the remaining finger
    // cannot turn or select anything until the user starts a new gesture.
    mode = points.size ? 'ignore' : 'idle';
    if (tap) onTap(event);
  }
  const handlers = {pointerdown: down, pointermove: move, pointerup: finish,
    pointercancel: finish, lostpointercapture: finish};
  for (const [type, handler] of Object.entries(handlers)) {
    host.addEventListener(type, event => {
      if (event.pointerType !== 'touch') return;
      // OrbitControls installs its listeners on the child canvas. Keeping its
      // listeners out of this sequence does not cancel browser page scrolling.
      event.stopPropagation();
      handler(event);
    }, {capture: true, passive: true});
  }
  return {reset};
}

// Keep a touch orbit inside the 19.5 × 36 m gallery, including clearance
// for the framed works and near plane. Distance stays continuous at corners.
export function roomOrbitDistance(target, direction, desired) {
  let d = desired;
  if (direction.x > 0) d = Math.min(d, (8.9 - target.x) / direction.x);
  if (direction.x < 0) d = Math.min(d, (-8.9 - target.x) / direction.x);
  if (direction.z > 0) d = Math.min(d, (17.05 - target.z) / direction.z);
  if (direction.z < 0) d = Math.min(d, (-17.05 - target.z) / direction.z);
  if (direction.y > 0) d = Math.min(d, (6.45 - target.y) / direction.y);
  return d;
}
