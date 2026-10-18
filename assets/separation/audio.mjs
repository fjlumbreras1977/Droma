// Shared, deterministic PCM helpers for local export and numerical checks.
export function makeStems(result) {
  const v=result.vocals;
  if(!v?.left?.length || v.left.length!==v.right.length)throw new Error('El motor no ha devuelto una voz válida.');
  const n=v.left.length;
  const music={left:new Float32Array(n),right:new Float32Array(n)};
  let peak=0;
  for(let i=0;i<n;i++){
    music.left[i]=result.drums.left[i]+result.bass.left[i]+result.other.left[i];
    music.right[i]=result.drums.right[i]+result.bass.right[i]+result.other.right[i];
    const vl=v.left[i],vr=v.right[i],ml=music.left[i],mr=music.right[i];
    if(!Number.isFinite(vl)||!Number.isFinite(vr)||!Number.isFinite(ml)||!Number.isFinite(mr))throw new Error('El motor ha producido un resultado no válido.');
    peak=Math.max(peak,Math.abs(vl),Math.abs(vr),Math.abs(ml),Math.abs(mr));
  }
  // One common gain keeps the relationship between both stems and avoids clipping.
  const gain=peak>.98?.98/peak:1;
  if(gain!==1)for(let i=0;i<n;i++){v.left[i]*=gain;v.right[i]*=gain;music.left[i]*=gain;music.right[i]*=gain;}
  return {vocals:v,music,gain};
}
export function encodeWav(stereo,sampleRate=44100){
  const n=stereo.left.length;
  if(n!==stereo.right.length)throw new Error('Los dos canales deben tener la misma duración.');
  const buffer=new ArrayBuffer(44+n*4),view=new DataView(buffer);
  const text=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,n*4,true);
  for(let i=0;i<n;i++)for(let ch=0;ch<2;ch++){
    const x=Math.max(-1,Math.min(1,ch?stereo.right[i]:stereo.left[i]));
    view.setInt16(44+(i*2+ch)*2,Math.round(x*(x<0?32768:32767)),true);
  }
  return buffer;
}
