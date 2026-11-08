import * as THREE from './assets/vendor/three.module.min.js';

const world=(lon,lat,z=0)=>new THREE.Vector3((lon-15.55)*.64,lat-49.85,z);
const BASE=.128, RELIEF_SCALE=.000115;

export function createMapScene(host,geo,stage,dem=null,geography=null){
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,matchMedia('(max-width:760px)').matches?1.25:1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setClearColor(0xffffff,0);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  }catch{return null}
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.className='country-canvas';host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,80);
  scene.add(new THREE.AmbientLight(0xffffff,1.35));
  const key=new THREE.DirectionalLight(0xffffff,1.65);key.position.set(-2.5,3,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.radius=4;key.shadow.bias=-.0003;scene.add(key);
  const fill=new THREE.DirectionalLight(0x9cbaac,.45);fill.position.set(5,-3,4);scene.add(fill);
  const shapes=[],polygons=[];
  function ring(points,ShapeClass){const path=new ShapeClass();points.forEach((p,i)=>{const v=world(p[0],p[1]);i?path.lineTo(v.x,v.y):path.moveTo(v.x,v.y)});return path}
  function addPolygon(rings){if(!rings?.length)return;const shape=ring(rings[0],THREE.Shape);for(let i=1;i<rings.length;i++)shape.holes.push(ring(rings[i],THREE.Path));shapes.push(shape);polygons.push(rings)}
  const features=geo?.type==='FeatureCollection'?geo.features:geo?.type==='Feature'?[geo]:[];
  for(const feature of features){const g=feature.geometry;if(g?.type==='Polygon')addPolygon(g.coordinates);if(g?.type==='MultiPolygon')g.coordinates.forEach(addPolygon)}
  if(!shapes.length){renderer.dispose();renderer.domElement.remove();return null}
  const top=new THREE.MeshStandardMaterial({color:0xE6EDDF,roughness:.95,metalness:0,side:THREE.DoubleSide});
  const side=new THREE.MeshStandardMaterial({color:0x6B8C7A,roughness:1,metalness:0,side:THREE.DoubleSide});
  const edgeMat=new THREE.MeshBasicMaterial({color:0xf6f7f2,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false});
  for(const shape of shapes){
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:3,steps:1,curveSegments:1});
    const slab=new THREE.Mesh(geometry,[top,side]);slab.castShadow=true;scene.add(slab);
    const edge=new THREE.Mesh(new THREE.ShapeGeometry(shape),edgeMat);edge.position.z=.126;scene.add(edge);
  }
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({color:0x2d574a,opacity:.2}));floor.position.z=-.025;floor.receiveShadow=true;scene.add(floor);
  function pointInRing(lon,lat,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(((a[1]>lat)!==(b[1]>lat))&&(lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]))inside=!inside}return inside}
  function inside(lon,lat){return polygons.some(rings=>pointInRing(lon,lat,rings[0])&&!rings.slice(1).some(h=>pointInRing(lon,lat,h)))}
  let terrainMode='flat',sampleHeight=()=>70;
  if(dem&&Number.isInteger(dem.width)&&Number.isInteger(dem.height)&&dem.width>2&&dem.height>2&&Array.isArray(dem.heights)&&dem.heights.length===dem.width*dem.height&&dem.bounds&&window.Delaunator){
    const {width,height,bounds}=dem;
    // A small Gaussian neighborhood softens DEM sampling without changing the source file.
    const source=dem.heights,heights=new Float32Array(source.length),kernel=[1,2,1];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      let sum=0;
      for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++){
        const yy=Math.max(0,Math.min(height-1,y+ky)),xx=Math.max(0,Math.min(width-1,x+kx));
        sum+=source[yy*width+xx]*kernel[ky+1]*kernel[kx+1];
      }
      heights[y*width+x]=sum/16;
    }
    sampleHeight=(lon,lat)=>{
      const u=Math.max(0,Math.min(width-1,(lon-bounds.west)/(bounds.east-bounds.west)*(width-1)));
      const v=Math.max(0,Math.min(height-1,(bounds.north-lat)/(bounds.north-bounds.south)*(height-1)));
      const x=Math.min(width-2,Math.floor(u)),y=Math.min(height-2,Math.floor(v)),fx=u-x,fy=v-y;
      const a=heights[y*width+x],b=heights[y*width+x+1],c=heights[(y+1)*width+x],d=heights[(y+1)*width+x+1];
      return ((a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy);
    };
    const relief=h=>BASE+Math.max(0,h-70)*RELIEF_SCALE;
    try{
      const mobile=matchMedia('(max-width:760px)').matches,step=mobile?4:2,boundaryStep=1;
      const points=[],seen=new Set();
      const add=(lon,lat)=>{const k=`${lon.toFixed(6)},${lat.toFixed(6)}`;if(seen.has(k))return;seen.add(k);points.push([lon,lat])};
      for(const rings of polygons)for(const ringCoords of rings){for(let i=0;i<ringCoords.length-1;i+=boundaryStep)add(ringCoords[i][0],ringCoords[i][1])}
      for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step){const lon=bounds.west+x/(width-1)*(bounds.east-bounds.west),lat=bounds.north-y/(height-1)*(bounds.north-bounds.south);if(inside(lon,lat))add(lon,lat)}
      const delaunay=window.Delaunator.from(points,p=>p[0],p=>p[1]),triangles=delaunay.triangles,indices=[];
      for(let i=0;i<triangles.length;i+=3){const a=points[triangles[i]],b=points[triangles[i+1]],c=points[triangles[i+2]];
        const centroid=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
        if(inside(centroid[0],centroid[1]))indices.push(triangles[i],triangles[i+1],triangles[i+2]);
      }
      if(indices.length<300)throw Error('Too few terrain triangles');
      const pos=new Float32Array(points.length*3),colors=new Float32Array(points.length*3),low=new THREE.Color(0xE9EFE4),high=new THREE.Color(0xB0C5AC),tmp=new THREE.Color();
      points.forEach(([lon,lat],i)=>{const h=sampleHeight(lon,lat),v=world(lon,lat,relief(h)),t=Math.max(0,Math.min(1,(h-120)/950));pos.set([v.x,v.y,v.z],i*3);tmp.copy(low).lerp(high,t);colors.set([tmp.r,tmp.g,tmp.b],i*3)});
      const surfaceGeo=new THREE.BufferGeometry();surfaceGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));surfaceGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));surfaceGeo.setIndex(indices);surfaceGeo.computeVertexNormals();
      const surface=new THREE.Mesh(surfaceGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide}));surface.castShadow=true;scene.add(surface);
      // A narrow skirt joins the actual DEM elevations to the exact flat country edge.
      for(const rings of polygons)for(const boundary of rings){const vertices=[];for(let i=0;i<boundary.length-1;i+=boundaryStep){const a=boundary[i],b=boundary[Math.min(i+boundaryStep,boundary.length-1)],aw=world(a[0],a[1]),bw=world(b[0],b[1]),az=relief(sampleHeight(a[0],a[1])),bz=relief(sampleHeight(b[0],b[1]));vertices.push(aw.x,aw.y,az,bw.x,bw.y,bz,aw.x,aw.y,.126,bw.x,bw.y,bz,bw.x,bw.y,.126,aw.x,aw.y,.126)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();scene.add(new THREE.Mesh(g,side))}
      terrainMode='real-dem';
    }catch(e){sampleHeight=()=>70;terrainMode='flat'}
  }
  // Generalized, source-backed river and highway traces hug the sampled terrain.
  let geographyMode='none';
  if(Array.isArray(geography?.features)){
    const riverMat=new THREE.LineBasicMaterial({color:0x72a2a4,transparent:true,opacity:.46,depthWrite:false});
    const roadMat=new THREE.LineBasicMaterial({color:0xd6c7a4,transparent:true,opacity:.37,depthWrite:false});
    for(const feature of geography.features){
      const kind=feature?.properties?.kind;
      if(kind!=='river'&&kind!=='road')continue;
      const paths=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiLineString'?feature.geometry.coordinates:[];
      for(const path of paths){
        if(!Array.isArray(path)||path.length<2)continue;
        const points=[];
        for(let i=0;i<path.length-1;i++){
          const a=path[i],b=path[i+1],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.025));
          for(let j=0;j<n;j++){const t=j/n,lon=a[0]+(b[0]-a[0])*t,lat=a[1]+(b[1]-a[1])*t,z=terrainMode==='real-dem'?BASE+Math.max(0,sampleHeight(lon,lat)-70)*RELIEF_SCALE+.015:.143;points.push(world(lon,lat,z))}
        }
        const last=path[path.length-1],lastZ=terrainMode==='real-dem'?BASE+Math.max(0,sampleHeight(last[0],last[1])-70)*RELIEF_SCALE+.015:.143;
        points.push(world(last[0],last[1],lastZ));
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),kind==='river'?riverMat:roadMat);
        line.renderOrder=2;line.userData.geographyKind=kind;scene.add(line);geographyMode='natural-earth';
      }
    }
  }
  let mode='space',width=1,height=1;
  function resize(w,h){width=w;height=h;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  function update(view){
    const distance=view.h/(2*Math.tan(THREE.MathUtils.degToRad(20))*view.scale*view.zoom);
    const centerX=-(view.panX+(view.mapOffsetX||0))/(view.scale*view.zoom);
    const centerY=view.panY/(view.scale*.78*view.zoom)+(view.mapOffsetY||0)/(view.scale*view.zoom*.9);
    const pitch=mode==='top'?0:THREE.MathUtils.degToRad(matchMedia('(max-width:760px)').matches?18:30);
    const target=new THREE.Vector3(centerX,centerY,0);camera.position.set(centerX,centerY-distance*Math.sin(pitch),distance*Math.cos(pitch));camera.up.set(0,1,0);camera.lookAt(target);camera.updateMatrixWorld();renderer.render(scene,camera);
  }
  function project(lon,lat){const z=terrainMode==='real-dem'?BASE+Math.max(0,sampleHeight(lon,lat)-70)*RELIEF_SCALE+.013:.135;const p=world(lon,lat,z).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2}}
  function setMode(value){mode=value==='top'?'top':'space'}
  function destroy(){scene.traverse(o=>{if(o.geometry)o.geometry.dispose()});renderer.dispose();renderer.domElement.remove()}
  return {resize,update,project,setMode,destroy,terrainMode,geographyMode};
}
