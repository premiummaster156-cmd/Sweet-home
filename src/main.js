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
let footstepTimer = 0, ambientRoarTimer = 5, cinematicGunPlayed = false, heartbeatTimer = 0;
let touchMove = {x:0,y:0};
let stickPointer = null;
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
  victory: document.querySelector("#victory"), touchControls: document.querySelector("#touch-controls"),
  posture: document.querySelector("#posture-status"), light: document.querySelector("#light-status"),
  lightBar: document.querySelector("#light-battery"), touchMode: document.querySelector("#touch-mode"),
  stick: document.querySelector("#virtual-stick"), stickKnob: document.querySelector("#stick-knob"),
  touchSprint: document.querySelector("#touch-sprint"), touchCrouch: document.querySelector("#touch-crouch"),
  touchLight: document.querySelector("#touch-light")
};
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const rnd = (a,b) => a + Math.random() * (b-a);
function reset() {
  keys.clear();touchMove={x:0,y:0};stickPointer=null;
  if(ui.stickKnob)ui.stickKnob.style.transform="translate(0,0)";
  if(ui.touchSprint)ui.touchSprint.classList.remove("is-active");
  player = {x:76,y:136,r:5,hp:100,stamina:100,faceX:1,faceY:0,attack:0,cooldown:0,invuln:0,crouched:false,flashlight:true,lightBattery:100};
  enemies = [
    {x:342,y:104,hp:3,speed:27,hit:0,alertTimer:0,variant:0},
    {x:396,y:195,hp:3,speed:24,hit:0,alertTimer:0,variant:1},
    {x:268,y:223,hp:2,speed:30,hit:0,alertTimer:0,variant:2}
  ];
  pickups = [
    {x:125,y:70,type:"med",taken:false},
    {x:220,y:185,type:"supply",taken:false},
    {x:432,y:70,type:"supply",taken:false},
    {x:370,y:225,type:"supply",taken:false}
  ];
  doors = [{x:454,y:137,open:false}]; fxList=[]; particles=[]; objectiveProgress=0; medkits=1; gameEnded=false;
  touchMove={x:0,y:0};stickPointer=null;footstepTimer=0;ambientRoarTimer=5;heartbeatTimer=0;
  ui.gameover.classList.add("hidden"); ui.victory.classList.add("hidden"); updateUI();
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(x1,y1,x2,y2,c){ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function text(s,x,y,c="#b8b8ad"){ctx.fillStyle=c;ctx.font="7px monospace";ctx.fillText(s,x,y);}
function diamond(cx,cy,rx,ry,fill,stroke){
  ctx.beginPath();ctx.moveTo(cx,cy-ry);ctx.lineTo(cx+rx,cy);ctx.lineTo(cx,cy+ry);ctx.lineTo(cx-rx,cy);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function wallDoor(x,y,w,h,label,variant=0){
  // deep inset and thick stained frame
  rect(x-3,y-3,w+6,h+7,"#111615");
  rect(x-2,y-2,w+4,h+5,"#4a4d44");
  rect(x,y,w,h,"#252b29");
  rect(x+3,y+3,w-6,h-5,variant===1?"#383832":"#303531");
  rect(x+5,y+5,w-10,3,"#57564b");
  rect(x+5,y+9,w-10,h-17,"#282e2b");
  rect(x+7,y+11,2,h-21,"#45483e");
  rect(x+w-10,y+h*.55,2,4,"#a08a62");
  rect(x+w-7,y+h*.55,2,4,"#171a18");
  rect(x+w*.5-7,y+5,14,5,"#777263");
  rect(x+w*.5-5,y+6,10,2,"#b0a58a");
  // chipped paint around bottom of the frame
  rect(x+3,y+h-4,4,2,"#646052");rect(x+w-7,y+h-3,4,2,"#666153");
  text(label,x+w/2-9,y+h+12,"#aaa48b");
}
function drawFloor(){
  // A single old Green Home floor: cool concrete, nicotine-stained walls and restrained emergency lighting.
  rect(0,0,W,H,"#171c1b");
  rect(0,0,W,70,"#252a27");
  // upper wall brickwork with uneven mortar and patches
  for(let row=0;row<8;row++){
    const yy=7+row*8,offset=row%2?13:0;
    for(let col=-1;col<19;col++){
      const xx=col*27+offset;
      const n=(col*13+row*7+80)%7;
      rect(xx,yy,25,6,n===0?"#343833":n===1?"#2b312d":"#303530");
      line(xx,yy+6,xx+24,yy+6,"#1b201d");
      if(n===2)rect(xx+5,yy+2,4,1,"#46483d");
      if(n===4)rect(xx+18,yy+1,3,2,"#252a27");
    }
  }
  // damp wall stains and old paint layers
  rect(0,63,W,7,"#43463d");rect(0,67,W,3,"#282e2a");
  for(let i=0;i<31;i++){
    const x=(i*71+17)%W,y=20+(i*19)%43;
    rect(x,y,2+(i%4),1,"#41443b");
  }
  // exposed pipes, conduits and old fluorescent fixtures
  rect(16,0,4,70,"#515249");rect(20,0,2,70,"#171d1a");
  rect(457,0,5,69,"#494d43");rect(453,0,2,69,"#171c1a");
  rect(28,5,170,2,"#55574c");rect(28,7,170,2,"#171d1a");
  rect(281,5,151,2,"#55574c");rect(281,7,151,2,"#171d1a");
  for(let x=40;x<445;x+=102){
    rect(x,10,29,5,"#141a18");rect(x+2,11,25,2,"#837c63");
    rect(x+4,11,20,1,"#b2a982");
  }
  // three apartment doors and old brass number plates
  wallDoor(65,29,43,35,"608");
  wallDoor(216,24,48,40,"605",1);
  wallDoor(365,29,43,35,"616");
  // door frames have shadowed concrete lintels
  rect(59,24,55,4,"#4d5147");rect(210,19,60,5,"#4e5147");rect(359,24,55,4,"#4d5147");
  // intercom panel and faded building directory
  rect(122,30,26,37,"#151a18");rect(125,33,20,30,"#41463c");
  rect(128,36,14,6,"#8d8166");rect(130,38,10,2,"#1b211e");
  for(let y=46;y<60;y+=4){rect(128,y,3,2,"#a14f42");rect(133,y,8,2,"#777665");}
  rect(152,41,43,17,"#1c211f");rect(155,44,37,11,"#514a3d");
  text("GREEN HOME",158,51,"#a9a18a");
  // elevator/service alcove in the centre.
  rect(279,29,61,37,"#131a18");rect(282,32,55,31,"#41463f");
  rect(286,35,47,25,"#252b28");rect(289,38,21,19,"#343a35");rect(312,38,18,19,"#343a35");
  line(310,38,310,57,"#101714");rect(303,26,13,5,"#77745f");rect(306,27,7,2,"#ba9d6c");
  rect(346,36,10,23,"#272c28");rect(348,38,6,4,"#a84c43");rect(349,45,4,2,"#aaa184");
  // corridor floor: hand-laid diamond slabs, chipped edges and subtle grime.
  rect(0,70,W,183,"#222825");
  for(let row=0;row<11;row++){
    for(let col=-2;col<15;col++){
      const cx=col*40+(row%2)*20,cy=78+row*17;
      const n=(col*9+row*5+80)%9;
      const shades=["#343a35","#303631","#394039","#2d342f","#353b35","#313833","#2a312d","#3a4039","#303631"];
      diamond(cx,cy,20,9,shades[n],"#171e1a");
      // a slightly worn inner edge catches a little ambient light
      line(cx-13,cy,cx,cy-6,"#44483f");
      if((col+row*3)%7===0){
        rect(cx-5,cy+2,4,1,"#555047");
        rect(cx+4,cy-2,2,1,"#222824");
      }
      if((col*3+row)%11===0){
        line(cx+3,cy+2,cx+7,cy+4,"#1b211e");
        line(cx+7,cy+4,cx+9,cy+2,"#4a463d");
      }
    }
  }
  // thin wall skirting and side concrete returns
  rect(0,68,W,3,"#55574a");rect(0,71,W,2,"#171e1a");
  rect(0,247,W,6,"#3d433b");rect(0,251,W,2,"#151b18");
  rect(0,70,7,179,"#343a35");rect(7,70,2,179,"#131917");
  rect(471,70,9,179,"#343a35");rect(469,70,2,179,"#131917");
  // left-side bench, torn cushion and scattered papers
  rect(15,91,52,25,"#101614");rect(18,88,47,21,"#383d36");
  rect(21,91,41,13,"#4c4b40");rect(24,94,35,7,"#333832");
  rect(20,107,5,9,"#282d28");rect(57,107,5,9,"#282d28");
  rect(31,93,9,2,"#696252");rect(44,96,8,1,"#746453");
  // small potted plant, mostly dried out
  rect(16,136,16,12,"#161c18");rect(18,138,12,8,"#4a4032");
  rect(20,140,8,5,"#766b53");rect(23,128,2,11,"#465043");
  rect(18,130,5,4,"#525e4b");rect(25,126,5,5,"#414b3e");
  rect(16,127,5,3,"#62664f");
  // right utility cabinet, rusted pipes and fallen rubbish
  rect(423,86,39,35,"#141a17");rect(426,89,33,29,"#4a4b40");
  rect(429,92,27,22,"#303631");rect(432,95,21,16,"#202723");
  rect(437,97,2,11,"#777361");rect(444,97,2,11,"#777361");
  rect(431,91,22,2,"#8b8166");rect(453,103,3,4,"#a08b61");
  rect(401,126,12,8,"#171d19");rect(403,123,8,7,"#3d4037");
  rect(396,130,7,4,"#68604e");rect(413,131,5,3,"#6a5b48");
  // toppled chair and old cardboard near the bottom wall
  rect(34,206,31,18,"#151a17");rect(38,202,24,5,"#4a4031");
  rect(41,207,18,12,"#5a4939");rect(43,209,14,8,"#353a33");
  line(39,222,35,228,"#6c5b44");line(60,220,65,228,"#6c5b44");
  rect(81,223,21,11,"#494436");rect(84,225,16,7,"#6a604b");
  // old emergency extinguisher, pipe joints and electrical boxes
  rect(106,89,9,18,"#5a3c31");rect(108,86,5,4,"#88745b");rect(109,91,3,10,"#8b4a3e");
  rect(111,87,4,2,"#b5a17b");
  rect(354,91,10,23,"#1b211e");rect(356,93,6,18,"#494a3d");
  rect(358,96,3,9,"#9c4d3f");rect(360,92,2,3,"#b2a17a");
  rect(391,193,32,24,"#141a17");rect(394,196,26,18,"#413e34");
  rect(398,198,18,13,"#282e29");rect(402,201,9,2,"#71634c");
  // a small pool of old blood and shoe scuffs, not neon red splashes
  rect(258,120,7,2,"#4d2928");rect(265,122,4,2,"#492526");
  rect(268,125,9,2,"#422323");rect(274,128,3,5,"#422323");
  rect(247,127,2,3,"#64403a");rect(253,133,3,1,"#52443b");
  rect(92,175,7,2,"#4c2927");rect(101,177,3,4,"#492625");
  rect(107,181,4,1,"#422421");rect(112,184,2,2,"#4e302a");
  rect(305,204,3,1,"#555046");rect(310,207,6,1,"#4f4a40");
  // scattered papers and small floor debris
  for(let i=0;i<19;i++){
    const x=(i*67+28)%W,y=88+(i*41)%151;
    if((x<70&&y<150)||(x>420&&y<140))continue;
    rect(x,y,2+(i%3),1,"#77715e");
    if(i%3===0)rect(x+2,y+1,1,1,"#aea084");
  }
  // the right-hand exit to the stairwell, framed in battered steel
  rect(448,112,27,50,"#101614");rect(450,114,23,46,"#55564b");
  rect(453,117,17,40,"#222a26");rect(456,120,11,34,"#303832");
  rect(458,122,7,30,"#262e29");rect(464,137,2,3,"#c0a16c");
  rect(450,109,23,3,"#8b8063");rect(450,161,23,3,"#817861");
  rect(443,109,4,8,"#756e56");rect(473,110,5,7,"#756e56");
  text("STAIR",452,104,"#a69b7e");
  // Emergency fixture's dim, warm spill on the floor.
  rect(219,71,24,2,"#4b4638");rect(224,65,14,6,"#171e1a");
  rect(227,67,8,2,"#a38b61");rect(228,67,5,1,"#c1a677");
}
function movingForSprite(p){return !!p.moving;}
function drawPlayer(){
  const p=player,x=Math.round(p.x);
  const phase=elapsed*(p.sprinting?17:p.crouched?4:9);
  const bob=Math.round(Math.sin(phase)*(p.crouched?0:p.sprinting?1:0.5));
  const y=Math.round(p.y+bob+(p.crouched?2:0));
  const stride=movingForSprite(p)?Math.round(Math.sin(phase)*(p.sprinting?2:1)):0;
  // Ground shadow and a narrow flashlight cast shadow keep the sprite planted in the scene.
  rect(x-8,y+7,16,4,"#101412");rect(x-5,y+8,10,2,"#090d0b");
  if(p.invuln>0&&Math.floor(elapsed*14)%2===0)return;
  // Back of the jacket and small worn backpack.
  rect(x-7,y-8,14,14,"#111714");
  rect(x-8,y-7,4,10,"#252b26");rect(x-9,y-4,3,6,"#363a31");
  rect(x-6,y-8,12,13,"#42463d");rect(x-5,y-7,10,11,"#353a34");
  rect(x-4,y-6,8,8,"#505044");rect(x-6,y-4,2,5,"#222a25");
  // Hood seam, shoulder folds and a quiet dark-red inner layer.
  rect(x-5,y-9,10,3,"#262b27");rect(x-3,y-9,6,2,"#6b6553");
  rect(x-2,y-4,4,6,"#6b4038");rect(x-1,y-3,2,4,"#8a5144");
  rect(x-6,y-3,2,4,"#686b5d");rect(x+4,y-3,2,4,"#686b5d");
  // Thin arms. Their pixel position shifts slightly during the walk cycle.
  rect(x-8,y-2+stride,3,7,"#262d28");rect(x+5,y-2-stride,3,7,"#262d28");
  rect(x-8,y+3+stride,3,2,"#8b7761");rect(x+5,y+3-stride,3,2,"#8b7761");
  // Narrow trousers and independently animated feet.
  rect(x-5,y+4+stride,4,6,"#242a26");rect(x+1,y+4-stride,4,6,"#242a26");
  rect(x-6,y+8+stride,5,2,"#151a18");rect(x+1,y+8-stride,5,2,"#151a18");
  // Head: shaggy black hair, pale face and uneven fringe; overhead-facing pose is kept readable.
  rect(x-5,y-17,10,10,"#101513");
  rect(x-4,y-18,8,9,"#282b27");rect(x-5,y-16,10,5,"#1a211e");
  rect(x-4,y-12,8,4,"#b49a7c");rect(x-3,y-11,6,3,"#c1a486");
  if(p.faceY<0){
    rect(x-5,y-17,10,6,"#171d1a");rect(x-4,y-14,8,3,"#272a25");
  }else if(p.faceX!==0){
    rect(x-4,y-14,7,4,"#b99b7d");rect(x-2,y-15,7,3,"#161c19");
    rect(x+2*p.faceX,y-12,2,1,"#211e1a");
  }else{
    rect(x-5,y-15,10,3,"#111714");rect(x-4,y-12,8,3,"#c1a282");
    rect(x-3,y-10,2,1,"#1b211d");rect(x+2,y-10,2,1,"#1b211d");
  }
  rect(x-6,y-17,3,3,"#101613");rect(x+3,y-18,3,3,"#101613");
  // Weapon: a battered steel pipe held low beside the body.
  if(p.attack>0){
    rect(x+p.faceX*8-3,y+p.faceY*8-3,6,6,"#c1b49b");
    rect(x+p.faceX*8-1,y+p.faceY*8-1,3,3,"#e0d4b8");
  }else{
    line(x+p.faceX*5,y+p.faceY*4,x+p.faceX*10,y+p.faceY*9,"#857e6b");
    rect(x+p.faceX*9-1,y+p.faceY*8-1,2,2,"#c1b69d");
  }
  // A small muted strap and metal catch give the silhouette its own readable details.
  rect(x-4,y-6,1,7,"#77735e");rect(x+3,y-5,1,4,"#1b201d");
  rect(x-1,y+1,2,1,"#a34b40");
}
function drawEnemy(e){
  const x=Math.round(e.x),phase=elapsed*(e.alertTimer>0?15:6);
  const twitch=Math.round(Math.sin(phase)*1.3);
  const y=Math.round(e.y+twitch);
  // A heavy, irregular shadow gives the infected a different weight to the player.
  rect(x-9,y+7,18,4,"#0b100e");rect(x-7,y+8,14,2,"#080c0a");
  if(e.variant===2){
    // A low crawler with a long, dragging forearm.
    rect(x-8,y-2,16,10,"#1d2521");
    rect(x-7,y-5,11,8,"#3d4139");rect(x-3,y-8,9,8,"#5b594b");
    rect(x-12,y+1,7,3,"#33382f");rect(x-16,y+3,8,2,"#282e28");
    rect(x+4,y+4,7,3,"#33382f");rect(x+7,y+7,7,2,"#252c26");
    rect(x-3,y-7,2,2,"#a05b4c");rect(x+2,y-6,2,2,"#a05b4c");
  }else{
    // A standing, malformed resident: narrow torso, dropped shoulders and arms hanging too low.
    rect(x-8,y-7,16,15,"#171e1a");
    rect(x-7,y-9,14,13,"#41443b");rect(x-5,y-8,10,10,"#555449");
    rect(x-7,y-6,3,10,"#333b34");rect(x+4,y-6,3,10,"#333b34");
    rect(x-9,y-3+twitch,3,10,"#41443a");rect(x+6,y-2-twitch,3,11,"#393e36");
    rect(x-10,y+6+twitch,3,4,"#292f29");rect(x+7,y+7-twitch,3,4,"#252b26");
    rect(x-5,y+5,4,4,"#4d4237");rect(x+2,y+5,4,4,"#483d34");
    // Torn neck and an uneven, partially obscured face.
    rect(x-5,y-16,10,10,"#151b18");rect(x-4,y-15,8,8,"#55564a");
    rect(x-5,y-17,10,4,"#202721");rect(x-6,y-14,3,5,"#2f3830");
    rect(x-3,y-10,2,2,"#a14c43");rect(x+2,y-11,2,2,"#a14c43");
    rect(x-2,y-6,5,2,"#302b26");
    // Vein-like dark splits and old blood, kept in restrained reds.
    rect(x-6,y-4,2,5,"#6c3932");rect(x+4,y-2,2,4,"#6c3932");
    rect(x-1,y+1,2,4,"#6e3832");
    if(e.variant===1){rect(x-12,y-1,3,8,"#4a493d");rect(x-13,y+5,3,5,"#33382f");}
  }
  if(e.hit>0){rect(x-8,y-19,16,2,"#b38b70");rect(x-5,y-20,10,1,"#6d3730");}
  if(e.alertTimer>0){rect(x-1,y-23,3,2,"#b85b4c");rect(x,y-25,1,1,"#d3a17b");}
}
function drawPickup(p){
  if(p.taken)return;
  const x=Math.round(p.x),y=Math.round(p.y),pulse=(Math.sin(elapsed*2.4)+1)*.5;
  rect(x-7,y+5,14,3,"#101512");
  if(p.type==="med"){
    rect(x-6,y-5,12,11,"#1a211d");rect(x-5,y-6,10,11,"#82775e");
    rect(x-4,y-4,8,8,"#b2a589");rect(x-2,y-3,4,6,"#6e4339");
    rect(x-1,y-5,2,10,"#c8bca0");rect(x-5,y-1,10,2,"#c8bca0");
    rect(x-3,y-7,6,2,"#49483c");
  }else{
    rect(x-6,y-5,12,11,"#181f1a");rect(x-5,y-6,10,10,"#5d5948");
    rect(x-4,y-4,8,7,"#867557");rect(x-3,y-3,6,5,"#4c483b");
    rect(x-1,y-5,2,2,"#a79a75");rect(x-4,y+2,8,1,"#a79a75");
  }
  if(pulse>.82){rect(x-1,y-10,2,2,"#b7a27a");}
}
function updateUI(){
  ui.hp.style.width=player.hp+"%";ui.hpLabel.textContent=Math.ceil(player.hp)+" / 100";
  ui.stamina.style.width=player.stamina+"%";ui.staminaLabel.textContent=Math.ceil(player.stamina)+" / 100";
  ui.medCount.textContent="× "+medkits+" · PRESS E";
  ui.itemCount.textContent=(1+pickups.filter(p=>p.taken).length)+" ITEMS";
  ui.progress.style.width=(objectiveProgress/3*100)+"%";
  ui.progressText.textContent=objectiveProgress+" / 3 SUPPLIES FOUND";
  ui.objective.textContent=objectiveProgress>=3?"Reach the exit":"Find supplies ("+objectiveProgress+"/3)";
  if(ui.posture)ui.posture.textContent=player.crouched?"CROUCHING":(keys.has("shift")&&player.stamina>0?"SPRINTING":"WALKING");
  if(ui.light)ui.light.textContent=player.flashlight?"FLASHLIGHT ON":"FLASHLIGHT OFF";
  if(ui.lightBar)ui.lightBar.style.width=player.lightBattery+"%";
  if(ui.touchMode)ui.touchMode.textContent=player.crouched?"STEALTH":(keys.has("shift")&&player.stamina>0?"RUN":"WALK");
  if(ui.touchCrouch)ui.touchCrouch.classList.toggle("is-active",player.crouched);
  if(ui.touchLight)ui.touchLight.classList.toggle("is-active",player.flashlight);
}
function update(dt){
  elapsed+=dt;
  if(player.cooldown>0)player.cooldown-=dt;
  if(player.attack>0)player.attack-=dt;
  if(player.invuln>0)player.invuln-=dt;
  let dx=0,dy=0;
  if(keys.has("w")||keys.has("arrowup"))dy--;
  if(keys.has("s")||keys.has("arrowdown"))dy++;
  if(keys.has("a")||keys.has("arrowleft"))dx--;
  if(keys.has("d")||keys.has("arrowright"))dx++;
  dx+=touchMove.x;dy+=touchMove.y;
  const moving=!!(dx||dy),magnitude=Math.hypot(dx,dy);
  player.moving=moving;
  if(magnitude>1){dx/=magnitude;dy/=magnitude;}
  const sprinting=keys.has("shift")&&!player.crouched&&moving&&player.stamina>1;
  player.sprinting=!!sprinting;
  if(sprinting)player.stamina=Math.max(0,player.stamina-dt*30);
  else player.stamina=clamp(player.stamina+dt*(player.crouched?15:12),0,100);
  if(player.stamina<=0&&sprinting){keys.delete("shift");audio.sfx("breath");}
  if(player.flashlight&&player.lightBattery>0)player.lightBattery=Math.max(0,player.lightBattery-dt*.32);
  else player.lightBattery=clamp(player.lightBattery+dt*.9,0,100);
  if(player.lightBattery<=0&&player.flashlight){player.flashlight=false;audio.sfx("light-click");}
  footstepTimer=Math.max(0,footstepTimer-dt);
  ambientRoarTimer-=dt;
  if(moving){
    const speed=sprinting?116:(player.crouched?34:65);
    player.x+=dx*speed*dt;player.y+=dy*speed*dt;
    if(Math.abs(dx)>Math.abs(dy))player.faceX=Math.sign(dx),player.faceY=0;
    else player.faceY=Math.sign(dy),player.faceX=0;
    ui.status.textContent=sprinting?"RUNNING · MAKING NOISE":player.crouched?"CROUCHING · QUIET":"MOVING CAREFULLY";
    if(footstepTimer<=0){
      audio.sfx(sprinting?"heavy-step":player.crouched?"soft-step":"footstep");
      footstepTimer=sprinting ? 0.22 : player.crouched ? 0.58 : 0.38;
    }
  }
  player.x=clamp(player.x,15,445);player.y=clamp(player.y,26,244);
  for(const e of enemies){
    e.hit=Math.max(0,e.hit-dt);
    const ex=player.x-e.x,ey=player.y-e.y,d=Math.hypot(ex,ey);
    const hearingRange=sprinting?278:player.crouched?72:172;
    e.alertTimer=Math.max(0,(e.alertTimer||0)-dt);
    if(d<hearingRange)e.alertTimer=3.2;
    if(e.alertTimer>0){
      const speed=e.speed*(sprinting?1.18:1);
      if(d>13){e.x+=ex/(d||1)*speed*dt;e.y+=ey/(d||1)*speed*dt;}
      else if(player.invuln<=0){
        player.hp=Math.max(0,player.hp-9);player.invuln=.62;shake=3;
        spawnBurst(player.x,player.y,"#9b3c3c",5);audio.sfx("hurt");
        if(player.hp<=0){gameEnded=true;running=false;ui.gameover.classList.remove("hidden");ui.touchControls.classList.add("hidden");audio.sfx("death");audio.scene("menu");}
      }
    }else{
      e.x+=Math.sin(elapsed*.7+e.y)*.12;
      e.y+=Math.cos(elapsed*.55+e.x)*.10;
    }
  }
  for(const p of pickups)if(!p.taken&&Math.hypot(p.x-player.x,p.y-player.y)<13)ui.status.textContent="ITEM NEARBY · PRESS E";
  if(ambientRoarTimer<=0&&enemies.some(e=>Math.hypot(e.x-player.x,e.y-player.y)<150)){
    audio.sfx("monster");ambientRoarTimer=7+rnd(0,5);
  }
  heartbeatTimer-=dt;
  if(player.hp<=32&&heartbeatTimer<=0){audio.sfx("heartbeat");heartbeatTimer=1.05;}
  if(player.hp>32)heartbeatTimer=0;
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
  for(const [x,y,r] of [[78,48,25],[395,48,22]]){
    const g=ctx.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,"rgba(160,164,130,.12)");g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  if(player.flashlight&&player.lightBattery>0){
    const angle=Math.atan2(player.faceY,player.faceX),range=118;
    const cone=ctx.createRadialGradient(player.x,player.y,5,player.x,player.y,range);
    cone.addColorStop(0,"rgba(202,205,170,.30)");cone.addColorStop(.65,"rgba(176,187,159,.12)");cone.addColorStop(1,"rgba(0,0,0,0)");
    ctx.save();ctx.globalCompositeOperation="screen";ctx.beginPath();ctx.moveTo(player.x,player.y);
    ctx.arc(player.x,player.y,range,angle-.52,angle+.52);ctx.closePath();ctx.fillStyle=cone;ctx.fill();ctx.restore();
  }else{
    const g=ctx.createRadialGradient(player.x,player.y,1,player.x,player.y,24);
    g.addColorStop(0,"rgba(115,126,112,.10)");g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;ctx.fillRect(player.x-24,player.y-24,48,48);
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
  if(player.hp<35){const pulse=(Math.sin(elapsed*5)+1)/2;ctx.fillStyle="rgba(108,12,15,"+(.025+pulse*.055)+")";ctx.fillRect(0,0,W,H);}
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
function togglePause(){
  if(!running||gameEnded)return;
  paused=!paused;ui.pause.classList.toggle("hidden",!paused);
  keys.clear();touchMove={x:0,y:0};stickPointer=null;
  if(ui.stickKnob)ui.stickKnob.style.transform="translate(0,0)";
  if(ui.touchSprint)ui.touchSprint.classList.remove("is-active");
  audio.sfx("menu");audio.scene(paused?"menu":"game");
}
function toggleCrouch(){
  if(!running||paused||gameEnded)return;
  player.crouched=!player.crouched;
  if(player.crouched){keys.delete("shift");ui.touchSprint.classList.remove("is-active");}
  audio.sfx("soft-step");updateUI();
}
function toggleFlashlight(){
  if(!running||paused||gameEnded||player.lightBattery<=0)return;
  player.flashlight=!player.flashlight;
  audio.sfx("light-click");updateUI();
}
function returnToMenu(){
  running=false;paused=false;cinematic=false;keys.clear();touchMove={x:0,y:0};stickPointer=null;
  ui.stickKnob.style.transform="translate(0,0)";ui.touchSprint.classList.remove("is-active");
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
  if((k==="p"||k==="escape")&&running&&!gameEnded)togglePause();
  if(k==="c"&&!e.repeat)toggleCrouch();
  if(k==="f"&&!e.repeat)toggleFlashlight();
});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>{
  keys.clear();touchMove={x:0,y:0};stickPointer=null;
  if(ui.stickKnob)ui.stickKnob.style.transform="translate(0,0)";
  if(ui.touchSprint)ui.touchSprint.classList.remove("is-active");
});
document.querySelectorAll("[data-touch-key]").forEach(button=>{
  const key=button.dataset.touchKey;
  button.addEventListener("pointerdown",e=>{e.preventDefault();keys.add(key);button.setPointerCapture?.(e.pointerId);});
  const release=e=>{e.preventDefault();keys.delete(key);};
  button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("lostpointercapture",release);
});
document.querySelector("#touch-attack").addEventListener("pointerdown",e=>{e.preventDefault();attack();});
document.querySelector("#touch-interact").addEventListener("pointerdown",e=>{e.preventDefault();interact();});
document.querySelector("#touch-pause").addEventListener("pointerdown",e=>{e.preventDefault();togglePause();});
document.querySelector("#touch-crouch").addEventListener("pointerdown",e=>{e.preventDefault();toggleCrouch();});
document.querySelector("#touch-light").addEventListener("pointerdown",e=>{e.preventDefault();toggleFlashlight();});
ui.touchSprint.addEventListener("pointerdown",e=>{
  e.preventDefault();if(!running||paused)return;keys.add("shift");ui.touchSprint.classList.add("is-active");
  ui.touchSprint.setPointerCapture?.(e.pointerId);
});
const stopSprint=e=>{if(e)e.preventDefault();keys.delete("shift");ui.touchSprint.classList.remove("is-active");};
ui.touchSprint.addEventListener("pointerup",stopSprint);
ui.touchSprint.addEventListener("pointercancel",stopSprint);
ui.touchSprint.addEventListener("lostpointercapture",stopSprint);
ui.stick.addEventListener("pointerdown",e=>{
  if(!running||paused)return;
  e.preventDefault();stickPointer=e.pointerId;ui.stick.setPointerCapture?.(e.pointerId);moveStick(e);
});
function moveStick(e){
  if(stickPointer!==e.pointerId)return;
  const r=ui.stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;
  const max=r.width*.32,len=Math.hypot(dx,dy);
  if(len>max){dx=dx/len*max;dy=dy/len*max;}
  touchMove={x:dx/max,y:dy/max};
  ui.stickKnob.style.transform=`translate(${dx}px,${dy}px)`;
}
ui.stick.addEventListener("pointermove",moveStick);
function releaseStick(e){
  if(stickPointer!==e.pointerId)return;
  stickPointer=null;touchMove={x:0,y:0};ui.stickKnob.style.transform="translate(0,0)";
}
ui.stick.addEventListener("pointerup",releaseStick);
ui.stick.addEventListener("pointercancel",releaseStick);
ui.stick.addEventListener("lostpointercapture",releaseStick);
reset();ui.frame.classList.add("cinematic-mode");ui.cinematic.classList.add("hidden");
ui.intro.classList.add("hidden");ui.menu.classList.remove("hidden");
render();requestAnimationFrame(frame);
