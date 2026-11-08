# HiARCH / HiPLAN / HiREAL

Tři pracovní směry nové prezentace: A — Papírový ateliér, B — Atlas a C — Galerie projektů.

Statický export aktuální verze V09 pro klientské prohlížení přes GitHub Pages. Úvodní stránka je `index.html`.

Fotografie, výkresy a vizualizace vycházejí z podkladů jednotlivých projektů. Zahrnuté fonty a knihovny mají licence v `assets/licenses/` a `assets/vendor/`.

## Ovládání galerie

Ovládání chůze bylo převzato z vlastního enginu FD Prohlídka: `input/touchLook.ts` a `controls/pathfinding.ts` ze stavu `4b9ad14` jsou přeloženy do `fd-touch-look-v8.js` a `fd-pathfinding-v8.js` bez změny logiky. Palcový ovladač používá stejnou mrtvou zónu 10 % a odezvu s^1,5. Engine ani jeho soukromá data se v tomto projektu nemění.

W/S nebo šipky nahoru/dolů: chůze. A/D: pohyb do stran. Šipky vlevo/vpravo: otočení. Tažení: rozhlížení nebo obcházení modelu. Kliknutí na podlahu: bezpečný přesun kolem vitrín. Kliknutí na vybraný model: detail.

## V09 — grafika a světlo

Sdílená kontrastní paleta pro přehled a varianty A/B/C, explicitní barvy tlačítek i pro iOS a jasné aktivní/fokusové stavy. Textové kombinace se kontrolují podle WCAG 2.2 AA (1.4.3), důležité ovládání podle 1.4.11. Jde o kontrolu těchto vlastností, nikoli certifikaci celé přístupnosti.

Galerie má světlý den, téměř černou noc a neon s výraznými barevnými odrazy. Vybraný exponát používá šikmé hlavní světlo s filtrováním stínů a samostatné boční světlo; v noci se potlačuje okolní světlo i odražená energie prostředí. Noční režimy používají jedinou stínovou mapu, na mobilu s nižším rozlišením.
