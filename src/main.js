import "./style.css";
import { createFrame, clearFrame, composite, createFx } from "pixelfx";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const buffer = createFrame(W, H);
const image = new ImageData(W, H);
let running = false, paused = false, last = 0, elapsed = 0, shake = 0;
let keys = new Set(), fxList = [], particles = [];
let player, enemies, pickups, doors, blood, objectiveProgress, medkits, gameEnded;
const ui = {
  intro: document.querySelector("#intro"), gameover: document.querySelector("#gameover"),
  pause: document.querySelector("#pause"), hp: document.querySelector("#hp"),
  hpLabel: document.querySelector("#hp-label"), stamina: document.querySelector("#stamina"),
  staminaLabel: document.querySelector("#stamina-label"), objective: document.querySelector("#objective"),
  progress: document.querySelector("#mission-progress"), progressText: document.querySelector("#progress-text"),
  medCount: document.querySelector("#med-count"), itemCount: document.querySelector("#item-count"),
  status: document.querySelector("#status")
};
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const rnd = (a,b) => a + Math.random() * (b-a);
function reset() {
  player = {x:76,y:136,r:5,hp:100,stamina:100,faceX:1,faceY:0,attack:0,cooldown:0,invuln:0};
  enemies = [{x:342,y:104,hp:3,speed:13,hit:0},{x:396,y:195,hp:3,speed:10,hit:0},{x:268,y:223,hp:2,speed:15,hit:0}];
  pickups = [{x:125,y:70,type:"med",taken:false},{x:220,y:185,type:"supply",taken:false},{x:432,y:70,type:"supply",taken:false}];
  doors = [{x:454,y:137,open:false}]; fxList=[]; particles=[]; objectiveProgress=0; medkits=1; gameEnded=false;
  ui.gameover.classList.add("hidden"); updateUI();
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
  if(player.cooldown>0||player.stamina<16||gameEnded)return;
  player.attack=.19;player.cooldown=.38;player.stamina-=16;shake=4;
  spawnBurst(player.x+player.faceX*9,player.y+player.faceY*9,"#d9d1b4",6);
  for(const e of enemies){
    const dx=e.x-player.x,dy=e.y-player.y,dist=Math.hypot(dx,dy);
    const facing=(dx*player.faceX+dy*player.faceY)/(dist||1);
    if(dist<27&&facing>-.15){e.hp--;e.hit=.16;e.x+=player.faceX*5;e.y+=player.faceY*5;spawnBurst(e.x,e.y,"#a74343",8);shake=7;if(e.hp<=0){spawnBurst(e.x,e.y,"#613236",16);objectiveProgress=Math.min(3,objectiveProgress+1);}}
  }
  enemies=enemies.filter(e=>e.hp>0);
}
function interact(){
  if(gameEnded)return;
  const p=player;
  const med=pickups.find(v=>!v.taken&&v.type==="med"&&Math.hypot(v.x-p.x,v.y-p.y)<23);
  if(med){med.taken=true;medkits++;ui.status.textContent="FIRST AID COLLECTED";updateUI();return;}
  const supply=pickups.find(v=>!v.taken&&v.type==="supply"&&Math.hypot(v.x-p.x,v.y-p.y)<23);
  if(supply){supply.taken=true;objectiveProgress=Math.min(3,objectiveProgress+1);ui.status.textContent="SUPPLY SECURED";updateUI();return;}
  if(Math.hypot(456-p.x,137-p.y)<29){
    if(enemies.length===0||objectiveProgress>=3){ui.objective.textContent="Exit reached — chapter complete";ui.status.textContent="CHAPTER COMPLETE";gameEnded=true;running=false;return;}
    ui.status.textContent="EXIT BLOCKED · CLEAR THREAT";
  } else if(medkits>0&&p.hp<75){medkits--;p.hp=Math.min(100,p.hp+35);ui.status.textContent="FIRST AID USED";updateUI();}
  else ui.status.textContent="NOTHING WITHIN REACH";
}
function updateUI(){
  ui.hp.style.width=player.hp+"%";ui.hpLabel.textContent=Math.ceil(player.hp)+" / 100";
  ui.stamina.style.width=player.stamina+"%";ui.staminaLabel.textContent=Math.ceil(player.stamina)+" / 100";
  ui.medCount.textContent="× "+medkits+" · PRESS E";
  ui.itemCount.textContent=(2+pickups.filter(p=>p.taken).length)+" ITEMS";
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
  if(dx||dy){const m=Math.hypot(dx,dy);dx/=m;dy/=m;player.x+=dx*65*dt;player.y+=dy*65*dt;if(Math.abs(dx)>Math.abs(dy))player.faceX=Math.sign(dx),player.faceY=0;else player.faceY=Math.sign(dy),player.faceX=0;ui.status.textContent="MOVING QUIETLY";}
  player.x=clamp(player.x,15,445);player.y=clamp(player.y,26,244);
  for(const e of enemies){
    e.hit=Math.max(0,e.hit-dt);
    const ex=player.x-e.x,ey=player.y-e.y,d=Math.hypot(ex,ey);
    if(d>13){e.x+=ex/(d||1)*e.speed*dt;e.y+=ey/(d||1)*e.speed*dt;}
    else if(player.invuln<=0){player.hp-=13*dt;player.invuln=.18;shake=3;spawnBurst(player.x,player.y,"#9b3c3c",3);if(player.hp<=0){player.hp=0;gameEnded=true;running=false;ui.gameover.classList.remove("hidden");}}
  }
  for(const p of pickups) if(!p.taken&&Math.hypot(p.x-player.x,p.y-player.y)<13)ui.status.textContent="ITEM NEARBY · PRESS E";
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.life-=dt;}
  particles=particles.filter(p=>p.life>0);
  updateUI();
}
function render(){
  drawFloor();
  // dark pools at the edge of the room
  ctx.fillStyle="rgba(0,0,0,.20)";ctx.fillRect(0,0,W,H);
  // light pools
  for(const [x,y,r] of [[player.x,player.y,68],[78,48,25],[395,48,22]]){
    const g=ctx.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,"rgba(160,164,130,.12)");g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  pickups.forEach(drawPickup);enemies.forEach(drawEnemy);drawPlayer();
  for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(p.x,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
  // vignette and subtle pixel grain
  const v=ctx.createRadialGradient(W/2,H/2,55,W/2,H/2,245);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.58)");ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  if(shake>0){shake=Math.max(0,shake-.45);}
  // Use pixelfx's native framebuffer/compositor for the effect layer pipeline.
  try { clearFrame(buffer); composite(buffer,image.data,[12,14,14]); } catch {}
  ctx.imageSmoothingEnabled=false;
}
function frame(now){
  const dt=Math.min((now-last)/1000||0,0.04);last=now;
  if(running&&!paused)update(dt);
  render();
  requestAnimationFrame(frame);
}
document.querySelector("#start").addEventListener("click",()=>{reset();running=true;paused=false;ui.intro.classList.add("hidden");last=performance.now();});
document.querySelector("#retry").addEventListener("click",()=>{reset();running=true;paused=false;ui.intro.classList.add("hidden");});
window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();
  keys.add(k);
  if(k===" "&&!e.repeat)attack();
  if(k==="e"&&!e.repeat)interact();
  if(k==="p"&&running&&!gameEnded){paused=!paused;ui.pause.classList.toggle("hidden",!paused);}
});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>keys.clear());
reset();render();requestAnimationFrame(frame);
