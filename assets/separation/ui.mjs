const $=id=>document.getElementById(id);
const input=$('song-file'),start=$('separate-start'),cancel=$('separate-cancel'),clear=$('separate-clear'),scope=$('separate-scope');
let file=null,sourceUrl='',urls=[],worker=null,job=0,timer=null,started=0,busy=false;
const seconds=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
function notice(text,error=false){$('separate-status').textContent=text;$('separate-status').classList.toggle('error',error);}
function stopAudio(){for(const audio of document.querySelectorAll('audio'))audio.pause();}
function freeResults(){for(const url of urls)URL.revokeObjectURL(url);urls=[];for(const id of ['vocal-audio','music-audio']){$(id).pause();$(id).removeAttribute('src');$(id).load();}$('separate-results').hidden=true;}
function setBusy(value){busy=value;start.disabled=value||!file;input.disabled=value;scope.disabled=value;clear.disabled=value||!file;cancel.hidden=!value;$('separate-progress').hidden=!value;$('separate-workspace').setAttribute('aria-busy',String(value));}
function stopWorker(){worker?.terminate();worker=null;clearInterval(timer);timer=null;}
function choose(candidate){
 if(busy||!candidate)return;
 if(candidate.size===0){notice('El archivo está vacío. Elige una canción válida.',true);return;}
 if(candidate.size>150*1024*1024){notice('El archivo supera 150 MB. Utiliza una copia de menor tamaño.',true);return;}
 stopAudio();freeResults();if(sourceUrl)URL.revokeObjectURL(sourceUrl);
 file=candidate;sourceUrl=URL.createObjectURL(file);$('original-audio').src=sourceUrl;
 $('song-name').textContent=file.name;$('song-size').textContent=(file.size/1024/1024).toFixed(1)+' MB';$('song-preview').hidden=false;
 $('separate-progress').hidden=true;setBusy(false);notice('Canción preparada. Elige el alcance y pulsa Separar voz y música.');
}
input.addEventListener('change',()=>choose(input.files[0]));
const drop=$('song-drop');
for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();if(!busy)drop.classList.add('dragover');});
for(const event of ['dragleave','drop'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove('dragover');});
drop.addEventListener('drop',e=>choose(e.dataTransfer.files[0]));
clear.addEventListener('click',()=>{job++;stopWorker();stopAudio();freeResults();if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl='';file=null;input.value='';$('original-audio').removeAttribute('src');$('original-audio').load();$('song-preview').hidden=true;setBusy(false);notice('Elige una canción para empezar.');});
cancel.addEventListener('click',()=>{job++;stopWorker();setBusy(false);notice('Proceso cancelado. Puedes volver a intentarlo con esta canción.');});
for(const audio of document.querySelectorAll('audio'))audio.addEventListener('play',()=>{for(const other of document.querySelectorAll('audio'))if(other!==audio)other.pause();});
function updateProgress(stage,fraction,detail){
 const labels={decode:'Preparar canción',model:'Cargar IA',prepare:'Preparar IA',separate:'Separar voz y música',export:'Crear descargas'};
 $('progress-stage').textContent=labels[stage]||'Procesando';
 if(typeof fraction==='number'){$('progress-bar').value=fraction;$('progress-percent').textContent=Math.round(fraction*100)+' %';}
 else{$('progress-bar').removeAttribute('value');$('progress-percent').textContent='En curso';}
 $('progress-detail').textContent=detail;
}
start.addEventListener('click',async()=>{
 if(!file||busy)return;
 if(!window.isSecureContext){notice('Abre Dröma mediante HTTPS para utilizar el separador de voz.',true);return;}
 if(typeof Worker==='undefined'||typeof WebAssembly==='undefined'){notice('Este navegador no permite el procesamiento necesario. Utiliza un navegador de escritorio actualizado.',true);return;}
 const selected=file,token=++job,preview=scope.value==='preview';
 stopAudio();freeResults();setBusy(true);notice('Procesando la canción en este equipo…');
 started=Date.now();$('progress-elapsed').textContent='0:00';timer=setInterval(()=>{$('progress-elapsed').textContent=seconds((Date.now()-started)/1000);},1000);
 try{
  updateProgress('decode',null,'Abriendo el audio…');
  const Context=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Context)throw new Error('Este navegador no puede abrir el audio. Prueba con otro navegador actualizado.');
  const context=new Context(2,1,44100),buffer=await context.decodeAudioData(await selected.arrayBuffer());
  if(token!==job)return;
  if(!preview&&buffer.duration>600)throw new Error('Esta versión procesa canciones de hasta 10 minutos. Puedes usar la prueba de 30 segundos o recortar antes el audio.');
  const n=Math.min(buffer.length,preview?44100*30:buffer.length);
  if(n<4410)throw new Error('El audio debe durar al menos una décima de segundo.');
  const left=new Float32Array(buffer.getChannelData(0).subarray(0,n));
  const right=new Float32Array(buffer.getChannelData(buffer.numberOfChannels>1?1:0).subarray(0,n));
  $('song-duration').textContent=seconds(buffer.duration);
  worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
  worker.onerror=()=>{if(token!==job)return;stopWorker();setBusy(false);notice('No se ha podido ejecutar el motor de separación. Prueba con 30 segundos en un navegador actualizado y con otras pestañas cerradas.',true);};
  worker.onmessage=({data})=>{
   if(token!==job)return;
   if(data.type==='progress'){updateProgress(data.stage,data.fraction,data.detail);return;}
   if(data.type==='error'){stopWorker();setBusy(false);notice(data.message,true);return;}
   if(data.type==='done'){
    const base=selected.name.replace(/\.[^.]+$/,'')+(preview?'_prueba-30s':'');
    const voice=URL.createObjectURL(new Blob([data.vocals],{type:'audio/wav'}));
    const music=URL.createObjectURL(new Blob([data.music],{type:'audio/wav'}));urls=[voice,music];
    $('vocal-audio').src=voice;$('music-audio').src=music;
    $('vocal-download').href=voice;$('music-download').href=music;
    $('vocal-download').download=base+'_voz.wav';$('music-download').download=base+'_musica.wav';
    $('result-duration').textContent=seconds(data.samples/data.sampleRate)+(preview?' · Prueba inicial':' · Canción completa');
    $('result-level').hidden=data.gain>=1;
    $('separate-results').hidden=false;stopWorker();setBusy(false);
    notice('Separación terminada. Escucha y descarga la voz y la música por separado.');
   }
  };
  updateProgress('model',0,'La primera vez se descarga un modelo de unos 180 MB. El audio permanece en tu equipo.');
  worker.postMessage({type:'separate',left:left.buffer,right:right.buffer},[left.buffer,right.buffer]);
 }catch(error){if(token!==job)return;stopWorker();setBusy(false);notice(error.message||'No se ha podido leer la canción. Prueba con un MP3 o WAV compatible.',true);}
});
window.addEventListener('pagehide',()=>{job++;stopWorker();stopAudio();for(const url of urls)URL.revokeObjectURL(url);if(sourceUrl)URL.revokeObjectURL(sourceUrl);});
setBusy(false);
