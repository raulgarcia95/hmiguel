'use strict';
const $=id=>document.getElementById(id), canvas=$('game'), ctx=canvas.getContext('2d'), data=window.GAME_DATA;
document.querySelector('main').prepend(document.querySelector('header'));
const dialogueRail=document.createElement('section');dialogueRail.id='dialogue-rail';dialogueRail.setAttribute('aria-label','Diálogos');$('stage').append(dialogueRail);dialogueRail.append($('subtitle'),$('conversation'));
const fadeLayer=document.createElement('div');fadeLayer.id='fade-layer';fadeLayer.setAttribute('aria-hidden','true');$('stage').append(fadeLayer);
async function fadeTo(opacity){const from=getComputedStyle(fadeLayer).opacity;const animation=fadeLayer.animate([{opacity:from},{opacity}],{duration:650,easing:'ease-in-out',fill:'forwards'});await animation.finished;fadeLayer.style.opacity=opacity;animation.cancel();}
const cinemaBar=document.createElement('div');cinemaBar.id='cinema-bar';cinemaBar.hidden=true;cinemaBar.innerHTML='<span id="cinema-title"></span><button id="skip-cinema">Saltar secuencia</button>';dialogueRail.prepend(cinemaBar);
const cinemaSeek=document.createElement('input');cinemaSeek.type='range';cinemaSeek.min='0';cinemaSeek.max='1000';cinemaSeek.value='0';cinemaSeek.setAttribute('aria-label','Avance de la secuencia');cinemaBar.insertBefore(cinemaSeek,$('skip-cinema'));cinemaSeek.oninput=()=>{if(cinematic)cinematic.begin=(cinematic.pausedAt??performance.now())-Number(cinemaSeek.value)/1000*cinematic.entry.duration;};
const pauseCinema=document.createElement('button');pauseCinema.textContent='Pausar';cinemaBar.insertBefore(pauseCinema,$('skip-cinema'));pauseCinema.onclick=()=>{if(!cinematic)return;if(cinematic.pausedAt!==undefined){cinematic.begin+=performance.now()-cinematic.pausedAt;delete cinematic.pausedAt;pauseCinema.textContent='Pausar';}else{cinematic.pausedAt=performance.now();pauseCinema.textContent='Reanudar';}};
const images=new Map();let started=false,conversation=null,textFinish=null,last=performance.now(),lastTick=0,lastRegion=-1,showMask=false,showHotspots=false,frameClock=0;
let lastHeroSprite=null,lastHeroAnimation='';
function heroSprite(sequence,idle,moving){
 const desired=!moving&&idle?idle:sequence?.[Math.floor((game.travelled||0)/24*sequence.length)%sequence.length];
 const ready=s=>{if(!s)return false;const im=image(s.image);return im.complete&&im.naturalWidth>0;};
 if(lastHeroAnimation!==game.state.animation){lastHeroAnimation=game.state.animation;lastHeroSprite=null;}
 const sprite=ready(desired)?desired:ready(lastHeroSprite)?lastHeroSprite:ready(idle)?idle:sequence?.find(ready);
 if(sprite)lastHeroSprite=sprite;
 return sprite;
}
function hideEntryForIntro(){fadeLayer.style.opacity='1';document.body.classList.toggle('cinema-active',true);$('welcome').hidden=true;}
function image(src){if(!images.has(src)){const im=new Image();im.src=src+(src.includes('?')?'&':'?')+'v=20261014-4';images.set(src,im);}return images.get(src);}
function paint(src,x,y,w,h){const im=image(src);if(im.complete&&im.naturalWidth)ctx.drawImage(im,x,y,w,h);}
function notice(text){$('notice').textContent=text;}
const labels={1:'Marica’s · La carta',2:'La primera prueba',3:'Sabadell',4:'Ferretería',5:'El poste',6:'La caja de cables',7:'Fin de partida',8:'Mapa de Cataluña',9:'Entrada a Port Aventura',10:'Port Aventura',11:'La entrada',12:'Fin de partida',13:'Los grandes almacenes',14:'Dentro de Marica’s',15:'La máquina de discos',16:'Fin de partida',17:'La ciudad',18:'La playa',19:'Pamela en la playa',20:'Fin de partida',21:'El restaurante',22:'La orilla',23:'El lavabo',25:'Fin de partida',26:'La taquilla',27:'La tienda de música',28:'La tienda de deportes',30:'El Prat',31:'Tarragona',32:'Fin de partida',33:'Fin de partida',34:'El bar',35:'Barcelona'};
function inventory(){
 $('inventory').replaceChildren();
 for(const id of game.state.inventory){const obj=game.state.objects[id];if(!obj)continue;const b=document.createElement('button');b.textContent=obj.name;b.classList.toggle('selected',game.state.selected===id);b.onclick=async()=>{if(game.busy||cinematic)return;if(game.state.selected&&game.state.selected!==id){await game.interact(id);if(!game.matched)select(id);}else select(game.state.selected===id?0:id);};b.oncontextmenu=e=>{e.preventDefault();if(!game.busy&&!cinematic)game.interact(id,4);};if(obj.icon){const im=document.createElement('img');im.src=obj.icon;im.alt='';b.prepend(im);}$('inventory').append(b);}
 $('action').textContent=game.state.selected===4?'Mirar':game.state.objects[game.state.selected]?.name||'Manos libres';
 $('hand').classList.toggle('selected',!game.state.selected);$('look').classList.toggle('selected',game.state.selected===4);
}
function select(id){game.state.selected=id;inventory();}
let pointerPosition=null,lastCursor='';
function updateCursor(now){let cursor='default';if(pointerPosition&&started&&!game.busy&&!conversation&&!cinematic){const p=pointerPosition,o=game.hotspot(p.x,p.y);cursor=o?(game.state.selected===4?'url("assets/cursors/eye.webp") 24 24, help':'pointer'):Adventure.valid(game.masks[game.state.room],p.x,p.y)?`url("assets/cursors/walk-${Math.floor(now/150)%4}.webp") 24 47, crosshair`:'not-allowed';}if(cursor!==lastCursor){canvas.style.cursor=cursor;lastCursor=cursor;}}
function showText(text){return new Promise(resolve=>{const box=$('subtitle');box.querySelector('span').textContent=text;box.hidden=false;const timer=setTimeout(finish,Math.max(2200,Math.min(9000,text.length*50)));function finish(){clearTimeout(timer);box.hidden=true;textFinish=null;resolve();}textFinish=finish;box.querySelector('button').onclick=finish;});}
function talk(id,phrase){
 const dialog=data.conversations[id];if(!dialog){notice('Esta conversación no está disponible en los archivos originales.');return Promise.resolve();}
 return new Promise(resolve=>{conversation={id,dialog,phrase};$('conversation').hidden=false;image(dialog.image);
 function close(){$('conversation').hidden=true;conversation=null;resolve();}
 function line(index){const p=dialog.phrases[index];if(!p||(!p.text&&!p.choices.some(Boolean))||/[\x00-\x08]/.test(p.text)){close();return;}
 conversation.phrase=index;if(p.variable<255)game.state.variables[p.variable]=p.value;
 $('speech').textContent=p.text;$('choices').replaceChildren();
 p.choices.forEach((choice,i)=>{if(!choice)return;const b=document.createElement('button');b.textContent=choice;b.onclick=()=>p.next[i]===255?close():line(p.next[i]);$('choices').append(b);});
 if(!$('choices').children.length){const b=document.createElement('button');b.textContent='Continuar';b.onclick=close;$('choices').append(b);}
 }
 $('close-conversation').onclick=close;line(phrase);
 });
}
const mediaPending=new Set();let cinematic=null;const music=new Audio();music.loop=true;music.volume=.35;let musicFile='';
const soundButton=document.createElement('button');soundButton.id='sound-toggle';soundButton.textContent='Silenciar música';soundButton.setAttribute('aria-pressed','false');soundButton.onclick=()=>{if(music.paused&&music.src){music.muted=false;music.play().catch(()=>notice('No se pudo reproducir la música.'));}else music.muted=!music.muted;soundButton.textContent=music.muted?'Activar música':'Silenciar música';soundButton.setAttribute('aria-pressed',String(music.muted));};$('settings').append(soundButton);
async function playMedia(type,file){
 const key=file.toUpperCase();
 if(type==='music'){const entry=window.MEDIA_DATA?.music?.[key];if(!entry){notice('La canción '+file+' no está en los archivos originales.');return;}if(musicFile!==key){musicFile=key;music.src=entry;await music.play().catch(()=>{soundButton.textContent='Activar música';notice('Pulsa Activar música para iniciar el sonido.');});}return;}
 if(type!=='animation')return;
 const entry=window.MEDIA_DATA?.animations?.[key];if(!entry){mediaPending.add(key);notice('Secuencia no disponible: '+file);return;}
 await fadeTo(1);
 await window.prepareRemasteredCinema?.(key);
 await new Promise(resolve=>{
  const begin=performance.now();cinematic={key,entry,begin,end:async()=>{if(cinematic?.ending)return;cinematic.ending=true;await fadeTo(1);cinematic=null;cinemaBar.hidden=true;$('subtitle').hidden=true;window.clearCinemaCaption?.();resolve();}};
  cinemaBar.hidden=false;$('cinema-title').textContent=key==='WMS.FLI'?'World Media Software':key==='PRESENT.FLI'?'La historia de Menchu y Miguel':file;
  cinemaSeek.hidden=!entry.remastered;cinemaSeek.value='0';
  pauseCinema.hidden=!entry.remastered;pauseCinema.textContent='Pausar';
  $('skip-cinema').onclick=()=>cinematic?.end();image(entry.image+'?play='+Math.round(begin));cinematic.source=entry.image+'?play='+Math.round(begin);
   fadeTo(0);
   });
  if(key==='PRESENT.FLI'){const cover=image('assets/portada.webp');if(cover.decode)await cover.decode().catch(()=>{});await new Promise(resolve=>{cinematic={key:'PORTADA',entry:{duration:10000},begin:performance.now(),end:async()=>{if(cinematic?.ending)return;cinematic.ending=true;await fadeTo(1);cinematic=null;resolve();}};fadeTo(0);});}
  if(key!=='WMS.FLI')await fadeTo(0);
}
const game=new Adventure.Game(data,{text:showText,conversation:talk,inventory,notice,room:room=>{
 image(room.image);image('assets/mask-'+room.id+'.webp');$('location').textContent=(labels[room.id]||room.art)+(room.hd?' · HD':' · Arte original');$('scene-select').value=String(room.id);
},media:playMedia,fade:()=>{},ending:showEnding});
const sceneBack=document.createElement('button');sceneBack.id='scene-back';sceneBack.textContent='← Volver a Marica’s';sceneBack.hidden=true;dialogueRail.append(sceneBack);sceneBack.onclick=async()=>{if(game.busy||cinematic||game.state.room!==15)return;await game.enter(14,69,160);};
const deathBar=document.createElement('div');deathBar.id='death-bar';deathBar.hidden=true;deathBar.innerHTML='<p>Menchu: Bueno… esta vez lo haré de otra manera.</p><button id="retry">Volver a intentarlo</button><button id="death-load">Cargar partida</button><button id="death-restart">Comenzar de nuevo</button>';dialogueRail.append(deathBar);
$('retry').onclick=async()=>{if(await game.retry())notice('De vuelta al momento anterior.');};
$('death-load').onclick=()=>{$('load').onclick();};$('death-restart').onclick=()=>{$('restart').onclick();};
// Exposed for deterministic local validation and saved-game diagnostics.
window.game=game;
for(const [id,room] of Object.entries(data.rooms)){const option=document.createElement('option');option.value=id;option.textContent=`${id} · ${labels[id]||room.art}${room.hd?' · HD':''}`;$('scene-select').append(option);}
function render(now){
 document.body.classList.toggle('cinema-active',!!cinematic||(!started&&$('welcome').hidden));
 deathBar.hidden=!game.isGameOver()||!!cinematic||!started;$('retry').disabled=!game.retryState;
 const dt=Math.min(.1,(now-last)/1000);last=now;const walking=started&&game.step(dt);if(walking)frameClock+=dt;
 updateCursor(now);
 ctx.fillStyle='#000';ctx.fillRect(0,0,1600,1000);
 sceneBack.hidden=game.state.room!==15||!!cinematic;
 if(cinematic?.key==='PORTADA'){const im=image('assets/portada.webp');if(im.naturalWidth){const scale=Math.min(1600/im.naturalWidth,1000/im.naturalHeight);ctx.drawImage(im,(1600-im.naturalWidth*scale)/2,(1000-im.naturalHeight*scale)/2,im.naturalWidth*scale,im.naturalHeight*scale);}if(now-cinematic.begin>=10000)cinematic.end();requestAnimationFrame(render);return;}
 if(cinematic){const elapsed=(cinematic.pausedAt??now)-cinematic.begin;cinemaSeek.value=String(Math.round(elapsed/cinematic.entry.duration*1000));if(window.drawRemasteredCinema&&window.drawRemasteredCinema(ctx,cinematic.key,elapsed,paint,cinematic.entry)){}else paint(cinematic.source,0,0,1600,1000);if(elapsed>=cinematic.entry.duration)cinematic.end();requestAnimationFrame(render);return;}
 if(!started){requestAnimationFrame(render);return;}
 const room=game.room();paint(conversation?conversation.dialog.image:room.image,0,0,1600,1000);
 if(!conversation){
  const graphics=Object.values(game.state.graphics).filter(g=>g.room===game.state.room&&g.flag>0);
  const drawGraphic=g=>paint(g.image,g.x*5,g.y*5,g.w*5,g.h*5);
  graphics.filter(g=>g.flag===1).forEach(drawGraphic);
  if(game.state.visible){const set=data.animations[game.state.animation]||data.animations['hombre.sca'];const sequence=set[game.state.direction]?.length?set[game.state.direction]:set[4];const idle=data.idleFrames?.[game.state.animation]?.[Math.min(3,game.state.direction)];const sprite=heroSprite(sequence,idle,walking||game.path.length>0);
   if(sprite)paint(sprite.image,game.state.x*5-(sprite.anchorX??sprite.w/2)*5,game.state.y*5-(sprite.anchorY??sprite.h)*5,sprite.w*5,sprite.h*5);
  }
  graphics.filter(g=>g.flag===2).forEach(drawGraphic);
  if(showMask)paint('assets/mask-'+game.state.room+'.webp',0,0,1600,1000);
  if(showHotspots){ctx.lineWidth=2;ctx.font='16px system-ui';for(const o of Object.values(game.state.objects)){if(o.room!==game.state.room||game.state.inventory.includes(o.id))continue;ctx.strokeStyle='#f4d389';ctx.strokeRect(o.x*5,o.y*5,o.w*5,o.h*5);ctx.fillStyle='#fff';ctx.fillText(o.name,o.x*5,o.y*5-5);}}
 }
 if(started&&(now-lastTick>120||game.pixel()!==lastRegion)){lastTick=now;lastRegion=game.pixel();game.tick().catch(e=>{notice('Error de ejecución: '+e.message);console.error(e);});}
 requestAnimationFrame(render);
}
function point(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*320,y:(event.clientY-r.top)/r.height*200};}
canvas.addEventListener('pointermove',event=>{pointerPosition=point(event);if(!started||game.busy||conversation)return;const p=pointerPosition,o=game.hotspot(p.x,p.y),hover=$('hover');if(!o){hover.style.display='none';return;}hover.textContent=(game.state.selected?(game.state.selected===4?'Mirar ':`Usar ${game.state.objects[game.state.selected]?.name||''} con `):'')+o.name;hover.style.display='block';const r=canvas.getBoundingClientRect();hover.style.left=Math.min(event.clientX-r.left+12,r.width-180)+'px';hover.style.top=Math.max(0,event.clientY-r.top-36)+'px';});
canvas.addEventListener('pointerleave',()=>{pointerPosition=null;$('hover').style.display='none';});
canvas.addEventListener('click',event=>{if(!started||game.busy||conversation)return;const p=point(event),o=game.hotspot(p.x,p.y);$('hover').style.display='none';if(o)game.interact(o.id).catch(console.error);else game.move(p.x,p.y);});
canvas.addEventListener('contextmenu',event=>{event.preventDefault();select(game.state.selected?0:4);});
$('start').onclick=async()=>{started=false;hideEntryForIntro();await game.start();started=true;inventory();notice('Haz clic para explorar. La carta está junto a Miguel.');canvas.focus();};
$('hand').onclick=()=>select(0);$('look').onclick=()=>select(4);
$('save').onclick=()=>{if(!started||game.busy)return notice('Espera a terminar la acción antes de guardar.');try{localStorage.setItem('miguel-hd-save-v1',game.serialize());notice('Partida guardada en este navegador.');}catch{notice('El navegador no permite guardar la partida.');}};
$('load').onclick=async()=>{if(game.busy||cinematic)return;try{const saved=localStorage.getItem('miguel-hd-save-v1');if(!saved)return notice('Todavía no hay una partida guardada.');await game.restore(saved);started=true;$('welcome').hidden=true;notice('Partida recuperada.');}catch{notice('No se pudo cargar la partida.');}};
$('fullscreen').onclick=()=>{const promise=document.fullscreenElement?document.exitFullscreen():document.querySelector('main').requestFullscreen();promise?.catch(()=>notice('Este navegador no permite pantalla completa.'));};
$('options').onclick=()=>{$('settings').hidden=!$('settings').hidden;$('options').setAttribute('aria-expanded',String(!$('settings').hidden));};
$('mask-toggle').onchange=e=>showMask=e.target.checked;$('hotspots-toggle').onchange=e=>showHotspots=e.target.checked;
$('visit').onclick=async()=>{if(game.busy||cinematic)return;started=false;$('welcome').hidden=true;await game.enter(Number($('scene-select').value),160,180);started=true;notice('Escena de prueba abierta.');};
$('restart').onclick=async()=>{if(game.busy||cinematic)return;started=false;hideEntryForIntro();await game.start();started=true;inventory();notice('Nueva partida iniciada. El guardado anterior se conserva.');};
const replay=document.createElement('button');replay.textContent='Ver introducción';replay.onclick=async()=>{if(game.busy||cinematic)return;const wasStarted=started,previousMusic=musicFile;started=false;$('welcome').hidden=true;await playMedia('music','CREATION.MOD');await playMedia('animation','WMS.FLI');await playMedia('animation','PRESENT.FLI');if(previousMusic)await playMedia('music',previousMusic);started=wasStarted;if(!wasStarted)$('welcome').hidden=false;};$('settings').append(replay);
const cinemaLabel=document.createElement('label');cinemaLabel.textContent='Revisar una secuencia ';const cinemaSelect=document.createElement('select');
for(const [key,title] of Object.entries({'WMS.FLI':'Logotipo inicial','PRESENT.FLI':'Introducción','CALIPPO.FLI':'El helado','GUACAMO.FLI':'La bebida','JUKE.FLI':'La máquina de discos','LAVABO.FLI':'El lavabo','PALIZA.FLI':'La pelea','SARRIA.FLI':'El aviso de Sarrià','BOMBAH.FLI':'La bomba'})){const o=document.createElement('option');o.value=key;o.textContent=title;cinemaSelect.append(o);}
cinemaLabel.append(cinemaSelect);const previewCinema=document.createElement('button');previewCinema.textContent='Reproducir secuencia';previewCinema.onclick=async()=>{if(game.busy||cinematic)return;const previous=started;started=false;$('welcome').hidden=true;await playMedia('animation',cinemaSelect.value);started=previous;if(!previous)$('welcome').hidden=false;};$('settings').append(cinemaLabel,previewCinema);
for(const key of ['hombre.sca','poste.sca'])for(const seq of data.animations[key])for(const frame of seq)image(frame.image);
for(const frames of Object.values(data.idleFrames||{}))for(const frame of frames)image(frame.image);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){select(0);$('settings').hidden=true;}if(e.key==='Enter'&&textFinish){e.preventDefault();textFinish();}});
image('assets/portada.webp');image(game.room().image);$('location').textContent=labels[1]+' · HD';inventory();requestAnimationFrame(render);

function showEnding(completed){
 let panel=$('ending');
 if(!panel){panel=document.createElement('div');panel.id='ending';panel.innerHTML='<h2>FIN</h2><p>La herencia del Tío Miguel</p><button id="ending-restart">Volver a jugar</button>'; $('stage').append(panel);$('ending-restart').onclick=()=>{panel.hidden=true;$('restart').onclick();};}
 panel.hidden=!completed;
 if(completed)notice('Aventura terminada.');
}
