(() => {
  'use strict';
  const legacy={koupelni:'assets/v6/photos/koupelni-aerial.webp',hustopece:'assets/v6/photos/hustopece.webp',transped:'assets/v6/photos/transped.webp',wurmova:'assets/v6/photos/wurmova.webp',bystrc:'assets/v6/photos/bystrc.webp',selska84:'assets/v6/photos/selska84.webp',ivancice:'assets/v6/photos/ivancice.webp',nebovidy:'assets/v6/photos/nebovidy.webp'};
  const backup=[
    {id:'koupelni',name:'Koupelní 2',city:'Hodonín',type:'Polyfunkční dům',status:'Dokončená 1. etapa',image:legacy.koupelni,original:legacy.koupelni},
    {id:'hustopece',name:'Dětská skupina Hustopeče',city:'Hustopeče',year:'2026',type:'Veřejná budova',status:'Realizace dle portfolia',image:legacy.hustopece,original:legacy.hustopece},
    {id:'transped',name:'HP Transped',city:'Brno',year:'2024',type:'Administrativní budova s halou',status:'Realizace dle portfolia',image:legacy.transped,original:legacy.transped},
    {id:'wurmova',name:'RD Wurmova',city:'Brno',year:'2017',type:'Rodinný dům',status:'Realizace dle portfolia',image:legacy.wurmova,original:legacy.wurmova},
    {id:'bystrc',name:'Přístaviště Bystrc',city:'Brno',year:'2011',type:'Občanská vybavenost',status:'Realizace dle portfolia',image:legacy.bystrc,original:legacy.bystrc},
    {id:'selska84',name:'BD Selská 84',city:'Brno',year:'2024',type:'Bytový dům',status:'Realizace dle portfolia',image:legacy.selska84,original:legacy.selska84},
    {id:'ivancice',name:'KoDuS Ivančice',city:'Ivančice',year:'2016',type:'Komunitní dům',status:'Realizace dle portfolia',image:legacy.ivancice,original:legacy.ivancice},
    {id:'nebovidy',name:'Vývojové centrum Veselý DS',city:'Nebovidy',year:'2020',type:'Vývojové centrum',status:'Realizace dle portfolia',image:legacy.nebovidy,original:legacy.nebovidy}
  ];
  const name=document.getElementById('media-name'),before=document.getElementById('media-before'),after=document.getElementById('media-after'),kicker=document.getElementById('media-kicker'),note=document.getElementById('media-status');
  if(!name||!before||!after)return;
  const setImage=(img,primary,backupPath)=>{
    const candidates=[primary,backupPath].filter(Boolean).map(path=>new URL(path,document.baseURI).href),tried=new Set();
    const next=()=>{const path=candidates.find(item=>!tried.has(item));if(!path){img.removeAttribute('src');return;}tried.add(path);img.src=path;};img.onerror=next;next();
  };
  async function load(){try{const response=await fetch('assets/v6/projects.json',{cache:'no-store'});if(!response.ok)throw Error();const json=await response.json();if(!Array.isArray(json.projects))throw Error();return {items:json.projects,backup:false};}catch{return {items:backup,backup:true};}}
  load().then(({items,backup:usingBackup})=>{
    if(!items.length){name.textContent='Projektové podklady nejsou k dispozici';return;}
    items=items.flatMap(p=>p.id==='koupelni'?[p,{...p,id:'koupelni-front',name:'Koupelní 2 · pohled z ulice',image:'assets/v6/photos/koupelni-front.webp',original:'assets/v2/originals/koupelni-front.webp'}]:[p]);
    let current=0;
    const draw=()=>{const p=items[current];name.textContent=p.name||p.id;kicker.textContent=[p.city,p.year].filter(Boolean).join(' · ')||'PROJEKT / OBRAZ';setImage(before,p.original,p.image||legacy[p.id]);setImage(after,p.image||legacy[p.id],p.original);note.textContent=usingBackup?'Ukázka lokálních obrazových podkladů; centrální projektová data ještě nejsou dostupná.':'';};
    draw();
    document.getElementById('media-prev')?.addEventListener('click',()=>{current=(current-1+items.length)%items.length;draw();});
    document.getElementById('media-next')?.addEventListener('click',()=>{current=(current+1)%items.length;draw();});
  });
})();
