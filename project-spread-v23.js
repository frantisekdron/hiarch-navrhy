(() => {
  const photos = JSON.parse(document.getElementById('photo-data').textContent);
  const name = document.querySelector('h1').textContent;
  const feature = document.getElementById('feature');
  const strip = document.querySelector('.filmstrip');
  const frames = Array.from(strip.querySelectorAll('[data-index]'));
  const modal = document.getElementById('lightbox');
  const large = document.getElementById('large-image');
  const labels = { photo: 'Fotografie', plan: 'Výkres', render: 'Vizualizace' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = photos.map((_, i) => i);
  let current = 0;
  let returnFocus;

  const selectedLight = new URLSearchParams(location.search).get('svetlo');
  if (selectedLight === 'noc' || selectedLight === 'neon') {
    document.querySelectorAll('[data-model-link]').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('svetlo', selectedLight);
      link.href = url;
    });
  }
  const pad = n => String(n).padStart(2, '0');

  function showLarge() {
    const image = photos[current];
    large.alt = name + ' – ' + image.caption;
    large.src = image.src;
    large.parentElement.dataset.kind = image.kind;
  }
  function display(index, announce = true) {
    if (!visible.includes(index)) return;
    current = index;
    const image = photos[index];
    feature.alt = name + ' – ' + image.caption;
    feature.width = image.width;
    feature.height = image.height;
    feature.srcset = image.srcset;
    feature.src = image.src;
    feature.parentElement.dataset.kind = image.kind;
    if (modal.open) showLarge();
    const position = visible.indexOf(index) + 1;
    document.querySelectorAll('[data-caption]').forEach(el => { el.textContent = image.caption; });
    document.querySelectorAll('[data-counter]').forEach(el => { el.textContent = pad(position) + ' / ' + pad(visible.length); });
    document.querySelectorAll('[data-kind-label]').forEach(el => { el.textContent = labels[image.kind]; });
    document.querySelectorAll('[data-step]').forEach(el => { el.disabled = visible.length < 2; });
    frames.forEach((frame, i) => {
      if (i === index) frame.setAttribute('aria-current', 'true');
      else frame.removeAttribute('aria-current');
    });
    const frame = frames[index];
    const offset = frame.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    if (offset < 0 || offset + frame.offsetWidth > strip.clientWidth) {
      strip.scrollBy({ left: offset - (strip.clientWidth - frame.offsetWidth) / 2, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    if (announce) document.getElementById('readout').textContent = position + ' z ' + visible.length + '. ' + image.caption;
  }
  function step(delta) {
    const next = (visible.indexOf(current) + delta + visible.length) % visible.length;
    display(visible[next]);
  }
  function enlarge(origin = document.querySelector('[data-enlarge]')) {
    returnFocus = origin;
    showLarge();
    modal.showModal();
  }
  strip.addEventListener('click', event => {
    const frame = event.target.closest('[data-index]');
    if (!frame || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    display(Number(frame.dataset.index));
  });
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.step))));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    visible = photos.flatMap((photo, i) => filter === 'all' || photo.kind === filter ? [i] : []);
    frames.forEach((frame, i) => { frame.hidden = !visible.includes(i); });
    document.querySelectorAll('[data-filter]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    display(visible.includes(current) ? current : visible[0]);
  }));
  document.querySelector('[data-enlarge]').addEventListener('click', event => enlarge(event.currentTarget));
  document.querySelectorAll('[data-plate]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!visible.includes(Number(link.dataset.plate))) document.querySelector('[data-filter="all"]')?.click();
    display(Number(link.dataset.plate));
    enlarge(link);
  }));
  document.querySelector('[data-dismiss]').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => returnFocus?.focus({ preventScroll: true }));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (!modal.open && document.activeElement !== document.body && !document.activeElement.closest('.photo-section')) return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1);
  });
  document.querySelectorAll('[data-gesture]').forEach(surface => {
    let start, suppressClickUntil = 0;
    surface.addEventListener('pointerdown', event => {
      if (!event.isPrimary) { start = null; return; }
      if (event.button !== 0 || event.target.closest('button')) return;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    surface.addEventListener('pointercancel', () => { start = null; });
    surface.addEventListener('pointerup', event => {
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 42 && Math.abs(dx) > 1.35 * Math.abs(dy)) {
        suppressClickUntil = performance.now() + 450;
        step(dx < 0 ? 1 : -1);
      }
    });
    surface.addEventListener('click', event => {
      if (event.target === feature && performance.now() > suppressClickUntil) enlarge();
    });
  });
  display(0, false);
})();
