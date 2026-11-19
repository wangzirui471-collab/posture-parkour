'use strict';

window.RunnerObstacles = (() => {
  const T = window.THREE;
  const { box, ball, pebble, roughRock, cone, trunk, cylinder, ring, matte, unlit, surface, put, branch, tube, seeded } = RunnerArt;
  const TAU = Math.PI*2;
  const timber = surface('bark',0xb29d86,.9,1.9), bark = surface('bark',0x9e8a76,.9,1.6), band = matte(0xa77854);
  const end = matte(0xedb97b), grain = matte(0xb4804f), dark = matte(0x392c28);
  const leaf = matte(0x86a54e), green = matte(0x436b48), fern = matte(0xadc065);
  const ochre = matte(0xdf9635), amber = matte(0xffc457), cream = matte(0xffe2a2);
  const rope = matte(0xd4ad78), graphite = matte(0x383745), stoneBed=matte(0x9b9e87), warning=matte(0xffaa61);
  const squash = matte(0xf0a26b);
  const sharedGeometry = new Set([box,ball,pebble,roughRock,cone,trunk,cylinder,ring]);
  const plane = new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  sharedGeometry.add(plane);
  const moves = { jump: { icon:'↑', label:'跳跃', color:0xffd276 }, duck:{ icon:'↓',label:'下蹲',color:0xa0e6e4 }, lane:{icon:'↔',label:'变道',color:0xff957d} };
  const marks = {};

  function mark(move) {
    if (marks[move]) return marks[move];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + moves[move].color.toString(16);
    ctx.strokeStyle = '#25332a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(11,11,106,106,26);
    ctx.fill();
    ctx.stroke();
    const arrow = (x,y,angle) => {
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0,22); ctx.lineTo(0,-22); ctx.lineTo(-15,-5);
      ctx.moveTo(0,-22); ctx.lineTo(15,-5);
      ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
      ctx.restore();
    };
    if (move==='lane') { arrow(53,64,-Math.PI/2); arrow(75,64,Math.PI/2); }
    else arrow(64,64,move==='jump' ? 0 : Math.PI);
    const texture = new T.CanvasTexture(canvas);
    texture.encoding = T.sRGBEncoding;
    marks[move] = new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false});
    return marks[move];
  }

  const highJumpObstacles=new Set([
    'bees','tiger','bambooWheel','riverRock','statue','rockslide','maglev','meteor','solar'
  ]);

  function finish(group, shape, signY) {
    if(highJumpObstacles.has(shape.kind)) shape.boostClearable=true;
    group.userData = shape;
    group.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = !object.material.transparent && !object.material.isMeshBasicMaterial;
      object.receiveShadow = true;
    });
    const sign = new T.Sprite(mark(shape.move));
    sign.position.set(0,signY, .15);
    sign.scale.set(.78,.78,1);
    group.add(sign);
    shape.sign=sign;
    return group;
  }

  function fronds(group,x,y,z,size,tilt=0) {
    for (let i=0;i<5;i++) {
      const a = tilt + i * 1.7;
      put(group,ball,i%2 ? leaf : fern,x+Math.cos(a)*size*.42,y+size*.13,z+Math.sin(a)*size*.42,size*.73,size*.10,size*.24,0,-a,.17);
    }
  }

  function log(group, length, radius, y, z, hollow=false) {
    put(group,cylinder,timber,0,y,z,radius,length,radius,0,0,Math.PI/2);
    for (const side of [-1,1]) {
      const x = side*(length/2+.018);
      put(group,cylinder,end,x,y,z,radius*.90,.035,radius*.90,0,0,Math.PI/2);
      for (const s of [.43,.64,.83]) put(group,ring,grain,x+side*.022,y+.015,z,radius*s,radius*s,.62,0,Math.PI/2);
      if (hollow) {
        put(group,cylinder,dark,x+side*.052,y-.026,z,radius*.52,.025,radius*.48,0,0,Math.PI/2);
        put(group,ring,bark,x+side*.068,y-.025,z,radius*.55,radius*.51,.62,0,Math.PI/2);
      }
    }
    for (let i=0;i<9;i++) {
      const a=i/9*TAU;
      put(group,box,i%2 ? bark : band,Math.sin(i*11)*.17,y+Math.cos(a)*(radius*.978),z+Math.sin(a)*(radius*.978),length*(.64 + .12*Math.cos(i)),.036,.073,-a,0,Math.sin(i)*.018);
    }
  }

  function low(kind=0) {
    const group = new T.Group();
    if (kind===1) {
      for (let i=0;i<7;i++) {
        const radius=.30 + Math.sin((i+.45)/7.4*Math.PI)*.37;
        put(group,ball,i%2 ? ochre : amber,0,.15+i*.205,0,radius,.199,radius);
      }
      put(group,ball,dark,0,.47,.545,.147,.121,.065);
      put(group,ring,ochre,0,.47,.596,.165,.136,.48);
      put(group,ball,cream,-.18,1.31,.16,.14,.044,.14,0,0,-.18);
      return finish(group,{hw:.64,hd:.64,yBottom:0,yTop:1.55,kind:'low',name:'蜂巢',move:'jump'},2.1);
    }
    log(group,1.69,.52,.56,0);
    branch(group,[-.36,.76,.11],[-.48,1.09,.21],.19,.08,bark);
    fronds(group,.48,.98,.07,.24);
    return finish(group,{hw:.8,hd:.58,yBottom:0,yTop:1.12,kind:'low',name:'滚落圆木',move:'jump'},1.72);
  }

  function treehole() {
    const group=new T.Group();
    log(group,2.05,.51,.67,0,true);
    branch(group,[-.53,.89,-.1],[-.68,1.27,-.21],.17,.066,bark);
    branch(group,[.47,.79,.1],[.83,1.03,.41],.13,.057,timber);
    fronds(group,.38,1.09,.08,.37,1.6);
    return finish(group,{hw:1,hd:.56,yBottom:0,yTop:1.3,kind:'treehole',name:'空心倒木',move:'jump'},1.88);
  }

  function stump() {
    const group=new T.Group();
    put(group,trunk,bark,0,.57,0,.65,1.15,.66);
    put(group,cylinder,end,0,1.16,0,.49,.11,.49);
    for (const sz of [.21,.34,.43]) put(group,ring,grain,-.038,1.219,.031,sz,sz,.47,Math.PI/2);
    for(let i=0;i<8;i++) {
      const a=i/8*TAU;
      const dx=Math.cos(a), dz=Math.sin(a);
      branch(group,[dx*.41,.38,dz*.41],[dx*.74,.014,dz*.69],.145,.029,timber);
      put(group,box,i%2 ? band : timber,dx*.55,.53,dz*.55,.068,.86,.060,0,-a,Math.sin(a)*.15);
    }
    for (const z of [-.32,.16]) {
      put(group,cylinder,cream,.48,.32,z,.043,.28,.042);
      put(group,ball,squash,.48,.48,z,.135,.065,.14);
    }
    fronds(group,-.42,.11,.39,.29);
    return finish(group,{hw:.7,hd:.66,yBottom:0,yTop:1.22,kind:'stump',name:'老树桩',move:'jump'},1.8);
  }

  function high(zone) {
    const group=new T.Group();
    const drift=zone==='river';
    for (const x of [-1.06,1.06]) {
      put(group,trunk,timber,x,1.06,0,.092,2.18,.092,0,0,x*.085);
      if (drift) put(group,pebble,stoneBed,x,.11,0,.15,.18,.32);
      else fronds(group,x,.13,.06,.23);
    }
    const curve=[[-1.14,2.13,0],[-.71,1.96,.12],[0,1.80,.14],[.56,1.93,.09],[1.16,2.19,0]];
    tube(group,curve,.13,drift ? rope : green);
    tube(group,curve.map(([x,y,z])=>[x,y+.12,z-.12]),.062,drift ? bark : leaf);
    for(let i=0;i<7;i++) {
      const x=.29*(i-3), y=1.55+Math.abs(x)*.22;
      if (drift) {
        put(group,box,i%2 ? cream : ochre,x,y+.20,.2,.19,.38,.046,0,0,.25*Math.sin(i));
      } else {
        put(group,ball,i%2 ? leaf : fern,x,y+.16,.18,.103,.235,.07,.17,0,.46*Math.sin(i));
      }
    }
    return finish(group,{hw:1,hd:.44,yBottom:1.4,yTop:2.5,kind:'high',name:drift?'低悬浮标绳':'低悬藤蔓',move:'duck'},2.83);
  }

  const elephantSkin=matte(0x8198af), elephantShade=matte(0x637d94), elephantEar=matte(0xdd9e9f);
  const tusk=matte(0xffe7b5), white=matte(0xf7f0d7);
  function elephant() {
    const group=new T.Group();
    put(group,ball,elephantSkin,0,2.58,-.35,1.11,1.15,1.55);
    put(group,ball,elephantSkin,0,2.64,1.04,.84,.90,.85);
    const legs=[];
    for (const x of [-.83,.83]) {
      for (const z of [-1.04,.55]) {
        const leg=new T.Group(); leg.position.set(x,1.73,z);
        group.add(leg); legs.push(leg);
        put(leg,trunk,elephantShade,0,-.79,0,.25,1.48,.27);
        put(leg,ball,elephantSkin,0,-1.55,.04,.31,.16,.36);
        for(const n of [-1,0,1]) put(leg,ball,elephantEar,.11*n,-1.59,.34,.06,.064,.04);
      }
      const s=Math.sign(x);
      put(group,ball,elephantShade,s*.81,2.68,1.05,.51,.73,.19,.12,s*-.35,s*.31);
      put(group,ball,elephantEar,s*.85,2.68,1.22,.32,.48,.091,.12,s*-.35,s*.31);
      put(group,ball,white,s*.33,2.82,1.73,.122,.14,.060);
      put(group,ball,graphite,s*.335,2.80,1.78,.063,.088,.04);
      put(group,ball,white,s*.35,2.84,1.814,.028,.031,.019);
      tube(group,[[s*.36,2.28,1.50],[s*.40,2.11,1.85],[s*.45,2.21,2.17]],.078,tusk);
    }
    const sniff = new T.Group();
    sniff.position.set(0,2.47,1.73);
    group.add(sniff);
    tube(sniff,[[0,0,0],[0,-.27,.20],[.06,-.37,.49],[.18,-.20,.72],[.20,.06,.79]],.167,elephantSkin);
    put(sniff,ball,elephantShade,.20,.055,.80,.145,.115,.126,-.4);
    tube(group,[[0,2.27,-1.69],[.12,1.98,-1.94],[.22,1.75,-1.97]],.055,elephantShade);
    put(group,ball,elephantShade,.23,1.71,-1.95,.077,.14,.071);
    return finish(group,{hw:1.1,hd:1.55,yBottom:1.35,yTop:3.75,kind:'elephant',name:'大象',move:'duck',legs,sniff},4.12);
  }

  const wing=matte(0xc8eee8,{transparent:true,opacity:.78,depthWrite:false});
  function bees() {
    const group=new T.Group(), swarm=[];
    const rand=seeded(2831);
    for(let i=0;i<19;i++) {
      const insect=new T.Group();
      const angle=i*2.4, r=.36+rand()*.34;
      insect.position.set(Math.cos(angle)*r,.31+(i%7)*.4,Math.sin(angle)*r);
      insect.rotation.y=angle;
      group.add(insect);
      const size=.75+rand()*.58;
      insect.scale.setScalar(size);
      put(insect,ball,amber,0,0,0,.135,.126,.213);
      for(const z of [.026,-.075]) put(insect,ring,dark,0,0,z,.126,.120,.25);
      put(insect,ball,dark,0,0,.18,.108,.102,.096);
      put(insect,ball,cream,.04,.028,.253,.024,.031,.016);
      const wings=[-1,1].map(s=>put(insect,ball,wing,s*.133,.117,-.07,.155,.034,.111,0,0,s*.27));
      swarm.push({insect,wings,baseY:insect.position.y,angle,r});
    }
    return finish(group,{hw:1,hd:.55,yBottom:0,yTop:3.2,kind:'bees',name:'蜂群',move:'lane',swarm},3.56);
  }

  const ember=unlit(0xffaf4f), flame=unlit(0xff7845), hot=unlit(0xffdb71);
  const apeFur=matte(0x735449), apeFace=matte(0xe8ad80), apeChest=matte(0xb88065);
  function ape(group,x,z,rot) {
    const a=new T.Group();
    a.position.set(x,0,z);
    a.rotation.y=rot;
    group.add(a);
    put(a,ball,apeFur,0,.71,0,.39,.57,.36);
    put(a,ball,apeChest,0,.72,.23,.28,.37,.16);
    put(a,ball,apeFur,0,1.24,.035,.31,.29,.31);
    put(a,ball,apeFace,0,1.19,.25,.243,.168,.13);
    put(a,ball,apeChest,0,1.105,.35,.13,.059,.060);
    for(const s of [-1,1]) {
      put(a,ball,apeFace,s*.286,1.25,.02,.12,.12,.086);
      put(a,ball,graphite,s*.095,1.27,.359,.033,.037,.024);
      put(a,ball,apeFur,s*.23,.28,.21,.23,.208,.32,.35,0,0);
      put(a,ball,apeFace,s*.28,.177,.42,.14,.095,.153);
      tube(a,[[s*.29,.92,.06],[s*.42,.66,.25],[s*.29,.53,.47]],.103,apeFur);
      put(a,ball,apeFace,s*.25,.54,.49,.126,.095,.082);
    }
    return a;
  }
  function apes() {
    const group=new T.Group(), flames=[];
    for(let i=0;i<10;i++) {
      const a=i/10*TAU;
      put(group,pebble,bark,Math.cos(a)*.65,.14,Math.sin(a)*.59,.19,.16,.18,.26,a,0);
    }
    for(let i=0;i<4;i++) put(group,cylinder,timber,0,.19,0,.11,1.08,.11,Math.PI/2,i*Math.PI/4,0);
    for(let i=0;i<5;i++) {
      const g=new T.Group();
      const h=2.35 - i*.29, r=.48-i*.05;
      g.position.set(Math.sin(i*5.6)*.22,.29,Math.cos(i*5.6)*.15);
      put(g,cone,i%2 ? hot : flame,0,h*.47,0,r,h,r,0,i*.71,Math.sin(i)*.19);
      group.add(g); flames.push(g);
    }
    ape(group,-1.11,.34,.75);
    ape(group,1.08,.23,-.75);
    ape(group,.35,-.89,2.7);
    const sparks=[];
    for(let i=0;i<12;i++) {
      const spark=put(group,pebble,ember,0,0,0,.042,.068,.042);
      sparks.push(spark);
    }
    return finish(group,{hw:1.6,hd:1.15,yBottom:0,yTop:3,kind:'apes',name:'猿人火堆',move:'lane',boostClearable:true,flames,sparks},3.24);
  }

  function gap(cover, lanes, zone) {
    const group=new T.Group();
    const first=lanes[cover[0]], last=lanes[cover[cover.length-1]];
    const width=last-first+2.60;
    if (zone !== 'bridge') {
      put(group,plane,unlit(0x27372e,{side:T.DoubleSide}),0,.013,0,width,1,4.8);
    }
    for(const edge of [-1,1]) {
      const z=edge*2.41;
      for(let i=0;i<cover.length;i++) {
        const x=(i-(cover.length-1)*.5)*2.6;
        put(group,box,bark,x,-.06,z,2.51,.17,.37,edge*-.13);
        for(let j=0;j<6;j++) {
          const len=.20 + (i+j*7)%4*.14;
          put(group,box,j%2 ? timber : band,x+(j-2.5)*.42,-.105,z-edge*len*.6,.31,.12,len,edge*(.2+j%3*.17),0,.045*j);
          if (j%2===0) put(group,box,warning,x+(j-2.5)*.42,.032,z,.25,.048,.14);
        }
      }
    }
    const partial=cover.length<3;
    return finish(group,{hw:width/2,hd:2.4,yBottom:-9,yTop:.42,kind:'gap',cx:(first+last)/2,name:partial?'半断桥':'全断桥',move:partial?'lane':'jump'},1.2);
  }

  const timberLive=surface('deck',0xc1a181,1.1,1.5);
  const weatheredBark=surface('bark',0xaba18c,1.25,1.19);
  const greyRock=surface('cliff',0xa6a599,.77,.72);
  const oldStone=surface('ruin',0xb5a289,.75,.76);
  const packedSnow=surface('snow',0xbecdd4);
  const bambooSkin=matte(0x748049);
  const shallowWater=unlit(0x99dad4,{transparent:true,opacity:.60,depthWrite:false,side:T.DoubleSide});
  const safetyCloth=matte(0xce9352,{side:T.DoubleSide});
  const wildlife = {};

  function posedBounds(scene) {
    const bounds=new T.Box3(), vertex=new T.Vector3();
    scene.updateMatrixWorld(true);
    scene.traverse(mesh=>{
      if(!mesh.isMesh) return;
      const positions=mesh.geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++) {
        vertex.fromBufferAttribute(positions,i);
        if(mesh.isSkinnedMesh) mesh.boneTransform(i,vertex);
        bounds.expandByPoint(vertex.applyMatrix4(mesh.matrixWorld));
      }
    });
    return bounds;
  }

  async function prepare() {
    const assets=window.RUNNER_ANIMALS || {};
    await Promise.all(Object.entries(assets).map(async ([name,bytes])=>{
      const bytesArray=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));
      const gltf=await new Promise((ok,fail)=>new T.GLTFLoader().parse(bytesArray.buffer,'',ok,fail));
      const bounds=posedBounds(gltf.scene);
      wildlife[name]={scene:gltf.scene,bounds,clips:gltf.animations};
    }));
    delete window.RUNNER_ANIMALS;
  }

  function animal(name,height,rotation,baseY=0) {
    const data=wildlife[name];
    if(!data) return null;
    const model=T.SkeletonUtils.clone(data.scene);
    const center=data.bounds.getCenter(new T.Vector3());
    const factor=height/Math.max(.01,data.bounds.max.y-data.bounds.min.y);
    model.position.set(-center.x*factor,baseY-data.bounds.min.y*factor,-center.z*factor);
    model.scale.setScalar(factor);
    model.traverse(part=>{
      if(part.isMesh) {
        part.userData.sharedModelGeometry=true;
        if(part.isSkinnedMesh) part.frustumCulled=false;
      }
    });
    const orient=new T.Group();
    orient.rotation.y=rotation;
    orient.add(model);
    return {orient,model,clips:data.clips};
  }

  function tiger() {
    const g=new T.Group();
    const rig=animal('tiger',1.80,0);
    const fallback = !rig && put(g,ball,amber,0,1.06,0,.63,.70,1.53);
    let mixer, pace, rush;
    if(rig) {
      g.add(rig.orient);
      mixer=new T.AnimationMixer(rig.model);
      const walk=rig.clips.find(clip=>clip.name.includes('Walking'));
      const strike=rig.clips.find(clip=>clip.name.includes('Attack'));
      if(walk) { pace=mixer.clipAction(walk).play(); pace.setEffectiveTimeScale(.77); }
      if(strike) {
        rush=mixer.clipAction(strike);
        rush.setLoop(T.LoopOnce,1); rush.clampWhenFinished=true;
      }
    }
    return finish(g,{ hw:.94,hd:1.75,yBottom:0,yTop:3.1,kind:'tiger',
      name:'冲锋老虎',move:'lane',mixer,pace,rush,fallback,charging:false },2.94);
  }

  function aimedJoint(bone,child,direction) {
    const desired=direction.clone().normalize().applyQuaternion(bone.parent.getWorldQuaternion(new T.Quaternion()).invert());
    const original=child.position.clone().normalize().applyQuaternion(bone.quaternion);
    bone.quaternion.premultiply(new T.Quaternion().setFromUnitVectors(original,desired));
    bone.updateWorldMatrix(false,true);
  }

  function poseMonkey(rig) {
    const map = names=>names.map(name=>rig.model.getObjectByName(name));
    const arms=[
      map(['Hand_001_L_35','Hand_002_L_34','Hand_003_L_33']),
      map(['Hand_001_R_53','Hand_002_R_52','Hand_003_R_51'])
    ];
    rig.orient.updateMatrixWorld(true);
    for(let i=0;i<arms.length;i++) {
      const [upper,elbow,wrist]=arms[i];
      const side=i ? -1 : 1;
      aimedJoint(upper,elbow,new T.Vector3(.18*side,.94,.28));
      aimedJoint(elbow,wrist,new T.Vector3(-.26*side,.83,.37+i*.14));
    }
    const legs=[
      map(['Leg_001_L_67','Leg_002_L_66','Leg_003_L_65']),
      map(['Leg_001_R_73','Leg_002_R_72','Leg_003_R_71'])
    ];
    for(let i=0;i<legs.length;i++) {
      const [thigh,knee,ankle]=legs[i];
      const side=i ? -1 : 1;
      aimedJoint(thigh,knee,new T.Vector3(.33*side,-.48,.76));
      aimedJoint(knee,ankle,new T.Vector3(-.13*side,-.63,-.46));
    }
    const hold = new T.Vector3();
    for(const [,,wrist] of arms) hold.add(rig.orient.worldToLocal(wrist.getWorldPosition(new T.Vector3())));
    hold.multiplyScalar(.5);
    rig.model.position.add(new T.Vector3(0,-.77,.04).sub(hold));
  }

  const liana=surface('bark',0x9aa679,1.1,1.38);
  function monkey() {
    const g=new T.Group();
    const mount=new T.Group();
    mount.position.set(0,3.34,0);
    g.add(mount);
    const rig=animal('macaque',1.06,0,-1.67);
    if(rig) { poseMonkey(rig); mount.add(rig.orient); }
    else ape(mount,0,0,0).position.y=-1.65;
    tube(mount,[[0,.10,0],[.04,-.24,0],[.09,-.60,-.03],[0,-.77,.04]],.052,liana);
    return finish(g,{hw:1.0,hd:.64,yBottom:1.42,yTop:2.88,kind:'monkey',name:'荡藤猕猴',move:'duck',mount},4.19);
  }

  function anchor(group,laneX) {
    if(group.userData.kind!=='monkey') return;
    const a=-5.15-laneX,b=5.15-laneX;
    tube(group,[[a,6.05,-.40],[a*.48,4.58,-.10],[0,3.34,0],[b*.56,4.89,.08],[b,6.45,.1]],.063,liana,21).castShadow=true;
    for(const [x,height] of [[a,6.07],[b,6.48]]) {
      branch(group,[x+.25,0,-.28],[x,height+1,.01],.14,.09,bambooSkin).castShadow=true;
    }
  }

  function raisedPlank() {
    const g=new T.Group();
    for(let i=0;i<5;i++) {
      const plate=put(g,box,timberLive,(i-2)*.35,.42+i%3*.10,.017-i*.09,.31,.15,1.71,.56+i%2*.16,0,.045*(i-2));
      put(g,ball,bark,plate.position.x,.79,.62,.044,.042,.036);
    }
    put(g,box,timber,.0,.10,.54,1.80,.14,.18,0,.03);
    return finish(g,{hw:.93,hd:.64,yBottom:0,yTop:1.19,kind:'plank',name:'翘起桥板',move:'jump'},1.83);
  }

  function bridgeRope() {
    const g=new T.Group();
    for(const side of [-1,1]) {
      put(g,box,timberLive,side*1.08,1.09,-.03,.13,2.26,.17,.1,0,side*.29);
      put(g,ring,rope,side*.85,1.91,0,.115,.11,.67,Math.PI/2);
    }
    tube(g,[[-1.18,2.21,-.13],[-.63,1.87,.04],[0,1.59,.22],[.62,1.81,.05],[1.18,2.35,-.1]],.05,rope);
    for(let i=0;i<5;i++) put(g,box,i%2 ? safetyCloth : cream,(i-2)*.355,1.75+.066*Math.abs(i-2),.225,.164,.28,.044,.17,0,.20*(i-2));
    return finish(g,{hw:1.0,hd:.49,yBottom:1.42,yTop:2.55,kind:'bridgeRope',name:'垂落护桥绳',move:'duck'},2.93);
  }

  function driftwood() {
    const g=new T.Group();
    const float=new T.Group();
    g.add(float);
    put(float,cylinder,weatheredBark,0,.34,0,.42,2.35,.39,.12,0,Math.PI/2-.11);
    branch(float,[.37,.55,-.08],[.79,1.10,-.28],.149,.04,weatheredBark);
    branch(float,[-.48,.48,.05],[-.78,.82,.29],.109,.036,weatheredBark);
    for(const x of [-1.16,1.16]) put(float,cylinder,end,x,.34,0,.37,.06,.35,0,.1,Math.PI/2);
    for(const z of [-.38,.41]) put(g,ring,shallowWater,0,.016,z,1.23,.23,.26,Math.PI/2);
    return finish(g,{hw:.94,hd:.60,yBottom:0,yTop:1.18,kind:'drift',name:'漂流枯木',move:'jump',float},1.74);
  }

  function riverRock() {
    const g=new T.Group();
    put(g,roughRock,greyRock,0,.81,-.22,.92,1.07,.89,.17,1.2,.16);
    put(g,roughRock,greyRock,-.42,.34,.57,.47,.52,.42,.51,1.1,.06);
    put(g,roughRock,leaf,.015,1.53,-.25,.53,.26,.53,.21,0,.13);
    put(g,ring,shallowWater,0,.016,0,1.03,1.16,.13,Math.PI/2);
    return finish(g,{hw:1.02,hd:.84,yBottom:0,yTop:3,kind:'riverRock',name:'尖礁水道',move:'lane'},2.37);
  }

  const darkWater=unlit(0x1a5958,{transparent:true,opacity:.73,depthWrite:false,side:T.DoubleSide});
  const whirlDisk=new T.CircleGeometry(1,32).rotateX(-Math.PI/2);
  sharedGeometry.add(whirlDisk);
  function whirlpool() {
    const g=new T.Group(), spirals=new T.Group();
    put(g,whirlDisk,darkWater,0,.021,0,1.13,1,1.2);
    g.add(spirals);
    for(let arm=0;arm<3;arm++) {
      const points=[];
      for(let i=0;i<=22;i++) {
        const t=i/22,r=.23+t*.92,a=arm*TAU/3+t*5.2;
        points.push([Math.sin(a)*r,.04,Math.cos(a)*r*.94]);
      }
      tube(spirals,points,.047,shallowWater,24);
    }
    return finish(g,{hw:.95,hd:1.10,yBottom:-.3,yTop:3,kind:'whirl',name:'急流漩涡',move:'lane',spirals},1.2);
  }

  function bambooBundle() {
    const g=new T.Group();
    for(let i=0;i<6;i++) {
      const a=i*2.39;
      put(g,cylinder,bambooSkin,Math.cos(a)*.20,.45+Math.sin(a)*.29,Math.sin(a)*.29,.12,2.07,.12,0,.15,Math.PI/2-.07);
    }
    for(const x of [-.62,.61]) put(g,ring,rope,x,.42,0,.40,.37,.46,.02,Math.PI/2);
    fronds(g,.38,.66,.22,.38);
    return finish(g,{hw:.94,hd:.61,yBottom:0,yTop:1.11,kind:'bambooBundle',name:'倒塌竹捆',move:'jump'},1.70);
  }

  function bambooCanes() {
    const g=new T.Group();
    for(let i=0;i<4;i++) {
      const s=i%2 ? -1 : 1;
      branch(g,[s*1.22,2.75-i*.07,-.22],[s*-.98,1.71+i*.14,.1],.038,.066,bambooSkin);
      fronds(g,s*.5,1.70+i*.145,.14,.25,i*.61);
    }
    return finish(g,{hw:.96,hd:.52,yBottom:1.41,yTop:2.62,kind:'bambooCanes',name:'低垂竹梢',move:'duck'},3.05);
  }

  function ruinStep() {
    const g=new T.Group();
    put(g,box,oldStone,0,.40,0,2.09,.7,.78,.095,-.07,.075);
    put(g,roughRock,greyRock,-.55,.63,.27,.39,.40,.37,.21,1.3,.1);
    put(g,roughRock,greyRock,.64,.22,.51,.47,.31,.37,.41,2.5,.1);
    return finish(g,{hw:1.0,hd:.61,yBottom:0,yTop:1.24,kind:'ruinStep',name:'崩塌石阶',move:'jump'},1.83);
  }

  const gateMoss=matte(0x637542);
  function ruinedGate() {
    const g=new T.Group();
    for(const side of [-1,1]) {
      for(let i=0;i<4;i++) put(g,box,oldStone,side*(1.05-i*.04),.21+i*.425,-.07,.29+i*.035,.42,.62,.09,0,side*.085);
    }
    put(g,box,oldStone,0,1.84,-.04,2.34,.55,.72,-.11,.06,.11);
    for(let i=0;i<3;i++) put(g,roughRock,gateMoss,(i-1)*.63,2.13+i*.045,.10,.35,.10,.23,.07,i*.4,0);
    return finish(g,{hw:1.0,hd:.61,yBottom:1.40,yTop:2.62,kind:'ruinedGate',name:'倾斜石门',move:'duck'},2.83);
  }

  function statue() {
    const g=new T.Group();
    put(g,box,oldStone,0,.32,0,1.73,.63,1.04,.046,.27,.10);
    put(g,roughRock,greyRock,0,1.04,0,.71,.86,.46,.17,.06,.68);
    put(g,roughRock,oldStone,-.21,1.86,.04,.42,.57,.43,.17,.11,.44);
    put(g,box,oldStone,.47,1.15,.08,.24,1.17,.33,.19,.3,-.6);
    return finish(g,{hw:.95,hd:.81,yBottom:0,yTop:3.1,kind:'statue',name:'倒伏石像',move:'lane'},2.62);
  }

  function snowbank() {
    const g=new T.Group();
    put(g,roughRock,packedSnow,0,.38,0,1.08,.71,.68,.12,.43,.08);
    put(g,roughRock,packedSnow,-.43,.23,.23,.62,.44,.56,.12,.03,.08);
    put(g,roughRock,greyRock,.35,.24,.47,.36,.37,.31,.31,.42,.07);
    return finish(g,{hw:.89,hd:.63,yBottom:0,yTop:1.17,kind:'snowbank',name:'横道积雪',move:'jump'},1.74);
  }

  function frozenLimb() {
    const g=new T.Group();
    tube(g,[[-1.17,1.56,.12],[-.56,1.63,.17],[0,1.82,.08],[.58,2.12,-.13],[1.38,2.56,-.28]],.125,weatheredBark);
    branch(g,[.27,1.93,-.03],[.43,2.60,-.56],.075,.036,weatheredBark);
    for(let i=0;i<6;i++) {
      const x=(i-2.4)*.36, y=1.75+Math.max(0,x)*.54;
      put(g,roughRock,packedSnow,x,y+.12,.09,.28,.091,.19,.18,i*.5,0);
      if(i%2===0) put(g,cone,packedSnow,x+.02,y-.17,.14,.032,.27,.045,Math.PI);
    }
    return finish(g,{hw:1.03,hd:.53,yBottom:1.39,yTop:2.58,kind:'frozenLimb',name:'低悬冰枝',move:'duck'},3.06);
  }

  function rockslide() {
    const g=new T.Group(), stone=new T.Group();
    g.add(stone);
    stone.position.y=1.03;
    put(stone,roughRock,greyRock,0,0,0,.90,.99,.94,.77,.1,.31);
    put(stone,roughRock,packedSnow,.12,.55,.37,.51,.35,.51,-.22,.1,.14);
    return finish(g,{hw:.99,hd:.85,yBottom:0,yTop:3.04,kind:'rockslide',name:'滚落冰岩',move:'lane',stone},2.58);
  }

  function animate(group,t,dt=.016) {
    const data=group.userData;
    data.animate?.(t);
    if (data.kind==='elephant') {
      data.legs.forEach((leg,i)=>{ leg.rotation.x=Math.sin(t*6+i*Math.PI/2)*.19; });
      data.sniff.rotation.x=Math.sin(t*3.3)*.18;
      data.sniff.rotation.z=Math.cos(t*4.4)*.18;
    } else if (data.kind==='bees') {
      data.swarm.forEach(({insect,wings,baseY,angle,r})=>{
        const a=angle+t*(2+Math.sin(angle)*.5);
        insect.position.set(Math.cos(a)*r,baseY+Math.sin(t*6+angle)*.15,Math.sin(a)*r);
        insect.rotation.y=-a;
        wings.forEach((wing,i)=>{ wing.rotation.z=Math.sin(t*37+angle)*(i ? .88 : -.88); });
      });
    } else if (data.kind==='apes') {
      data.flames.forEach((f,i)=>{
        f.scale.y=.95+Math.sin(t*13+i)*.12;
        f.rotation.z=.12*Math.sin(t*7+i*1.3);
      });
      data.sparks.forEach((spark,i)=>{
        const p=(t*.85+i*.083)%1;
        spark.position.set(Math.cos(i*5.7+p)*p*.69,.86+p*2.29,Math.sin(i*5.7)*p*.69);
        spark.scale.setScalar(.022+(1-p)*.027);
      });
    } else if(data.kind==='tiger') {
      if(!data.charging && group.position.z>-27) {
        data.charging=true;
        if(data.rush) {
          data.rush.reset().setEffectiveTimeScale(.92).play();
          if(data.pace) data.pace.crossFadeTo(data.rush,.29,false);
        }
      }
      data.mixer?.update(dt);
      if(data.fallback) data.fallback.position.y=1.06+Math.sin(t*8)*.15;
    } else if(data.kind==='monkey') {
      data.mount.rotation.z=.22*Math.sin(t*3.8);
      data.mount.rotation.x=.28*Math.sin(t*3.8+.65);
    } else if(data.kind==='drift') {
      data.float.position.y=.075*Math.sin(t*4.1);
      data.float.rotation.z=.12*Math.sin(t*3.3);
    } else if(data.kind==='whirl') data.spirals.rotation.y=t*2.3;
    else if(data.kind==='rockslide') data.stone.rotation.x=t*3.7;
  }

  function dispose(group) {
    group.userData.mixer?.stopAllAction();
    group.traverse(object=>{
      if (object.isMesh && !sharedGeometry.has(object.geometry) && !object.userData.sharedModelGeometry) object.geometry.dispose();
    });
  }

  const newObstacles=RunnerNewObstacles(finish);
  return { newObstacles, setBoostCue:(group,on)=>{
    if(group.userData.boostClearable || group.userData.kind==='gap') {
      group.userData.sign.material=mark(on ? 'jump' : group.userData.move);
    }
  }, prepare, anchor, low, treehole, stump, high, elephant, bees, apes, gap, tiger, monkey, raisedPlank, bridgeRope, driftwood, riverRock, whirlpool, bambooBundle, bambooCanes, ruinStep, ruinedGate, statue, snowbank, frozenLimb, rockslide, moves, animate, dispose };
})();
