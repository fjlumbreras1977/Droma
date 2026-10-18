import {captionAt} from './captions.mjs';
import {timeLabel} from '../media/audio.mjs';
export const FORMATS={vertical:{label:'Vertical · 9:16',width:1080,height:1920},square:{label:'Cuadrado · 1:1',width:1080,height:1080},horizontal:{label:'Horizontal · 16:9',width:1920,height:1080}};
export function dimensions(format,quality='hd'){const f=FORMATS[format]||FORMATS.vertical,scale=quality==='full'?1:2/3;return {width:Math.round(f.width*scale),height:Math.round(f.height*scale)};}
function round(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
export function coverRect(image,width,height,x=.5,y=.5,zoom=1){const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,scale=Math.max(width/iw,height/ih)*Math.max(1,zoom);return {x:(width-iw*scale)*x,y:(height-ih*scale)*y,width:iw*scale,height:ih*scale};}
function lines(ctx,text,width){const result=[];for(const paragraph of String(text).split('\n')){let row='';for(const original of paragraph.split(/\s+/).filter(Boolean)){const pieces=[];let part='';for(const letter of original){if(part&&ctx.measureText(part+letter).width>width){pieces.push(part);part=letter;}else part+=letter;}if(part)pieces.push(part);for(const word of pieces){if(row&&ctx.measureText(row+' '+word).width>width){result.push(row);row=word;}else row+=(row?' ':'')+word;}}if(row)result.push(row);}return result;}
function fitText(ctx,text,width,size,min,maxLines,family,weight=700){let rows;for(;size>min;size-=2){ctx.font=weight+' '+size+'px '+family;rows=lines(ctx,text,width);if(rows.length<=maxLines)break;}ctx.font=weight+' '+size+'px '+family;rows=lines(ctx,text,width);if(rows.length>maxLines){rows=rows.slice(0,maxLines);let last=rows.at(-1);while(last&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);rows[rows.length-1]=last+'…';}return {rows,size};}
function waveValue(buffer,time,index,total){
 if(!buffer)return .12+Math.abs(Math.sin(index*.76))*.35;
 const data=buffer.getChannelData(0),rate=buffer.sampleRate,center=Math.floor((time-.2+index/total*.4)*rate);let peak=0;
 for(let j=0;j<64;j++){const at=center+j*3;if(at>=0&&at<data.length)peak=Math.max(peak,Math.abs(data[at]));}
 return Math.min(1,peak*3.2);
}
export function drawScene(ctx,scene,time=0){
 const canvas=ctx.canvas,w=1080,h=canvas.height/canvas.width*w,vertical=h>1300,square=h>900&&!vertical,accent=scene.accent||'#d9ff62';
 ctx.save();ctx.setTransform(canvas.width/w,0,0,canvas.width/w,0,0);ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#101110';ctx.fillRect(0,0,w,h);
 if(scene.photo){const r=coverRect(scene.photo,w,h,scene.photoX??.5,scene.photoY??.5,scene.zoom??1);ctx.drawImage(scene.photo,r.x,r.y,r.width,r.height);}
 else{const glow=ctx.createRadialGradient(w*.8,h*.2,0,w*.8,h*.2,w);glow.addColorStop(0,'#3d4e25');glow.addColorStop(1,'#101110');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#d9ff6220';ctx.lineWidth=1;for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(w*.95,h*.23,150+i*90,0,Math.PI*2);ctx.stroke();}}
 ctx.fillStyle='rgba(0,0,0,'+(scene.shade??.45)+')';ctx.fillRect(0,0,w,h);
 const overlay=ctx.createLinearGradient(0,h*.22,0,h);overlay.addColorStop(0,'rgba(0,0,0,0)');overlay.addColorStop(.65,'rgba(7,10,5,.72)');overlay.addColorStop(1,'rgba(7,10,5,.96)');ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h);
 const margin=80;
 ctx.fillStyle=accent;ctx.beginPath();ctx.arc(margin+5,84,5,0,Math.PI*2);ctx.fill();ctx.font='700 23px Manrope, sans-serif';ctx.fillStyle='#f2f4ed';ctx.fillText(String(scene.brand||'').toUpperCase().slice(0,48),margin+25,92,w-2*margin-160);
 if(scene.logo){const iw=scene.logo.naturalWidth||scene.logo.width,ih=scene.logo.naturalHeight||scene.logo.height,scale=Math.min(170/iw,75/ih);ctx.drawImage(scene.logo,w-margin-iw*scale,52,iw*scale,ih*scale);}
 const titleTop=h*(vertical?.39:square?.29:.245),title=fitText(ctx,scene.title||'',w-margin*2,vertical?76:square?66:55,32,vertical||square?3:2,'"Space Grotesk", sans-serif');
 ctx.fillStyle='#ffffff';ctx.textBaseline='top';for(let i=0;i<title.rows.length;i++)ctx.fillText(title.rows[i],margin,titleTop+i*title.size*1.09);
 ctx.font='500 25px Manrope, sans-serif';ctx.fillStyle='#d4ddc9';ctx.fillText(scene.byline||'',margin,titleTop+title.rows.length*title.size*1.09+22,w-margin*2);
 const waveY=h*(vertical?.665:square?.625:.59),bars=64,gap=5,bw=(w-margin*2-gap*(bars-1))/bars,waveHeight=vertical?125:square?105:75;
 for(let i=0;i<bars;i++){const value=waveValue(scene.buffer,(scene.start||0)+time,i,bars),height=4+value*waveHeight;ctx.fillStyle=accent;ctx.globalAlpha=.35+.65*(1-Math.abs(i-bars/2)/(bars/2));round(ctx,margin+i*(bw+gap),waveY-height/2,bw,height,bw/2);ctx.fill();}ctx.globalAlpha=1;
 const caption=scene.showCaptions===false?'':captionAt(scene.cues||[],(scene.start||0)+time);
 if(caption){const boxWidth=w-margin*2,scaled=(scene.captionScale||1),font=fitText(ctx,caption,boxWidth-48,vertical?43*scaled:square?37*scaled:Math.min(31,31*scaled),22,vertical||square?3:2,'Manrope, sans-serif',700);const lh=font.size*1.3,boxHeight=font.rows.length*lh+36,y=Math.min(h*.78,h-90-boxHeight);ctx.fillStyle='rgba(8,11,6,.82)';round(ctx,margin,y,boxWidth,boxHeight,16);ctx.fill();ctx.fillStyle='#ffffff';ctx.textAlign='center';for(let i=0;i<font.rows.length;i++)ctx.fillText(font.rows[i],w/2,y+18+i*lh);ctx.textAlign='left';}
 const duration=Math.max(.1,scene.duration||60),progress=Math.max(0,Math.min(1,time/duration)),footerY=h-67;
 ctx.fillStyle='#ffffff38';round(ctx,margin,footerY,w-margin*2,3,1.5);ctx.fill();ctx.fillStyle=accent;round(ctx,margin,footerY,(w-margin*2)*progress,3,1.5);ctx.fill();ctx.font='500 18px Manrope, sans-serif';ctx.fillStyle='#c2ccb7';ctx.textBaseline='alphabetic';ctx.fillText(timeLabel(time),margin,footerY+33);ctx.textAlign='right';ctx.fillText(timeLabel(duration),w-margin,footerY+33);ctx.textAlign='left';ctx.restore();
}
