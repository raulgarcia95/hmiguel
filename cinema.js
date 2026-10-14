/* Redibujos HD y capas animadas. Las duraciones siguen los fotogramas FLI. */
(function(){
 'use strict';
 const cache=new Map(),root='assets/cinema/';
 const names=['tv','watch','face','changing','entrance','beer','meeting','street','fallen','globe'];
 function get(name){const src=root+'intro-'+name+'.webp';if(!cache.has(src)){const im=new Image();im.src=src+'?v=20261014-3';cache.set(src,im);}return cache.get(src);}
 ['final-letter','rope-wall','rope','final-sofa','final-angry','final-shout'].forEach(get);names.forEach(get);for(let i=0;i<6;i++)get('program-'+i);for(let i=0;i<4;i++){get('actor-'+i);get('final-'+i);get('police-'+i);}
 for(const name of ['calippo','guacamo','lavabo'])for(let i=0;i<4;i++)get(name+'-'+i);
 ['juke','bomba','sarria'].forEach(get);
 for(const [name,count] of [['saludo',6],['encuentro',6],['cerveza',4],['cejas',4],['pisada',4],['underwear',4],['tvframe',75]])for(let i=0;i<count;i++)get(name+'-'+i);
 window.prepareRemasteredCinema=async key=>{
  const needed=[...cache.entries()].filter(([src])=>key==='WMS.FLI'?src.includes('globe'):key==='FINAL.FLI'?/final-|police-|rope|face|changing/.test(src):key==='PRESENT.FLI'?!/final-|police-|rope|calippo|guacamo|lavabo|juke|bomba|sarria|globe/.test(src):src.includes(key.replace('.FLI','').toLowerCase()));
  await Promise.all(needed.map(([,im])=>im.decode?im.decode().catch(()=>{}):Promise.resolve()));
 };
 function draw(ctx,name,x=0,y=0,w=1600,h=1000){const im=get(name);if(im.complete&&im.naturalWidth)ctx.drawImage(im,x,y,w,h);}
 function caption(text){let p=document.getElementById('cinema-caption');if(!p){p=document.createElement('p');p.id='cinema-caption';document.getElementById('dialogue-rail')?.append(p);}p.textContent=text;p.hidden=!text;}
 window.clearCinemaCaption=()=>caption('');
 function smoke(ctx,x,y,t,scale=1){ctx.save();ctx.strokeStyle='rgba(230,236,242,.22)';ctx.lineWidth=3*scale;for(let n=0;n<3;n++){ctx.beginPath();for(let i=0;i<80;i++){const yy=y-i*scale*3,xx=x+Math.sin(i/13+t*1.4+n)*12*scale+i*.3; i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();}ctx.restore();}
 function actor(ctx,paint,x,y,t,dir=0,size=1){const seq=window.GAME_DATA.animations['hombre.sca'][dir],s=t===0?(window.GAME_DATA.idleFrames?.['hombre.sca']?.[dir]||seq[0]):seq[Math.floor(t*seq.length/0.7)%seq.length];paint(s.image,x-(s.anchorX??s.w/2)*5*size,y-(s.anchorY??s.h)*5*size,s.w*5*size,s.h*5*size);}
 function storyActor(ctx,cell,x,y,w,h){const im=get('actor-'+cell);if(im.complete&&im.naturalWidth){const k=Math.min(w/im.naturalWidth,h/im.naturalHeight);ctx.drawImage(im,x+(w-im.naturalWidth*k)/2,y+h-im.naturalHeight*k,im.naturalWidth*k,im.naturalHeight*k);}}
 window.drawRemasteredCinema=function(ctx,key,elapsed,paint,entry){
  const t=elapsed/1000;
  if(key==='FINAL.FLI'){
   if(!get('final-0').naturalWidth)return false;
   const f=Math.min(176,Math.floor(elapsed/entry.frameDuration));let text='';
   ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,1600,1000);
   if(f<26){
    draw(ctx,'final-0');
    // A cartoon train falls behind the wall, as in the original ending.
    if(f>=8){const p=Math.min(1,(f-8)/12);ctx.save();ctx.translate(1130+180*p,120+600*p*p);ctx.rotate(p*2);ctx.fillStyle='#f4c84d';ctx.strokeStyle='#522611';ctx.lineWidth=3;for(let i=0;i<4;i++){ctx.fillRect(i*25,0,23,19);ctx.strokeRect(i*25,0,23,19);}ctx.restore();}
    if(f>=15){smoke(ctx,1230,690,t,1.2);ctx.fillStyle='#ffb02e';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(1200+i*12,685-Math.sin(t*9+i)*12,12,25,0,0,Math.PI*2);ctx.fill();}}
   }else if(f<32){ctx.fillStyle='#fff';ctx.font='bold 100px Georgia';ctx.textAlign='center';ctx.fillText('MÁS TARDE…',800,500);}
   else if(f<40){draw(ctx,'final-1');text='Menchu: Bueno, ¡a por la herencia!';}
   else if(f<45){}
   else if(f<58){draw(ctx,'changing');actor(ctx,paint,130+(f-45)*27,870,t,0,.8);}
   else if(f<74){
    draw(ctx,'final-letter');
   }else if(f<93){draw(ctx,f<83?'final-angry':'face');text=f<83?'Menchu: ¡Me cago en…!':'Menchu: Bueno, da igual…';}
   else if(f<127){
    draw(ctx,'final-2');
    const position=elapsed/entry.frameDuration;
    draw(ctx,'rope-wall',1430,0,105,640);
    const reveal=Math.max(0,Math.min(1,(position-108)/9));
    if(reveal){ctx.save();ctx.beginPath();ctx.rect(1400,0,160,645*reveal);ctx.clip();draw(ctx,'rope',1420,0,115,645);ctx.restore();}
    if(position>=118){
     const phase=position<124?Math.floor(position*2)%2:position<125.5?2:3;
     const im=get('police-'+phase),height=phase===2?430:500,width=height*im.naturalWidth/im.naturalHeight;
     const grip=[.453,.490,.368,.546][phase],progress=Math.min(1,(position-118)/6);
     const top=phase>=2?795-height:-500+progress*795;
     draw(ctx,'police-'+phase,1480-width*grip,top,width,height);
     // The foreground sofa hides the descending policeman's feet correctly.
     draw(ctx,'final-sofa');
    }
   }else if(f<154){draw(ctx,'final-3');text=f<136?'Policía: ¡Alto! Queda detenido por el asesinato de Miguel Escoria. ¡15 AÑOS!':f<145?'Menchu: ¡Ah! Qué susto, creía que era por descarrilar el Dragon Khan.':'Policía: ¡Con que fuiste tú, eh! CADENA PERPETUA.';}
   else{draw(ctx,'final-shout');text='Menchu: ¡NOOOOOOOO! ¡BOCAZAS!';ctx.fillStyle='#fff075';ctx.font='bold 120px Georgia';ctx.textAlign='center';ctx.fillText('FIN',f%4<2?180:1400,850);}
   ctx.restore();caption(text);return true;
  }
  if(['CALIPPO.FLI','GUACAMO.FLI','LAVABO.FLI'].includes(key)){
   const f=elapsed/entry.frameDuration;let name,cell;
   if(key==='CALIPPO.FLI'){name='calippo';cell=f<2?0:f<7?1:f<9?2:3;}
   else if(key==='GUACAMO.FLI'){name='guacamo';cell=f<4?0:f<8?1:f<12?2:3;}
   else{name='lavabo';cell=f<5?0:f<8?1:f<17?2:3;}
   if(!get(name+'-'+cell).naturalWidth)return false;
   draw(ctx,name+'-'+cell);
   if(name==='guacamo'&&cell===3){smoke(ctx,580,570,t,.6);smoke(ctx,980,570,t,.6);}
   if(name==='calippo'&&cell===3){
    ctx.save();ctx.fillStyle='#132443';ctx.textAlign='center';ctx.font='bold 40px system-ui';
    ['TE HA TOCADO UNA ENTRADA','PARA PORT AVENTURA','CANJÉALO EN TU','ESTABLECIMIENTO HABITUAL'].forEach((line,i)=>ctx.fillText(line,800,365+i*76));ctx.restore();
   }
   caption('');return true;
  }
  if(key==='JUKE.FLI'){
   if(!get('juke').naturalWidth)return false;draw(ctx,'juke');caption('');
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.08+.1*(1+Math.sin(t*6))/2;ctx.fillStyle='#ffc862';ctx.fillRect(463,489,32,200);ctx.fillRect(1066,489,32,200);ctx.restore();return true;
  }
  if(key==='SARRIA.FLI'){
   if(!get('sarria').naturalWidth)return false;const p=Math.min(1,t/1.25),z=1+3*p;
   ctx.save();ctx.translate(800,500);ctx.scale(z,z);ctx.translate(-(800+(340-800)*p),-(500+(675-500)*p));draw(ctx,'sarria');
   ctx.fillStyle='#e4dfca';ctx.fillRect(163,563,354,224);ctx.fillStyle='#222';ctx.font='24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
   ['Cerrado por naranjazo','en las pelotas. Se jugará','en la Nova Creu Alta','de Sabadell.','','Disculpen las molestias.'].forEach((line,i)=>ctx.fillText(line,340,583+i*32));ctx.restore();caption('');return true;
  }
  if(key==='BOMBAH.FLI'){
   if(!get('bomba').naturalWidth)return false;caption('');
   if(elapsed<1256){draw(ctx,'bomba');return true;}
   ctx.fillStyle='#000';ctx.fillRect(0,0,1600,1000);ctx.save();ctx.textAlign='center';ctx.font='bold 110px Georgia';ctx.fillStyle=['#ff8e35','#a384ef','#63b749'][Math.floor(elapsed/314)%3];ctx.fillText('¡¡¡BOOOOOOOOM!!!',800,360);ctx.restore();return true;
  }
  if(key==='PALIZA.FLI'){
   caption('');ctx.fillStyle='#000';ctx.fillRect(0,0,1600,1000);ctx.save();ctx.textAlign='center';
   function word(text,x,y,size,color,font='Georgia'){ctx.fillStyle=color;ctx.font=`bold ${size}px ${font}`;ctx.fillText(text,x,y);}
   if(elapsed<213)word('¡PAF!',800,820,240,'#9890ff');
   else if(elapsed<497)word('PUMB',850,420,260,'#fff','Arial');
   else if(elapsed<1065){word('¡PING!',430,290,110,'#fff');word('¡CRASH!',1000,760,110,'#fff');}
   else{word('¡PLASH!',300,520,96,'#66bb44');if(elapsed>=1207)word('¡AAAYYYY!',950,230,90,'#dc594d');if(elapsed>=1491)word('¡NOOO, AAAAH!',1000,720,84,'#7788ee');}
   ctx.restore();return true;
  }
  if(key==='WMS.FLI'){
   if(!get('globe').naturalWidth)return false;
   caption('');ctx.fillStyle='#050608';ctx.fillRect(0,0,1600,1000);
   const settle=Math.min(1,t/4.3),bounce=Math.abs(Math.sin(t*3.1))*Math.max(0,1-settle);
   const x=800+Math.sin(t*1.7)*220*(1-settle),y=570-bounce*520;
   draw(ctx,'globe',x-230,y-230,460,460);
   ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,(t-2.6)/1.2));ctx.textAlign='center';ctx.fillStyle='#e8deb9';ctx.font='bold 105px Georgia';ctx.fillText('WORLD MEDIA',800,600);ctx.fillStyle='#c43d38';ctx.font='italic 115px Georgia';ctx.fillText('Software',800,790);ctx.restore();return true;
  }
  if(key!=='PRESENT.FLI')return false;
  const f=Math.min(205,elapsed/entry.frameDuration);
  let shot=f<75?'tv':f<83?'watch':f<89?'face':f<112?'changing':f<126?'entrance':f<142?'beer':f<175?'meeting':f<195?'street':'fallen';
  if(!get(shot).naturalWidth)return false;
  ctx.save();
  if(['watch','face','beer','fallen'].includes(shot)){const zoom=1+.008*Math.sin(t*.6);ctx.translate(800,500);ctx.scale(zoom,zoom);ctx.translate(-800,-500);}
  draw(ctx,shot);
  let text='';
  if(shot==='tv'){
   ctx.save();ctx.beginPath();ctx.roundRect(578,270,450,242,10);ctx.clip();draw(ctx,'tvframe-'+Math.floor(f),578,270,450,242);
   ctx.globalAlpha=.04;ctx.fillStyle='#fff';for(let y=275+(t*20)%8;y<510;y+=8)ctx.fillRect(578,y,450,1);ctx.restore();smoke(ctx,320,651,t,.7);
  }else if(shot==='watch'){if(Math.floor(f)%2){const im=get('watch');ctx.drawImage(im,672,405,35,105,697,405,35,105);}}
  else if(shot==='face'){draw(ctx,'cejas-'+[0,1,2,3,1,0][Math.floor(f)-83]);}
  else if(shot==='changing'){
   if(f<97){const x=f<91?920:920-(f-91)/6*740,y=f<90?590:710;const im=get('underwear-'+(f<90?0:f<91?1:2+Math.floor(f)%2));if(im.naturalWidth){const h=f<90?245:340,w=h*im.naturalWidth/im.naturalHeight;ctx.drawImage(im,x-w/2,y-h,w,h);}}
   else if(f<104){const im=get('underwear-1');if(im.naturalWidth)ctx.drawImage(im,145,350,100,340);}
   else if(f<111){const x=f<107?300+(f-104)*35:405-(f-107)*155;actor(ctx,paint,x,800,t,1,.85);}
   // Foreground TV and folding screen retain the original occlusion order.
   const bg=get('changing');ctx.drawImage(bg,740,535,355,375,740,535,355,375);if(f<104)ctx.drawImage(bg,0,370,290,425,0,370,290,425);
  }else if(shot==='entrance'){
   const progress=Math.max(0,Math.min(1,(f-112)/13));
   if(progress<.78)actor(ctx,paint,40+progress/.78*1010,845,t,0,.72);
   else{const q=(progress-.78)/.22;ctx.globalAlpha=1-q;actor(ctx,paint,1050,845-q*135,t,2,.72-q*.18);ctx.globalAlpha=1;}
  }else if(shot==='beer'){draw(ctx,'cerveza-'+(f<135?0:f<137?1:f<141?2:3));if(f>=131&&f<135){const bottle=get('bottle');if(bottle.naturalWidth)ctx.drawImage(bottle,-180+(f-131)/4*1300,440,160,430);}text=f>=127&&f<130?'Menchu: ¡Una birra!':'';}
  else if(shot==='meeting'){
   if(f>=146&&f<152)draw(ctx,'saludo-'+(Math.floor(f)-146));
   else {const cell=f<145?0:f<152?1:f<160?2:f<163?3:f<169?4:5;draw(ctx,'encuentro-'+cell);if(f>=170){ctx.fillStyle='#1b1c1c';ctx.fillRect(0,0,1600,1000);draw(ctx,'encuentro-5',(f-170)/5*1600,0);}}
   text=f<144?'Amigo: ¿Qué tal Menchu?':f>=152&&f<155?'Amigo: Te presento a Miguel':f>=155&&f<161?'Amigo: Es la escoria más grande de la sociedad y además un poco maricón':f>=163&&f<168?'Miguel: ¿Te vienes a «Marica’s»? Es el bar de moda':f>=168&&f<172?'Menchu: Vale, pero con la condición de que no intentes nada':'';
  }else if(shot==='street'){
   const p=Math.max(0,Math.min(1,(f-176)/4)),mx=30+p*490,my=733+p*50;
   if(f>=176&&f<180){actor(ctx,paint,mx,my,t,0,.55);storyActor(ctx,1,80+p*470,510+p*40,175,260);}
   else if(f>=180&&f<186){storyActor(ctx,0,465,555,180,270);storyActor(ctx,1,615+Math.sin(f*2)*9,565,160,245);}
   else if(f>=186&&f<193){actor(ctx,paint,520,790,0,0,.55);storyActor(ctx,2,600,665,220,160);text='Miguel: Mi último deseo es que leas esta carta... Adiós, cariño.';}
   else if(f>=193){actor(ctx,paint,520,790,0,0,.55);storyActor(ctx,3,590,760,310,100);}
  }
  if(shot==='fallen')draw(ctx,'pisada-'+(f<196?0:f<197?1:f<201?2:3));
  ctx.restore();caption(text);return true;
 };
})();
