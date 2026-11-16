// The 10% dead zone and s^1.5 response match FD Prohlidka TouchControls.
export function joystickVector(dx,dy,radius=46){
 const length=Math.hypot(dx,dy),m=Math.min(1,length/radius),s=Math.max(0,(m-.1)/.9),gain=s**1.5;
 return length?{side:dx/length*gain,forward:-dy/length*gain,x:dx/length*m*radius,y:dy/length*m*radius}:{side:0,forward:0,x:0,y:0};
}
export function bindMovePad({pad,onStart,onChange,onNudge}){
 const knob=pad.querySelector('.move-knob'),held=new Map();let joy=null;
 const emit=()=>{let side=joy?.side||0,forward=joy?.forward||0;for(const press of held.values()){if(press.moving){side+=press.axes[0];forward+=press.axes[1]}}const n=Math.max(1,Math.hypot(side,forward));onChange(side/n,forward/n)};
 const reset=()=>{for(const press of held.values())clearTimeout(press.timer);held.clear();joy=null;knob.style.transform='';pad.removeAttribute('data-press');pad.querySelectorAll('button').forEach(b=>b.removeAttribute('data-held'));onChange(0,0)};
 const axes={forward:[0,1],back:[0,-1],left:[-1,0],right:[1,0]};
 for(const button of pad.querySelectorAll('[data-step]')){
  button.addEventListener('pointerdown',e=>{
   if(e.button>0||held.has(e.pointerId))return;
   e.preventDefault();onStart();button.setPointerCapture(e.pointerId);
   const press={axes:axes[button.dataset.step],moving:false,timer:0};
   held.set(e.pointerId,press);button.dataset.held='true';
   press.timer=setTimeout(()=>{press.moving=true;emit()},150);
  });
  const up=e=>{
   const press=held.get(e.pointerId);if(!press)return;
   clearTimeout(press.timer);held.delete(e.pointerId);button.removeAttribute('data-held');emit();
   if(!press.moving&&!held.size&&!joy&&e.type==='pointerup')onNudge(...press.axes);
  };
  button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);
  button.addEventListener('click',e=>{if(e.detail===0){onStart();onNudge(...axes[button.dataset.step])}});
 }
 knob.addEventListener('pointerdown',e=>{if(e.button>0||joy)return;e.preventDefault();onStart();joy={id:e.pointerId,cx:e.clientX,cy:e.clientY,side:0,forward:0};knob.setPointerCapture(e.pointerId);pad.dataset.press='true'});
 knob.addEventListener('pointermove',e=>{if(joy?.id!==e.pointerId)return;const v=joystickVector(e.clientX-joy.cx,e.clientY-joy.cy);Object.assign(joy,v);knob.style.transform=`translate(${v.x}px,${v.y}px)`;emit()});
 const end=e=>{if(joy?.id!==e.pointerId)return;joy=null;knob.style.transform='';pad.removeAttribute('data-press');emit()};
 knob.addEventListener('pointerup',end);knob.addEventListener('pointercancel',end);knob.addEventListener('lostpointercapture',end);
 return {reset};
}
