import {makeProjectModel as makeKoupelni} from './museum-koupelni-v18.js?v=18.0';

const ids = ['hustopece','transped','wurmova','bystrc','selska84','ivancice','nebovidy'];
const slots = new Map();
const active = new Set();
const errors = new Map(), detailErrors = new Map();
let preferred = null, revision = null, transferred = 0, ready, initialBatch, loadAsset, notify;
let loadingPaused = false;

export function getModelState() {
 const withTier = tier => ids.filter(id => slots.get(id)?.visible === tier);
 return {
  manifestRevision: revision, loadedIds: ids.filter(id => slots.get(id)?.visible),
  fullIds: withTier('full'), previewIds: withTier('preview'),
  pendingIds: ids.filter(id => !slots.get(id)?.visible && !errors.has(id)),
  errors: Object.fromEntries(errors), detailErrors: Object.fromEntries(detailErrors),
  payloadBytes: transferred
 };
}

function present(id) {
 const slot = slots.get(id);
 if (!slot) return;
 // Keep the current building on the plinth while its other representation is loading.
 let next = slot.full ? 'full' : null;
 if (slot.preview && (id !== preferred || !slot.full)) next = 'preview';
 if (next && next !== slot.visible) {
  slot.visible = next;
  notify(id);
 }
}

function nextJob() {
 const candidates = [];
 for (const [id,slot] of slots) {
  const tier = !slot.visible ? (slot.entry.preview && !slot.previewFailed ? 'preview' : 'full') : 'full';
  if (active.has(id) || errors.has(id) || slot[tier]) continue;
  if (slot.visible && (preferred !== id || detailErrors.has(id))) continue;
  const asset = tier === 'full' ? slot.entry : slot.entry.preview;
  candidates.push({id,slot,tier,asset});
 }
 candidates.sort((a,b) => Number(b.id === preferred) - Number(a.id === preferred) || a.asset.bytes-b.asset.bytes);
 return candidates[0];
}

async function run(job) {
 const {id,slot,tier,asset} = job;
 let failed = false;
 try {
  slot[tier] = await loadAsset(id,asset);
  transferred += asset.bytes;
  errors.delete(id);
  detailErrors.delete(id);
  present(id);
 } catch (error) {
  failed = true;
  const message = error?.message || 'model unavailable';
  if (tier === 'preview') slot.previewFailed = true;
  else if (slot.visible) detailErrors.set(id,message);
  else errors.set(id,message);
 } finally {
  active.delete(id);
  notify(failed ? id : null);
  // Let the newly installed exhibit paint before another GLB is decoded.
  setTimeout(pump,0);
 }
}

function pump() {
 if (!loadAsset) return;
 while (!loadingPaused && active.size < 2) {
  const job = nextJob();
  if (!job) break;
  active.add(job.id);
  void run(job);
 }
 if (ready && !getModelState().pendingIds.length) {
  const done = ready;
  ready = null;
  done(getModelState());
 }
}

// Keep already requested assets, but do not start another decode while hidden.
// Priority and retry changes remain queued until the caller resumes loading.
export function setModelLoadingPaused(paused) {
 loadingPaused = !!paused;
 if (!loadingPaused) pump();
}

export function prioritizeModel(id,{retry=false}={}) {
 const next = ids.includes(id) ? id : null;
 if (next === preferred && !retry) return;
 const old = preferred;
 preferred = next;
 if (retry || old !== next) { detailErrors.delete(next); if (slots.has(next)) errors.delete(next); }
 if (old !== next) present(old);
 present(next);
 pump();
}

function prepare(scene,THREE,id) {
 const normalized = new Map();
 let meshes = 0;
 function material(source) {
  if (!source?.isMeshBasicMaterial) return source;
  if (!normalized.has(source)) normalized.set(source,new THREE.MeshStandardMaterial({
   name:source.name,color:source.color,map:source.map,transparent:source.transparent,
   opacity:source.opacity,alphaTest:source.alphaTest,side:source.side,depthWrite:source.depthWrite,roughness:.82,metalness:.02
  }));
  return normalized.get(source);
 }
 scene.traverse(object => {
  if (!object.isMesh) return;
  meshes++;
  object.material = Array.isArray(object.material) ? object.material.map(material) : material(object.material);
 });
 if (!meshes) throw new Error('empty model ' + id);
 return scene;
}

export function makeProjectModel(id,THREE) {
 if (id === 'koupelni') return makeKoupelni(id,THREE);
 const slot = slots.get(id);
 if (!slot?.visible) {
  const group = new THREE.Group();
  group.userData = {modelId:id,loading:true,detailLevel:'pending'};
  return group;
 }
 const tier = slot.visible, model = slot[tier].clone(true), materials = new Map();
 function finish(source) {
  if (!source?.isMeshStandardMaterial) return source;
  if (materials.has(source)) return materials.get(source);
  const material = source.clone();
  material.userData.galleryModelMaterial = true;
  material.envMapIntensity = material.transparent ? .68 : .48;
  if (material.transparent) material.depthWrite = false;
  materials.set(source,material);
  return material;
 }
 model.userData = {...model.userData,modelId:id,loading:false,assetTier:tier,
  detailLevel:tier === 'full' ? 'client-model' : 'gallery-preview',geometrySource:'SketchUp model supplied by HiARCH'};
 model.traverse(mesh => {
  if (!mesh.isMesh) return;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.projectId = id;
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(finish) : finish(mesh.material);
 });
 return model;
}

function validAsset(asset,id,folder) {
 return asset?.url === 'assets/v22/'+folder+'/'+id+'.glb' && Number.isSafeInteger(asset.bytes) && asset.bytes > 0;
}

export function loadClientModels(THREE,{onUpdate=()=>{}}={}) {
 if (initialBatch) return initialBatch;
 initialBatch = new Promise(resolve => { ready = resolve; });
 notify = id => onUpdate({...getModelState(),id});
 async function start() {
  try {
   const [response,{GLTFLoader},{MeshoptDecoder}] = await Promise.all([
    fetch(new URL('assets/v22/models/manifest.json?v=26',document.baseURI)),
    import('./assets/vendor/GLTFLoader.js'),import('./assets/vendor/meshopt_decoder.module.js')
   ]);
   if (!response.ok) throw new Error('manifest unavailable');
   const manifest = await response.json();
   if (manifest.revision !== 22 || !Array.isArray(manifest.models)) throw new Error('invalid model manifest');
   revision = manifest.revision;
   const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
   loadAsset = async (id,asset) => {
    const url = new URL(asset.url,document.baseURI);
    if (asset.updatedIn === 26) url.searchParams.set('v',asset.sha256.slice(0,12));
    return prepare((await loader.loadAsync(url.href)).scene,THREE,id);
   };
   for (const id of ids) {
    const entry = manifest.models.find(asset => asset.id === id);
    if (!validAsset(entry,id,'models')) { errors.set(id,'missing or invalid model entry'); notify(id); continue; }
    slots.set(id,{entry,previewFailed:!validAsset(entry.preview,id,'preview'),visible:null,full:null,preview:null});
   }
   notify(null);
   pump();
  } catch (error) {
   const failedIds = ids.filter(id => !slots.get(id)?.visible);
   for (const id of failedIds) errors.set(id,error.message);
   for (const id of failedIds) notify(id);
   ready?.(getModelState());
   ready = null;
  }
 }
 void start();
 return initialBatch;
}
