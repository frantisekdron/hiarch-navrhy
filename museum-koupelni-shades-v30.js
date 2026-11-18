// Window detail documented by the close photograph (portfolio image 05).
// Shade positions represent one daytime arrangement on the two ribbon façades.
const frontDrops = [[1,.53],[8,.16],[10,.81],[14,.24],[16,.67],[23,.36],[29,.72],[34,.14],[40,.54],[48,.80],[53,.29],[58,.43],[64,.20]];
const backDrops = [[0,.18],[7,.61],[12,.37],[19,.78],[25,.22],[31,.51],[38,.68],[41,.18],[44,.34],[51,.75],[56,.42],[63,.25]];

export function addKoupelniShades(model, T) {
  const glass = [];
  model.traverse(part => {
    if (part.isInstancedMesh && part.name==='Recessed physical glazing' && part.count>66) glass.push(part);
  });
  const count=frontDrops.length+backDrops.length;
  const shades=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({
    color:0xffffff,roughness:.73,metalness:.08
  }),2*count);
  shades.name='Koupelní · předokenní rolety a spodní lišty';
  const pane=new T.Matrix4(), size=new T.Vector3(), centre=new T.Vector3(), rotation=new T.Quaternion();
  const partTransform=new T.Matrix4(), offset=new T.Vector3(), scale=new T.Vector3();
  const fabric=new T.Color(0xcac6bb),rail=new T.Color(0xabaea8);
  model.updateMatrixWorld(true);
  let index=0;
  for(const glazing of glass){
    const placements=glazing.parent.position.z>0?frontDrops:backDrops;
    for(const [window,drop] of placements){
      glazing.getMatrixAt(window,pane);
      pane.decompose(centre,rotation,size);
      // In local pane coordinates positive Z faces outdoors. Fit within the reveals.
      const width=size.x*.96, height=size.y*drop, top=centre.y+size.y*.49;
      function part(y,h,depth,color){
        offset.set(centre.x,y,centre.z+size.z*.5+.004);
        scale.set(width,h,depth);
        partTransform.compose(offset,rotation,scale).premultiply(glazing.matrixWorld);
        shades.setMatrixAt(index,partTransform);
        shades.setColorAt(index++,color);
      }
      part(top-height/2,height,.0018,fabric);
      part(top-height,.0029,.004,rail);
    }
  }
  shades.count=index;shades.castShadow=false;shades.receiveShadow=true;
  shades.computeBoundingSphere();
  if(index)model.add(shades);
  return model;
}
