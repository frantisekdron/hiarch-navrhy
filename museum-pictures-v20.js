// Picture centres fall between the travertine pilasters. The atlas and salon
// doorway have separate bays on the east wall. All dimensions are in metres.
export const pictureBays = [
  {id:'interior-living',  side:-1, z:3.80},
  {id:'interior-bedroom', side: 1, z:3.80},
  {id:'real-building',    side:-1, z:-2.95},
  {id:'interior-room',    side: 1, z:-2.95}
];

export function hangGalleryPictures({THREE, scene, box, mats, artworks, labelTexture}) {
  const ink = new THREE.MeshBasicMaterial({color:0xffedca,toneMapped:false});
  const matte = new THREE.MeshStandardMaterial({
    color:0xece4d3,roughness:.94,emissive:0xcfc4aa,emissiveIntensity:.23
  });
  const prints = [];
  const pickables = [];
  const board = (w,h,d,x,y,z,material) =>
    box(w,h,d,x,y,z,material,scene,{castShadow:false,receiveShadow:false});

  for (const {id,side,z} of pictureBays) {
    const art = artworks.find(item=>item.id===id);
    if (!art?.texture) continue;
    const image = art.texture.image;
    const aspect = art.width && art.height ? art.width/art.height : image.width/image.height;
    const width = Math.min(4.08,2.48*aspect);
    const height = width / aspect;
    const frameWidth = width+.42, frameHeight = height+.44;
    const y = 3.28;
    // From the wall towards the viewer: walnut rebate, brass lip, mount, print.
    board(.10,frameHeight,frameWidth,side*9.32,y,z,mats.wood);
    board(.04,frameHeight-.09,frameWidth-.09,side*9.25,y,z,mats.bronze);
    board(.034,frameHeight-.15,frameWidth-.15,side*9.20,y,z,matte);

    const print = new THREE.Mesh(new THREE.PlaneGeometry(width,height),
      new THREE.MeshBasicMaterial({map:art.texture}));
    print.position.set(side*9.164,y+.025,z);
    print.rotation.y=-side*Math.PI/2;
    print.name=art.title;
    print.userData.artworkId=id;
    scene.add(print);
    prints.push(print.material);
    pickables.push(print);

    const top=y+frameHeight/2;
    const lampWidth=Math.min(1.85,width*.55);
    board(.26,.045,.065,side*9.19,top+.165,z,mats.bronze);
    board(.09,.074,lampWidth,side*9.065,top+.13,z,mats.bronze);
    board(.050,.018,lampWidth-.06,side*9.05,top+.087,z,ink);

    // A paper label carries its own backing below the frame, aligned to the edge.
    const labelZ=z+side*(frameWidth/2-.94);
    const labelY=y-frameHeight/2-.22;
    board(.054,.275,1.82,side*9.31,labelY,labelZ,matte);
    const label=labelTexture([art.title,art.subtitle],{width:576,height:88,color:'#352d23'});
    const caption=new THREE.Mesh(new THREE.PlaneGeometry(1.75,.232),
      new THREE.MeshBasicMaterial({map:label,transparent:true,depthWrite:false,toneMapped:false}));
    caption.position.set(side*9.27,labelY,labelZ);
    caption.rotation.y=print.rotation.y;
    caption.userData.artworkId=id;
    scene.add(caption);
    pickables.push(caption);
  }
  function setLighting(preset) {
    const day=preset==='day';
    for(const material of prints) material.color.setScalar(day?1:preset==='neon'?.77:.85);
    matte.emissiveIntensity=day?.03:preset==='neon'?.24:.30;
    ink.color.set(day?0xd9d2be:0xffe2a8);
  }
  return {pickables,setLighting};
}
