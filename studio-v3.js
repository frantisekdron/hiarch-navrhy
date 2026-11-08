(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
 document.querySelectorAll('.direction-card').forEach(card=>{
  let scheduled=0,next=null;
  card.addEventListener('pointermove',e=>{if(reduced.matches||!fine.matches)return;const r=card.getBoundingClientRect();next={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5};if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;if(next){card.style.setProperty('--tilt-x',`${-next.y*5}deg`);card.style.setProperty('--tilt-y',`${next.x*6}deg`);}})});
  card.addEventListener('pointerleave',()=>{next=null;card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
 });
 const control=document.querySelector('.compare-control');
 control?.addEventListener('input',()=>{control.closest('.comparison').style.setProperty('--compare',`${control.value}%`);control.setAttribute('aria-valuetext',`${control.value} % upravené fotografie`);});
})();
