import "./style.css";
import * as PixelFX from "pixelfx";
import * as SwordSlash from "pixelfx/fx/melee/sword-slash";
import { createAudioEngine } from "./audio.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const buffer = typeof PixelFX.createFrame === "function" ? PixelFX.createFrame(W, H) : null;
const effectCanvas = document.createElement("canvas");
effectCanvas.width = W; effectCanvas.height = H;
const effectCtx = effectCanvas.getContext("2d");
effectCtx.imageSmoothingEnabled = false;
const effectImage = effectCtx.createImageData(W, H);
const audio = createAudioEngine();
let running = false, paused = false, last = 0, elapsed = 0, shake = 0;
let cinematic = false, cinematicTime = 0, cinematicDone = false;
let footstepTimer = 0, ambientRoarTimer = 5, cinematicGunPlayed = false;
const snow = Array.from({length:95},(_,i)=>({x:(i*53)%W,y:(i*37)%H,s:1+(i%3===0?1:0),v:12+(i%7)*4,drift:((i%5)-2)*2}));
let keys = new Set(), fxList = [], particles = [];
let player, enemies, pickups, doors, blood, objectiveProgress, medkits, gameEnded;
const ui = {
  intro: document.querySelector("#intro"), gameover: document.querySelector("#gameover"),
  pause: document.querySelector("#pause"), hp: document.querySelector("#hp"),
  hpLabel: document.querySelector("#hp-label"), stamina: document.querySelector("#stamina"),
  staminaLabel: document.querySelector("#stamina-label"), objective: document.querySelector("#objective"),
  progress: document.querySelector("#mission-progress"), progressText: document.querySelector("#progress-text"),
  medCount: document.querySelector("#med-count"), itemCount: document.querySelector("#item-count"),
  status: document.querySelector("#status"), cinematic: document.querySelector("#cinematic"), caption: document.querySelector("#cinematic-caption"), skip: document.querySelector("#skip-cinematic"), frame: document.querySelector(".canvas-frame"),
  menu: document.querySelector("#main-menu"), settings: document.querySelector("#settings-panel"), controls: document.querySelector("#controls-panel"),
  menuActions: document.querySelector("#menu-actions"), volume: document.querySelector("#master-volume"), mute: document.querySelector("#mute-audio"),
  victory: document.querySelector("#victory"), touchControls: document.querySelector("#touch-controls")
};
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const rnd = (a,b) => a + Math.random() * (b-a);
function reset() {
  player = {x:76,y:136,r:5,hp:100,stamina:100,faceX:1,faceY:0,attack:0,cooldown:0,invuln:0};
  enemies = [{x:342,y:104,hp:3,speed:13,hit:0},{x:396,y:195,hp:3,speed:10,hit:0},{x:268,y:223,hp:2,speed:15,hit:0}];
  pickups = [
    {x:125,y:70,type:"med",taken:false},
    {x:220,y:185,type:"supply",taken:false},
    {x:432,y:70,type:"supply",taken:false},
    {x:370,y:225,type:"supply",taken:false}
  ];
  doors = [{x:454,y:137,open:false}]; fxList=[]; particles=[]; objectiveProgress=0; medkits=1; gameEnded=false;
  footstepTimer=0; ambientRoarTimer=5;
  ui.gameover.classList.add("hidden"); ui.victory.classList.add("hidden"); updateUI();
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(x1,y1,x2,y2,c){ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function text(s,x,y,c="#b8b8ad"){ctx.fillStyle=c;ctx.font="7px monospace";ctx.fillText(s,x,y);}
function drawFloor(){
  rect(0,0,W,H,"#15191a");
  // old concrete tiles
  for(let y=14;y<H;y+=24) for(let x=0;x<W;x+=32){
    rect(x,y,31,23,(Math.floor(x/32+y/24)%3===0)?"#202526":"#1c2122");
    line(x,y,x+30,y,"#293031"); line(x,y,x,y+22,"#171b1c");
    if((x*7+y*11)%13===0) rect(x+8,y+11,2,1,"#343333");
  }
  // side rooms and corridor walls
  rect(0,0,W,13,"#33383a"); rect(0,13,W,3,"#55534b");
  rect(0,253,W,17,"#303537"); rect(0,253,W,2,"#626057");
  rect(0,16,7,237,"#353a3b"); rect(473,16,7,237,"#353a3b");
  // wall vents and ceiling lights
  for(let x=38;x<450;x+=102){rect(x,3,28,6,"#68685d");rect(x+3,5,22,2,"#b1b19a");}
  // room dividers, broken wall sections
  rect(155,16,5,54,"#494b45");rect(155,70,24,4,"#494b45");rect(155,74,5,34,"#494b45");
  rect(310,16,5,42,"#494b45");rect(310,58,29,4,"#494b45");rect(334,62,5,26,"#494b45");
  rect(155,201,5,51,"#494b45");rect(310,225,5,28,"#494b45");
  // rugs and stains
  rect(29,91,79,49,"#292a27");rect(32,94,73,43,"#3a3530");
  for(let i=0;i<18;i++) rect(35+(i*17)%66,98+(i*23)%35,2,1,"#51443d");
  rect(183,35,57,21,"#292e2d");rect(186,38,51,15,"#353a38");
  // furniture, overturned cabinets
  rect(20,35,32,25,"#40372f");rect(23,38,26,19,"#59483a");rect(24,40,24,2,"#76604a");
  rect(375,30,56,24,"#3a3029");rect(378,33,50,18,"#514237");rect(382,36,13,11,"#272b2a");
  rect(362,211,57,19,"#42372e");rect(365,214,51,13,"#5b4a39");
  rect(186,213,42,25,"#333736");rect(190,217,34,17,"#4b4b43");
  // blood trails
  rect(262,112,4,10,"#4e2224");rect(267,118,9,3,"#5d2427");rect(274,123,3,7,"#492124");
  rect(92,167,7,2,"#542528");rect(101,171,3,5,"#542528");
  // door and exit
  rect(450,116,22,43,"#171a19");rect(454,119,15,37,"#5b4a38");rect(457,122,9,31,"#3b332c");
  rect(462,136,2,2,"#d1a15a");
  // hazard stripes
  for(let x=432;x<452;x+=6){line(x,111,x+5,106,"#8d6539");}
}
function drawPlayer(){
  const p=player; const x=Math.round(p.x),y=Math.round(p.y);
  // shadow
  rect(x-6,y+5,12,3,"#101313");
  if(p.invuln>0 && Math.floor(elapsed*14)%2===0) return;
  // feet, dark trousers, jacket, face, hair
  rect(x-4,y+2,3,5,"#252b31");rect(x+1,y+2,3,5,"#252b31");
  rect(x-5,y-5,10,9,"#6b7470");rect(x-4,y-4,8,7,"#858b7e");
  rect(x-3,y-8,6,5,"#b38d6b");rect(x-4,y-10,8,4,"#202426");
  rect(x-5,y-9,3,3,"#202426");rect(x+2,y-9,3,2,"#202426");
  // backpack strap and eyes
  rect(x-2,y-4,2,5,"#454a43");rect(x+1,y-7,1,1,"#202020");
  // weapon facing direction
  const wx=x+p.faceX*9, wy=y+p.faceY*9;
  if(p.attack>0){rect(wx-2,wy-2,5,5,"#d6d1bd");rect(wx-1,wy-1,3,3,"#f1e9ce");}
  else {line(x+p.faceX*4,y+p.faceY*3,wx,wy,"#9d9a89");}
}
function drawEnemy(e){
  const x=Math.round(e.x),y=Math.round(e.y);
  rect(x-6,y+5,13,3,"#101313");
  rect(x-5,y-5,10,11,"#302d30");rect(x-4,y-8,8,5,"#4b3b3c");
  rect(x-6,y-4,3,8,"#3d3032");rect(x+3,y-4,3,8,"#3d3032");
  rect(x-3,y-7,2,2,"#b34b43");rect(x+2,y-7,2,2,"#b34b43");
  rect(x-3,y+1,7,2,"#6a3032");
  if(e.hit>0){rect(x-7,y-10,14,1,"#e6b4a0");}
  // small health ticks
  for(let i=0;i<e.hp;i++) rect(x-4+i*3,y-12,2,1,"#a84542");
}
function drawPickup(p){
  if(p.taken)return;
  const x=Math.round(p.x),y=Math.round(p.y);
  rect(x-5,y-5,11,11,"#101313");
  if(p.type==="med"){rect(x-4,y-4,9,9,"#d7d1bb");rect(x-1,y-3,3,7,"#a94945");rect(x-3,y-1,7,3,"#a94945");}
  else {rect(x-4,y-4,9,9,"#7b674a");rect(x-2,y-2,5,5,"#c0a06a");rect(x,y-1,2,3,"#e6d39b");}
}
function spawnBurst(x,y,color,n=10){
  for(let i=0;i<n;i++) particles.push({x,y,vx:rnd(-45,45),vy:rnd(-50,20),life:rnd(.18,.48),max:.48,color,size:Math.random()<.5?1:2});
}
function attack(){
  if(!running||paused||player.cooldown>0||player.stamina<16||gameEnded)return;
  player.attack=.19;player.cooldown=.38;player.stamina-=16;shake=4;
  audio.sfx("swing");
  if(typeof PixelFX.createFx==="function"){
    const angle=player.faceX===-1?Math.PI:player.faceY===1?Math.PI/2:player.faceY===-1?-Math.PI/2:0;
    fxList.push(PixelFX.createFx(SwordSlash,{
      x:player.x-6,y:player.y+26,angle,seed:Math.floor(elapsed*1000)%9999,
      palette:["#34191e","#672d35","#963e45","#c65b5c","#df8c7e","#f0c5ac","#fff0dc"],
      sparks:["#fff0d5","#e8ad81","#c65b5c","#7a3038"]
    }));
  }
  spawnBurst(player.x+player.faceX*9,player.y+player.faceY*9,"#d9d1b4",6);
  for(const e of enemies){
    const dx=e.x-player.x,dy=e.y-player.y,dist=Math.hypot(dx,dy);
    const facing=(dx*player.faceX+dy*player.faceY)/(dist||1);
    if(dist<27&&facing>-.15){e.hp--;e.hit=.16;e.x+=player.faceX*5;e.y+=player.faceY*5;spawnBurst(e.x,e.y,"#a74343",8);shake=7;audio.sfx("hit");if(e.hp<=0){spawnBurst(e.x,e.y,"#613236",16);audio.sfx("enemy-down");}}
  }
  enemies=enemies.filter(e=>e.hp>0);
}
function interact(){
  if(!running||paused||gameEnded)return;
  const p=player;
  const med=pickups.find(v=>!v.taken&&v.type==="med"&&Math.hypot(v.x-p.x,v.y-p.y)<23);
  if(med){med.taken=true;medkits++;ui.status.textContent="FIRST AID COLLECTED";audio.sfx("pickup");updateUI();return;}
  const supply=pickups.find(v=>!v.taken&&v.type==="supply"&&Math.hypot(v.x-p.x,v.y-p.y)<23);
  if(supply){supply.taken=true;objectiveProgress=Math.min(3,objectiveProgress+1);ui.status.textContent="SUPPLY SECURED";audio.sfx("pickup");updateUI();return;}
  if(Math.hypot(456-p.x,137-p.y)<29){
    if(objectiveProgress>=3){
      ui.objective.textContent="Chapter complete";ui.status.textContent="CHAPTER COMPLETE";
      gameEnded=true;running=false;ui.victory.classList.remove("hidden");ui.touchControls.classList.add("hidden");audio.sfx("victory");audio.scene("menu");return;
    }
    ui.status.textContent="EXIT LOCKED · FIND ALL 3 SUPPLIES";
  } else if(medkits>0&&p.hp<75){medkits--;p.hp=Math.min(100,p.hp+35);ui.status.textContent="FIRST AID USED";audio.sfx("heal");updateUI();}
  else ui.status.textContent="NOTHING WITHIN REACH";
}
function updateUI(){
  ui.hp.style.width=player.hp+"%";ui.hpLabel.textContent=Math.ceil(player.hp)+" / 100";
  ui.stamina.style.width=player.stamina+"%";ui.staminaLabel.textContent=Math.ceil(player.stamina)+" / 100";
  ui.medCount.textContent="× "+medkits+" · PRESS E";
  ui.itemCount.textContent=(1+pickups.filter(p=>p.taken).length)+" ITEMS";
  ui.progress.style.width=(objectiveProgress/3*100)+"%";
  ui.progressText.textContent=objectiveProgress+" / 3 SUPPLIES FOUND";
  ui.objective.textContent=objectiveProgress>=3?"Reach the exit":"Find supplies ("+objectiveProgress+"/3)";
}
function update(dt){
  elapsed+=dt;
  if(player.cooldown>0)player.cooldown-=dt;if(player.attack>0)player.attack-=dt;if(player.invuln>0)player.invuln-=dt;
  player.stamina=clamp(player.stamina+dt*10,0,100);
  let dx=0,dy=0;
  if(keys.has("w")||keys.has("arrowup"))dy--;if(keys.has("s")||keys.has("arrowdown"))dy++;
  if(keys.has("a")||keys.has("arrowleft"))dx--;if(keys.has("d")||keys.has("arrowright"))dx++;
  footstepTimer=Math.max(0,footstepTimer-dt);
  ambientRoarTimer-=dt;
  if(dx||dy){
    const m=Math.hypot(dx,dy);dx/=m;dy/=m;
    player.x+=dx*65*dt;player.y+=dy*65*dt;
    if(Math.abs(dx)>Math.abs(dy))player.faceX=Math.sign(dx),player.faceY=0;else player.faceY=Math.sign(dy),player.faceX=0;
    ui.status.textContent="MOVING QUIETLY";
    if(footstepTimer<=0){audio.sfx("footstep");footstepTimer=.36;}
  }
  player.x=clamp(player.x,15,445);player.y=clamp(player.y,26,244);
  for(const e of enemies){
    e.hit=Math.max(0,e.hit-dt);
    const ex=player.x-e.x,ey=player.y-e.y,d=Math.hypot(ex,ey);
    if(d>13){e.x+=ex/(d||1)*e.speed*dt;e.y+=ey/(d||1)*e.speed*dt;}
    else if(player.invuln<=0){
      player.hp=Math.max(0,player.hp-9);player.invuln=.62;shake=3;
      spawnBurst(player.x,player.y,"#9b3c3c",5);audio.sfx("hurt");
      if(player.hp<=0){gameEnded=true;running=false;ui.gameover.classList.remove("hidden");ui.touchControls.classList.add("hidden");audio.sfx("death");audio.scene("menu");}
    }
  }
  for(const p of pickups) if(!p.taken&&Math.hypot(p.x-player.x,p.y-player.y)<13)ui.status.textContent="ITEM NEARBY · PRESS E";
  if(ambientRoarTimer<=0 && enemies.some(e=>Math.hypot(e.x-player.x,e.y-player.y)<125)){
    audio.sfx("monster");ambientRoarTimer=7+rnd(0,5);
  }
  for(const fx of fxList)fx.update(dt);
  fxList=fxList.filter(fx=>!fx.done());
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.life-=dt;}
  particles=particles.filter(p=>p.life>0);
  updateUI();
}
function render(){
  ctx.save();
  if(shake>0)ctx.translate(rnd(-shake,shake),rnd(-shake,shake));
  drawFloor();
  // dark pools at the edge of the room
  ctx.fillStyle="rgba(0,0,0,.20)";ctx.fillRect(0,0,W,H);
  // light pools
  for(const [x,y,r] of [[player.x,player.y,68],[78,48,25],[395,48,22]]){
    const g=ctx.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,"rgba(160,164,130,.12)");g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  pickups.forEach(drawPickup);enemies.forEach(drawEnemy);drawPlayer();
  if(fxList.length&&buffer&&typeof PixelFX.composite==="function"){
    PixelFX.clearFrame(buffer);
    for(const fx of fxList)fx.draw(buffer);
    PixelFX.composite(buffer,effectImage.data,null);
    effectCtx.putImageData(effectImage,0,0);
    ctx.drawImage(effectCanvas,0,0);
  }
  for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(p.x,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
  // vignette and subtle pixel grain
  const v=ctx.createRadialGradient(W/2,H/2,55,W/2,H/2,245);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.58)");ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  ctx.restore();
  if(shake>0)shake=Math.max(0,shake-.45);
  // Reuse pixelfx's framebuffer for future effect layers; clearing it is allocation-free.
  if(buffer && typeof PixelFX.clearFrame==="function")PixelFX.clearFrame(buffer);
  ctx.imageSmoothingEnabled=false;
}

function pixelText(str,x,y,size=8,color="#e9e8df",align="left"){
  ctx.save();ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();
}
function drawSkyline(snowy=true){
  const sky=snowy?"#111b25":"#303b36";
  rect(0,0,W,H,sky);
  if(snowy){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#172633");g.addColorStop(1,"#56636a");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    rect(0,166,W,104,"#c2cbd0");rect(0,182,W,88,"#dbe0df");
  }else{
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#263632");g.addColorStop(1,"#687264");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    rect(0,182,W,88,"#424b3d");
  }
  for(let i=0;i<13;i++){
    const x=i*42-10, bw=22+(i%3)*7, bh=42+(i*19%63);
    rect(x,146-bh,bw,bh,snowy?"#202c34":"#39413a");
    for(let wy=153-bh;wy<140;wy+=9)for(let wx=x+4;wx<x+bw-3;wx+=8)
      rect(wx,wy,3,4,snowy?(i%3===0?"#87949b":"#34444e"):(i%4===0?"#b3a16d":"#536253"));
    if(snowy)rect(x,146-bh,bw,2,"#a7b2b7");
  }
  // road / bridge perspective
  ctx.fillStyle=snowy?"#8b969d":"#313a34";ctx.beginPath();ctx.moveTo(125,158);ctx.lineTo(354,158);ctx.lineTo(480,270);ctx.lineTo(0,270);ctx.closePath();ctx.fill();
  rect(0,190,W,3,snowy?"#e6e9e8":"#6d735f");
  for(let x=25;x<480;x+=58)rect(x,224,20,2,snowy?"#e6e9e8":"#8b8b70");
  if(snowy){
    // ruined building silhouette
    rect(20,82,83,91,"#202a30");rect(28,68,26,22,"#202a30");rect(70,57,33,34,"#202a30");
    rect(32,99,11,13,"#111a20");rect(58,107,13,16,"#111a20");rect(79,88,10,15,"#111a20");
    rect(379,90,75,78,"#202a30");rect(394,72,32,24,"#202a30");
    for(let i=0;i<12;i++)rect(385+(i%4)*15,105+Math.floor(i/4)*18,6,8,"#111a20");
  } else {
    // Green Home apartment block and courtyard
    rect(106,30,268,160,"#555b50");rect(116,38,248,152,"#6b7062");rect(101,27,278,8,"#333a35");
    for(let y=48;y<164;y+=22)for(let x=125;x<355;x+=27){
      rect(x,y,17,14,"#303a37");rect(x+2,y+2,13,10,(x+y)%3===0?"#7e8a76":"#4a625a");
      rect(x+7,y+2,2,10,"#2a3431");
    }
    rect(203,151,73,39,"#343b35");rect(211,157,57,33,"#292f2c");rect(233,161,13,29,"#1b2220");
    rect(0,190,W,80,"#374239");rect(0,208,W,3,"#5a6453");
    // little lawn and a dangerous lawn mower
    rect(12,194,76,28,"#46583f");rect(19,200,58,14,"#53664a");
    rect(41,195,18,7,"#252b28");rect(37,201,27,3,"#202623");rect(42,198,4,3,"#a6a18a");
  }
}
function drawPixelPerson(x,y,kind="soldier",step=0,scale=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
  if(kind==="soldier"){
    rect(-4,0,8,15,"#313d42");rect(-4,-7,8,8,"#9aabaf");rect(-5,-9,10,4,"#2b3539");
    rect(-3,3,3,8,"#4c5b5d");rect(-4,13,3,5,"#20282c");rect(1,13,3,5,"#20282c");
    rect(-3,-4,2,2,"#1b2226");rect(2,-4,2,2,"#1b2226");
    rect(2,2,10,2,"#2c3437");rect(9,0,8,2,"#111719");
  } else if(kind==="hyun"){
    rect(-4,0,4,11,"#202a30");rect(1,0,4,11,"#202a30");
    rect(-5,-12,10,13,"#313c3c");rect(-3,-17,7,7,"#c0a087");
    rect(-4,-20,9,5,"#171e22");rect(-6,-17,4,5,"#171e22");
    rect(-5,-11,3,8,"#222c2d");rect(2,-10,3,8,"#222c2d");
    rect(-3,-8,2,2,"#8e9890");rect(1,-8,2,2,"#8e9890");
  } else if(kind==="guard"){
    rect(-4,0,4,11,"#303832");rect(1,0,4,11,"#303832");rect(-5,-11,10,12,"#667362");
    rect(-3,-17,7,7,"#b28d6c");rect(-4,-19,9,5,"#252a25");rect(-5,-15,3,5,"#252a25");
    rect(-3,-5,7,2,"#b6b29b");
  } else if(kind==="ballet"){
    rect(-1,-4,2,11,"#bfc6c1");rect(-3,-12,6,8,"#d8ded9");rect(-3,-15,6,4,"#c5cec8");
    rect(-4,-8,8,3,"#d8ded9");rect(-7,-6,5,2,"#d8ded9");rect(2,-6,5,2,"#d8ded9");
    rect(-5,7,5,2,"#d8ded9");rect(1,7,6,2,"#d8ded9");rect(-2,-18,4,4,"#1d2526");
  }
  ctx.restore();
}
function drawHelicopter(x,y){
  rect(x-14,y,28,6,"#202a30");rect(x-7,y-5,14,6,"#303d43");rect(x-3,y-4,7,3,"#9baeb4");
  rect(x+10,y+2,13,2,"#202a30");rect(x+20,y-1,2,5,"#202a30");
  rect(x-24,y-7,48,1,"#c0cbd0");rect(x-2,y-10,2,4,"#c0cbd0");
  rect(x-10,y+6,2,4,"#202a30");rect(x+6,y+6,2,4,"#202a30");
}
function drawCinematic(){
  const t=cinematicTime;
  // Sequence 1: the snowy bridge, armed units and an impossible figure.
  if(t<10.5){
    drawSkyline(true);
    // Snow particles drift at different depths.
    for(const flake of snow){const yy=(flake.y+t*flake.v)%H;const xx=(flake.x+Math.sin(t*.8+flake.y)*5+flake.drift*t+W)%W;rect(xx,yy,flake.s,flake.s,"#edf1f0");}
    // Helicopter sweeps overhead.
    drawHelicopter(370-t*8,48+Math.sin(t*1.8)*3);
    // soldiers form a firing line
    for(let i=0;i<7;i++)drawPixelPerson(120+i*39,197+(i%2)*4,"soldier",t);
    // figure emerges from ruined buildings and advances through snow
    const progress=clamp((t-1.2)/8.4,0,1);
    drawPixelPerson(55+progress*168,187-progress*4,"hyun",t,1.3);
    // blood on clothes / snow; restrained pixel detail
    rect(54+progress*168,176-progress*4,3,5,"#7c3439");
    if(t>6.7 && Math.floor(t*5)%4===0){
      rect(0,0,W,H,"rgba(230,238,240,.13)");
      for(let i=0;i<7;i++)rect(120+i*39,187+(i%2)*4,17,2,"#d8dfe0");
    }
    if(t<1.2){pixelText("SEPTEMBER 2020",18,25,8,"#dbe2e3");pixelText("UNKNOWN LOCATION",18,38,6,"#aebbc0");}
    if(t>2.1&&t<6.8){pixelText("UNIDENTIFIED FIGURE APPROACHING",18,25,7,"#e3e7e5");pixelText("VISUAL CONFIRMATION REQUIRED",18,37,6,"#b9c5c7");}
    if(t>=6.8){pixelText("WARNING · TARGET DOES NOT STOP",W/2,25,7,"#f0c8c2","center");}
    const fade=t>9.8?clamp((t-9.8)/.7,0,1):0;
    if(fade){rect(0,0,W,H,`rgba(239,243,242,${fade})`);}
  // Sequence 2: August, the quiet arrival at Green Home.
  } else if(t<19.5){
    drawSkyline(false);
    // tree leaves sway; distant birds and power lines
    for(let i=0;i<6;i++){rect(18+i*79,78+Math.sin(t*1.7+i)*2,23,4,"#596d4c");rect(27+i*79,73+Math.sin(t*1.7+i)*2,12,4,"#72815b");}
    line(0,58,480,72,"#242f2c");line(0,63,480,77,"#242f2c");
    // The new tenant walks toward the building.
    const walk=clamp((t-11.3)/6.3,0,1);
    drawPixelPerson(55+walk*140,220,"hyun",t,1.25);
    // suitcase and long afternoon shadows
    rect(44+walk*140,220,10,9,"#292d2c");rect(46+walk*140,222,6,5,"#665c49");rect(49+walk*140,220,2,2,"#a99b7d");
    rect(0,244,W,26,"#2b352e");
    for(let x=0;x<480;x+=40)rect(x,244,22,1,"#495447");
    drawPixelPerson(68,222,"guard",t,.9);
    if(t<12.4){pixelText("AUGUST 2020",18,25,8,"#e0e4d4");pixelText("SEOUL, SOUTH KOREA",18,38,6,"#b3bcae");}
    if(t>12.5&&t<18.7){pixelText("GREEN HOME APARTMENTS",W/2,19,7,"#e0e4d4","center");}
    if(t>18.7)rect(0,0,W,H, "rgba(7,10,9,.35)");
  // Sequence 3: the isolated room and the rooftop interruption.
  } else if(t<25.5){
    rect(0,0,W,H,"#111719");
    // lonely apartment room, rain-dark window and distant Seoul
    rect(0,0,480,270,"#18201f");rect(20,22,190,135,"#303a37");rect(26,28,178,123,"#10191d");
    for(let i=0;i<7;i++){rect(34+i*23,40,2,102,"#263230");}
    for(let i=0;i<9;i++){rect(30+i*20,61+(i%3)*19,10,3,"#52645d");}
    rect(0,161,480,109,"#202a28");rect(0,163,480,3,"#414b43");
    rect(249,176,113,8,"#42453d");rect(258,184,5,45,"#313732");rect(346,184,5,45,"#313732");
    // Hyun-su sits in shadow; the curtain moves gently.
    rect(65+Math.sin(t*2)*4,30,9,124,"#45504a");rect(80+Math.sin(t*2)*4,30,7,124,"#303a36");
    drawPixelPerson(278,207,"hyun",t,1.35);
    if(t<22.4){pixelText("ROOM 1410",18,20,7,"#c3cbc2");pixelText("A PLACE TO DISAPPEAR",18,32,6,"#85938b");}
    else{
      // dissolve into the rooftop skyline and a ballerina practicing alone
      rect(0,0,W,H,"#1a2528");rect(0,158,W,112,"#20292b");
      for(let i=0;i<12;i++){const x=i*43;rect(x,83+(i%4)*9,26,90,"#293638");rect(x+6,93+(i%4)*9,5,8,"#5d6b67");}
      rect(0,203,W,3,"#515d57");rect(0,206,W,64,"#222c2c");
      drawPixelPerson(225,202,"hyun",t,1.4);
      drawPixelPerson(285,201,"ballet",t,.95);
      pixelText("SOMEONE ELSE IS HERE.",W/2,24,7,"#e0e5de","center");
    }
  } else {
    // Final title card before the player enters the game.
    drawSkyline(false);
    rect(0,0,W,H,"rgba(5,8,8,.76)");
    pixelText("AN UNOFFICIAL PIXEL HORROR EXPERIENCE",W/2,93,7,"#b6c0b3","center");
    pixelText("SWEET HOME",W/2,129,25,"#f0eee2","center");
    pixelText("CHAPTER 01  /  GREEN HOME",W/2,150,8,"#c26b60","center");
    pixelText("THE END OF THE WORLD BEGINS AT HOME",W/2,181,7,"#a2aaa0","center");
  }
  // cinematic frame texture
  rect(0,0,W,3,"rgba(0,0,0,.55)");rect(0,H-3,W,3,"rgba(0,0,0,.55)");
}
function startCinematic(){
  audio.unlock();audio.scene("cinematic");audio.sfx("radio");
  cinematic=true;cinematicDone=false;cinematicTime=0;cinematicGunPlayed=false;
  ui.menu.classList.add("hidden");ui.intro.classList.add("hidden");
  ui.cinematic.classList.remove("hidden");ui.frame.classList.add("cinematic-mode");
  last=performance.now();
}
function finishCinematic(){
  cinematic=false;cinematicDone=true;
  ui.cinematic.classList.add("hidden");
  ui.frame.classList.remove("cinematic-mode");
  ui.intro.classList.remove("hidden");
  audio.sfx("stinger");audio.scene("menu");
}

function frame(now){
  const dt=Math.min((now-last)/1000||0,0.04);last=now;
  if(cinematic){
    cinematicTime+=dt;drawCinematic();
    if(cinematicTime>6.9&&!cinematicGunPlayed){audio.sfx("gunfire");cinematicGunPlayed=true;}
    if(cinematicTime>28){finishCinematic();}
    else if(ui.caption){ui.caption.textContent=cinematicTime<10.5?"SEPTEMBER 2020 · UNKNOWN LOCATION":cinematicTime<19.5?"AUGUST 2020 · GREEN HOME":"ROOM 1410 · SEOUL";}
  }
  else {if(running&&!paused)update(dt);render();}
  requestAnimationFrame(frame);
}
document.querySelector("#start").addEventListener("click",()=>{
  audio.unlock();audio.sfx("confirm");reset();running=true;paused=false;
  ui.intro.classList.add("hidden");ui.gameover.classList.add("hidden");ui.victory.classList.add("hidden");
  ui.touchControls.classList.remove("hidden");
  audio.scene("game");last=performance.now();
});
document.querySelector("#new-game").addEventListener("click",startCinematic);
document.querySelector("#skip-cinematic").addEventListener("click",finishCinematic);
document.querySelector("#retry").addEventListener("click",()=>{
  audio.unlock();reset();running=true;paused=false;ui.intro.classList.add("hidden");
  ui.gameover.classList.add("hidden");ui.victory.classList.add("hidden");ui.touchControls.classList.remove("hidden");
  audio.scene("game");last=performance.now();
});
function returnToMenu(){
  running=false;paused=false;cinematic=false;keys.clear();
  ui.pause.classList.add("hidden");ui.intro.classList.add("hidden");
  ui.gameover.classList.add("hidden");ui.victory.classList.add("hidden");ui.touchControls.classList.add("hidden");
  ui.cinematic.classList.add("hidden");ui.menu.classList.remove("hidden");
  ui.frame.classList.add("cinematic-mode");audio.scene("menu");
}
document.querySelector("#return-menu").addEventListener("click",returnToMenu);
document.querySelector("#game-menu").addEventListener("click",returnToMenu);
document.querySelector("#victory-menu").addEventListener("click",returnToMenu);
document.querySelector("#open-settings").addEventListener("click",()=>{
  audio.unlock();audio.scene("menu");audio.sfx("menu");
  ui.menuActions.classList.add("hidden");ui.settings.classList.remove("hidden");
});
document.querySelector("#open-controls").addEventListener("click",()=>{
  audio.unlock();audio.scene("menu");audio.sfx("menu");
  ui.menuActions.classList.add("hidden");ui.controls.classList.remove("hidden");
});
document.querySelector("#settings-back").addEventListener("click",()=>{ui.settings.classList.add("hidden");ui.menuActions.classList.remove("hidden");});
document.querySelector("#controls-back").addEventListener("click",()=>{ui.controls.classList.add("hidden");ui.menuActions.classList.remove("hidden");});
ui.volume.value=String(audio.getVolume());
ui.volume.addEventListener("input",e=>audio.setVolume(Number(e.target.value)));
function syncMuteButton(){ui.mute.textContent=audio.isMuted()?"SOUND OFF":"SOUND ON";}
ui.mute.addEventListener("click",()=>{audio.toggleMute();syncMuteButton();});
syncMuteButton();
window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();
  keys.add(k);
  if(k===" "&&!e.repeat)attack();
  if(k==="e"&&!e.repeat)interact();
  if((k==="p"||k==="escape")&&running&&!gameEnded){
    paused=!paused;ui.pause.classList.toggle("hidden",!paused);
    audio.sfx("menu");audio.scene(paused?"menu":"game");
  }
});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>keys.clear());
document.querySelectorAll("[data-touch-key]").forEach(button=>{
  const key=button.dataset.touchKey;
  button.addEventListener("pointerdown",e=>{e.preventDefault();keys.add(key);button.setPointerCapture?.(e.pointerId);});
  const release=e=>{e.preventDefault();keys.delete(key);};
  button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("lostpointercapture",release);
});
document.querySelector("#touch-attack").addEventListener("pointerdown",e=>{e.preventDefault();attack();});
document.querySelector("#touch-interact").addEventListener("pointerdown",e=>{e.preventDefault();interact();});
reset();ui.frame.classList.add("cinematic-mode");ui.cinematic.classList.add("hidden");
ui.intro.classList.add("hidden");ui.menu.classList.remove("hidden");
render();requestAnimationFrame(frame);
