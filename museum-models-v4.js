// Small architectural massing studies. Dimensions are composition units, not measured buildings.
export function makeProjectModel(id, THREE) {
  const group = new THREE.Group();
  group.userData.modelId = id;
  group.userData['data-model-id'] = id;
  const pale = new THREE.MeshPhysicalMaterial({color:0xb5c7ad,roughness:.86,metalness:0,transparent:true,opacity:.88,depthWrite:true,side:THREE.DoubleSide});
  const porcelain = new THREE.MeshPhysicalMaterial({color:0xe9f0df,roughness:.82,metalness:0,transparent:true,opacity:.94,side:THREE.DoubleSide});
  const mid = new THREE.MeshPhysicalMaterial({color:0x8ca890,roughness:.87,metalness:0,transparent:true,opacity:.91,side:THREE.DoubleSide});
  const dark = new THREE.MeshStandardMaterial({color:0x3e594c,roughness:.91,metalness:0});
  const glass = new THREE.MeshPhysicalMaterial({color:0x9dbbb0,roughness:.38,metalness:.05,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide});
  const canopyMat = new THREE.MeshPhysicalMaterial({color:0xc4d6c0,roughness:.66,metalness:0,transparent:true,opacity:.69,depthWrite:false,side:THREE.DoubleSide});
  const edgeMat = new THREE.LineBasicMaterial({color:0xf5ffe9,transparent:true,opacity:.83,depthTest:true});
  const quietEdge = new THREE.LineBasicMaterial({color:0xdcebd6,transparent:true,opacity:.48,depthTest:true});
  function addBox(w,h,d,x,y,z,mat=pale,edges=true){
    const geometry=new THREE.BoxGeometry(w,h,d),mesh=new THREE.Mesh(geometry,mat);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    if(edges){const line=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),edgeMat);line.position.copy(mesh.position);group.add(line)}
    return mesh;
  }
  function addPlate(w,d,x,y,z,mat=porcelain){return addBox(w,.035,d,x,y,z,mat,true)}
  function addRoof(w,d,eaveY,rise,x,z){
    const g=new THREE.BufferGeometry(),hx=w/2,hz=d/2,rx=w*.2;
    const vertices=[-hx,eaveY,-hz,hx,eaveY,-hz,hx,eaveY,hz,-hx,eaveY,hz,-rx,eaveY+rise,0,rx,eaveY+rise,0];
    const indices=[0,1,5,0,5,4,3,4,5,3,5,2,0,4,3,1,2,5];
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,mid);mesh.position.set(x,0,z);mesh.castShadow=true;group.add(mesh);
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(g),edgeMat);outline.position.copy(mesh.position);group.add(outline);
  }
  function addCanopy(w,d,x,y,z){
    const cols=8,rows=4,vertices=[],indices=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const u=i/cols,v=j/rows;
      vertices.push(x+(u-.5)*w,y+.07*Math.sin(u*Math.PI*2)+.035*Math.cos(v*Math.PI*2),z+(v-.5)*d);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,e=c+1;indices.push(a,c,b,b,c,e)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,canopyMat);mesh.castShadow=true;group.add(mesh);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(g),quietEdge);group.add(edge);
  }
  // One quiet table-scale footprint and a fine location ring belong to every study.
  addBox(1.88,.04,1.08,0,.02,0,dark,false);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.43,.47,40),new THREE.MeshBasicMaterial({color:0xbcd4b5,transparent:true,opacity:.33,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(0,.045,0);group.add(ring);
  switch(id){
    case 'koupelni':
      addBox(.79,1.22,.54,-.22,.67,0,porcelain);
      addBox(.13,1.19,.57,.08,.68,.005,dark,false);
      addBox(.63,.45,.58,.49,.285,-.01,pale);
      addPlate(.61,.7,.49,.52,-.01);
      break;
    case 'hustopece':
      addBox(1.46,.35,.32,0,.245,-.27,porcelain);
      addBox(.34,.37,.74,-.55,.255,.1,pale);
      addBox(.42,.32,.68,.51,.23,.12,mid);
      addPlate(.52,.3,0,.08,.13,pale);
      break;
    case 'transped':
      addBox(1.57,.29,.65,0,.195,0,pale);
      addBox(1.06,.46,.61,-.12,.57,-.045,dark);
      addPlate(.66,.71,.44,.37,.025,porcelain);
      addBox(.4,.15,.24,.49,.17,.19,glass,false);
      break;
    case 'wurmova':
      addBox(.99,.72,.7,0,.425,0,porcelain);
      addRoof(1.08,.78,.79,.29,0,0);
      addBox(.29,.48,.29,.34,.36,.39,pale);
      break;
    case 'bystrc':
      addBox(1.5,.33,.5,0,.235,-.13,porcelain);
      addPlate(1.72,.14,0,.21,.3,mid);
      addBox(.13,.17,.13,-.72,.16,.26,pale,false);
      addBox(.13,.17,.13,.72,.16,.26,pale,false);
      addCanopy(1.45,.62,0,.63,-.03);
      break;
    case 'selska84':
      addBox(1.19,.88,.57,0,.49,-.04,pale);
      for(const y of [.28,.53,.78])addPlate(.46,.25,0,y,.35,porcelain);
      addBox(.76,.22,.49,0,1.04,-.085,porcelain);
      break;
    case 'ivancice':
      addBox(1.68,.74,.48,0,.42,-.045,porcelain);
      for(const y of [.29,.54,.79])addPlate(1.58,.17,0,y,.285,pale);
      break;
    case 'nebovidy':
      addBox(1.57,.25,.61,0,.165,0,dark);
      addBox(1.51,.59,.57,0,.58,-.015,porcelain);
      addBox(1.36,.17,.018,0,.65,.28,glass,false);
      addPlate(1.55,.61,0,.89,-.015,porcelain);
      break;
    default:
      addBox(1.1,.52,.58,0,.31,0,pale);
  }
  return group;
}
