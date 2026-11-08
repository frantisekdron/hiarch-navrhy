(() => {
  'use strict';
  const legacy = {
    koupelni:'assets/v6/photos/koupelni-aerial.webp', hustopece:'assets/v6/photos/hustopece.webp',
    transped:'assets/v6/photos/transped.webp', wurmova:'assets/v6/photos/wurmova.webp',
    bystrc:'assets/v6/photos/bystrc.webp', selska84:'assets/v6/photos/selska84.webp',
    ivancice:'assets/v6/photos/ivancice.webp', nebovidy:'assets/v6/photos/nebovidy.webp'
  };
  const fallbackProjects = [
    {id:'koupelni',name:'Koupelní 2',city:'Hodonín',type:'Polyfunkční dům',summary:'Proměna bývalé administrativní budovy v polyfunkční dům v Hodoníně.',status:'Dokončená 1. etapa',image:legacy.koupelni},
    {id:'hustopece',name:'Dětská skupina Hustopeče',city:'Hustopeče',year:'2026',type:'Veřejná budova',status:'Realizace dle portfolia',image:legacy.hustopece},
    {id:'transped',name:'HP Transped',city:'Brno',year:'2024',type:'Administrativní budova s halou',status:'Realizace dle portfolia',image:legacy.transped},
    {id:'wurmova',name:'RD Wurmova',city:'Brno',year:'2017',type:'Rodinný dům',status:'Realizace dle portfolia',image:legacy.wurmova},
    {id:'bystrc',name:'Přístaviště Bystrc',city:'Brno',year:'2011',type:'Občanská vybavenost',status:'Realizace dle portfolia',image:legacy.bystrc},
    {id:'selska84',name:'BD Selská 84',city:'Brno',year:'2024',type:'Bytový dům',status:'Realizace dle portfolia',image:legacy.selska84},
    {id:'ivancice',name:'KoDuS Ivančice',city:'Ivančice',year:'2016',type:'Komunitní dům',status:'Realizace dle portfolia',image:legacy.ivancice},
    {id:'nebovidy',name:'Vývojové centrum Veselý DS',city:'Nebovidy',year:'2020',type:'Vývojové centrum',status:'Realizace dle portfolia',image:legacy.nebovidy}
  ];
  const imagePath = (value,id) => value || legacy[id] || '';
  const text = (value) => String(value ?? '').trim();
  const imageWithFallback = (img,primary,id,secondary) => {
    const candidates=[primary,secondary,legacy[id]].filter(Boolean).map(src=>new URL(src,document.baseURI).href);
    const tried=new Set();
    const attempt=()=>{const next=candidates.find(src=>!tried.has(src));if(!next){img.removeAttribute('src');img.classList.add('image-missing');return;}tried.add(next);img.src=next;};
    img.onerror=attempt;attempt();
  };
  async function getProjects(){
    try{const response=await fetch('assets/v6/projects.json',{cache:'no-store'});if(!response.ok)throw Error('projects');const payload=await response.json();if(!Array.isArray(payload.projects))throw Error('schema');return {projects:payload.projects.filter(p=>p&&p.id&&p.name),fallback:false};}
    catch{return {projects:fallbackProjects,fallback:true};}
  }
  function displayType(type){const labels={housing:'Bydlení',public:'Veřejné stavby',commercial:'Komerční stavby'};const key=text(type).toLowerCase();return labels[key]||text(type)||'Projekt';}
  function renderCard(project){
    const card=document.createElement('button');card.type='button';card.className='project-card';card.dataset.projectId=project.id;
    const image=document.createElement('img');image.alt=text(project.name);image.loading='lazy';imageWithFallback(image,project.preview||project.image,project.id,project.original);
    const meta=document.createElement('div');meta.className='card-meta';meta.innerHTML='<span></span><span></span>';meta.children[0].textContent=displayType(project.type);meta.children[1].textContent=text(project.year);
    const title=document.createElement('h3');title.textContent=text(project.name);
    const city=document.createElement('div');city.className='card-city';city.textContent=text(project.city);
    card.append(image,meta,title,city);
    if(text(project.status)){const status=document.createElement('div');status.className='card-status';status.textContent=text(project.status);card.append(status);}
    return card;
  }
  function setupVariant(projects,fallback){
    const grid=document.querySelector('[data-project-grid]'),filters=document.querySelector('[data-project-filters]'),status=document.querySelector('[data-project-status]');
    const dialog=document.querySelector('[data-project-dialog]'),dialogBody=document.querySelector('[data-dialog-body]');
    let activeFilter='*';
    if(grid&&filters){
      const types=[...new Set(projects.map(p=>displayType(p.type)))];
      const choices=[['*','Všechny typy'],...types.map(type=>[type,type])];
      filters.replaceChildren(...choices.map(([key,label],index)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.filter=key;b.setAttribute('aria-pressed',String(index===0));return b;}));
      const draw=()=>{grid.replaceChildren();const shown=projects.filter(p=>activeFilter==='*'||displayType(p.type)===activeFilter);if(!shown.length){const e=document.createElement('p');e.className='empty-state';e.textContent='Pro tento filtr tu zatím nejsou projekty.';grid.append(e);return;}shown.forEach(p=>grid.append(renderCard(p)));};
      filters.addEventListener('click',event=>{const b=event.target.closest('[data-filter]');if(!b)return;activeFilter=b.dataset.filter;filters.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===b)));draw();});
      grid.addEventListener('click',event=>{const card=event.target.closest('[data-project-id]');if(!card)return;const p=projects.find(item=>item.id===card.dataset.projectId);if(p)openProject(p);});
      draw();
      if(status)status.textContent=fallback?'Zobrazeny jsou dostupné lokální podklady; po načtení projektového souboru se použijí jeho záznamy.':'';
    }
    function openProject(p){
      if(!dialog||!dialogBody)return;
      const image=document.createElement('img');image.alt=text(p.name);imageWithFallback(image,p.image,p.id,p.original);
      const copy=document.createElement('div');copy.className='dialog-copy';
      const kicker=document.createElement('p');kicker.className='overline';kicker.textContent=[p.city,p.year].filter(Boolean).join(' · ');
      const title=document.createElement('h2');title.textContent=text(p.name);
      copy.append(kicker,title);
      if(text(p.summary)){const summary=document.createElement('p');summary.textContent=text(p.summary);copy.append(summary);}
      const facts=document.createElement('div');facts.className='dialog-facts';
      [["Typ",displayType(p.type)],["Stav",text(p.status)],["Rok",text(p.year)],["Místo",text(p.city)]].filter(([,value])=>value).forEach(([key,value])=>{const item=document.createElement('span');item.textContent=key;const detail=document.createElement('b');detail.textContent=value;item.append(detail);facts.append(item);});
      copy.append(facts);
      const galleryItems=Array.isArray(p.gallery)?p.gallery.map(item=>typeof item==='string'?{src:item,alt:text(p.name)}:{src:item?.image||item?.src,alt:item?.alt||text(p.name)}).filter(item=>item.src&&item.src!==p.image):[];
      let gallery=null;
      if(galleryItems.length){gallery=document.createElement('section');gallery.className='dialog-gallery';gallery.style.gridColumn='1 / -1';gallery.style.padding='20px clamp(20px,4vw,42px) 28px';gallery.style.borderTop='1px solid rgba(36,39,38,.18)';const galleryTitle=document.createElement('h3');galleryTitle.textContent='Další pohledy';galleryTitle.style.cssText='font:20px var(--display);margin:0 0 12px';const strip=document.createElement('div');strip.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px';gallery.append(galleryTitle,strip);galleryItems.forEach(item=>{const photo=document.createElement('img');photo.alt=item.alt;photo.loading='lazy';photo.style.cssText='display:block;width:100%;aspect-ratio:1.35;object-fit:cover;background:#ddd9cf';imageWithFallback(photo,item.src,p.id,p.image);strip.append(photo);});}
      dialogBody.replaceChildren(...(gallery?[image,copy,gallery]:[image,copy]));if(!dialog.open)dialog.showModal();
    }
    if(dialog){dialog.querySelector('.dialog-close')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});}
  }
  const plan=document.querySelector('.a-plan');
  if(plan){
    const result=plan.querySelector('#path-result'),close=plan.querySelector('[data-close-path]'),buttons=[...plan.querySelectorAll('[data-path]')];
    const copy={plan:'<b>HiARCH</b><span>Návrhy a povolení pro váš stavební záměr.</span><a href="#kontakt">Probrat váš záměr ↗</a>',home:'<b>HiREAL</b><span>Realitní služby a nabídka nemovitostí.</span><a href="#projekty">Prohlédnout projekty ↗</a>'};
    const choose=key=>{plan.dataset.path=key||'';buttons.forEach(button=>{const active=button.dataset.path===key;button.setAttribute('aria-expanded',String(active));});result.hidden=!key;close.hidden=!key;result.innerHTML=key?copy[key]:'';};
    buttons.forEach(button=>button.addEventListener('click',()=>choose(button.dataset.path)));
    close?.addEventListener('click',()=>choose(''));
  }
  getProjects().then(({projects,fallback})=>{
    setupVariant(projects,fallback);
    const mediaName=document.getElementById('media-name'),before=document.getElementById('media-before'),after=document.getElementById('media-after'),kicker=document.getElementById('media-kicker'),mediaStatus=document.getElementById('media-status');
    if(!mediaName||!before||!after)return;
    if(!projects.length){mediaName.textContent='Podklady zatím nejsou dostupné';if(mediaStatus)mediaStatus.textContent='';return;}
    let index=0;
    const paint=()=>{const p=projects[index];mediaName.textContent=text(p.name);kicker.textContent=[p.city,p.year].filter(Boolean).join(' · ')||'PROJEKT / OBRAZ';imageWithFallback(before,p.original,p.id,p.image);imageWithFallback(after,p.image,p.id,p.original);if(mediaStatus)mediaStatus.textContent=fallback?'Lokální obrazové podklady · záloha do příchodu centrálních dat.':'';};
    paint();
    document.getElementById('media-prev')?.addEventListener('click',()=>{index=(index-1+projects.length)%projects.length;paint();});
    document.getElementById('media-next')?.addEventListener('click',()=>{index=(index+1)%projects.length;paint();});
  });
})();
