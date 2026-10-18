export const timeLabel=value=>{const n=Math.max(0,Number(value)||0);return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');};
export const fileBase=name=>(String(name||'audio').replace(/\.[^.]+$/,'').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/,'').slice(0,160)||'audio');
export function clipRange(start,end,duration,max=300){
 start=Number(start);end=Number(end);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration+.01||end-start<.1)throw Error('Elige un inicio y un final válidos, con al menos 0,1 segundos de audio.');
 if(end-start>max+.001)throw Error('El fragmento puede durar hasta '+Math.round(max/60)+' minutos.');
 return {start,end:Math.min(end,duration),duration:Math.min(end,duration)-start};
}
export async function decodeFile(file,maxMB=150){
 if(!file?.size)throw Error('El archivo está vacío. Elige otro archivo.');
 if(file.size>maxMB*1024*1024)throw Error('El archivo supera '+maxMB+' MB. Utiliza una copia o un fragmento de menor tamaño.');
 const Context=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
 if(!Context)throw Error('Este navegador no permite leer el audio. Utiliza un navegador de escritorio actualizado.');
 let buffer;
 try{buffer=await new Context(2,1,44100).decodeAudioData(await file.arrayBuffer());}
 catch{throw Error('No se ha podido leer la pista de sonido. La compatibilidad depende del códec: prueba un MP4 con audio AAC, un WebM con Opus o un audio WAV/MP3.');}
 if(!buffer.length||!Number.isFinite(buffer.duration)||buffer.numberOfChannels<1)throw Error('El archivo no contiene una pista de audio que pueda leerse.');
 if(buffer.numberOfChannels>2)throw Error('Esta herramienta admite sonido mono o estéreo. Prepara una versión con uno o dos canales.');
 return buffer;
}
export function slicePcm(buffer,start,end,mono=false){
 const first=Math.floor(start*buffer.sampleRate),last=Math.min(buffer.length,Math.ceil(end*buffer.sampleRate)),n=last-first;
 if(n<=0)throw Error('El fragmento no contiene audio.');
 const source=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 if(mono&&source.length===2){const out=new Float32Array(n);for(let i=0;i<n;i++)out[i]=(source[0][first+i]+source[1][first+i])/2;return [out];}
 return source.map(channel=>new Float32Array(channel.subarray(first,last)));
}
export function wavBuffer(channels,rate=44100){
 const n=channels[0]?.length,count=channels.length;
 if(!n||count<1||count>2||channels.some(c=>c.length!==n))throw Error('El audio debe tener uno o dos canales de igual duración.');
 const bytes=new ArrayBuffer(44+n*count*2),view=new DataView(bytes);
 const text=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,rate,true);view.setUint32(28,rate*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,n*count*2,true);
 for(let i=0;i<n;i++)for(let ch=0;ch<count;ch++){const value=channels[ch][i],x=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;view.setInt16(44+(i*count+ch)*2,Math.round(x*(x<0?32768:32767)),true);}
 return bytes;
}
export function requestDownload(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function encodeMp3(channels,rate,kbps,onProgress=()=>{},signal){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./mp3-worker.js',import.meta.url));
  let settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;worker.terminate();signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
  const abort=()=>finish(new DOMException('Proceso cancelado.','AbortError'));
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  worker.onerror=()=>finish(Error('No se ha podido iniciar el codificador MP3. Recarga la página y vuelve a intentarlo.'));
  worker.onmessage=({data})=>{if(data.type==='progress')onProgress(data.value);if(data.type==='done')finish(null,new Blob(data.parts,{type:'audio/mpeg'}));if(data.type==='error')finish(Error(data.message));};
  const copies=channels.map(c=>new Float32Array(c));worker.postMessage({channels:copies,rate,kbps},copies.map(c=>c.buffer));
 });
}
