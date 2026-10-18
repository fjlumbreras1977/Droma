/** Derive timeline indicators from actual clip settings, without storing stale flags. */
const number=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const differs=(value,normal=0)=>Math.abs(number(value,normal)-normal)>.001;
const fmt=value=>String(Math.round(number(value)*100)/100).replace('.',',');
const filterNames={cinema:'Cine',warm:'Cálido',mono:'Blanco y negro',vintage:'Vintage',cool:'Frío',vivid:'Vibrante',dream:'Suave'};
const animationNames={fade:'Fundido',rise:'Deslizar arriba',slide:'Deslizar lateral',zoom:'Acercamiento',wipe:'Barrido'};
const audioNames={telephone:'Teléfono',presence:'Presencia de voz',compress:'Compresor'};
const blendNames={screen:'Trama',multiply:'Multiplicar',overlay:'Superponer',lighten:'Aclarar',darken:'Oscurecer'};
export function getClipModifiers(clip,{asset,track}={}){
 if(!clip)return [];
 const indicators=[];
 const visual=clip.kind!=='audio',hasAudio=['video','audio'].includes(clip.kind);
 const add=(id,label,title,details,icon,tab,focusProp)=>indicators.push({id,label,title,details:details.join(' · '),icon,tab,focusProp});
 if(visual){
  const fx=[];
  if(filterNames[clip.filter])fx.push(filterNames[clip.filter]);
  if(number(clip.blur)>0)fx.push(`Desenfoque: ${fmt(clip.blur)} px`);
  if(fx.length)add('fx','FX','Efectos de vídeo',fx,'sparkles','color',number(clip.blur)>0?'blur':null);
  const anim=[];
  if(animationNames[clip.animation])anim.push(animationNames[clip.animation]);
  if(number(clip.fadeIn)>0)anim.push(`Entrada: ${fmt(clip.fadeIn)} s`);
  if(number(clip.fadeOut)>0)anim.push(`Salida: ${fmt(clip.fadeOut)} s`);
  if(anim.length)add('animation','AN','Animación y fundidos',anim,'play','animation','fadeIn');
  if(Array.isArray(clip.keyframes)&&clip.keyframes.length)add('keyframes',String(clip.keyframes.length),'Fotogramas clave',[`${clip.keyframes.length} claves de transformación`],'diamond','animation');
  const colour=[];
  for(const [key,name,normal,suffix] of [['brightness','Brillo',100,'%'],['contrast','Contraste',100,'%'],['saturation','Saturación',100,'%'],['hue','Tono',0,'°'],['warmth','Temperatura cálida',0,'%']]){
   if(differs(clip[key],normal))colour.push(`${name}: ${fmt(clip[key])}${suffix}`);
  }
  if(colour.length)add('colour','COL','Ajustes de color',colour,'palette','color','brightness');
  if(clip.chroma)add('chroma','CR','Croma activado',[`Color: ${clip.chromaColor||'#00ff00'}`,`Tolerancia: ${fmt(number(clip.chromaTolerance,90))}`],'droplet','color','chroma');
  if(['circle','rounded'].includes(clip.mask)){
   add('mask','MSK','Máscara',[clip.mask==='circle'?'Máscara circular':'Rectángulo redondeado'],'shape','color','mask');
  }else{
   const crop=[];
   for(const [key,label] of [['cropL','Izquierda'],['cropR','Derecha'],['cropT','Arriba'],['cropB','Abajo']])if(number(clip[key])>0)crop.push(`${label}: ${fmt(clip[key])}%`);
   if(crop.length)add('crop','RC','Recorte de imagen',crop,'crop','color','cropL');
  }
  const transform=[];
  for(const [key,label,normal,suffix] of [['x','X',0,''],['y','Y',0,''],['scale','Escala',100,'%'],['rotation','Giro',0,'°']])if(differs(clip[key],normal))transform.push(`${label}: ${fmt(clip[key])}${suffix}`);
  if(clip.flip)transform.push('Volteo horizontal');
  if(clip.fit==='cover'&&!['text','shape'].includes(clip.kind))transform.push('Encuadre: Rellenar');
  if(transform.length)add('transform','TR','Transformación',transform,'maximize','basic','scale');
  if(differs(clip.opacity,100))add('opacity',fmt(clip.opacity)+'%','Opacidad modificada',[`Opacidad: ${fmt(clip.opacity)}%`],'eye','basic','opacity');
  if(blendNames[clip.blend])add('blend','BL','Modo de fusión',[blendNames[clip.blend]],'transition','color','blend');
  if(clip.kind==='text'){
   const styling=[];
   if(number(clip.stroke)>0)styling.push(`Contorno: ${fmt(clip.stroke)} px`);
   if(clip.shadow)styling.push('Sombra');
   if(clip.textBg&&clip.textBg!=='transparent')styling.push('Fondo de texto');
   if(clip.italic)styling.push('Cursiva');
   if(styling.length)add('text-style','TXT','Estilo de texto',styling,'text','basic','text');
  }
 }
 if(hasAudio&&differs(clip.speed,1))add('speed',fmt(clip.speed)+'×','Velocidad modificada',[`Velocidad: ${fmt(clip.speed)}×`],'speed',clip.kind==='audio'?'audio':'basic','speed');
 if(hasAudio){
  const audio=[];
  if(audioNames[clip.audioFx])audio.push(audioNames[clip.audioFx]);
  if(differs(clip.volume,100))audio.push(`Volumen: ${fmt(clip.volume)}%`);
  if(differs(clip.pan))audio.push(`Balance: ${fmt(clip.pan)}`);
  if(number(clip.audioIn)>0)audio.push(`Fundido de entrada: ${fmt(clip.audioIn)} s`);
  if(number(clip.audioOut)>0)audio.push(`Fundido de salida: ${fmt(clip.audioOut)} s`);
  if(clip.audioMuted)audio.push('Audio del clip silenciado');
  if(track?.muted)audio.push('Pista silenciada');
  if(audio.length)add('audio','AU','Audio modificado',audio,'volume','audio','volume');
  const offset=number(clip.offset),span=number(clip.duration)*number(clip.speed,1),sourceDuration=number(asset?.duration);
  if(offset>.001||sourceDuration>0&&span<sourceDuration-.01){
   add('trim','CUT','Fragmento recortado',[`Origen: ${fmt(offset)}–${fmt(offset+span)} s`],'split',clip.kind==='audio'?'audio':'basic','duration');
  }
 }
 if(clip.disabled||track?.hidden)add('visibility','OFF','Contenido oculto',[clip.disabled?'Clip desactivado':'Pista visual oculta'],'eye',clip.kind==='audio'?'audio':'basic');
 return indicators;
}
/** Fit chips to a clip, always retaining a summary on narrow or crowded clips. */
export function modifierLayout(indicators,pixelWidth){
 if(!indicators.length)return {visible:[],hidden:[],compact:false,tiny:false};
 if(pixelWidth<90)return {visible:[],hidden:indicators,compact:true,tiny:pixelWidth<32};
 const limit=pixelWidth>=270?4:pixelWidth>=180?3:pixelWidth>=120?2:1;
 return {visible:indicators.slice(0,limit),hidden:indicators.slice(limit),compact:false,tiny:false};
}
export function modifierDescription(indicators){return indicators.map(item=>`${item.title}: ${item.details}`).join('\n');}
