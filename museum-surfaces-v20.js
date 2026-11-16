// Five offline material images. No full-size canvas work or pixel loops at startup.
const ASSETS = new URL('./assets/v20/surfaces/', import.meta.url);

/** Synchronous, stable texture handles; local images arrive without delaying room creation.
 * Failures retain neutral one-pixel surfaces. No retry loops or remote dependencies.
 * Caller owns the five returned textures and should dispose them with the room.
 */
export function loadGallerySurfaces(THREE, renderer, requestRender) {
  const anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  const loader = new THREE.ImageLoader();

  function texture(file, repeat, fallback, isColor) {
    // Canvas is deliberately only one texel: no large CPU allocations or synthesis.
    const pixel = document.createElement('canvas');
    pixel.width = pixel.height = 1;
    const context = pixel.getContext('2d');
    context.fillStyle = fallback;
    context.fillRect(0, 0, 1, 1);
    const map = new THREE.Texture(pixel);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(...repeat);
    map.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.anisotropy = anisotropy;
    map.needsUpdate = true;
    let disposed = false;
    const onDispose = () => { disposed = true; };
    map.addEventListener('dispose', onDispose);
    loader.load(new URL(file, ASSETS).href, (image) => {
      if (disposed) return;
      // The placeholder may already own immutable 1x1 WebGL2 storage.
      map.removeEventListener('dispose', onDispose);
      map.dispose();
      map.addEventListener('dispose', onDispose);
      map.image = image;
      map.needsUpdate = true;
      requestRender?.();
    }, undefined, () => {
      // Keep valid fallback and allow a demand-rendering host to settle normally.
      if (!disposed) requestRender?.();
    });
    return map;
  }

  return {
    limestone: {
      map: texture('limestone-color.webp', [2.2, 3.2], '#eceae3', true),
      normalMap: texture('limestone-normal.webp', [2.2, 3.2], '#8080ff', false)
    },
    terrazzo: {
      map: texture('terrazzo-color.webp', [6.5, 12], '#dedbd3', true),
      normalMap: texture('terrazzo-normal.webp', [6.5, 12], '#8080ff', false)
    },
    wood: texture('wood-color.webp', [1, 4], '#c8b39d', true)
  };
}
