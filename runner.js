(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const body = document.body;
  const stage = byId('stage');
  const start = byId('start-btn');
  const results = byId('results');
  const paused=byId('paused');
  const tutorial=byId('tutorial');
  const pauseButton=byId('pause-btn');
  const preference=byId('c-tutorial');
  const gallery=byId('cast-gallery'), openGallery=byId('cast-open');
  const castList=byId('cast-list'), castAction=byId('cast-action');
  const settings = byId('cfg-panel');
  const toggle = byId('cfg-toggle');
  const preview = byId('pose-preview');
  const elAction = byId('last-action');
  const pctx = preview.getContext('2d');
  const failure = (message) => {
    byId('fatal').textContent = message;
    byId('fatal').hidden = false;
  };
  if (!window.THREE || !window.RunnerArt || !window.RunnerObstacles || !window.RunnerModel || !window.RunnerCampaign || !window.RunnerGear || !window.RunnerSeriesModel) {
    failure('游戏资源缺失，请保留项目目录中的脚本和资源文件。');
    return;
  }

  const T = window.THREE;
  const Art = window.RunnerArt;
  const Props = window.RunnerObstacles;
  const Gear = window.RunnerGear;
  const CFG = { confidence:.6, tiltThreshold:.35, jumpCooldown:600, holdFrames:3, invertTilt:false, showPreview:false,
    sensitivity:100, swipeSensitivity:100, volume:30, guides:true, effects:true };
  const LANES = [-2.6,0,2.6];
  const Campaign=window.RunnerCampaign;
  const ZONES=Campaign.zones;
  const route=Campaign.route();
  const FLIGHT_LENGTH=4.8;
  const SHOE_SECONDS=30, BOOST_VELOCITY=17.8;
  const read=(key,fallback)=>{
    try { return localStorage.getItem('pose-runner:'+key) ?? fallback; } catch { return fallback; }
  };
  const save=(key,value)=>{ try { localStorage.setItem('pose-runner:'+key,value); } catch {} };
  preference.checked=read('tutorial','1')!=='0';
  const QS = new URLSearchParams(location.search);
  const WS_URL = QS.get('ws') || 'ws://127.0.0.1:8765/?role=game';
  const requestedZone=parseInt(QS.get('startzone'),10);
  const START_ZONE=Number.isInteger(requestedZone) && ZONES[requestedZone] ? requestedZone : null;
  const NO_DIALOG = QS.get('nodialog') === '1';
  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionAllowed=()=>CFG.effects && !REDUCED_MOTION;
  const options = { antialias:true, powerPreference:'high-performance' };
  let renderer;
  try { renderer = new T.WebGLRenderer(options); } catch (error) {
    failure('浏览器未能启动 3D 渲染。请开启硬件加速后重新打开页面。');
    return;
  }
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(55,1,.1,360);
  const world = Art.createWorld(scene,renderer);
  const player = new T.Group();
  scene.add(player);
  const shadowTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32,32,8,32,32,32);
    gradient.addColorStop(0,'#19251ad0');
    gradient.addColorStop(1,'#19251a00');
    context.fillStyle = gradient;
    context.fillRect(0,0,64,64);
    return new T.CanvasTexture(canvas);
  })();
  const shadow = new T.Mesh(new T.PlaneGeometry(2.25,1.65).rotateX(-Math.PI/2),Art.unlit(0xffffff,{
    map:shadowTexture, transparent:true, opacity:.45, depthWrite:false
  }));
  scene.add(shadow);

  const obstacles=[], pickups=[];
  const coinLabel=byId('coin-count'), guardLabel=byId('guard');
  const shoeLabel=byId('shoe-gear'), shoeTime=byId('shoe-remaining');
  const supplyLabel=byId('supply'), supplyName=byId('supply-name'), supplyLane=byId('supply-lane');
  const comboLabel=byId('combo'), comboCount=byId('combo-count'), comboMoves=byId('combo-moves');
  const flightBanner=byId('flight-banner');
  const pursuitBanner=byId('pursuit'), pursuitClock=byId('pursuit-clock'), chaseCaption=byId('capture-caption');
  const characters={er:{name:'熊二',price:0},da:{name:'熊大',price:0}};
  const castButtons=new Map();
  const coinFormat=new Intl.NumberFormat('zh-CN');
  const owns=(key,collection)=>Object.hasOwn(characters,key) &&
    (characters[key].price===0 || collection.unlocked.includes(key));
  const loadCollection=(fallback)=>{
    try {
      const saved=JSON.parse(read('collection','null'));
      if(saved && Number.isSafeInteger(saved.balance) && saved.balance>=0 && Array.isArray(saved.unlocked)){
        return {balance:saved.balance,unlocked:saved.unlocked.filter(key=>typeof key==='string' && Object.hasOwn(characters,key))};
      }
    } catch {}
    return fallback;
  };
  let collection={balance:0,unlocked:[]};
  let previewKey='er';
  const hud = byId('hud'), hint=byId('hint'), touch=byId('touch-controls');
  const scoreLabel=byId('score'), speedLabel=byId('speed'), progress=byId('zone-progress');
  const hazard=byId('hazard'), hazardIcon=byId('hazard-icon'), hazardAction=byId('hazard-action'), hazardName=byId('hazard-name');
  const actions={left:'左移',right:'右移',jump:'跳跃',duck:'下蹲',idle:'站立'};
  const metrics=byId('zone-count');
  let state='ready', model, equipment, cast, chaser;
  const pursuerKey=()=>selected==='vick' ? 'er' : 'vick';
  const pursuerName=()=>characters[pursuerKey()]?.name ?? '光头强';
  let selected='er', modeKey='normal', mode=Campaign.difficulties.normal;
  let pursuitTime=0, stumbleTime=0, pursuitIntro=0, capture=null;
  let currentLane=1, distance=0, score=0, speed=24, zoneIndex=0, zoneStart=0, zoneEnd=ZONES[0].len;
  let playerX=0, playerY=0, vy=0, bank=0, onGround=true, lastJump=-9999, lastLaneChange=-9999;
  let poseDuck=false, touchDuck=false, duckAmount=0, phase=0, elapsed=0, previousFrame=performance.now();
  let playlist, nextSpawn=0, coins=0, guard=false, guardFlash=0;
  let guardBurst=0, shoes=0, flightTime=0, supplies={};
  let lesson=0, pausedState='playing', pauseFromSettings=false;
  let combo=0, bestCombo=0, comboScore=0, comboUntil=0, comboSequence=[];
  const keyboardDuck = new Set();
  let swipe=null, duckSwipeUntil=0, laneChange=null, audio=null;

  const activeInput=()=>state==='playing' || state==='training' || state==='flight';
  function showState(next) {
    body.dataset.state=state=next;
    byId('overlay').hidden=next!=='ready';
    results.hidden=next!=='over' || NO_DIALOG;
    paused.hidden=next!=='paused' || !settings.hidden;
    tutorial.hidden=next!=='training';
    const onCourse=next==='playing' || next==='flight';
    chaseCaption.hidden=next!=='capturing';
    pursuitBanner.hidden=next!=='playing' || pursuitTime<=0;
    hud.hidden=!onCourse && !(next==='paused' && pausedState!=='training');
    flightBanner.hidden=next!=='flight';
    pauseButton.hidden=!activeInput();
    hint.hidden=!CFG.guides || (next!=='playing' && next!=='training');
    comboLabel.hidden=next!=='playing' || combo<2 || elapsed>=comboUntil;
    touch.hidden=!activeInput();
    guardLabel.hidden=!((guard || guardFlash>0) && next==='playing');
    refreshShoes();
    if(next!=='playing') hazard.hidden=supplyLabel.hidden=true;
  }

  function displayCharacter(key) {
    if(!cast) return;
    for(const [id,entry] of Object.entries(cast)) entry.model.group.visible=id===key;
    ({model,equipment}=cast[key]);
    body.dataset.character=key;
  }

  function changeCharacter(key,persist=true) {
    if(!owns(key,collection)) return;
    selected=key;
    byId('character-title').textContent=characters[key].name;
    byId('intro-copy').textContent=pursuerName()+'追上来了。穿过树林和未来城，甩开他。';
    byId('pursuit-name').textContent=pursuerName()+'追近了';
    if(persist) save('character',key);
    displayCharacter(key);
  }

  function saveCollection() {
    save('collection',JSON.stringify(collection));
  }

  function renderGallery() {
    const {name,price}=characters[previewKey];
    const unlocked=owns(previewKey,collection), equipped=previewKey===selected, available=collection.balance>=price;
    byId('cast-balance').textContent=coinFormat.format(collection.balance);
    byId('cast-name').textContent=name;
    byId('cast-status').textContent=equipped ? '出场角色' : unlocked ? '已解锁' :
      available ? '解锁需 '+price+' 金币' : '还差 '+(price-collection.balance)+' 金币';
    castAction.textContent=equipped ? '使用中' : unlocked ? '选用' : '购买 · '+price+' 金币';
    castAction.disabled=equipped || (!unlocked && !available);
    for(const [key,button] of castButtons) {
      const cost=characters[key].price;
      button.querySelector('small').textContent=key===selected ? '出场中' : owns(key,collection) ? '已解锁' : cost+' 金币';
      button.setAttribute('aria-pressed',String(key===previewKey));
    }
  }

  function createGallery() {
    for(const [key,{name}] of Object.entries(characters)) {
      const button=document.createElement('button');
      const label=document.createElement('strong'), status=document.createElement('small');
      label.textContent=name;
      button.type='button';
      button.dataset.character=key;
      button.append(label,status);
      button.addEventListener('click',()=>{
        previewKey=key;
        displayCharacter(key);
        renderGallery();
      });
      castList.append(button);
      castButtons.set(key,button);
    }
  }

  function usePreview() {
    if(!gallery.open) return;
    collection=loadCollection(collection);
    const {price}=characters[previewKey];
    if(!owns(previewKey,collection)) {
      if(collection.balance<price) { renderGallery(); return; }
      collection.balance-=price;
      collection.unlocked.push(previewKey);
      saveCollection();
    }
    changeCharacter(previewKey);
    closeGallery();
  }

  function closeGallery() {
    gallery.close();
    displayCharacter(selected);
    openGallery.focus({preventScroll:true});
  }

  function chooseChaser(inRun) {
    if(!cast) return;
    chaser.group.visible=false;
    for(const child of [...chaser.group.children]) player.add(child);
    if(!inRun) return;
    const {model:actor,equipment:gear}=cast[pursuerKey()];
    chaser.group.add(actor.group);
    actor.group.visible=true;
    gear.update({guard:false,burst:0,shoes:0,flight:false,elapsed});
  }

  function changeMode(key,persist=true) {
    if(!Object.hasOwn(Campaign.difficulties,key)) return;
    modeKey=key;
    mode=Campaign.difficulties[key];
    body.dataset.difficulty=key;
    document.querySelector('input[name="difficulty"][value="'+key+'"]').checked=true;
    if(persist) save('difficulty',key);
  }

  function resetChase(intro=0) {
    pursuitTime=stumbleTime=0;
    pursuitIntro=intro;
    capture=null;
    if(chaser) chaser.group.visible=false;
    pursuitBanner.hidden=true;
  }

  function tripOver(obstacle) {
    const shape=obstacle.userData;
    shape.passed=true;
    shape.sign.visible=false;
    if(pursuitTime>0) {
      beginCapture(obstacle,true);
      return;
    }
    pursuitTime=8;
    stumbleTime=.76;
    if(motionAllowed()) stage.animate([{filter:'brightness(.84)'},{filter:'brightness(1)'}],{duration:270});
  }

  function updatePursuit(dt) {
    pursuitTime=Math.max(0,pursuitTime-dt);
    stumbleTime=Math.max(0,stumbleTime-dt);
    pursuitIntro=Math.max(0,pursuitIntro-dt);
    pursuitBanner.hidden=pursuitTime<=0;
    const countdown=Math.ceil(pursuitTime)+' 秒';
    if(pursuitClock.textContent!==countdown) pursuitClock.textContent=countdown;
  }

  function beginCapture(obstacle,consecutive=false) {
    const side=playerX>1.6 ? -1 : 1;
    capture={
      time:0,side,reason:obstacle.userData.name,consecutive,
      initialY:playerY,
      chaserX:chaser.group.visible ? chaser.group.position.x : playerX+side*2.05,
      chaserZ:chaser.group.visible ? Math.max(2.0,chaser.group.position.z) : 5.6
    };
    guard=false;
    guardBurst=0;
    removeObstacle(obstacles.indexOf(obstacle));
    onGround=true;
    shoeLabel.hidden=true;
    chaseCaption.textContent=pursuerName()+'追上来了！';
    showState('capturing');
  }

  function runCapture(dt) {
    capture.time=Math.min(1.68,capture.time+dt);
    playerY=capture.initialY*(1-T.MathUtils.smoothstep(capture.time,0,.39));
    if(capture.time>=.92) chaseCaption.textContent='被'+pursuerName()+'抓住了';
    if(capture.time>=1.68) finishGame();
  }

  function showChaser(isCourse,isFlight) {
    if(!chaser) return;
    const figure=chaser.group;
    if(capture) {
      const {time,side,chaserX,chaserZ}=capture;
      const reach=T.MathUtils.smoothstep(time,0,.94);
      const x=T.MathUtils.lerp(chaserX,playerX+side*1.28,reach);
      const z=T.MathUtils.lerp(chaserZ,.22,reach);
      figure.visible=true;
      figure.position.set(x,world.deckHeight(),z);
      figure.rotation.y=T.MathUtils.lerp(Math.atan2(playerX-x,-z),-side*Math.PI,.22*reach);
      chaser.pose({phase:time*18,pressure:1,catching:T.MathUtils.smoothstep(time,.14,.97)});
      return;
    }
    figure.visible=isCourse && !isFlight && (pursuitTime>0 || pursuitIntro>0);
    if(!figure.visible) return;
    const chasePressure=pursuitTime>0 ? Math.min(1,pursuitTime/4.8) : 0;
    const flank=playerX>1.15 ? -1 : 1;
    const z=pursuitTime>0 ? 8.9-4.37*chasePressure : 10.5-2.7*(pursuitIntro/2.25);
    figure.position.set(playerX+flank*(camera.aspect<.95 ? 1.0 : 1.63),world.deckHeight(),z);
    figure.rotation.y=Math.PI+flank*.1;
    chaser.pose({phase:elapsed*(12.4+chasePressure*2.4),pressure:chasePressure});
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w/h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
    renderer.setSize(w,h);
  }

  function positionCamera() {
    if (state==='ready') {
      const portrait = camera.aspect<.95;
      camera.fov=portrait ? 56 : 43;
      camera.filmOffset=portrait ? 0 : -9.4;
      if (portrait) {
        if(gallery.open) {
          camera.position.set(1.4,2.38,7.05);
          camera.lookAt(.18,-.88,0);
        } else {
          camera.position.set(1.6,2.05,7.45);
          camera.lookAt(.2,-.02,0);
        }
      } else {
        camera.position.set(2.05,2.06,7.48);
        camera.lookAt(.37,1.39,-1.1);
      }
    } else {
      camera.fov=camera.aspect<.95 ? 64 : 56;
      camera.filmOffset=0;
      const chase=playerX*.23;
      const flying=state==='flight' || state==='paused' && pausedState==='flight';
      camera.position.set(chase,flying ? playerY+3.31 : 4.65,flying ? 9.3 : 9.75);
      if(capture) {
        const turn=T.MathUtils.smoothstep(capture.time,0,.88);
        const angle=turn*Math.PI*.995;
        const radius=T.MathUtils.lerp(9.30,6.55,turn);
        const side=capture.side;
        const targetX=playerX+side*.58;
        const targetZ=T.MathUtils.lerp(1.78,.23,turn);
        camera.position.set(targetX+side*Math.sin(angle)*radius,
          T.MathUtils.lerp(4.22,2.96,turn)+world.deckHeight(),targetZ+Math.cos(angle)*radius);
        camera.lookAt(targetX,1.41+world.deckHeight(),targetZ);
      } else camera.lookAt(chase*.65,flying ? playerY+.34 : 1.32,-13);
    }
    camera.updateProjectionMatrix();
  }

  function removeObstacle(index) {
    const [obstacle]=obstacles.splice(index,1);
    scene.remove(obstacle);
    Props.dispose(obstacle);
  }
  function clearObstacles() {
    while(obstacles.length) removeObstacle(obstacles.length-1);
  }
  function addObstacle(obstacle,x,z=-133) {
    Props.anchor(obstacle,x);
    obstacle.position.set(x,0,z);
    Props.setBoostCue(obstacle,shoes>0);
    scene.add(obstacle);
    obstacles.push(obstacle);
  }

  function removePickup(index) {
    const [object]=pickups.splice(index,1);
    scene.remove(object);
  }

  function clearPickups() {
    while(pickups.length) removePickup(pickups.length-1);
    supplyLabel.hidden=true;
  }

  function addPickup(kind,x,y,z) {
    const group=Gear.pickup(kind);
    group.position.set(x,y+world.deckHeight(),z);
    group.userData={baseY:y,kind};
    scene.add(group);
    pickups.push(group);
  }

  function covered(obstacle,x) {
    const shape=obstacle.userData;
    return Math.abs(x-obstacle.position.x)<shape.hw+(shape.kind==='gap' ? 0 : .42);
  }

  function baseManeuver(shape) {
    if(shape.kind==='gap') return 'jump';
    if(shape.move==='jump' && shape.yTop<=1.94 && !shape.boostClearable) return 'jump';
    if(shape.move==='duck' && shape.yBottom>=1.28) return 'duck';
    return null;
  }

  function rewardTrail(row,z) {
    const safe=LANES.filter(x=>row.every(obstacle=>!covered(obstacle,x)));
    const passable=row.find(obstacle=>baseManeuver(obstacle.userData));
    if(!safe.length && !passable) return;
    const x=safe.length ? safe[Math.floor(Math.random()*safe.length)] : passable.position.x;
    const shape=passable?.userData, move=safe.length ? null : baseManeuver(shape);
    for(let offset=12;offset>=-10;offset-=2) {
      const arc=move==='jump' ? (shape.kind==='gap' ? 1.1 : Math.max(.65,shape.yTop))*
        Math.max(0,1-(offset/(shape.hd+2.2))**2) : 0;
      const crouch=move==='duck' && Math.abs(offset)<shape.hd+1 ? .28 : 0;
      const point=z+offset;
      const blocked=obstacles.some(other=>!row.includes(other) &&
        Math.abs(point-other.position.z)<other.userData.hd+.8 && covered(other,x));
      const crowded=pickups.some(item=>item.position.x===x && Math.abs(point-item.position.z)<1.25);
      if(!blocked && !crowded) addPickup('coin',x,.81+arc-crouch,point);
    }
    if(!safe.length) return;
    const zone=ZONES[zoneIndex];
    if(zone.type==='cyber' && !supplies.rocket && distance-zoneStart>=zone.len*.44) {
      addPickup('rocket',x,.98,z-12.3);
      supplies.rocket=true;
      return;
    }
    const drop=Campaign.supplyDrop({guard,shoes,orbital:zone.type==='orbit',
      shieldPlaced:supplies.shield,shoesPlaced:supplies.shoes});
    if(drop) {
      addPickup(drop,x,.95,z-12.3);
      supplies[drop]=true;
    }
  }

  function grantShield(message) {
    guard=true;
    guardFlash=0;
    guardLabel.textContent=message;
    guardLabel.hidden=state!=='playing';
  }

  function applyPickup(kind) {
    if(kind==='coin') {
      coins++;
      collection=loadCollection(collection);
      collection.balance=Math.min(Number.MAX_SAFE_INTEGER,collection.balance+1);
      saveCollection();
      coinLabel.textContent=String(coins);
      playTone([760+(coins%5)*65]);
    } else if(kind==='shield') grantShield('护盾蜂蜜罐 · 抵挡一次碰撞');
    else if(kind==='shoes') {
      shoes=SHOE_SECONDS;
      refreshShoes();
    } else if(kind==='rocket' && zoneIndex!==Campaign.orbitIndex) launch();
  }

  function refreshShoes() {
    const seconds=Math.ceil(shoes);
    const text=seconds+' 秒';
    if(shoeTime.textContent!==text) shoeTime.textContent=text;
    shoeLabel.hidden=state!=='playing' || shoes<=0;
  }

  function indicateSupply() {
    if(!CFG.guides) { supplyLabel.hidden=true; return; }
    let closest=null;
    for(const item of pickups) {
      if(item.userData.kind==='coin' || item.position.z<-Math.max(39,speed*1.68) || item.position.z>1.3) continue;
      if(!closest || item.position.z>closest.position.z) closest=item;
    }
    supplyLabel.hidden=!closest;
    if(!closest) return;
    const name=Gear.captions[closest.userData.kind];
    const lane=closest.position.x<-1 ? '左道' : (closest.position.x>1 ? '右道' : '中道');
    if(supplyName.textContent!==name) supplyName.textContent=name;
    if(supplyLane.textContent!==lane) supplyLane.textContent=lane;
  }

  function stepPickups(shift) {
    const deck=world.deckHeight();
    for(let i=pickups.length-1;i>=0;i--) {
      const item=pickups[i];
      const previousZ=item.position.z;
      item.position.z+=shift;
      item.rotation.y=elapsed*3.1+i*.22;
      item.position.y=deck+item.userData.baseY+Math.sin(elapsed*4.6+i*.88)*.08;
      if(previousZ<=.70 && item.position.z>=-.70 && Math.abs(item.position.x-playerX)<.78 &&
        Math.abs(item.position.y-deck-(playerY+(duckAmount>.5 ? .48 : .80)))<.74) {
        removePickup(i);
        applyPickup(item.userData.kind);
        if(state==='flight') return;
      } else if(item.position.z>13) removePickup(i);
    }
    indicateSupply();
  }

  function absorbImpact(obstacle) {
    guard=false;
    guardBurst=.55;
    guardLabel.textContent='护盾抵挡了一次碰撞';
    guardFlash=1.3;
    obstacle.userData.passed=true;
    obstacle.userData.sign.visible=false;
    if(obstacle.userData.kind==='gap' && onGround) { vy=8.1; onGround=false; }
    if(motionAllowed()) stage.animate([{filter:'brightness(1.31)'},{filter:'brightness(1)'}],{duration:440});
  }

  function launch() {
    clearObstacles();
    clearPickups();
    flightTime=0;
    resetChase();
    playerY=1.15;
    onGround=false;
    vy=0;
    duckAmount=0;
    keyboardDuck.clear();
    world.activate('launch',true);
    body.dataset.zone='launch';
    byId('zone').textContent='高空航道';
    metrics.textContent='升空';
    progress.style.transform='scaleX(0)';
    showState('flight');
    if(motionAllowed()) stage.animate([{opacity:.48},{opacity:1}],{duration:610,easing:'ease-out'});
  }

  function refreshScore() {
    const nextScore=Math.floor(distance/8)+coins*2+comboScore;
    if(nextScore!==score) {
      score=nextScore;
      scoreLabel.textContent=String(score);
    }
    const pace=speed.toFixed(1);
    if(speedLabel.textContent!==pace) speedLabel.textContent=pace;
  }

  function stepFlight(dt) {
    flightTime=Math.min(FLIGHT_LENGTH,flightTime+dt);
    const p=flightTime/FLIGHT_LENGTH;
    speed=78+p*36;
    distance+=speed*dt;
    playerY=1.15+Math.sin(p*Math.PI*.50)*8.4;
    const dx=LANES[currentLane]-playerX;
    playerX+=dx*Math.min(1,dt*8);
    bank+=(-dx*.08-bank)*Math.min(1,dt*9);
    progress.style.transform='scaleX('+p.toFixed(4)+')';
    refreshScore();
    if(p<1) return;
    playerY=vy=0;
    onGround=true;
    lastJump=-9999;
    switchZone(Campaign.orbitIndex,false,distance);
    showState('playing');
    grantShield('太空护盾已就绪');
  }

  const makers={
    log:Props.low, low:Props.low, hive:()=>Props.low(1), treehole:Props.treehole,
    vine:()=>Props.high('forest'), high:kind=>Props.high(kind),
    elephant:Props.elephant, bees:Props.bees, apes:Props.apes, stump:Props.stump, tiger:Props.tiger, monkey:Props.monkey,
    gap:kind=>Props.gap([0,1,2],LANES,kind),
    halfgap:kind=>Props.gap(Math.random()>.5 ? [1,2] : [0,1],LANES,kind),
    plank:Props.raisedPlank, bridgeRope:Props.bridgeRope,
    drift:Props.driftwood, riverRock:Props.riverRock, whirl:Props.whirlpool,
    bambooBundle:Props.bambooBundle, bambooCanes:Props.bambooCanes,
    ruinStep:Props.ruinStep, ruinedGate:Props.ruinedGate, statue:Props.statue,
    snowbank:Props.snowbank, frozenLimb:Props.frozenLimb, rockslide:Props.rockslide,
    ...Props.newObstacles
  };
  function closingSpeed(shape) {
    return shape.advance ?? (shape.kind==='elephant' ? 2.2 : (shape.kind==='tiger' ? 4.1 : 0));
  }

  function formationMember(shape) {
    return shape.kind!=='gap' && shape.hw<=1.17 && !closingSpeed(shape);
  }

  function placeScheduledObstacle(pace) {
    const kind=ZONES[zoneIndex].type;
    const id=playlist.draw();
    if(!id) return;
    const target=mode.targetBias>0 && Math.random()<mode.targetBias ? currentLane : null;
    const targetedGap=id==='halfgap' && target!==null && target!==1;
    const primary=targetedGap ? Props.gap([Math.max(0,target-1),Math.min(2,target+1)],LANES,kind) : makers[id](kind);
    const shape=primary.userData;
    let last;
    for(const item of obstacles) {
      if(item.userData.passed) continue;
      const {hd,kind}=item.userData, z=item.position.z;
      if(!last || z-hd<last.z-last.hd) last={hd,kind,z};
    }
    const depth=Campaign.spawnDepth(mode,pace,{hd:Math.max(1.25,shape.hd),advance:closingSpeed(shape)},last);
    if(zoneEnd-distance<=depth+pace*1.17) {
      Props.dispose(primary);
      return;
    }
    const lane=target ?? Math.floor(Math.random()*LANES.length);
    const wide=id==='apes' || id==='solar';
    const x=shape.cx ?? (wide ? (lane===1 ? (Math.random()<.5 ? -1.3 : 1.3) : Math.sign(LANES[lane])*1.3) : LANES[lane]);
    const row=[primary];
    addObstacle(primary,x,-depth);

    if(formationMember(shape) && playlist.companion) {
      const limit=Campaign.formationSize(mode,route.section);
      const free=LANES.filter((_,index)=>index!==lane);
      if(Math.random()<.5) free.reverse();
      const used=new Set([id]);
      let passable=!!baseManeuver(shape);
      for(const slot of free.slice(0,limit-1)) {
        const requireAction=row.length===2 && !passable;
        const side=playlist.companion(used,key=>{
          const obstacle=makers[key](kind);
          const data=obstacle.userData, action=baseManeuver(data);
          if(!formationMember(data) || (requireAction && !action)) {
            Props.dispose(obstacle);
            return false;
          }
          passable ||= !!action;
          row.push(obstacle);
          addObstacle(obstacle,slot,-depth);
          return true;
        });
        if(side) used.add(side);
      }
    }
    const batch={remaining:row.length,action:null,hit:false,summary:null};
    if(row.length>1) {
      batch.summary=LANES.map((lane,index)=>{
        const hazard=row.find(item=>covered(item,lane));
        const action=hazard && baseManeuver(hazard.userData);
        const call=action==='jump' ? '跳' : action==='duck' ? '蹲' : hazard ? '绕' : '通';
        return ['左','中','右'][index]+call;
      }).join(' · ');
    }
    for(const obstacle of row) obstacle.userData.batch=batch;
    rewardTrail(row,-depth);
  }

  function switchZone(index,reset=false,entry=reset ? 0 : zoneEnd) {
    clearObstacles();
    clearPickups();
    const zone=ZONES[index];
    zoneIndex=index;
    zoneStart=entry;
    zoneEnd=zoneStart+zone.len;
    world.activate(zone.type,reset);
    body.dataset.zone=zone.type;
    supplies={shield:false,shoes:false,rocket:false};
    playlist=Campaign.playlist(zone,Math.random,mode);
    nextSpawn=zoneStart+speed*.28;
    byId('zone').textContent=zone.name;
    metrics.textContent=index===Campaign.orbitIndex ? '太空支线' : '第 '+(route.section+1)+' 段 · '+Campaign.tierLabels[zone.tier];
    progress.style.transform='scaleX(0)';
    if (!reset && motionAllowed()) stage.animate([{opacity:.64},{opacity:1}],{duration:720,easing:'ease-out'});
  }

  function placeDebugObstacle() {
    const kind=ZONES[zoneIndex].type;
    const name=QS.get('obstacle');
    if(!Object.hasOwn(makers,name)) return;
    const obstacle=name==='halfgap' ? Props.gap([0,1],LANES,kind) : makers[name](kind);
    addObstacle(obstacle,obstacle.userData.cx ?? LANES[1],-55);
    const follow=QS.get('follow');
    if(Object.hasOwn(makers,follow)){
      const second=makers[follow](kind);
      addObstacle(second,second.userData.cx ?? LANES[1],-106);
    }
  }

  function resetInput() {
    playerX=playerY=vy=bank=duckAmount=phase=0;
    currentLane=1; onGround=true; lastJump=lastLaneChange=-9999;
    poseDuck=touchDuck=false; swipe=null; duckSwipeUntil=0; laneChange=null; keyboardDuck.clear();
    tiltState.reset(); actionState.reset();
    elAction.textContent='键盘或姿态控制';
  }

  function startGame(skipTutorial=false) {
    if(!model || gallery.open || (state!=='ready' && state!=='over')) return;
    enableAudio();
    setSettings(false);
    resetInput();
    if (!skipTutorial && !QS.has('obstacle') && !QS.has('startzone') && preference.checked) {
      clearObstacles();
      clearPickups();
      world.activate('forest',true);
      lesson=0;
      presentLesson();
      showState('training');
      return;
    }
    beginRun();
  }

  function beginRun() {
    resetInput();
    poseDuck=QS.get('duck')==='1';
    distance=score=coins=guardFlash=bestCombo=comboScore=0;
    resetCombo();
    const normalStart=route.start(START_ZONE);
    const first=START_ZONE===Campaign.orbitIndex ? START_ZONE : normalStart;
    speed=Campaign.pace(mode,0,first===Campaign.orbitIndex);
    chooseChaser(true);
    resetChase(2.25);
    guard=false;
    guardBurst=shoes=flightTime=0;
    switchZone(first,true);
    placeDebugObstacle();
    const debugPickup=QS.get('pickup');
    if(Object.hasOwn(Gear.captions,debugPickup)) addPickup(debugPickup,0,.94,-12);
    scoreLabel.textContent='0';
    coinLabel.textContent='0';
    speedLabel.textContent=speed.toFixed(1);
    showState('playing');
    if(first===Campaign.orbitIndex) grantShield('太空护盾已就绪');
    updateHazard();
  }

  const TOUCH = typeof window.matchMedia==='function' && window.matchMedia('(pointer: coarse)').matches;
  const lessons=[
    {title:'左右变道',description:TOUCH?'在屏幕上左右滑动。':'用鼠标左右拖动，或按 A / D。',icon:'←　→',done:()=>Math.abs(playerX)>1.16},
    {title:'向上跳跃',description:TOUCH?'在屏幕上向上滑动。':'按住鼠标向上拖，或按空格。',icon:'↑',done:()=>playerY>.64},
    {title:'压低身体',description:TOUCH?'在屏幕上向下滑动并按住。':'按住鼠标向下拖，或按住 S。',icon:'↓',done:()=>duckAmount>.68}
  ];
  function setTutorial(enabled) {
    preference.checked=enabled;
    save('tutorial',enabled ? '1' : '0');
  }
  function presentLesson() {
    const stage=lessons[lesson];
    byId('lesson-step').textContent='练习 '+(lesson+1)+' / '+lessons.length;
    byId('lesson-title').textContent=stage.title;
    byId('lesson-input').textContent=stage.description;
    byId('lesson-visual').textContent=stage.icon;
  }
  function finishTutorial() {
    setTutorial(false);
    beginRun();
  }

  function finishGame() {
    showState('over');
    const bestKey=modeKey==='normal' ? 'best' : 'best-'+modeKey;
    const best=Math.max(Number(read(bestKey,'0')) || 0,score);
    save(bestKey,String(best));
    byId('big-score').textContent=String(score);
    byId('result-coins').textContent=String(coins);
    byId('result-balance').textContent=coinFormat.format(collection.balance);
    byId('result-combo').textContent=String(bestCombo);
    byId('finish-title').textContent='被'+pursuerName()+'抓住了';
    byId('result-best').textContent=String(best);
    byId('result-mode').textContent=mode.name+'模式';
    byId('finish-detail').textContent=capture.consecutive ?
      '连续两次绊脚 · '+capture.reason+'让'+pursuerName()+'追了上来' : capture.reason+'挡住了去路';
    if(!NO_DIALOG) byId('restart-btn').focus({preventScroll:true});
  }

  function home() {
    clearObstacles();
    clearPickups();
    world.activate('forest',true);
    body.dataset.zone='forest';
    shoes=guardBurst=0; guard=false;
    resetChase();
    resetInput();
    setSettings(false);
    chooseChaser(false);
    displayCharacter(selected);
    showState('ready');
    start.focus({preventScroll:true});
  }

  function choosePause(next,fromSettings=false) {
    if(next && activeInput()) {
      pausedState=state;
      pauseFromSettings=fromSettings;
      keyboardDuck.clear(); touchDuck=false;
      showState('paused');
      if(!fromSettings) byId('resume-btn').focus({preventScroll:true});
    } else if(!next && state==='paused') {
      pauseFromSettings=false;
      showState(pausedState);
      if(document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
  }

  function feedback(source,action) {
    elAction.textContent=source+' · '+actions[action];
  }
  function requestLane(dir,source,now) {
    if(!activeInput() || now-lastLaneChange<240*100/CFG.sensitivity) return;
    const target=currentLane+dir;
    if(target<0 || target>=LANES.length) return;
    laneChange={from:playerX,distance};
    currentLane=target; lastLaneChange=now;
    feedback(source,dir<0 ? 'left' : 'right');
  }
  function requestJump(source,now) {
    if(!activeInput() || state==='flight' || !onGround || now-lastJump<CFG.jumpCooldown) return;
    poseDuck=touchDuck=false; duckSwipeUntil=0;
    keyboardDuck.clear();
    vy=shoes>0 ? BOOST_VELOCITY : 10.8; onGround=false; lastJump=now;
    feedback(source,'jump');
  }

  const keyMoves = { KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right',
    Space:'jump', KeyW:'jump', ArrowUp:'jump', KeyS:'duck', ArrowDown:'duck' };
  function handleMove(move,source,now) {
    if(move==='left' || move==='right') requestLane(move==='left' ? -1 : 1,source,now);
    else if(move==='jump') requestJump(source,now);
    else feedback(source,'duck');
  }
  window.addEventListener('keydown',e=>{
    if(gallery.open) return;
    if(e.key==='Escape' && !settings.hidden) { setSettings(false); toggle.focus(); return; }
    if((e.code==='KeyP' || e.key==='Escape') && (activeInput() || state==='paused')){
      e.preventDefault();
      if(!e.repeat) choosePause(state!=='paused');
      return;
    }
    if(e.target instanceof Element && e.target.closest('input,button,a')) return;
    if(!activeInput()) {
      if (state!=='paused' && (e.code==='Space' || e.code==='Enter')) { e.preventDefault(); if(!e.repeat) startGame(); }
      return;
    }
    const move=keyMoves[e.code];
    if(!move) return;
    e.preventDefault();
    if(e.repeat) return;
    if(move==='duck') keyboardDuck.add(e.code);
    handleMove(move,'键盘',performance.now());
  });
  window.addEventListener('keyup',e=>keyboardDuck.delete(e.code));
  window.addEventListener('blur',()=>{ keyboardDuck.clear(); touchDuck=false; });
  start.addEventListener('click',()=>startGame());
  openGallery.addEventListener('click',()=>{
    if(state!=='ready') return;
    setSettings(false);
    collection=loadCollection(collection);
    previewKey=selected;
    displayCharacter(previewKey);
    renderGallery();
    gallery.showModal();
  });
  byId('cast-close').addEventListener('click',closeGallery);
  gallery.addEventListener('cancel',event=>{
    event.preventDefault();
    closeGallery();
  });
  castAction.addEventListener('click',usePreview);
  window.addEventListener('storage',event=>{
    if(event.key!=='pose-runner:collection') return;
    collection=loadCollection(collection);
    if(gallery.open) renderGallery();
  });
  for(const input of document.querySelectorAll('input[name="difficulty"]')) input.addEventListener('change',()=>changeMode(input.value));
  const requestedCharacter=QS.get('character');
  changeMode(QS.get('difficulty') || read('difficulty','normal'),false);
  preference.addEventListener('change',()=>setTutorial(preference.checked));
  byId('skip-tutorial').addEventListener('click',finishTutorial);
  pauseButton.addEventListener('click',()=>choosePause(true));
  byId('resume-btn').addEventListener('click',()=>choosePause(false));
  byId('pause-home-btn').addEventListener('click',home);
  byId('restart-btn').addEventListener('click',()=>startGame());
  byId('home-btn').addEventListener('click',home);
  for(const button of touch.querySelectorAll('button')) {
    const move=button.dataset.move;
    button.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(!activeInput()) return;
      if(move==='duck') {
        touchDuck=true;
        button.setPointerCapture(e.pointerId);
      }
      handleMove(move,'触屏',performance.now());
    });
    if(move==='duck') button.addEventListener('lostpointercapture',()=>{ touchDuck=false; });
  }

  stage.addEventListener('pointerdown',event=>{
    if(!activeInput() || !event.isPrimary) return;
    swipe={id:event.pointerId,x:event.clientX,y:event.clientY,handled:false};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if(!swipe || swipe.handled || swipe.id!==event.pointerId || !activeInput()) return;
    const x=event.clientX-swipe.x, y=event.clientY-swipe.y;
    if(Math.max(Math.abs(x),Math.abs(y))<35*100/CFG.swipeSensitivity) return;
    swipe.handled=true;
    const move=Math.abs(x)>Math.abs(y) ? (x<0 ? 'left' : 'right') : (y<0 ? 'jump' : 'duck');
    if(move==='duck') duckSwipeUntil=elapsed+.66;
    handleMove(move,'触屏',performance.now());
  });
  stage.addEventListener('lostpointercapture',()=>{swipe=null;});

  function enableAudio() {
    if(!window.AudioContext || !navigator.userActivation?.isActive) return;
    audio??=new AudioContext();
    if(audio.state==='suspended') audio.resume().catch(()=>{});
  }

  function playTone(notes) {
    if(!CFG.volume || audio?.state!=='running') return;
    const master=CFG.volume/100*.045, moment=audio.currentTime;
    for(const [i,frequency] of notes.entries()) {
      const at=moment+i*.069, voice=audio.createOscillator(), gain=audio.createGain();
      voice.type='sine';
      voice.frequency.value=frequency;
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(master,at+.016);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.14);
      voice.connect(gain).connect(audio.destination);
      voice.start(at);
      voice.stop(at+.145);
    }
  }

  function connectWS() {
    let socket;
    try { socket=new WebSocket(WS_URL); } catch (error) { setStatus(false,'姿态设备地址无效'); return; }
    socket.onopen=()=>setStatus(true,'姿态设备已连接');
    socket.onclose=()=>{
      poseDuck=false;
      setStatus(false,'键盘可用 · 姿态未连接');
      setTimeout(connectWS,2000);
    };
    socket.onerror=()=>setStatus(false,'键盘可用 · 姿态未连接');
    socket.onmessage=event=>onPoseMessage(event.data);
  }

  function setStatus(connected,text) {
    byId('dot').classList.toggle('on',connected);
    byId('ws-text').textContent=text;
  }

  var actionState = {
    last: 'idle', candidate: null, count: 0, latched: false,
    reset: function () { this.last = 'idle'; this.candidate = null; this.count = 0; this.latched = false; },
    feed: function (action, now) {
      if (action !== this.last) { this.last = action; this.candidate = null; this.count = 0; this.latched = false; }
      if (action === 'duck') { poseDuck = true; this.latched = true; return; }
      if (action === 'jump') {
        poseDuck = false;
        if (!this.latched) { requestJump('姿态', now); this.latched = true; }
        setTimeout(function () { actionState.latched = false; }, 120);
        return;
      }
      if (action === 'left' || action === 'right') {
        poseDuck = false;
        if (this.candidate !== action) { this.candidate = action; this.count = 1; }
        else this.count++;
        if (this.count >= CFG.holdFrames && !this.latched) {
          requestLane(action === 'left' ? -1 : 1, '姿态', now);
          this.latched = true;
        }
      } else { poseDuck = false; this.count = 0; this.latched = false; }
    }
  };

  // 方案 B：COCO-17，5/6 肩、11/12 髋
  // 左右 = 肩髋中点横向偏移；跳跃 = 双肩上升；蹲下 = 双肩下降
  var tiltState = {
    smooth: 0, candidate: 0, count: 0, latched: false,
    baseShoulderY: null, jumpArmed: true,
    reset: function () {
      this.smooth = 0; this.candidate = 0; this.count = 0; this.latched = false;
      this.baseShoulderY = null; this.jumpArmed = true;
    },
    feed: function (kps, w, h, now) {
      var p = function (i) {
        var a = kps[i] || [0, 0, 0];
        var x = a[0], y = a[1], c = a.length > 2 ? a[2] : 1;
        if (x > 1.5 || y > 1.5) { x = x / w; y = y / h; }
        return [x, y, c];
      };
      var ls = p(5), rs = p(6), lh = p(11), rh = p(12);
      if (Math.min(ls[2], rs[2], lh[2], rh[2]) < CFG.confidence) return;

      // 1) 左右：肩中点与髋中点的横向差 / 肩宽
      var shoulderW = Math.abs(rs[0] - ls[0]) || 0.2;
      var raw = ((lh[0] + rh[0]) / 2 - (ls[0] + rs[0]) / 2) / shoulderW;
      if (CFG.invertTilt) raw = -raw;
      this.smooth = this.smooth * 0.7 + raw * 0.3;
      var dir = Math.abs(this.smooth) >= CFG.tiltThreshold ? (this.smooth > 0 ? -1 : 1) : 0;
      if (dir !== this.candidate) { this.candidate = dir; this.count = 1; this.latched = false; }
      else this.count++;
      if (dir !== 0 && this.count >= CFG.holdFrames && !this.latched) {
        requestLane(dir, '姿态', now); this.latched = true;
      }
      if (dir === 0) this.latched = false;

      // 2) 双肩升降：上升=跳，下降=蹲（图像 y 向下，上升即 y 变小）
      var shoulderY = (ls[1] + rs[1]) / 2;
      if (this.baseShoulderY === null) this.baseShoulderY = shoulderY;
      var dy = shoulderY - this.baseShoulderY;
      if (dy < -0.045 && this.jumpArmed) {
        requestJump('姿态', now);
        this.jumpArmed = false;
      }
      if (Math.abs(dy) < 0.015) this.jumpArmed = true;
      var wasDucking = poseDuck;
      poseDuck = dy > 0.032;
      if (poseDuck && !wasDucking) feedback('姿态', 'duck');
      if (!poseDuck && Math.abs(dy) < 0.02) {
        this.baseShoulderY = this.baseShoulderY * 0.99 + shoulderY * 0.01;
      }
      drawPreview(kps, w, h);
    }
  };

  function drawPreview(kps, w, h) {
    if (!CFG.showPreview) return;
    var cw = preview.width, chh = preview.height;
    pctx.clearRect(0, 0, cw, chh);
    var edges = [[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];
    function xy(i) {
      var a = kps[i] || [0,0,0];
      var x = a[0], y = a[1];
      if (x > 1.5 || y > 1.5) { x = x / w; y = y / h; }
      return [x * cw, y * chh];
    }
    pctx.strokeStyle = '#8dff9f'; pctx.lineWidth = 2; pctx.beginPath();
    edges.forEach(function (e) { var a = xy(e[0]), b = xy(e[1]); pctx.moveTo(a[0], a[1]); pctx.lineTo(b[0], b[1]); });
    pctx.stroke();
    pctx.fillStyle = '#ffd166';
    for (var i = 0; i < 17; i++) { var q = xy(i); pctx.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
  }

  function onPoseMessage(raw) {
    var obj;
    try { obj = JSON.parse(raw); } catch (err) { return; }
    if (!obj || typeof obj !== 'object' || state==='paused') return;
    var now = performance.now();
    var conf = typeof obj.confidence === 'number' ? obj.confidence : 1;
    if (conf < CFG.confidence) return;
    if (obj.action) {
      var a = String(obj.action).toLowerCase();
      if (['left', 'right', 'jump', 'duck', 'idle'].indexOf(a) >= 0) {
        actionState.feed(a, now);
        feedback('姿态', a);
      }
    } else if (obj.keypoints && obj.keypoints.length >= 17) {
      tiltState.feed(obj.keypoints, obj.width || 1, obj.height || 1, now);
    }
  }



  function bindRange(id,key,digits,suffix='') {
    const input=byId('c-'+id), output=byId('o-'+id);
    const previous=Number(read('setting-'+key,CFG[key]));
    if(Number.isFinite(previous)) input.value=String(T.MathUtils.clamp(previous,Number(input.min),Number(input.max)));
    function sync() {
      CFG[key]=Number(input.value);
      output.textContent=CFG[key].toFixed(digits)+suffix;
    }
    sync();
    input.addEventListener('input',()=>{
      sync();
      save('setting-'+key,String(CFG[key]));
    });
  }

  function bindCheck(id,key,update=()=>{}) {
    const input=byId('c-'+id);
    input.checked=read('setting-'+key,CFG[key]?'1':'0')==='1';
    function sync() { CFG[key]=input.checked; update(input.checked); }
    sync();
    input.addEventListener('change',()=>{
      sync();
      save('setting-'+key,CFG[key]?'1':'0');
    });
  }

  bindRange('sense','sensitivity',0,'%');
  bindRange('swipe','swipeSensitivity',0,'%');
  bindRange('volume','volume',0,'%');
  bindRange('conf','confidence',2);
  bindRange('tilt','tiltThreshold',2);
  bindRange('cool','jumpCooldown',0);
  bindRange('hold','holdFrames',0);
  bindCheck('guides','guides',on=>{if(!on) hint.hidden=hazard.hidden=supplyLabel.hidden=true;});
  bindCheck('effects','effects');
  bindCheck('inv','invertTilt');
  bindCheck('prev','showPreview',on=>{preview.hidden=!on;});
  function setSettings(open) {
    settings.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
    if(open && activeInput()) choosePause(true,true);
    else if(!open && state==='paused' && pauseFromSettings) {
      if(pausedState==='training' && !preference.checked) beginRun();
      else choosePause(false);
    }
  }
  toggle.addEventListener('click',event=>{
    setSettings(settings.hidden);
    if (settings.hidden && event.detail > 0) toggle.blur();
  });

  function updateHazard() {
    if(!CFG.guides) { hazard.hidden=true; return; }
    let nearest=null;
    const target=LANES[currentLane];
    for(const obstacle of obstacles) {
      const x=obstacle.position.x,z=obstacle.position.z;
      if (obstacle.userData.passed || z>3 || z<-Math.max(36,speed*1.65) || Math.abs(x-target)>=obstacle.userData.hw+.42) continue;
      if(!nearest || z>nearest.position.z) nearest=obstacle;
    }
    hazard.hidden=!nearest;
    if(!nearest) return;
    const data=nearest.userData;
    const gap=data.kind==='gap';
    const boosted=(data.boostClearable || gap) && shoes>0;
    const move=boosted ? 'jump' : data.move;
    const closing=speed+closingSpeed(data);
    const highLeap=data.yTop>4 ? .43 : .32;
    const edge=gap ? data.hd : data.hd+.4;
    const timing=(move==='jump' || gap) &&
      nearest.position.z>=-(closing*(boosted ? highLeap : .23)+edge) &&
      nearest.position.z<(gap ? -edge : 0) && (!gap || onGround);
    const cue=timing ? 'jump' : move;
    if(hazard.dataset.move!==cue) hazard.dataset.move=cue;
    const icon=Props.moves[cue].icon;
    if(hazardIcon.textContent!==icon) hazardIcon.textContent=icon;
    const description=data.batch?.summary ?? data.name;
    if(hazardName.textContent!==description) hazardName.textContent=description;
    hazard.classList.toggle('takeoff',timing);
    const prompt=gap && data.move==='lane' ? '跳跃或变道' :
      (boosted ? '弹跳鞋高跳' : (data.trip ? '抬脚跨过' : Props.moves[move].label));
    const call=timing ? (boosted ? '现在高跳' : '现在跳') : prompt;
    if(hazardAction.textContent!==call) hazardAction.textContent=call;
  }

  function stepPlayer(dt,travelSpeed) {
    if(!onGround) {
      vy-=24*dt;
      playerY+=vy*dt;
      if(playerY<=0) { playerY=vy=0; onGround=true; }
    }
    const dx=LANES[currentLane]-playerX;
    playerX+=dx*Math.min(1,dt*13*CFG.sensitivity/100);
    bank+=(-dx*.086-bank)*Math.min(1,dt*10);
    const crouching=poseDuck || touchDuck || duckSwipeUntil>elapsed || keyboardDuck.size>0;
    duckAmount+=((crouching ? 1 : 0)-duckAmount)*Math.min(1,dt*14);
    phase+=dt*(11.2+travelSpeed*.15);
  }

  const comboNames={jump:'跳跃',duck:'下蹲',lane:'变道'};
  function resetCombo() {
    combo=0;
    comboUntil=0;
    comboSequence=[];
    comboLabel.hidden=true;
  }

  function addCombo(action) {
    combo++;
    bestCombo=Math.max(bestCombo,combo);
    comboUntil=elapsed+5.4;
    comboSequence.push(comboNames[action]);
    if(comboSequence.length>3) comboSequence.shift();
    if(combo<2) return;
    const bonus=Math.min(6,combo)*8;
    comboScore+=bonus;
    comboCount.textContent='连招 ×'+combo+' · +'+bonus;
    comboMoves.textContent=comboSequence.join(' → ');
    comboLabel.hidden=false;
    playTone([523,659,880]);
    refreshScore();
  }

  function checkClearance(obstacle,hit,top) {
    const shape=obstacle.userData, z=obstacle.position.z;
    const edge=shape.kind==='gap' ? shape.hd : shape.hd+.4;
    const batch=shape.batch ??= {remaining:1,action:null,hit:false};
    if(hit) {
      batch.hit=true;
      resetCombo();
      return;
    }
    if(Math.abs(z)<edge && !shape.passed) {
      if(covered(obstacle,playerX)) {
        if(!onGround && (shape.kind==='gap' || (shape.yBottom<1.28 && playerY>=shape.yTop))) batch.action='jump';
        else if(duckAmount>.5 && top<=shape.yBottom && batch.action!=='jump') batch.action='duck';
      } else if(!batch.action && laneChange && distance-laneChange.distance<speed*1.32 && covered(obstacle,laneChange.from)) {
        batch.action='lane';
      }
    }
    if(z>=edge && !shape.comboChecked) {
      shape.comboChecked=true;
      if(--batch.remaining===0 && !batch.hit && batch.action) addCombo(batch.action);
    }
  }

  function runFrame(dt) {
    if(combo && elapsed>=comboUntil) resetCombo();
    updatePursuit(dt);
    const pace=Campaign.pace(mode,distance,zoneIndex===Campaign.orbitIndex);
    speed=pace*(1-.38*(stumbleTime/.76));
    const travel=speed*dt;
    distance+=travel;
    shoes=Math.max(0,shoes-dt);
    guardBurst=Math.max(0,guardBurst-dt);
    refreshShoes();
    if(distance>=zoneEnd) switchZone(route.advance());
    progress.style.transform='scaleX('+((distance-zoneStart)/ZONES[zoneIndex].len).toFixed(4)+')';
    stepPlayer(dt,speed);
    if(distance>=nextSpawn && zoneEnd-distance>72+speed*1.17) {
      placeScheduledObstacle(pace);
      nextSpawn=distance+playlist.interval(pace,route.section);
    }
    if(guardFlash>0) {
      guardFlash-=dt;
      if(guardFlash<=0 && !guard) guardLabel.hidden=true;
    }

    stepPickups(travel);
    refreshScore();
    if(state==='flight') return;
    const top=playerY+(duckAmount>.5 ? 1.15 : 2.7);
    for(let i=obstacles.length-1;i>=0;i--) {
      const obstacle=obstacles[i], shape=obstacle.userData;
      const advance=shape.advance ?? (shape.kind==='elephant' ? 2.2 : (shape.kind==='tiger' && shape.charging ? 4.1 : 0));
      Props.setBoostCue(obstacle,shoes>0);
      obstacle.position.z+=travel+advance*dt;
      Props.animate(obstacle,elapsed,dt);
      const dx=Math.abs(obstacle.position.x-playerX);
      const dz=Math.abs(obstacle.position.z);
      // A bridge opening has no vertical hitbox. Only a landing inside it is a fall.
      const hit=shape.kind==='gap' ? onGround && dx<shape.hw && dz<shape.hd :
        dx<shape.hw+.42 && dz<shape.hd+.4 && top>shape.yBottom &&
        playerY<(shape.move==='lane' && !shape.boostClearable ? Math.max(7,shape.yTop) : shape.yTop);
      checkClearance(obstacle,!shape.passed && hit,top);
      if(!shape.passed && hit) {
        if(guard) absorbImpact(obstacle);
        else if(shape.trip) tripOver(obstacle);
        else beginCapture(obstacle);
        if(state==='capturing') break;
      }
      if(obstacle.position.z>16) removeObstacle(i);
    }
    if(state==='playing') updateHazard();
  }

  function practiceFrame(dt) {
    stepPlayer(dt,15);
    if(!lessons[lesson].done()) return;
    lesson++;
    if(lesson===lessons.length) finishTutorial();
    else presentLesson();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt=T.MathUtils.clamp((now-previousFrame)/1000,0,.05);
    previousFrame=now;
    const running=state==='playing', practicing=state==='training', launched=state==='flight';
    const menu=state==='ready', catching=state==='capturing';
    if(state!=='paused' && state!=='over') elapsed+=dt;
    const previousDistance=distance;
    if(running) {
      // Short physics steps keep thin obstacles solid even at high speed or low frame rate.
      const slices=Math.max(1,Math.ceil(dt*60-1e-6));
      for(let n=0;n<slices && state==='playing';n++) runFrame(dt/slices);
    } else if(launched) stepFlight(dt);
    else if(practicing) practiceFrame(dt);
    else if(catching) runCapture(dt);
    if(menu || running || practicing || launched || catching) {
      const inFlight=state==='flight';
      const moving=(running || launched) ? Math.max(0,distance-previousDistance) : 0;
      world.step({distance:moving,elapsed,playerX,bank,obstacles});
      const base=world.deckHeight();
      player.position.set(playerX,base+playerY,0);
      player.rotation.z=capture ? 0 : bank;
      shadow.position.set(playerX,base+.016,0);
      shadow.scale.setScalar(1-Math.min(.44,playerY*.16));
      shadow.material.opacity=.45*(1-Math.min(.73,playerY*.26));
      const caught=capture ? T.MathUtils.smoothstep(capture.time,.28,1.03) : 0;
      const facing=capture ? Math.PI-capture.side*1.20*caught : undefined;
      model?.pose({phase,elapsed,airborne:!onGround,crouch:duckAmount,menu,
        playing:(running && !capture) || practicing,floating:base>0,flight:inFlight,
        stumble:stumbleTime/.76,caught,facing,bank,dt});
      equipment?.update({guard,burst:guardBurst/.55,shoes,flight:inFlight,elapsed});
      showChaser(running || state==='playing',inFlight);
    }
    positionCamera();
    renderer.render(scene,camera);
  }

  window.addEventListener('resize',resize);
  resize();
  showState('ready');
  connectWS();
  requestAnimationFrame(frame);
  Promise.all([RunnerModel.load('er'),RunnerModel.load('da'),RunnerSeriesModel.load(),Props.prepare()]).then(([er,da,series])=>{
    const chaseGroup=new T.Group();
    chaseGroup.name='pursuit-actor';
    chaseGroup.visible=false;
    chaser={
      group:chaseGroup,
      pose({phase,pressure,catching=0}) {
        cast[pursuerKey()].model.pose({phase,elapsed,airborne:false,crouch:0,menu:false,playing:true,bank:0,
          facing:0,pursuing:pressure,grabbing:catching});
      }
    };
    scene.add(chaseGroup);
    const models={er,da};
    for(const [key,{name,price,actor}] of Object.entries(series)) {
      characters[key]={name,price:key==='vick' ? 60 : price};
      models[key]=actor;
    }
    collection=loadCollection(collection);
    cast=Object.fromEntries(Object.entries(models).map(([key,actor])=>{
      player.add(actor.group);
      return [key,{model:actor,equipment:Gear.equip(actor)}];
    }));
    createGallery();
    changeCharacter(owns(requestedCharacter,collection) ? requestedCharacter : read('character','er'),false);
    if(!model) changeCharacter('er',false);
    openGallery.disabled=false;
    body.dataset.model='ready';
    byId('runner-model-status').textContent=TOUCH?'左右滑动变道 · 上滑跳跃 · 下滑下蹲':'A / D 或拖动变道 · 空格跳跃 · S 下蹲';
    start.disabled=false;
    if(QS.get('autostart')==='1') startGame(true);
  }).catch(err=>{
    console.error(err);
    failure('角色或动物资源加载失败，请检查项目中的 assets 目录。');
  });
})();
