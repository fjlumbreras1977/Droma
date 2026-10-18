const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
export async function mixDucking(voice,music,options={},onProgress=()=>{},signal){
 if(!voice?.length||!music?.length||voice.sampleRate!==music.sampleRate)throw Error('La voz y la música deben tener la misma frecuencia de muestreo.');
 const rate=voice.sampleRate,intro=clamp(Number(options.intro)||0,0,20),outro=clamp(Number(options.outro)||0,0,20),duration=intro+voice.duration+outro;
 if(duration>600.01)throw Error('La mezcla puede durar hasta 10 minutos, incluyendo entrada y salida.');
 const n=Math.ceil(duration*rate),hop=Math.max(1,Math.round(rate*.02)),frames=Math.ceil(n/hop),voiceData=Array.from({length:voice.numberOfChannels},(_,i)=>voice.getChannelData(i)),musicData=Array.from({length:music.numberOfChannels},(_,i)=>music.getChannelData(i));
 const threshold=Math.pow(10,clamp(Number(options.threshold??-38),-60,-15)/20),musicGain=Math.pow(10,clamp(Number(options.musicDb??-12),-36,0)/20),voiceGain=Math.pow(10,clamp(Number(options.voiceDb??0),-12,6)/20),reduction=Math.pow(10,clamp(Number(options.depth??-15),-30,0)/20),attack=Math.max(.01,Number(options.attack??80)/1000),release=Math.max(.05,Number(options.release??700)/1000),introSamples=Math.round(intro*rate),active=new Uint8Array(frames);
 let hold=0;
 for(let f=0;f<frames;f++){
  const at=f*hop-introSamples;let energy=0,count=0;
  for(let i=Math.max(0,at);i<Math.min(voice.length,at+hop);i+=4){let value=0;for(const ch of voiceData)value+=ch[i]*ch[i];energy+=value/voiceData.length;count++;}
  const speaking=count>0&&Math.sqrt(energy/count)>=threshold;
  if(speaking)hold=13;else hold=Math.max(0,hold-1);active[f]=hold>0?1:0;
 }
 const envelope=new Float32Array(frames);let gain=active[Math.min(2,frames-1)]?reduction:1;
 for(let f=0;f<frames;f++){const target=active[Math.min(frames-1,f+2)]?reduction:1,coefficient=Math.exp(-hop/rate/(target<gain?attack:release));gain=target+(gain-target)*coefficient;envelope[f]=gain;}
 const left=new Float32Array(n),right=new Float32Array(n),fade=Math.min(rate*.02,music.length*.1),loop=options.loop!==false;let peak=0;
 const musicSample=(channel,index)=>{if(index>=music.length&&!loop)return 0;const at=index%music.length;let value=channel[at];if(loop&&fade>0){if(at<fade)value*=at/fade;else if(at>music.length-fade)value*=(music.length-at)/fade;}return value;};
 for(let at=0;at<n;at++){
  if(at%65536===0){if(signal?.aborted)throw new DOMException('Mezcla cancelada.','AbortError');onProgress(at/n);await new Promise(resolve=>setTimeout(resolve,0));}
  const vAt=at-introSamples,f=Math.min(frames-1,Math.floor(at/hop)),next=Math.min(frames-1,f+1),fraction=at%hop/hop,duck=envelope[f]+(envelope[next]-envelope[f])*fraction;
  const edge=Math.min(1,at/(rate*.04),(n-1-at)/(rate*.6));
  const ml=musicSample(musicData[0],at)*musicGain*duck*edge,mr=musicSample(musicData[musicData.length>1?1:0],at)*musicGain*duck*edge;
  const vl=vAt>=0&&vAt<voice.length?voiceData[0][vAt]*voiceGain:0,vr=vAt>=0&&vAt<voice.length?voiceData[voiceData.length>1?1:0][vAt]*voiceGain:0;
  left[at]=vl+ml;right[at]=vr+mr;peak=Math.max(peak,Math.abs(left[at]),Math.abs(right[at]));
 }
 const outputGain=peak>.98?.98/peak:1;if(outputGain<1)for(let i=0;i<n;i++){left[i]*=outputGain;right[i]*=outputGain;}
 onProgress(1);return {channels:[left,right],rate,duration:n/rate,envelope,outputGain,peak};
}
