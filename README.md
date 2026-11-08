# HiARCH / HiPLAN / HiREAL

Tři pracovní směry nové prezentace: A — Papírový ateliér, B — Atlas a C — Galerie projektů.

Statický export aktuální verze V08 pro klientské prohlížení přes GitHub Pages. Úvodní stránka je `index.html`.

Fotografie, výkresy a vizualizace vycházejí z podkladů jednotlivých projektů. Zahrnuté fonty a knihovny mají licence v `assets/licenses/` a `assets/vendor/`.

## Ovládání galerie

Ovládání chůze bylo převzato z vlastního enginu FD Prohlídka: `input/touchLook.ts` a `controls/pathfinding.ts` ze stavu `4b9ad14` jsou přeloženy do `fd-touch-look-v8.js` a `fd-pathfinding-v8.js` bez změny logiky. Palcový ovladač používá stejnou mrtvou zónu 10 % a odezvu s^1,5. Engine ani jeho soukromá data se v tomto projektu nemění.

W/S nebo šipky nahoru/dolů: chůze. A/D: pohyb do stran. Šipky vlevo/vpravo: otočení. Tažení: rozhlížení nebo obcházení modelu. Kliknutí na podlahu: bezpečný přesun kolem vitrín. Kliknutí na vybraný model: detail.
