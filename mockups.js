(() => {
  const params = new URLSearchParams(location.search);
  const version = ['1','2','3'].includes(params.get('v')) ? params.get('v') : '1';
  const screen = ['hero','portfolio','detail'].includes(params.get('s')) ? params.get('s') : 'hero';
  const root = document.getElementById('mockup');
  const content = document.getElementById('mock-content');
  const img = (file, alt, cls='') => `<img class="${cls}" src="assets/${file}" alt="${alt}">`;
  const data = {
    1: {
      hero: `<div class="v1-hero"><div class="v1-plan"><figure class="photo-wing wing-hiarch">${img('hiarch-04.webp','Přístaviště Bystrc, projekt HiARCH')}<figcaption><b>HiARCH</b><span>Navrhujeme</span></figcaption></figure><figure class="photo-wing wing-hiplan">${img('koupelni-aerial.webp','Projekt Koupelní 2 v Hodoníně')}<figcaption><b>HiPLAN</b><span>Stavíme</span></figcaption></figure><figure class="photo-wing wing-hireal">${img('koupelni-front.webp','Budova projektu Koupelní 2')}<figcaption><b>HiREAL</b><span>Nabízíme</span></figcaption></figure><section class="courtyard" aria-live="polite"><h1>Co tu může<br>vzniknout<br>pro vás?</h1><div class="journey-actions"><button type="button" data-choice="project" aria-controls="route-result" aria-pressed="false" aria-expanded="false">Mám stavební záměr</button><button type="button" data-choice="property" aria-controls="route-result" aria-pressed="false" aria-expanded="false">Hledám nemovitost</button></div><div class="route-result" id="route-result" hidden></div><button type="button" class="route-close" hidden>Zavřít výběr ×</button></section><small class="groundnote">Půdorysná scénografie · grafika identity</small></div></div>`,
      portfolio: `<div class="subhead"><div><small class="kicker">VÝBĚR MÍST / RŮZNÉ PROJEKTY</small><h1>Projekty mají<br>svou adresu.</h1></div><p>Různá měřítka a různá místa v jednom portfoliu.</p></div><div class="projects"><figure class="project-main">${img('hiarch-01.webp','Dětská skupina v Hustopečích')}<figcaption>HUSTOPEČE · 2026 · PODKLAD Z PORTFOLIA<b>Dětská skupina</b></figcaption></figure><div class="project-side"><figure>${img('hiarch-02.webp','Projekt HP Transped z roku 2024')}<figcaption>2024 · PODKLAD Z PORTFOLIA<b>HP Transped</b></figcaption></figure><figure>${img('hiarch-05.webp','Projekt bytového domu Selská 84 z roku 2024')}<figcaption>2024 · PODKLAD Z PORTFOLIA<b>BD Selská 84</b></figcaption></figure></div></div><div class="data-strip"><span>UKÁZKY<b>3 RŮZNÉ PROJEKTY</b></span><span>MÉDIA<b>PODKLADY Z PORTFOLIA</b></span><span>DALŠÍ UKÁZKY<b>HiARCH 03 · HiARCH 04</b></span></div>`,
      detail: `<div class="subhead"><div><small class="kicker">HODONÍN / VLASTNÍ PROJEKT</small></div><span class="kicker">DETAIL MÍSTA · 01</span></div><div class="v1-detail-grid">${img('koupelni-front.webp','Přední pohled na projekt Koupelní 2')}<div class="v1-detail-copy"><div class="kicker">NOVÁ ADRESA V HODONÍNĚ</div><h1>Koupelní 2</h1><p class="serif">Místo pro další příběh.</p><p>Proměna bývalé administrativní budovy v polyfunkční dům v Hodoníně.</p><div class="plans"><div class="plan-graphic"><span>GRAFICKÝ PRINCIP · NE PŮDORYS</span></div><div class="plan-graphic"><span>GRAFICKÁ SCHÉMA</span></div></div></div></div>`
    },
    2: {
      hero: `<div class="v2-hero"><div id="map-demo" aria-label="Ukázka hlavního principu Atlas míst"></div></div>`,
      portfolio: `<div class="v2-portfolio"><div id="map-demo" data-mode="3d" aria-label="Prostorová zkouška stejné mapy Atlas míst"></div></div>`,
      detail: `<div class="v2-detail-layout">${img('koupelni-aerial.webp','Letecký pohled na Koupelní 2')}<div class="v2-detail-copy"><small class="location">HODONÍN / VLASTNÍ PROJEKT</small><h1>Koupelní 2</h1><p>Místo v atlasu není jen špendlík. Je to souvislost mezi adresou, lidmi, kteří na ní pracují, a tím, co tu vzniká.</p><p>Detail projektu ukáže ověřený stav, zapojené firmy i další kroky — v měřítku, které dává smysl.</p><div class="v2-tags"><span>HiPLAN</span><span>HiARCH</span><span>POLYFUNKČNÍ DŮM</span></div></div></div>`
    },
    3: {
      hero: `<div class="v3-hero"><div id="film-demo" aria-label="Ukázka hlavního filmového principu"></div></div>`,
      portfolio: `<div class="film-portfolio-title"><div><small class="kicker">VÝBĚR MÍST · TŘI POHLEDY</small><h1>Každé místo má rytmus.</h1></div><p>Filmový výběr zůstává klidný. Jméno a stav jsou vždy čitelné.</p></div><div class="film-projects"><figure>${img('film-city.webp','Městský kontext projektu Koupelní 2')}<figcaption>KONTEXT<b>Koupelní 2 / Hodonín</b></figcaption></figure><figure>${img('film-building.webp','Budova projektu Koupelní 2')}<figcaption>ARCHITEKTURA<b>Budova</b></figcaption></figure><figure>${img('film-detail.webp','Detail projektu Koupelní 2')}<figcaption>DETAIL<b>Prostor</b></figcaption></figure></div><div class="film-data"><span>DEMO MONTÁŽ · SKUTEČNÉ ZÁBĚRY</span><span>FOTO/VIDEO · KOUPELNÍ 2</span><span>NEJDE O HOTOVÝ FILM</span></div>`,
      detail: `<div class="film-detail-layout">${img('film-building.webp','Budova projektu Koupelní 2, filmový záběr')}<div class="film-detail-copy"><small>HODONÍN · HiPLAN</small><h1>Koupelní 2</h1><p class="film-quote">Polyfunkční dům v Hodoníně</p><p>Proměna bývalé administrativní budovy v polyfunkční dům.</p><p class="film-meta">UKÁZKOVÁ KOMPOZICE · OVĚŘENÝ OBSAH DOPLNIT</p></div></div>`
    }
  };
  root.classList.add(`v${version}`);
  root.classList.add(`view${version}`);
  if(screen !== 'hero') root.classList.add(screen);
  content.className = `scene ${screen}`;
  content.innerHTML = data[version][screen];
  if(version === '1' && screen === 'hero') {
    const hero = content.querySelector('.v1-hero');
    const actions = [...content.querySelectorAll('[data-choice]')];
    const result = content.querySelector('.route-result');
    const close = content.querySelector('.route-close');
    const copy = {
      project: '<b>HiARCH</b><span>Návrhy a povolení pro váš stavební záměr.</span>',
      property: '<b>HiREAL</b><span>Realitní služby a nabídka nemovitostí.</span>'
    };
    const setChoice = (choice) => {
      hero.dataset.choice = choice || '';
      actions.forEach((button) => {
        const active = button.dataset.choice === choice;
        button.setAttribute('aria-pressed', String(active));
        button.setAttribute('aria-expanded', String(active));
      });
      result.hidden = !choice;
      close.hidden = !choice;
      result.innerHTML = choice ? copy[choice] : '';
    };
    actions.forEach((button) => button.addEventListener('click', () => setChoice(button.dataset.choice)));
    close.addEventListener('click', () => setChoice(''));
  }
})();
