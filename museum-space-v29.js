// All camera and walking coordinates are Three world units (two per physical metre).
// The portal and side room are anchored independently of the exhibition furniture.
export function createGallerySpace(metadata) {
  const {width, depth, eaves}=metadata.hall.physicalMetres;
  const {min,max}=metadata.salon.bounds;
  const portal=metadata.salon.entrance.lookAt;
  const stretch=metadata.architectureHorizontalScale || width/9.6;
  const doorHalf=metadata.salon.doorwayHalfWidth || 1.4*stretch;
  const inside=(x,z,r)=>x>=r[0]&&z>=r[1]&&x<=r[2]&&z<=r[3];
  const hall=[-width+.48,-depth+.48,width-.48,depth-.48];
  const salon=[min[0]+.3,min[2]+.42,max[0]-.42,max[2]-.42];
  const passage=[width-.8,portal[2]-doorHalf+.2,salon[0]+.4,portal[2]+doorHalf-.2];
  const boundsOpen=[hall[0],Math.min(hall[1],salon[1]),salon[2],Math.max(hall[3],salon[3])];
  return { width,depth,eaves,stretch,portal,doorHalf,salonBounds:metadata.salon.bounds,
    // Clearance includes the face of the wall frames and the projecting steel columns.
    orbitBounds:[-width+1.1,width-1.05,-depth+.90,depth-.9,.32,2*eaves-.42],
    hallPoint:(x,y,z)=>[x*stretch,y,z*stretch],
    navigationBounds:open=>open?boundsOpen:hall,
    walkable:(x,z,open)=>Number.isFinite(x)&&Number.isFinite(z)&&(inside(x,z,hall)||open&&(inside(x,z,passage)||inside(x,z,salon))),
    insideSalon:(x,z)=>x>portal[0]+.10 && z>min[2] && z<max[2],
    portalPoint:(offsetX,y,offsetZ=0)=>[portal[0]+offsetX,y,portal[2]+offsetZ]
  };
}

export function roomOrbitDistance(target, direction, desired, bounds) {
  let limit=desired;
  for(const [axis,low,high] of [['x',bounds[0],bounds[1]],['z',bounds[2],bounds[3]],['y',bounds[4],bounds[5]]]){
    const delta=direction[axis];
    if(Math.abs(delta)>1e-7)limit=Math.min(limit,((delta>0?high:low)-target[axis])/delta);
  }
  return Math.max(.04,limit);
}

// Limit zoom using the visible facade along this bearing, including a small near-plane margin.
export function orbitDistance(table,target,direction,desired){
  const c=Math.cos(table.yaw),s=Math.sin(table.yaw),size=table.scaledSize;
  const dx=target.x-table.centerX,dz=target.z-table.centerZ;
  const origin=[dx*c-dz*s,target.y-table.surfaceY-size.y/2,dx*s+dz*c];
  const ray=[direction.x*c-direction.z*s,direction.y,direction.x*s+direction.z*c];
  const half=[size.x/2,size.y/2,size.z/2];
  let exit=Infinity;
  for(let i=0;i<3;i++)if(Math.abs(ray[i])>1e-6)exit=Math.min(exit,((ray[i]>0?half[i]:-half[i])-origin[i])/ray[i]);
  return roomOrbitDistance(target,direction,Math.max(desired,Number.isFinite(exit)?exit+.12:.22),table.orbitBounds);
}
