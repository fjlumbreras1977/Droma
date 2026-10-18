import {DemucsProcessor} from './processor.mjs';
import {makeStems,encodeWav} from './audio.mjs';
const progress=(stage,fraction,detail)=>self.postMessage({type:'progress',stage,fraction,detail});
const toHex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function getModel(config){
 let cache;
 try{cache=await caches.open('droma-demucs-model-v1');}catch{}
 if(cache){
  try{
   const cached=await cache.match(config.url);
   if(cached){const data=await cached.arrayBuffer();if(data.byteLength===config.bytes){progress('model',1,'Modelo recuperado de este navegador.');return data;}await cache.delete(config.url);}
  }catch{}
 }
 const response=await fetch(config.url,{mode:'cors',credentials:'omit'});
 if(!response.ok)throw new Error('No se ha podido descargar el modelo de IA. Comprueba tu conexión y vuelve a intentarlo.');
 let bytes;
 if(response.body){
  const reader=response.body.getReader(),chunks=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);total+=value.byteLength;progress('model',Math.min(.99,total/config.bytes),`Descargando modelo: ${Math.round(total/1e6)} / ${Math.round(config.bytes/1e6)} MB`);}
  bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
 }else bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.byteLength!==config.bytes)throw new Error('La descarga del modelo está incompleta. Vuelve a intentarlo con una conexión estable.');
 progress('model',1,'Verificando el modelo descargado…');
 const digest=toHex(await crypto.subtle.digest('SHA-256',bytes));
 if(digest!==config.sha256)throw new Error('La verificación del modelo ha fallado. No se procesará el audio con esta descarga.');
 if(cache){try{await cache.put(config.url,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}catch{}}
 return bytes.buffer;
}
let running=false;
self.onmessage=async({data})=>{
 if(data.type!=='separate'||running)return;
 running=true;let processor;
 try{
  const config=await (await fetch(new URL('./model.json',import.meta.url))).json();
  progress('model',0,'Preparando el modelo de IA…');
  const model=await getModel(config);
  const settings={onProgress:p=>progress('separate',Math.max(0,Math.min(1,p.progress)),'Separando la voz y la música…')};
  async function createProcessor(useGpu){
   const ort=useGpu?await import('./ort/ort.webgpu.min.mjs'):await import('./ort/ort.wasm.min.mjs');
   ort.env.wasm.numThreads=1;
   ort.env.wasm.proxy=false;
   ort.env.wasm.wasmPaths=new URL('./ort/',import.meta.url).href;
   return new DemucsProcessor({...settings,ort,sessionOptions:{executionProviders:useGpu?['webgpu','wasm']:['wasm'],graphOptimizationLevel:'basic'}});
  }
  let gpu=false;
  try{gpu=Boolean(navigator.gpu && await navigator.gpu.requestAdapter());}catch{}
  progress('prepare',null,'Preparando el motor. Esta fase puede tardar un poco…');
  processor=await createProcessor(gpu);
  try{await processor.loadModel(model);}catch(error){
   if(!gpu)throw error;
   try{await processor.session?.release();}catch{}
   progress('prepare',null,'Preparando el procesamiento con el equipo…');
   processor=await createProcessor(false);
   await processor.loadModel(model);
  }
  progress('separate',0,'Separando la voz y la música…');
  const result=await processor.separate(new Float32Array(data.left),new Float32Array(data.right));
  progress('export',null,'Preparando los dos archivos WAV…');
  const stems=makeStems(result);
  const vocals=encodeWav(stems.vocals,44100),music=encodeWav(stems.music,44100);
  self.postMessage({type:'done',vocals,music,gain:stems.gain,sampleRate:44100,samples:stems.vocals.left.length},[vocals,music]);
 }catch(error){
  console.error('Dröma: error del motor de separación',error);
  const message=String(error?.message||error);
  self.postMessage({type:'error',message:/memory|allocation|out of|size|OOM/i.test(message)?'El equipo no tiene suficiente memoria para esta separación. Prueba con 30 segundos, cierra otras pestañas o usa un ordenador con más memoria.':/network|fetch|download|connection|descarga/i.test(message)?message:'No se ha podido completar la separación. Prueba con 30 segundos en un navegador actualizado. El equipo debe disponer de memoria suficiente.'});
 }finally{try{await processor?.session?.release();}catch{}running=false;}
};
