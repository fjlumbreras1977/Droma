export function parseTimestamp(value){
 const match=String(value).trim().match(/^(?:(\d{1,3}):)?(\d{2}):(\d{2})[.,](\d{1,3})$/);
 if(!match||Number(match[2])>59||Number(match[3])>59)throw Error('Tiempo de subtítulo no válido: '+value);
 return Number(match[1]||0)*3600+Number(match[2])*60+Number(match[3])+Number(match[4].padEnd(3,'0'))/1000;
}
const plain=text=>text.replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').trim();
export function validateCaptions(cues){
 if(cues.length>500)throw Error('Puedes utilizar hasta 500 subtítulos en un proyecto.');
 return cues.map((cue,i)=>{const start=Number(cue.start),end=Number(cue.end),text=String(cue.text||'').trim();if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||!text)throw Error('Revisa el texto y los tiempos del subtítulo '+(i+1)+'.');if(text.length>300)throw Error('El subtítulo '+(i+1)+' supera 300 caracteres. Divídelo en varios fragmentos.');return {start,end,text};}).sort((a,b)=>a.start-b.start);
}
export function parseCaptions(input){
 const blocks=String(input).replace(/^\uFEFF/,'').replace(/\r/g,'').split(/\n\s*\n/),cues=[];
 for(const block of blocks){const lines=block.trim().split('\n');if(/^(WEBVTT|NOTE|STYLE|REGION)\b/.test(lines[0]))continue;const index=lines.findIndex(line=>line.includes('-->'));if(index<0)continue;const pair=lines[index].split('-->');const text=plain(lines.slice(index+1).join('\n'));cues.push({start:parseTimestamp(pair[0]),end:parseTimestamp(pair[1].trim().split(/\s+/)[0]),text});}
 if(!cues.length)throw Error('No se han encontrado subtítulos válidos. Utiliza un archivo SRT o WebVTT con sus tiempos.');
 return validateCaptions(cues);
}
export function captionAt(cues,time){return cues.filter(cue=>time>=cue.start&&time<cue.end).map(cue=>cue.text).join('\n');}
function timestamp(value){const ms=Math.max(0,Math.round(value*1000)),seconds=Math.floor(ms/1000);return String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')+','+String(ms%1000).padStart(3,'0');}
export function serializeSrt(cues,start,end){return validateCaptions(cues).filter(c=>c.end>start&&c.start<end).map((cue,i)=>(i+1)+'\n'+timestamp(Math.max(start,cue.start)-start)+' --> '+timestamp(Math.min(end,cue.end)-start)+'\n'+cue.text+'\n').join('\n');}
export function distributeText(text,start,end){
 const words=String(text).trim().split(/\s+/).filter(Boolean);if(!words.length)throw Error('Escribe el texto que quieres repartir.');
 const lines=[];let line='';for(const word of words){if(line&&(line+' '+word).length>82){lines.push(line);line=word;}else line+=(line?' ':'')+word;if(/[.!?…]$/.test(word)&&line.length>25){lines.push(line);line='';}}if(line)lines.push(line);
 if(end-start<lines.length*.3)throw Error('El fragmento es demasiado corto para ese texto.');
 const total=lines.reduce((n,t)=>n+t.length,0);let cursor=start;
 return validateCaptions(lines.map((text,i)=>{const from=cursor;cursor=i===lines.length-1?end:cursor+(end-start)*text.length/total;return {start:from,end:cursor,text};}));
}
