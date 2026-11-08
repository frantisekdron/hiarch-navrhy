// The 10% dead zone and s^1.5 response match FD Prohlidka TouchControls.
export function joystickVector(dx,dy,radius=46){
 const length=Math.hypot(dx,dy),m=Math.min(1,length/radius),s=Math.max(0,(m-.1)/.9),gain=s**1.5;
 return length?{side:dx/length*gain,forward:-dy/length*gain,x:dx/length*m*radius,y:dy/length*m*radius}:{side:0,forward:0,x:0,y:0};
}
export function bindMovePad({pad,onStart,onChange,onNudge}){
 const knob=pad.querySelector('.move-knob'),held=new Map();let joy=null;
 const emit=()=>{let side=joy?.side||0,forward=joy?.forward||0;for(const v of held.values()){side+=v[0];forward+=v[1]}const n=Math.max(1,Math.hypot(side,forward));onChange(side/n,forward/n)};
 const reset=()=>{held.clear();joy=null;knob.style.transform='';pad.removeAttribute('data-press');pad.querySelectorAll('button').forEach(b=>b.removeAttribute('data-held'));onChange(0,0)};
 const axes={forward:[0,1],back:[0,-1],left:[-1,0],right:[1,0]};
 for(const button of pad.querySelectorAll('[data-step]')){
  button.addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();onStart();button.setPointerCapture(e.pointerId);held.set(e.pointerId,axes[button.dataset.step]);button.dataset.held='true';emit()});
  const up=e=>{held.delete(e.pointerId);button.removeAttribute('data-held');emit()};
  button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);
  button.addEventListener('click',e=>{if(e.detail===0){onStart();onNudge(...axes[button.dataset.step])}});
 }
 knob.addEventListener('pointerdown',e=>{if(e.button>0||joy)return;e.preventDefault();onStart();const r=knob.getBoundingClientRect();joy={id:e.pointerId,cx:r.left+r.width/2,cy:r.top+r.height/2,side:0,forward:0};knob.setPointerCapture(e.pointerId);pad.dataset.press='true'});
 knob.addEventListener('pointermove',e=>{if(joy?.id!==e.pointerId)return;const v=joystickVector(e.clientX-joy.cx,e.clientY-joy.cy);Object.assign(joy,v);knob.style.transform=`translate(${v.x}px,${v.y}px)`;emit()});
 const end=e=>{if(joy?.id!==e.pointerId)return;joy=null;knob.style.transform='';pad.removeAttribute('data-press');emit()};
 knob.addEventListener('pointerup',end);knob.addEventListener('pointercancel',end);knob.addEventListener('lostpointercapture',end);
 return {reset};
}
