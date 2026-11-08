(() => {
  'use strict';
  const stage=document.querySelector('[data-maquette]');
  if(!stage)return;
  const tabs=[...stage.querySelectorAll('[data-company-tab]')];
  const planes=[...stage.querySelectorAll('[data-plane]')];
  const title=document.querySelector('[data-role-title]');
  const copy=document.querySelector('[data-role-copy]');
  const explodedButton=document.querySelector('[data-explode]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const roles={
    hiarch:{title:'HiARCH',copy:'Navrhujeme architekturu a připravujeme záměry i povolení.'},
    hiplan:{title:'HiPLAN',copy:'Realizujeme vlastní developerské projekty.'},
    hireal:{title:'HiREAL',copy:'Věnujeme se realitní činnosti a nabídce nemovitostí.'}
  };
  function select(key,focus=false){
    const content=roles[key]||roles.hiarch;
    stage.dataset.activePlane=key;
    tabs.forEach(tab=>{const active=tab.dataset.companyTab===key;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();});
    planes.forEach(plane=>plane.dataset.active=String(plane.dataset.plane===key));
    title.textContent=content.title;copy.textContent=content.copy;
  }
  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>select(tab.dataset.companyTab));
    tab.addEventListener('keydown',event=>{
      const index=tabs.indexOf(tab);let next=index;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();select(tabs[next].dataset.companyTab,true);
    });
  });
  select('hiarch');
  explodedButton?.addEventListener('click',()=>{
    const open=stage.dataset.exploded!=='true';stage.dataset.exploded=String(open);
    explodedButton.setAttribute('aria-pressed',String(open));
    explodedButton.innerHTML=open?'Složit prostor <span>↙</span>':'Rozložit prostor <span>↗</span>';
  });
  const finePointer=window.matchMedia('(pointer: fine)');
  if(finePointer.matches&&!reduced.matches){
    let frame=0,latest=null;
    stage.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse')return;
      latest=event;
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;if(!latest)return;
        const bounds=stage.getBoundingClientRect();
        const x=(latest.clientX-bounds.left)/bounds.width-.5;
        const y=(latest.clientY-bounds.top)/bounds.height-.5;
        stage.style.setProperty('--ry',`${(x*6).toFixed(2)}deg`);
        stage.style.setProperty('--rx',`${(-y*6).toFixed(2)}deg`);
      });
    },{passive:true});
    stage.addEventListener('pointerleave',()=>{latest=null;stage.style.setProperty('--rx','0deg');stage.style.setProperty('--ry','0deg');},{passive:true});
  }
  if(!reduced.matches){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{stage.dataset.assembled='true';}));
    if('IntersectionObserver'in window){
      document.documentElement.dataset.reveal='on';
      const targets=document.querySelectorAll('.a-intro,.section-title,.approach-inner,.company-grid,.editorial-section,.contact-inner');
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});
      targets.forEach(target=>{target.classList.add('scroll-in');observer.observe(target);});
    }
  }
})();
