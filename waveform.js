/** Source-audio peaks shared by audio clips and the audio embedded in video. */
const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
const yieldToUI=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(resolve=>setTimeout(resolve,0));
export async function buildPeakEnvelope(channels,sampleRate,{binsPerSecond=100,yieldControl=yieldToUI,isCancelled=()=>false}={}){
  if(!Array.isArray(channels)||!channels.length||!Number.isFinite(sampleRate)||sampleRate<=0||!Number.isFinite(binsPerSecond)||binsPerSecond<=0)throw new TypeError('Audio no válido para generar la forma de onda.');
  const frames=channels[0].length;
  if(channels.some(channel=>!channel||channel.length!==frames))throw new TypeError('Los canales de audio deben tener la misma duración.');
  const hopSize=Math.max(1,Math.round(sampleRate/binsPerSecond));
  const bins=Math.ceil(frames/hopSize),minimum=new Float32Array(bins),maximum=new Float32Array(bins);
  let maxAbs=0;
  for(let bin=0;bin<bins;bin++){
    if(isCancelled())throw new DOMException('Análisis cancelado.','AbortError');
    let lo=0,hi=0;
    const first=bin*hopSize,last=Math.min(frames,first+hopSize);
    for(const channel of channels){
      for(let frame=first;frame<last;frame++){
        const value=channel[frame];
        if(!Number.isFinite(value))continue;
        if(value<lo)lo=value;
        if(value>hi)hi=value;
      }
    }
    minimum[bin]=lo;maximum[bin]=hi;maxAbs=Math.max(maxAbs,-lo,hi);
    if(bin>0&&bin%256===0)await yieldControl();
  }
  return {minimum,maximum,sampleRate,hopSize,duration:frames/sampleRate,channels:channels.length,maxAbs};
}
/** Aggregate every peak touched by a pixel, retaining brief transients on zoom-out. */
export function readPeakRange(waveform,start,end){
  if(!waveform?.minimum?.length||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end<=0||start>=waveform.duration)return {min:0,max:0};
  const length=waveform.minimum.length,binsPerSecond=waveform.sampleRate/waveform.hopSize;
  const first=bound(Math.floor(Math.max(0,start)*binsPerSecond),0,length-1);
  const last=bound(Math.ceil(Math.min(waveform.duration,end)*binsPerSecond),first+1,length);
  let min=0,max=0;
  for(let bin=first;bin<last;bin++){min=Math.min(min,waveform.minimum[bin]);max=Math.max(max,waveform.maximum[bin]);}
  return {min,max};
}
export function clipColumnPeaks(waveform,clip,column,columns){
  if(!Number.isFinite(columns)||columns<=0||column<0||column>=columns)return {min:0,max:0};
  const sourceSpan=clip.duration*clip.speed;
  return readPeakRange(waveform,clip.offset+column/columns*sourceSpan,clip.offset+(column+1)/columns*sourceSpan);
}
