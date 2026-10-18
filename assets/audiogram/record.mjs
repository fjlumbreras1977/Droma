import {drawScene,dimensions} from './render.mjs';
export function videoFormat(Recorder=globalThis.MediaRecorder){
 if(!Recorder?.isTypeSupported)return null;
 for(const type of ['video/mp4;codecs=avc1.420028,mp4a.40.2','video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'])if(Recorder.isTypeSupported(type))return {mime:type,extension:type.includes('mp4')?'mp4':'webm'};
 return null;
}
export async function recordAudiogram({buffer,start,end,scene,format='vertical',quality='hd',onProgress=()=>{},signal,Recorder=globalThis.MediaRecorder,Context=globalThis.AudioContext||globalThis.webkitAudioContext,createCanvas=()=>document.createElement('canvas'),requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}){
 const supported=videoFormat(Recorder);if(!supported||!Context)throw Error('Este navegador no permite exportar vídeo con sonido. Utiliza Chrome, Edge o Safari actualizados.');
 if(signal?.aborted)throw new DOMException('Exportación cancelada.','AbortError');
 const canvas=createCanvas(),size=dimensions(format,quality);canvas.width=size.width;canvas.height=size.height;
 if(!canvas.captureStream)throw Error('Este navegador no permite capturar el vídeo del audiograma.');
 const ctx=canvas.getContext('2d',{alpha:false});drawScene(ctx,scene,0);
 let audioContext,source,recorder,stream,canvasStream,audioStream,raf,watchdog,tail,abortHandler;const chunks=[];
 try{
  audioContext=new Context({sampleRate:44100});await audioContext.resume();
  const destination=audioContext.createMediaStreamDestination();source=audioContext.createBufferSource();source.buffer=buffer;source.connect(destination);audioStream=destination.stream;
  canvasStream=canvas.captureStream(30);stream=new MediaStream([...canvasStream.getVideoTracks(),...destination.stream.getAudioTracks()]);
  recorder=new Recorder(stream,{mimeType:supported.mime,videoBitsPerSecond:quality==='full'?6500000:3500000,audioBitsPerSecond:192000});
  const duration=end-start;
  return await new Promise((resolve,reject)=>{
   let settled=false,startClock=0,lastFrame=-1,bytes=0;
   const fail=error=>{if(settled)return;settled=true;reject(error);};
   const stop=()=>{if(recorder.state!=='inactive')recorder.stop();};
   abortHandler=()=>{try{source.stop();}catch{}try{stop();}catch{}fail(new DOMException('Exportación cancelada.','AbortError'));};
   signal?.addEventListener('abort',abortHandler,{once:true});
   const draw=()=>{if(settled||signal?.aborted)return;const t=Math.max(0,Math.min(duration,audioContext.currentTime-startClock)),frame=Math.floor(t*30);if(frame!==lastFrame){lastFrame=frame;drawScene(ctx,scene,t);onProgress(t/duration,t);}raf=requestFrame(draw);};
   recorder.ondataavailable=event=>{if(event.data?.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>400*1024*1024)fail(Error('El vídeo supera el tamaño disponible. Prueba un fragmento más corto o calidad HD.'));}};
   recorder.onerror=event=>fail(event.error||Error('El navegador no ha podido codificar el vídeo. Prueba calidad HD.'));
   recorder.onstop=()=>{if(settled)return;if(signal?.aborted){fail(new DOMException('Exportación cancelada.','AbortError'));return;}if(!chunks.length){fail(Error('No se ha generado vídeo. Vuelve a intentarlo en un navegador actualizado.'));return;}settled=true;const mime=recorder.mimeType||supported.mime;resolve({blob:new Blob(chunks,{type:mime.split(';')[0]}),extension:mime.includes('mp4')?'mp4':'webm',mime,width:size.width,height:size.height});};
   recorder.onstart=()=>{try{if(signal?.aborted){abortHandler();return;}startClock=audioContext.currentTime+.025;source.start(startClock,start,duration);draw();}catch(error){fail(error);}};
   source.onended=()=>{drawScene(ctx,scene,duration);onProgress(1,duration);tail=setTimeout(stop,80);};
   watchdog=setTimeout(()=>fail(Error('La exportación se ha interrumpido. Mantén visible la pestaña y vuelve a intentarlo.')),(duration+30)*1000);
   recorder.start(500);
  });
 }finally{
  clearTimeout(watchdog);clearTimeout(tail);if(raf!==undefined)cancelFrame(raf);signal?.removeEventListener('abort',abortHandler);
  if(source){source.onended=null;try{source.stop();}catch{}try{source.disconnect();}catch{}}
  if(recorder){recorder.onstop=recorder.onstart=recorder.onerror=recorder.ondataavailable=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}}
  for(const track of new Set([...(stream?.getTracks()||[]),...(canvasStream?.getTracks()||[]),...(audioStream?.getTracks()||[])]))track.stop();try{await audioContext?.close();}catch{}
 }
}
