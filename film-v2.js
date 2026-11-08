(() => {
  'use strict';
  const host=document.querySelector('[data-film-engine]');
  if(!host)return;
  const stage=host.querySelector('[data-film-stage]');
  const poster=host.querySelector('[data-film-poster]');
  const range=host.querySelector('[data-film-range]');
  const status=host.querySelector('[data-film-status]');
  const caption=host.querySelector('[data-film-caption]');
  const playButton=host.querySelector('[data-film-action="play"]');
  const pauseButton=host.querySelector('[data-film-action="pause"]');
  const replayButton=host.querySelector('[data-film-action="replay"]');
  const motionButton=host.querySelector('[data-film-action="motion"]');
  const sources={
    city:{label:'MÍSTO',caption:'01 / MÍSTO · KOUPELNÍ 2',poster:'assets/film-city.webp',alt:'Okolí projektu Koupelní 2 v Hodoníně'},
    building:{label:'DŮM',caption:'02 / DŮM · KOUPELNÍ 2',poster:'assets/film-building.webp',alt:'Budova projektu Koupelní 2 v Hodoníně'},
    detail:{label:'DETAIL',caption:'03 / DETAIL · KOUPELNÍ 2',poster:'assets/film-detail.webp',alt:'Detailní záběr projektu Koupelní 2'}
  };
  const edges={
    'city-building':{from:'city',to:'building',src:'assets/transition-city.mp4',label:'Místo → dům'},
    'building-detail':{from:'building',to:'detail',src:'assets/transition-building.mp4',label:'Dům → detail'}
  };
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionOff=reduced.matches;
  let explicitMotionChoice=false;
  let currentState='city';
  let selectedEdge='city-building';
  let phase='poster';
  let generation=0;
  let video=host.querySelector('[data-film-video]');
  let pendingRatio=null;
  let desiredTime=null;
  let isDragging=false;
  function say(message){status.textContent=message;}
  function clock(value){if(!Number.isFinite(value)||value<0)return '0:00';const seconds=Math.floor(value);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  function setPhase(next){phase=next;stage.dataset.state=next;}
  function syncControls(){
    motionButton.setAttribute('aria-pressed',String(motionOff));
    motionButton.textContent=motionOff?'Nehýbat · zapnuto':'Nehýbat';
    playButton.textContent=phase==='playing'?'Přechod běží':'▶ Přehrát přechod';
    pauseButton.disabled=phase!=='playing'&&phase!=='loading';
    replayButton.disabled=!selectedEdge;
    host.querySelectorAll('[data-film-edge]').forEach(button=>button.setAttribute('aria-current',String(button.dataset.filmEdge===selectedEdge)));
  }
  function showPoster(key){
    currentState=key;const item=sources[key];poster.src=item.poster;poster.alt=item.alt;caption.textContent=item.caption;
    stage.removeAttribute('data-frame-ready');
  }
  function detachVideo(){
    const old=video;video=old.cloneNode(false);video.removeAttribute('src');video.preload='none';old.replaceWith(video);
  }
  function safeRatio(value){return Math.min(1,Math.max(0,Number(value)||0));}
  function applyPendingSeek(token,element){
    if(token!==generation||pendingRatio===null||!Number.isFinite(element.duration)||element.duration<=0)return;
    const ratio=pendingRatio;pendingRatio=null;
    const target=Math.min(Math.max(0,element.duration-.04),ratio*element.duration);desiredTime=target;
    try{element.currentTime=target;setPhase('seeking');say('Hledám požadovaný snímek…');}
    catch{pendingRatio=ratio;say('Připravuji pozici záběru…');}
  }
  function revealDecodedFrame(token,element){
    if(token!==generation||element.readyState<2)return;
    if(phase==='seeking'&&desiredTime!==null&&Math.abs(element.currentTime-desiredTime)>.12)return;
    const reveal=()=>{if(token===generation&&element.readyState>=2&&!(phase==='seeking'&&desiredTime!==null&&Math.abs(element.currentTime-desiredTime)>.12))stage.dataset.frameReady='true';};
    if(element.paused){reveal();return;}
    if(typeof element.requestVideoFrameCallback==='function')element.requestVideoFrameCallback(reveal);else reveal();
  }
  function setFailure(token,message){
    if(token!==generation)return;
    video.pause();stage.removeAttribute('data-frame-ready');setPhase('error');say(`${message} Poster zachován. Stiskněte Přehrát znovu.`);syncControls();
  }
  function prepareEdge(key,autoplay,replay=false){
    const edge=edges[key];if(!edge)return;
    motionOff=false;explicitMotionChoice=true;motionButton.setAttribute('aria-pressed','false');motionButton.textContent='Nehýbat';
    range.setAttribute('aria-label',`Posunout přechod ${edge.label.toLowerCase()}`);
    const same=selectedEdge===key&&video.getAttribute('src')&&phase!=='error';
    if(same&&!replay){
      const token=generation;
      if(autoplay){try{const result=video.play();if(result&&result.catch)result.catch(()=>setFailure(token,'Video se nepodařilo spustit.'));}catch{setFailure(token,'Video se nepodařilo spustit.');}}
      syncControls();return;
    }
    selectedEdge=key;showPoster(edge.from);range.value='0';pendingRatio=null;desiredTime=null;
    generation+=1;const token=generation;detachVideo();video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('muted','');video.preload='none';video.setAttribute('aria-label',`Přechod: ${edge.label}`);
    video.addEventListener('loadedmetadata',()=>{if(token!==generation)return;applyPendingSeek(token,video);if(phase==='loading')say('Video načteno · čekám na první obrazový snímek…');});
    video.addEventListener('durationchange',()=>applyPendingSeek(token,video));
    video.addEventListener('loadeddata',()=>{if(token!==generation)return;applyPendingSeek(token,video);revealDecodedFrame(token,video);if(!autoplay&&phase==='loading'){setPhase('paused');say('Záběr připraven · přetáhněte posuvník nebo stiskněte Přehrát.');}});
    video.addEventListener('canplay',()=>{if(token!==generation)return;applyPendingSeek(token,video);if(phase==='loading'&&!autoplay)say('Video připraveno.');});
    video.addEventListener('playing',()=>{if(token!==generation)return;setPhase('playing');say(`Přehrává se · ${edge.label}.`);revealDecodedFrame(token,video);syncControls();});
    video.addEventListener('waiting',()=>{if(token===generation)say('Načítám další snímky…');});
    video.addEventListener('seeking',()=>{if(token===generation){setPhase('seeking');say('Hledám požadovaný snímek…');}});
    video.addEventListener('seeked',()=>{if(token!==generation)return;if(desiredTime!==null&&Math.abs(video.currentTime-desiredTime)>.12)return;revealDecodedFrame(token,video);desiredTime=null;setPhase('paused');say(`Pozastaveno · ${edge.label}.`);range.setAttribute('aria-valuetext',`${clock(video.currentTime)} / ${clock(video.duration)}`);syncControls();});
    video.addEventListener('timeupdate',()=>{if(token!==generation||isDragging||!Number.isFinite(video.duration)||video.duration<=0)return;range.value=String(Math.round(safeRatio(video.currentTime/video.duration)*1000));range.setAttribute('aria-valuetext',`${clock(video.currentTime)} / ${clock(video.duration)}`);});
    video.addEventListener('pause',()=>{if(token!==generation||phase==='seeking'||phase==='ended'||phase==='error')return;setPhase('paused');say(`Pozastaveno · ${edge.label}.`);syncControls();});
    video.addEventListener('ended',()=>{if(token!==generation)return;currentState=edge.to;showPoster(edge.to);range.value='1000';setPhase('ended');say(`Přechod dokončen · ${edge.label}.`);syncControls();});
    video.addEventListener('error',()=>setFailure(token,'Video se nepodařilo načíst.'));
    video.src=edge.src;setPhase('loading');say(`Načítám přechod · ${edge.label}…`);syncControls();video.load();
    if(autoplay){
      try{const result=video.play();if(result&&result.catch)result.catch(error=>{if(token===generation)setFailure(token,error&&error.name==='NotAllowedError'?'Prohlížeč zablokoval přehrání':'Video se nepodařilo spustit');});}
      catch{setFailure(token,'Video se nepodařilo spustit.');}
    }
  }
  function startNext(){
    const key=currentState==='city'?'city-building':currentState==='building'?'building-detail':(selectedEdge||'building-detail');
    prepareEdge(key,true,false);
  }
  function pause(){if(phase==='playing'||phase==='loading'){video.pause();if(phase==='loading'&&video.readyState<2){setPhase('paused');say('Pozastaveno · video zůstane připravené.');}syncControls();}}
  function goBack(){const edge=edges[selectedEdge];resetTo(edge?edge.from:'city');}
  function resetTo(key='city'){
    generation+=1;pendingRatio=null;isDragging=false;detachVideo();selectedEdge=key==='city'?'city-building':key==='building'?'building-detail':selectedEdge;showPoster(key);range.value='0';setPhase('poster');say(key==='city'?'Připraveno · pohyb spustíte tlačítkem.':`Statický snímek · ${sources[key].label.toLowerCase()}.`);syncControls();
  }
  function setMotionOff(value){
    motionOff=value;explicitMotionChoice=true;motionButton.setAttribute('aria-pressed',String(value));motionButton.textContent=value?'Nehýbat · zapnuto':'Nehýbat';
    if(value){const ratio=Number(range.value)/1000;const edge=edges[selectedEdge];const still=phase==='ended'?currentState:(edge&&ratio>=.5?edge.to:(edge?.from||currentState));resetTo(still);say('Pohyb vypnutý · statický snímek.');}
    else say('Pohyb povolen · záběr se spustí až po výběru.');
    syncControls();
  }
  function seek(value){
    const ratio=safeRatio(Number(value)/1000);isDragging=true;
    if(!video.getAttribute('src')){prepareEdge(selectedEdge||'city-building',false,false);}
    if(phase==='playing'||!video.paused){setPhase('seeking');video.pause();}
    pendingRatio=ratio;range.value=String(Math.round(ratio*1000));
    applyPendingSeek(generation,video);
    if(pendingRatio!==null)say('Načítám video před posunem…');
  }
  host.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.filmEdge){prepareEdge(button.dataset.filmEdge,true,true);return;}
    switch(button.dataset.filmAction){
      case 'play':
        if(phase==='playing')return;
        if((phase==='paused'||phase==='seeking'||phase==='loading')&&video.getAttribute('src')){
          motionOff=false;explicitMotionChoice=true;syncControls();const token=generation;try{const result=video.play();if(result&&result.catch)result.catch(()=>{if(token===generation)setFailure(token,'Video se nepodařilo spustit');});}catch{if(token===generation)setFailure(token,'Video se nepodařilo spustit');}
        }else if(phase==='ended')prepareEdge(selectedEdge,true,true);else startNext();
        return;
      case 'pause': pause();return;
      case 'replay': prepareEdge(selectedEdge||'city-building',true,true);return;
      case 'reset': resetTo('city');return;
      case 'back': goBack();return;
      case 'motion': setMotionOff(!motionOff);return;
    }
  });
  range.addEventListener('pointerdown',()=>{isDragging=true;});
  range.addEventListener('touchstart',()=>{isDragging=true;},{passive:true});
  range.addEventListener('input',()=>seek(range.value));
  range.addEventListener('change',()=>{isDragging=false;if(pendingRatio!==null)applyPendingSeek(generation,video);});
  reduced.addEventListener?.('change',event=>{if(explicitMotionChoice)return;motionOff=event.matches;motionButton.setAttribute('aria-pressed',String(motionOff));if(motionOff&&phase==='playing')setMotionOff(true);else syncControls();});
  poster.addEventListener('error',()=>{say('Statický obraz se nenačetl. Video lze stále spustit.');});
  resetTo('city');
  if(motionOff)say('Systém předvolil režim bez pohybu · Přehrát přechod vždy spustí video.');
  host.dataset.ready='true';
})();
