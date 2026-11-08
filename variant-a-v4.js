(() => {
  'use strict';
  const stage = document.querySelector('[data-maquette]');
  if (!stage) return;

  const tabs = [...stage.querySelectorAll('[data-company-tab]')];
  const planes = [...stage.querySelectorAll('[data-plane]')];
  const company = document.querySelector('[data-role-title]');
  const service = document.querySelector('[data-role-service]');
  const support = document.querySelector('[data-role-copy]');
  const unfold = document.querySelector('[data-explode]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const roles = {
    hiarch: {
      company: 'HiARCH',
      service: 'Navrhujeme architekturu a připravujeme povolení.',
      support: 'Od prvního návrhu k dokumentaci pro povolovací proces.'
    },
    hiplan: {
      company: 'HiPLAN',
      service: 'Realizujeme vlastní developerské projekty.',
      support: 'Samostatná část skupiny věnovaná realizaci vlastních projektů.'
    },
    hireal: {
      company: 'HiREAL',
      service: 'Věnujeme se realitní činnosti a nabývání nemovitostí.',
      support: 'Realitní činnost a nabývání nemovitostí.'
    }
  };
  const hoverIntentMs = 95;
  const transitionLockMs = 780;
  let transitionLockedUntil = 0;
  let hoverTimer = 0;
  let hoverCandidate = '';
  let touchGesture = null;
  let suppressPlaneClickUntil = 0;

  function selectCompany(key, moveFocus = false, lockTransition = true) {
    const role = roles[key] || roles.hiarch;
    const changed = stage.dataset.activePlane !== key;
    if (changed && lockTransition) transitionLockedUntil = performance.now() + transitionLockMs;
    if (hoverTimer) window.clearTimeout(hoverTimer);
    hoverTimer = 0;
    hoverCandidate = '';
    stage.dataset.activePlane = key;
    stage.dataset.exploded = 'false';
    document.getElementById('company-service')?.setAttribute('aria-labelledby', `company-tab-${key}`);
    if (unfold) {
      unfold.setAttribute('aria-pressed', 'false');
      unfold.innerHTML = 'Rozložit prostor <span aria-hidden="true">↗</span>';
    }
    tabs.forEach((tab) => {
      const selected = tab.dataset.companyTab === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    planes.forEach((plane) => {
      plane.dataset.active = String(plane.dataset.plane === key);
    });
    company.textContent = role.company;
    service.textContent = role.service;
    support.textContent = role.support;
  }

  function stepCompany(direction) {
    const current = Math.max(0, tabs.findIndex((tab) => tab.dataset.companyTab === stage.dataset.activePlane));
    const next = (current + direction + tabs.length) % tabs.length;
    selectCompany(tabs[next].dataset.companyTab);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectCompany(tab.dataset.companyTab));
    tab.addEventListener('focus', () => selectCompany(tab.dataset.companyTab));
    tab.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(tab);
      let next = current;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectCompany(tabs[next].dataset.companyTab, true);
    });
  });

  planes.forEach((plane) => {
    plane.addEventListener('focus', () => selectCompany(plane.dataset.plane));
    plane.addEventListener('click', (event) => {
      if (event.detail > 0 && performance.now() < suppressPlaneClickUntil) return;
      selectCompany(plane.dataset.plane);
    });
    plane.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectCompany(plane.dataset.plane);
    });
  });

  unfold?.addEventListener('click', () => {
    const isOpen = stage.dataset.exploded !== 'true';
    stage.dataset.exploded = String(isOpen);
    unfold.setAttribute('aria-pressed', String(isOpen));
    unfold.innerHTML = isOpen
      ? 'Složit prostor <span aria-hidden="true">↙</span>'
      : 'Rozložit prostor <span aria-hidden="true">↗</span>';
  });

  selectCompany(stage.dataset.activePlane || 'hiarch');

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    touchGesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { passive: true });
  window.addEventListener('pointerup', (event) => {
    if (!touchGesture || event.pointerId !== touchGesture.id) return;
    const dx = event.clientX - touchGesture.x;
    const dy = event.clientY - touchGesture.y;
    touchGesture = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    suppressPlaneClickUntil = performance.now() + 320;
    stepCompany(dx < 0 ? 1 : -1);
  }, { passive: true });
  window.addEventListener('pointercancel', () => { touchGesture = null; }, { passive: true });

  const processDeck = document.querySelector('[data-process-deck]');
  if (processDeck) {
    const processCards = [...processDeck.querySelectorAll('[data-process-card]')];
    const processButtons = [...document.querySelectorAll('[data-process-select]')];
    const processPosition = document.querySelector('[data-process-position]');
    let processTouch = null;
    let suppressProcessClickUntil = 0;

    function selectProcessStep(index, focus = false) {
      const step = (index + processCards.length) % processCards.length;
      processDeck.dataset.activeStep = String(step);
      processCards.forEach((card, cardIndex) => {
        const distance = (cardIndex - step + processCards.length) % processCards.length;
        const position = distance === 0 ? 'active' : distance === 1 ? 'next' : 'previous';
        const active = distance === 0;
        card.dataset.deckPosition = position;
        card.setAttribute('aria-pressed', String(active));
        card.setAttribute('aria-hidden', String(!active));
        card.tabIndex = active ? 0 : -1;
        if (active && focus) card.focus();
      });
      processButtons.forEach((button, buttonIndex) => button.setAttribute('aria-pressed', String(buttonIndex === step)));
      if (processPosition) processPosition.textContent = `${String(step + 1).padStart(2, '0')} / ${String(processCards.length).padStart(2, '0')}`;
    }

    document.querySelector('.process-deck-wrap [data-process-prev]')?.addEventListener('click', () => selectProcessStep(Number(processDeck.dataset.activeStep) - 1));
    document.querySelector('.process-deck-wrap [data-process-next]')?.addEventListener('click', () => selectProcessStep(Number(processDeck.dataset.activeStep) + 1));
    processButtons.forEach((button) => button.addEventListener('click', () => selectProcessStep(Number(button.dataset.processSelect))));
    processCards.forEach((card) => {
      card.addEventListener('click', (event) => {
        if (event.detail > 0 && performance.now() < suppressProcessClickUntil) return;
        selectProcessStep(Number(card.dataset.processCard));
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectProcessStep(Number(card.dataset.processCard));
        }
      });
    });
    processDeck.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectProcessStep(Number(processDeck.dataset.activeStep) + 1, true);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectProcessStep(Number(processDeck.dataset.activeStep) - 1, true);
      }
    });
    processDeck.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') processTouch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }, { passive: true });
    window.addEventListener('pointerup', (event) => {
      if (!processTouch || event.pointerId !== processTouch.id) return;
      const dx = event.clientX - processTouch.x;
      const dy = event.clientY - processTouch.y;
      processTouch = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      suppressProcessClickUntil = performance.now() + 320;
      selectProcessStep(Number(processDeck.dataset.activeStep) + (dx < 0 ? 1 : -1));
    }, { passive: true });
    window.addEventListener('pointercancel', () => { processTouch = null; }, { passive: true });
    selectProcessStep(Number(processDeck.dataset.activeStep) || 0);
  }

  const finePointer = window.matchMedia('(pointer: fine)');
  if (finePointer.matches) {
    let frame = 0;
    stage.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (!reducedMotion.matches && !frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          const bounds = stage.getBoundingClientRect();
          const px = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
          const py = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
          stage.style.setProperty('--paper-turn-x', `${((.5 - py) * 3).toFixed(2)}deg`);
          stage.style.setProperty('--paper-turn-y', `${((px - .5) * 4).toFixed(2)}deg`);
        });
      }

      const plane = event.target.closest('[data-plane]');
      const key = plane?.dataset.plane || '';
      if (!key || key === stage.dataset.activePlane || performance.now() < transitionLockedUntil) {
        if (hoverTimer) window.clearTimeout(hoverTimer);
        hoverTimer = 0;
        hoverCandidate = '';
        return;
      }
      if (key === hoverCandidate) return;
      if (hoverTimer) window.clearTimeout(hoverTimer);
      hoverCandidate = key;
      const pointerX = event.clientX;
      const pointerY = event.clientY;
      hoverTimer = window.setTimeout(() => {
        hoverTimer = 0;
        const latestPlane = document.elementFromPoint(pointerX, pointerY)?.closest('[data-plane]');
        if (latestPlane?.dataset.plane === hoverCandidate && performance.now() >= transitionLockedUntil) {
          selectCompany(hoverCandidate);
        }
        hoverCandidate = '';
      }, hoverIntentMs);
    }, { passive: true });
    stage.addEventListener('pointerleave', () => {
      if (!reducedMotion.matches) {
        stage.style.setProperty('--paper-turn-x', '0deg');
        stage.style.setProperty('--paper-turn-y', '0deg');
      }
      if (hoverTimer) window.clearTimeout(hoverTimer);
      hoverTimer = 0;
      hoverCandidate = '';
    }, { passive: true });
  }

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    document.documentElement.dataset.reveal = 'on';
    const targets = document.querySelectorAll('.a-intro,.section-title,.approach-inner,.company-grid,.editorial-section,.contact-inner');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    targets.forEach((target) => {
      target.classList.add('scroll-in');
      observer.observe(target);
    });
  }
})();
