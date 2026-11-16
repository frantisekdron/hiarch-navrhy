/** Floor topology in world metres; the connecting door never opens adjacent walls. */
export const GALLERY_FLOOR=[-8.5,-15.5,8.5,15.4];
export const SALON_FLOOR=[9.93,-18.75,18.65,-10.85];
export const SALON_PASSAGE=[8.25,-15.8,10.2,-13.8];
const inRect=(x,z,r)=>x>=r[0]&&z>=r[1]&&x<=r[2]&&z<=r[3];
export function isWalkableRegion(x,z,doorOpen=false){return Number.isFinite(x)&&Number.isFinite(z)&&(inRect(x,z,GALLERY_FLOOR)||(doorOpen&&(inRect(x,z,SALON_PASSAGE)||inRect(x,z,SALON_FLOOR))))}
export function navigationBounds(doorOpen=false){return doorOpen?[-8.5,-18.75,18.65,15.4]:[...GALLERY_FLOOR]}
