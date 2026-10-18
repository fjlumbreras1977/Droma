/* Uses the unmodified lamejs codec distributed with Dröma's original converter. */
importScripts('./lame.min.js');
self.onmessage=({data})=>{
 try{
  const {channels,rate,kbps}=data;
  if(rate!==44100||![128,192,256,320].includes(kbps)||![1,2].includes(channels.length)||!channels[0].length||channels.some(c=>c.length!==channels[0].length))throw Error('Los ajustes del MP3 no son válidos.');
  const encoder=new lamejs.Mp3Encoder(channels.length,rate,kbps),parts=[],n=channels[0].length,left=new Int16Array(1152),right=channels.length===2?new Int16Array(1152):null;let last=-1;
  const pcm=x=>{x=Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;return Math.round(x*(x<0?32768:32767));};
  for(let at=0;at<n;at+=1152){const size=Math.min(1152,n-at);for(let i=0;i<size;i++){left[i]=pcm(channels[0][at+i]);if(right)right[i]=pcm(channels[1][at+i]);}const out=right?encoder.encodeBuffer(left.subarray(0,size),right.subarray(0,size)):encoder.encodeBuffer(left.subarray(0,size));if(out.length)parts.push(new Uint8Array(out));const percent=Math.min(99,Math.floor((at+size)*100/n));if(percent!==last){last=percent;self.postMessage({type:'progress',value:percent});}}
  const tail=encoder.flush();if(tail.length)parts.push(new Uint8Array(tail));if(!parts.length)throw Error('No se ha podido generar el MP3.');self.postMessage({type:'done',parts},parts.map(p=>p.buffer));
 }catch(error){self.postMessage({type:'error',message:error.message||'No se ha podido codificar el MP3.'});}
};
