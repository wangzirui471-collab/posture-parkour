'use strict';

window.RunnerNewObstacles = (finish) => {
  const T=window.THREE;
  const {box,ball,roughRock,cone,cylinder,ring,put,branch,tube,matte,unlit,surface}=RunnerArt;
  const bamboo=matte(0x9b9a63), bambooEnds=matte(0xc6b784);
  const oldWood=surface('deck',0xab9a7d), blocks=surface('ruin',0xa49b88);
  const rock=surface('cliff',0xa3aaa8), snow=surface('snow',0xd6e7ed);
  const ice=matte(0x83bacc,{roughness:.22,metalness:.22});
  const navy=matte(0x354861,{roughness:.45,metalness:.40});
  const alloy=matte(0x889bae,{roughness:.39,metalness:.48});
  const bright=matte(0xc8d5df,{roughness:.47,metalness:.36});
  const tint=matte(0x214b69,{roughness:.23,metalness:.58});
  const dark=matte(0x202b3c,{roughness:.43,metalness:.35});
  const cyan=unlit(0x8cefff), rose=unlit(0xff639b), gold=unlit(0xffbe75);
  const white=unlit(0xf5f7ff);
  const thinRose=unlit(0xff498a,{transparent:true,opacity:.28,depthWrite:false});
  const thinCyan=unlit(0x67d9ff,{transparent:true,opacity:.23,depthWrite:false});

  function bambooWheel() {
    const g=new T.Group(), wheel=new T.Group();
    wheel.position.y=1.28;
    g.add(wheel);
    for(const z of [-.30,.30]){
      put(wheel,ring,bambooEnds,0,0,z,1.00,1.00,.82);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        put(wheel,box,bamboo,Math.cos(a)*.52,Math.sin(a)*.52,z,1.03,.076,.09,0,0,a);
      }
    }
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5;
      put(wheel,box,bambooEnds,Math.cos(a)*1.03,Math.sin(a)*1.03,0,.22,.11,.73,0,0,a);
    }
    for(const x of [-1,1]) branch(g,[x*.96,0,.27],[x*.81,1.24,-.05],.10,.07,oldWood);
    return finish(g,{hw:1.02,hd:.65,yBottom:0,yTop:3.1,kind:'bambooWheel',
      name:'脱轴竹水轮',move:'lane',animate:t=>{wheel.rotation.z=t*2.3;}},2.86);
  }

  function bambooScreen() {
    const g=new T.Group();
    for(const x of [-1.07,1.07]) put(g,cylinder,bamboo,x,1.32,0,.071,2.82,.071,0,0,x*.12);
    put(g,box,oldWood,0,2.76,-.05,2.24,.16,.19,0,0,.10);
    for(let i=0;i<10;i++){
      put(g,cylinder,i%2 ? bamboo : bambooEnds,(i-4.5)*.20,2.29+i*.024,.06,.073,1.08,.056,0,0,.06);
    }
    return finish(g,{hw:1.01,hd:.49,yBottom:1.40,yTop:2.82,kind:'bambooScreen',
      name:'垂落编竹帘',move:'duck'},3.19);
  }

  function stoneLantern() {
    const g=new T.Group();
    put(g,box,blocks,0,.18,0,1.45,.32,.81,0,.34,.1);
    put(g,box,blocks,.10,.46,-.03,1.83,.39,.52,.33,-.11,.25);
    put(g,cone,rock,.51,.72,.14,.58,.58,.48,0,.77,-.36);
    put(g,box,blocks,-.59,.62,.18,.48,.51,.45,.30,-.14,.54);
    return finish(g,{hw:.96,hd:.59,yBottom:0,yTop:1.20,kind:'stoneLantern',
      name:'翻倒石灯',move:'jump'},1.77);
  }

  function pendulum() {
    const g=new T.Group(), swing=new T.Group();
    swing.position.set(0,3.22,-.10);
    g.add(swing);
    for(const x of [-1.04,1.04]) put(g,box,blocks,x,1.6,-.16,.23,3.2,.34,0,0,x*.07);
    put(g,box,blocks,0,3.22,-.18,2.17,.25,.40,0,0,.04);
    put(swing,cylinder,oldWood,0,-.63,0,.073,1.3,.073);
    put(swing,roughRock,rock,0,-1.26,0,.49,.56,.47,.42,.53,.11);
    put(swing,ring,bambooEnds,0,-1.21,.03,.49,.48,.57,Math.PI/2);
    return finish(g,{hw:1.01,hd:.62,yBottom:1.40,yTop:3.09,kind:'pendulum',name:'吊索石锤',move:'duck',
      animate:t=>{swing.rotation.x=Math.sin(t*3.47)*.38;}},3.68);
  }

  function iceFangs() {
    const g=new T.Group();
    for(const x of [-1.03,1.03]) put(g,roughRock,rock,x,1.22,-.14,.28,1.59,.41,.17,.24,x*.11);
    put(g,roughRock,snow,0,2.68,-.17,1.32,.43,.50,.17,.44,.08);
    for(let i=0;i<9;i++){
      const h=.39+(i*17%8)*.092;
      put(g,cone,i%3 ? ice : snow,(i-4)*.24,2.49-h*.5,.11+(i%2)*.12,.093,h,.11,Math.PI,.1,i*.01);
    }
    return finish(g,{hw:1.00,hd:.57,yBottom:1.42,yTop:2.77,kind:'iceFangs',name:'倒挂冰锥',move:'duck'},3.17);
  }

  function snowFence() {
    const g=new T.Group();
    for(let i=0;i<8;i++){
      put(g,box,oldWood,(i-3.5)*.249,1.23,0,.18,2.32,.13,.085*(i-4),0,(i-4)*.071);
      put(g,roughRock,snow,(i-3.5)*.238,2.15+(i%2)*.19,.02,.14,.26,.15,0,0,.15);
    }
    for(const y of [.67,1.64]) put(g,box,oldWood,0,y,.08,2.04,.14,.18,.07,0,-.10);
    return finish(g,{hw:1.05,hd:.64,yBottom:0,yTop:3.18,kind:'snowFence',
      name:'雪压防风栅',move:'lane',boostClearable:true},2.93);
  }

  function maglev() {
    const g=new T.Group(), car=new T.Group();
    g.add(car);
    put(car,box,navy,0,1.99,-.55,1.94,2.97,4.45);
    put(car,box,alloy,0,1.91,1.69,1.75,2.65,.37);
    put(car,ball,tint,0,2.37,1.93,.82,.54,.21);
    put(car,box,dark,0,1.01,1.91,1.13,.43,.15);
    put(car,box,rose,0,1.63,1.96,1.62,.066,.08);
    for(const x of [-.93,.93]){
      put(car,box,cyan,x,.58,.10,.11,.11,3.82);
      put(car,ball,white,x*.70,1.27,2.06,.16,.105,.044);
      for(let i=0;i<4;i++) put(car,box,tint,x,2.44,.92-i*.94,.082,.64,.54);
    }
    return finish(g,{hw:1.01,hd:2.48,yBottom:0,yTop:4.67,kind:'maglev',name:'悬浮列车',move:'lane',advance:4.8,
      animate:t=>{car.position.y=.08*Math.sin(t*6.2);}},3.97);
  }

  function streetLaser() {
    const g=new T.Group();
    for(const x of [-1.02,1.02]){
      put(g,box,navy,x,1.27,0,.22,2.53,.33);
      put(g,ball,rose,x,1.66,.21,.12,.13,.07);
    }
    for(const y of [1.54,1.87,2.20]){
      put(g,box,thinRose,0,y,.035,2.10,.175,.17);
      put(g,box,rose,0,y,.042,2.04,.035,.057);
    }
    return finish(g,{hw:.99,hd:.48,yBottom:1.40,yTop:2.90,kind:'streetLaser',name:'门禁激光幕',move:'duck'},3.02);
  }

  function bollards() {
    const g=new T.Group();
    put(g,box,dark,0,.064,0,2.08,.12,.65);
    for(const x of [-.70,0,.70]){
      put(g,cylinder,alloy,x,.56,0,.19,1.08,.19);
      put(g,cylinder,cyan,x,.78,0,.203,.076,.203);
      put(g,cylinder,navy,x,1.10,0,.176,.08,.176);
      put(g,ball,rose,x,.40,.189,.045,.074,.030);
    }
    return finish(g,{hw:.97,hd:.56,yBottom:0,yTop:1.19,kind:'bollards',name:'升降拦车柱',move:'jump'},1.77);
  }

  function drone() {
    const g=new T.Group(), body=new T.Group(), fans=[];
    body.position.y=2.08;
    g.add(body);
    put(body,ball,navy,0,0,0,.67,.29,.55);
    put(body,box,bright,0,.11,.14,.69,.27,.56,0,0,.08);
    put(body,ball,rose,0,-.06,.512,.158,.10,.063);
    for(const x of [-.81,.81]){
      put(body,box,alloy,x*.53,-.01,0,.83,.12,.20);
      put(body,ring,alloy,x,.11,0,.32,.32,.68,Math.PI/2);
      const fan=new T.Group();
      fan.position.set(x,.12,.005);
      body.add(fan); fans.push(fan);
      put(fan,box,cyan,0,0,0,.52,.034,.078,0,.21);
    }
    return finish(g,{hw:.99,hd:.61,yBottom:1.43,yTop:2.70,kind:'drone',name:'低空巡逻机',move:'duck',
      animate:t=>{body.position.y=2.05+.14*Math.sin(t*4);fans.forEach((f,i)=>{f.rotation.y=t*32*(i ? -1 : 1);});}},2.95);
  }

  function plasma() {
    const g=new T.Group();
    for(const x of [-.90,.90]){
      put(g,box,navy,x,1.36,0,.26,2.64,.40);
      put(g,box,rose,x,1.42,.23,.12,1.97,.042);
    }
    const pane=put(g,box,thinRose,0,1.20,0,1.86,2.30,.21);
    for(let y=.29;y<2.6;y+=.39) put(g,box,y<.45 ? gold : rose,0,y,.09,1.85,.03,.050);
    return finish(g,{hw:1.02,hd:.48,yBottom:0,yTop:3.12,kind:'plasma',name:'过载等离子墙',
      move:'lane',boostClearable:true,animate:t=>{pane.scale.y=2.30+.13*Math.sin(t*8.7);}},3.06);
  }

  function parcel() {
    const g=new T.Group();
    put(g,box,navy,0,.25,0,1.91,.49,1.13);
    put(g,box,alloy,-.13,.64,-.08,1.28,.41,.83,0,-.15,.08);
    put(g,box,cyan,0,.32,.59,1.67,.067,.044);
    for(const x of [-.68,.68]) put(g,ball,rose,x,.22,.585,.09,.076,.043);
    return finish(g,{hw:.99,hd:.68,yBottom:0,yTop:1.16,kind:'parcel',name:'失控配送舱',move:'jump'},1.76);
  }

  function meteor() {
    const g=new T.Group(), body=new T.Group();
    g.add(body); body.position.y=1.24;
    put(body,roughRock,rock,0,0,0,1.00,1.25,.87,.43,.8,.07);
    put(body,roughRock,rock,-.37,.43,.43,.45,.35,.31,0,.2);
    put(body,box,gold,-.32,.50,.59,.53,.04,.039,.2,-.23,.68);
    put(body,box,rose,.31,-.14,.70,.42,.035,.038,.2,.19,-.36);
    return finish(g,{hw:1.02,hd:1.12,yBottom:0,yTop:4.6,kind:'meteor',
      name:'近轨旋转陨石',move:'lane',advance:5.8,animate:t=>{body.rotation.set(t*1.5,t*.65,t*.87);}},3.25);
  }

  function antenna() {
    const g=new T.Group();
    put(g,cylinder,alloy,-1.00,1.24,.10,.14,2.53,.14,0,0,-.18);
    put(g,cylinder,alloy,.13,2.10,0,.13,2.06,.13,0,0,Math.PI/2+.12);
    put(g,ring,bright,.34,2.01,.08,.61,.47,.82,0,.20,-.44);
    put(g,ball,tint,.34,2.02,-.049,.55,.42,.13,0,.20,-.44);
    put(g,ball,cyan,.41,2.05,.182,.082,.088,.065);
    return finish(g,{hw:1.01,hd:.75,yBottom:1.38,yTop:2.85,kind:'antenna',name:'折落通信天线',move:'duck'},3.20);
  }

  function cargo() {
    const g=new T.Group();
    put(g,cylinder,alloy,0,.60,0,.56,1.88,.56,0,0,Math.PI/2);
    for(const x of [-.70,.70]){
      put(g,cylinder,navy,x,.60,0,.57,.14,.57,0,0,Math.PI/2);
      put(g,cylinder,cyan,x*1.38,.60,0,.42,.072,.41,0,0,Math.PI/2);
    }
    put(g,box,navy,0,.12,0,1.61,.27,.81,0,.12,.08);
    return finish(g,{hw:1.02,hd:.69,yBottom:0,yTop:1.22,kind:'cargo',name:'失重补给舱',move:'jump'},1.79);
  }

  function solar() {
    const g=new T.Group();
    put(g,box,alloy,0,1.29,0,3.60,2.21,.18,-.16,.13,-.22);
    for(let i=0;i<5;i++){
      const x=(i-2)*.695;
      put(g,box,tint,x,1.31-.19*x,.10,.658,1.96,.070,-.16,.13,-.22);
      put(g,box,cyan,x,1.55-.19*x,.154,.60,.035,.026,0,.13,-.22);
    }
    return finish(g,{hw:1.69,hd:.64,yBottom:0,yTop:3.55,kind:'solar',name:'倾覆太阳翼',move:'lane'},3.16);
  }

  function airlock() {
    const g=new T.Group();
    for(const y of [1.92,2.24]){
      put(g,box,alloy,0,y,0,2.13,.30,.52);
      put(g,box,cyan,0,y,.28,1.78,.071,.029);
    }
    for(const x of [-1.02,1.02]) put(g,box,navy,x,1.43,-.13,.22,2.84,.54);
    put(g,box,bright,0,2.76,0,2.17,.47,.63);
    return finish(g,{hw:1.03,hd:.53,yBottom:1.39,yTop:2.98,kind:'airlock',
      name:'半降气闸',move:'duck'},3.35);
  }

  function thruster() {
    const g=new T.Group(), jets=[];
    put(g,cylinder,navy,0,.43,0,.86,.81,.88);
    put(g,cylinder,alloy,0,.86,0,.76,.21,.76);
    put(g,ring,gold,0,.97,0,.64,.64,.63,Math.PI/2);
    for(let i=-1;i<=1;i++){
      const flame=put(g,cone,i ? thinCyan : cyan,i*.34,1.91,0,i ? .25:.41,2.07,.29,.16,0,i*.09);
      jets.push(flame);
    }
    return finish(g,{hw:1.04,hd:.76,yBottom:0,yTop:3.40,kind:'thruster',name:'失控推进喷流',move:'lane',boostClearable:true,
      animate:t=>jets.forEach((jet,i)=>{jet.scale.y=1.96+.23*Math.sin(t*15+i*3);})},3.32);
  }

  const cedar=surface('deck',0xad865b), grain=surface('bark',0xb2926c);
  const cherry=matte(0xe84c43), appleSkin=matte(0xbdc56e), leaves=matte(0x72934f);
  const paint=matte(0xbd7a43), bluePaint=matte(0x537684), tealPaint=matte(0x598368);
  const steel=matte(0x696779,{roughness:.46,metalness:.37});
  const rubber=matte(0x3b343b), sand=surface('cliff',0xce9168), redRock=surface('cliff',0xaa634a);
  const basalt=surface('cliff',0x6a6175), oyster=matte(0xc4ccbb), sulfur=matte(0xdaab59);
  const workLight=unlit(0xffd28d), vapor=unlit(0xd6e9e9,{transparent:true,opacity:.35,depthWrite:false});
  const hot=unlit(0xffc18b,{transparent:true,opacity:.55,depthWrite:false});

  function appleCrate() {
    const g=new T.Group();
    for(const x of [-.53,.49]){
      for(let y=.21;y<.78;y+=.18) {
        for(const z of [-.41,.41]) put(g,box,cedar,x,y,z,.95,.142,.076);
      }
      for(const side of [-1,1]){
        put(g,box,oldWood,x+side*.424,.43,0,.096,.58,.86);
        for(const z of [-.42,.42]) put(g,box,blocks,x+side*.407,.44,z,.09,.61,.046);
      }
      for(let i=0;i<8;i++){
        put(g,ball,i%3 ? cherry : appleSkin,x+(i%4-1.5)*.198,.711+(i%3)*.044,(i<4 ? .22 : -.21),
          .112,.102,.114,.16,i);
      }
    }
    put(g,box,oldWood,0,.12,0,2.07,.11,.88);
    return finish(g,{hw:1.03,hd:.47,yBottom:0,yTop:.90,kind:'appleCrate',name:'散落苹果筐',move:'jump'},1.36);
  }

  function orchardTrellis() {
    const g=new T.Group();
    for(const x of [-1.12,1.12]) put(g,box,oldWood,x,1.25,-.08,.16,2.63,.19,0,0,x*.064);
    put(g,box,cedar,0,2.42,.05,2.30,.24,.42,0,0,-.13);
    for(let i=0;i<8;i++){
      const x=(i-3.5)*.276, y=2.13-x*.15+.095*Math.sin(i*2);
      put(g,roughRock,leaves,x,y,.15,.28,.43,.30,0,i*.67);
      put(g,ball,i%3 ? cherry : appleSkin,x,y-.32,.28,.112,.116,.105);
      put(g,box,oldWood,x,2.48-x*.12,.16,.08,.11,.87,0,-.15,.07);
    }
    return finish(g,{hw:1.05,hd:.49,yBottom:1.50,yTop:2.79,kind:'orchardTrellis',name:'斜垂果树棚架',move:'duck'},3.16);
  }

  function wheel(g,x,y,z,size,tire=rubber,hub=steel) {
    put(g,cylinder,tire,x,y,z,size,size*.53,size,0,0,Math.PI/2);
    put(g,cylinder,hub,x+Math.sign(x)*size*.275,y,z,size*.58,.055,size*.58,0,0,Math.PI/2);
    put(g,cylinder,tire,x+Math.sign(x)*size*.32,y,z,size*.23,.045,size*.23,0,0,Math.PI/2);
  }

  function orchardTractor() {
    const g=new T.Group();
    put(g,box,tealPaint,0,.87,.2,1.1,.60,2.61);
    put(g,box,tealPaint,0,1.28,.70,.96,.62,1.55);
    put(g,box,steel,0,1.24,1.493,.86,.52,.086);
    for(let i=-3;i<=3;i++) put(g,box,rubber,i*.102,1.24,1.54,.029,.38,.028);
    for(const x of [-.56,.56]){
      wheel(g,x*1.27,.62,-.69,.62);
      wheel(g,x,.43,1.02,.45);
      put(g,ball,workLight,x*.69,1.51,1.506,.11,.092,.057);
      put(g,box,steel,x*.87,1.81,-.76,.077,1.38,.079,0,0,x*.09);
    }
    put(g,box,cedar,0,1.46,-.51,.64,.22,.59);
    put(g,box,tealPaint,0,2.51,-.72,1.14,.18,1.03);
    put(g,cylinder,rubber,-.33,1.83,.49,.052,.78,.054);
    return finish(g,{hw:1.02,hd:1.61,yBottom:0,yTop:2.68,kind:'orchardTractor',name:'抛锚果园拖拉机',move:'lane'},3.10);
  }

  function lumberStack() {
    const g=new T.Group();
    for(const z of [-.36,.34]) put(g,box,oldWood,0,.11,z,1.73,.22,.17);
    for(let row=0;row<3;row++) for(let j=0;j<4;j++){
      const z=(j-1.5)*.235;
      put(g,box,(j+row)%3 ? cedar : grain,.068*Math.sin(row+j),.24+row*.195,z,1.98-row*.15,.176,.204,
        .018*Math.sin(j),.035*(j-1),row*.036);
    }
    for(const x of [-.68,.64]) put(g,box,steel,x,.74,.03,.062,.028,.93,0,0,.08);
    return finish(g,{hw:1.07,hd:.54,yBottom:0,yTop:.80,kind:'lumberStack',name:'倾倒方木垛',move:'jump'},1.42);
  }

  function kilnHook() {
    const g=new T.Group(), hoist=new T.Group();
    g.add(hoist);
    hoist.position.set(0,2.65,0);
    for(const x of [-1.09,1.09]) put(g,box,oldWood,x,1.33,-.14,.17,2.74,.31);
    put(g,box,grain,0,2.70,-.08,2.29,.22,.31);
    put(hoist,cylinder,steel,0,-.271,.06,.058,.67,.058);
    put(hoist,box,paint,0,-.63,.06,1.68,.22,.36);
    for(const x of [-.69,-.23,.23,.69]){
      put(hoist,ring,steel,x,-.88,.09,.165,.23,.75,.16,0,.23);
      put(hoist,box,paint,x,-.61,.25,.13,.15,.032,0,0,-.40);
    }
    return finish(g,{hw:1.02,hd:.40,yBottom:1.49,yTop:2.81,kind:'kilnHook',name:'垂落吊具横梁',move:'duck',
      animate:t=>{hoist.rotation.x=.21*Math.sin(t*2.8);}},3.31);
  }

  function timberCarrier() {
    const g=new T.Group();
    put(g,box,paint,0,.67,.19,1.65,.40,2.67);
    put(g,box,steel,0,.94,1.24,1.62,.17,.39);
    for(const x of [-.77,.77]){
      for(const z of [-.87,1.02]) wheel(g,x,.44,z,.45);
      put(g,box,paint,x,.97,-.64,.13,1.94,2.55,0,0,x*.045);
      put(g,box,workLight,x*.8,.8,1.59,.20,.15,.07);
    }
    for(let i=0;i<8;i++){
      const x=(i%3-1)*.52, y=1.05+Math.floor(i/3)*.44, z=-.36-.14*(i%3);
      put(g,cylinder,grain,x,y,z,.268,2.76,.264,Math.PI/2,.025,.02);
      put(g,cylinder,cedar,x,y,z+1.395,.238,.041,.231,Math.PI/2);
      put(g,ring,bamboo,x,y,z+1.423,.152,.135,.31);
    }
    return finish(g,{hw:1.06,hd:1.94,yBottom:0,yTop:2.53,kind:'timberCarrier',name:'满载运木拖车',move:'lane',advance:2.8},3.08);
  }

  function oysterBaskets() {
    const g=new T.Group();
    for(let i=0;i<3;i++){
      const x=(i-1)*.65, z=i%2 ? .13 : -.07, y=i%2 ? .60 : .43;
      put(g,cone,oldWood,x,y*.51,z,.37,y*.98,.38,Math.PI);
      put(g,cylinder,oyster,x,y,z,.32,.09,.33);
      for(let j=0;j<5;j++) put(g,roughRock,j%2 ? oyster : rock,x+Math.cos(j*2.4)*.20,y+.065,z+Math.sin(j*2.4)*.21,
        .12,.093,.135,.43,j*.76,.24);
      put(g,ring,bambooEnds,x,y,z,.34,.35,.75,Math.PI/2);
      put(g,ring,bambooEnds,x,y*.64,z,.29,.30,.75,Math.PI/2);
    }
    return finish(g,{hw:1.01,hd:.55,yBottom:0,yTop:.81,kind:'oysterBaskets',name:'散落的牡蛎筐',move:'jump'},1.37);
  }

  function mangroveLimb() {
    const g=new T.Group();
    branch(g,[-1.18,1.99,-.09],[.98,1.88,.10],.23,.17,grain);
    branch(g,[-1.00,1.93,-.07],[-1.17,.43,.21],.18,.19,grain);
    branch(g,[.55,1.94,.03],[1.02,2.77,-.28],.13,.072,grain);
    branch(g,[-.17,1.94,-.02],[.45,2.48,-.42],.12,.055,grain);
    for(let i=0;i<8;i++){
      const x=(i-3.5)*.248;
      put(g,roughRock,leaves,x,2.16+.16*Math.sin(i*.7),-.12+.08*Math.cos(i*3),.34,.32,.34,.33,i*.79);
    }
    return finish(g,{hw:1.06,hd:.52,yBottom:1.53,yTop:2.73,kind:'mangroveLimb',name:'横过栈桥的红树枝',move:'duck'},3.15);
  }

  function strandedSkiff() {
    const g=new T.Group(), hull=new T.Group();
    hull.position.y=1.06;
    hull.rotation.x=.46;
    g.add(hull);
    put(hull,ball,tealPaint,0,0,0,1.02,.49,1.86);
    put(hull,ball,cedar,0,.35,0,.91,.13,1.68);
    put(hull,ball,oldWood,0,.414,.09,.73,.055,1.42);
    for(const x of [-.73,.73]) {
      put(hull,box,blocks,x,.24,0,.15,.17,2.08,0,0,x*.23);
      put(hull,box,cedar,x,.41,0,.10,.15,1.87,0,0,x*.30);
    }
    for(const z of [-.62,.39]) put(hull,box,blocks,0,.49,z,1.45,.08,.29);
    put(g,box,oldWood,0,.12,.71,1.23,.22,.51,0,.14,.07);
    put(g,cylinder,cedar,-.25,1.25,.22,.047,2.57,.046,1.27,.16,.17);
    put(g,ball,cedar,.14,1.69,1.42,.25,.069,.39,.27,.23,.17);
    return finish(g,{hw:1.08,hd:1.81,yBottom:0,yTop:2.26,kind:'strandedSkiff',name:'横搁的渔船',move:'lane'},2.87);
  }

  function mineSleepers() {
    const g=new T.Group();
    for(let i=0;i<4;i++){
      const y=.22+i*.165, z=(i-1.5)*.145;
      put(g,box,oldWood,.045*i,y,z,1.98-i*.12,.24,.38,.13,.10*(i-1),.08*i);
      for(const x of [-.64,.66]) put(g,box,steel,x,y+.132,z,.16,.052,.31,0,0,.12);
    }
    return finish(g,{hw:1.03,hd:.56,yBottom:0,yTop:.99,kind:'mineSleepers',name:'堆起的矿道枕木',move:'jump'},1.52);
  }

  function oreChute() {
    const g=new T.Group();
    for(const x of [-1.12,1.12]){
      put(g,box,grain,x,1.39,0,.13,2.78,.23,0,0,x*.07);
      put(g,box,steel,x*.80,2.13,-.10,.18,.56,1.02,.34,0,0);
    }
    put(g,box,steel,0,2.06,-.07,1.93,.31,1.14,.34,0,.09);
    put(g,box,paint,0,1.74,.40,1.95,.16,.22,.13,0,.09);
    for(let i=0;i<5;i++) put(g,roughRock,sand,(i-2)*.34,2.18+(i%2)*.12,-.04+(i%2)*.15,.24,.23,.26,.20,i*.7,.13);
    return finish(g,{hw:1.06,hd:.71,yBottom:1.54,yTop:2.66,kind:'oreChute',name:'低悬卸矿槽',move:'duck'},3.22);
  }

  function runawayCart() {
    const g=new T.Group();
    put(g,box,steel,0,.61,0,1.77,.26,2.10);
    for(const x of [-.83,.83]){
      for(const z of [-.72,.73]) wheel(g,x,.35,z,.34,steel,rubber);
      put(g,box,steel,x,1.18,0,.15,.88,2.05,0,0,x*.16);
      put(g,box,paint,x*.80,1.60,0,.14,.11,2.13);
    }
    for(const z of [-.99,.99]) put(g,box,steel,0,1.17,z,1.71,.88,.13,z*.15,0,.06);
    for(let i=0;i<11;i++) put(g,roughRock,i%3 ? rock : sand,(i%3-1)*.51,1.38+(i%2)*.29,(i%4-1.5)*.45,.31,.44,.40,.32,i*.88,.15);
    put(g,ball,workLight,0,.91,1.11,.20,.12,.087);
    return finish(g,{hw:1.08,hd:1.19,yBottom:0,yTop:2.24,kind:'runawayCart',name:'失控矿车',move:'lane',advance:6.6},2.65);
  }

  function sandstoneShelf() {
    const g=new T.Group();
    for(let i=0;i<3;i++){
      put(g,roughRock,i%2 ? sand : redRock,-.11*i,.28+i*.23,-.13*i,1.03-i*.12,.32,.64-i*.11,.19,i*.68,.071);
    }
    return finish(g,{hw:1.04,hd:.70,yBottom:0,yTop:1.10,kind:'sandstoneShelf',name:'剥落砂岩阶',move:'jump'},1.63);
  }

  function fallenSign() {
    const g=new T.Group();
    for(const x of [-1.13,1.13]) put(g,box,grain,x,1.32,-.07,.15,2.68,.17,0,0,x*.09);
    put(g,box,cedar,0,2.16,.06,2.16,.91,.20,.08,.03,-.10);
    for(const y of [1.86,2.47]) put(g,box,oldWood,0,y,.19,1.97,.082,.073,0,0,-.10);
    put(g,box,blocks,0,2.13,.198,1.11,.108,.067,0,0,-.10);
    for(const side of [-1,1]) put(g,box,blocks,.47,2.08+side*.126,.213,.34,.093,.05,0,0,side*.67);
    return finish(g,{hw:1.03,hd:.42,yBottom:1.57,yTop:2.70,kind:'fallenSign',name:'折低的木路标',move:'duck'},3.09);
  }

  function rollingTumbleweed() {
    const g=new T.Group(), body=new T.Group();
    body.position.y=1.02;
    g.add(body);
    put(body,roughRock,grain,0,0,0,.48,.47,.50,.51,.39,.32);
    for(let i=0;i<11;i++){
      const az=i*2.399, y=(i-5)*.153, r=Math.sqrt(1-y*y);
      put(body,ring,i%3 ? cedar : bambooEnds,0,y*.12,0,r*.89+.15,.97,.71,az*.86,az*.44,az*.31);
      branch(body,[Math.cos(az)*.20,y*.51,Math.sin(az)*.21],[Math.cos(az)*r,y,Math.sin(az)*r],.05,.026,bambooEnds,5);
    }
    return finish(g,{hw:1.05,hd:1.07,yBottom:0,yTop:2.13,kind:'rollingTumbleweed',name:'滚来的风滚草团',move:'lane',
      advance:5.4,animate:t=>{body.rotation.set(t*3.4,Math.sin(t)*.29,t*.63);}},2.60);
  }

  function mooringFenders() {
    const g=new T.Group();
    const rubberBumper=(x,y,z,r)=>{
      put(g,ring,rubber,x,y,z,r,r,.91,Math.PI/2,0,x*.09);
      put(g,ring,steel,x,y+.041,z,r*.75,r*.73,.61,Math.PI/2,0,x*.09);
    };
    for(const x of [-.52,.52]){
      put(g,cylinder,rubber,x,.29,0,.48,.45,.48);
      put(g,cylinder,rubber,x,.63,.04,.44,.25,.44,0,.07,x*.085);
      rubberBumper(x,.743,.03,.42);
      put(g,box,paint,x,.42,.493,.35,.080,.039,0,0,x*.19);
    }
    return finish(g,{hw:1.04,hd:.57,yBottom:0,yTop:.87,kind:'mooringFenders',name:'叠起的防撞轮胎',move:'jump'},1.47);
  }

  function containerBody(g,material,width,height,depth) {
    put(g,box,material,0,0,0,width,height,depth);
    for(let j=-4;j<=4;j++) put(g,box,material,j*width*.104,0,depth*.507,width*.038,height*.90,.047);
    for(const side of [-1,1]){
      put(g,box,steel,side*width*.45,0,depth*.53,.079,height*.86,.06);
      put(g,box,steel,side*width*.49,height*.43,0,.13,.13,depth*1.024);
      put(g,box,steel,side*width*.49,-height*.43,0,.13,.13,depth*1.024);
    }
  }

  function hoistedContainer() {
    const g=new T.Group(), cargo=new T.Group();
    g.add(cargo);
    cargo.position.set(0,2.05,-.08);
    containerBody(cargo,bluePaint,1.98,.83,1.02);
    for(const x of [-.81,.81]){
      put(cargo,box,paint,x,-.31,.548,.25,.095,.037,0,0,-.40);
      branch(cargo,[x,.38,0],[x*.55,1.45,-.13],.037,.035,rubber);
    }
    return finish(g,{hw:1.02,hd:.68,yBottom:1.51,yTop:2.67,kind:'hoistedContainer',name:'低悬货箱',move:'duck',
      animate:t=>{cargo.rotation.z=.072*Math.sin(t*2.3);}},3.79);
  }

  function rollingContainer() {
    const g=new T.Group(), body=new T.Group();
    body.position.set(0,1.26,-.10);
    body.rotation.set(.12,-.07,.08);
    g.add(body);
    containerBody(body,paint,1.89,2.21,2.54);
    for(const y of [-.75,.74]){
      put(body,box,blocks,0,y,1.327,.68,.13,.050);
      for(const x of [-.72,.72]) put(body,box,workLight,x,y,1.338,.11,.11,.072);
    }
    return finish(g,{hw:1.06,hd:1.46,yBottom:0,yTop:2.73,kind:'rollingContainer',name:'滑脱货柜',move:'lane',advance:4.7},3.11);
  }

  function basaltLedge() {
    const g=new T.Group();
    for(let i=0;i<5;i++){
      const x=(i-2)*.386, h=.33+(i%3)*.25;
      put(g,roughRock,basalt,x,h*.42,0,.42,h*.63,.47,.31,i*.78,i*.13);
      put(g,roughRock,sulfur,x,h*.86,.12,.35,.094,.38,.26,i*.78,i*.13);
    }
    return finish(g,{hw:1.04,hd:.56,yBottom:0,yTop:.93,kind:'basaltLedge',name:'突起玄武岩棱',move:'jump'},1.51);
  }

  function steamManifold() {
    const g=new T.Group();
    for(const x of [-1.09,1.09]){
      put(g,cylinder,steel,x,1.26,-.05,.13,2.51,.13,0,0,x*.06);
      put(g,cylinder,paint,x,1.99,.05,.20,.26,.23);
    }
    for(const y of [1.79,2.26]){
      put(g,cylinder,paint,0,y,.02,.16,2.00,.17,0,0,Math.PI/2);
      for(const x of [-.65,0,.65]) put(g,cylinder,steel,x,y,.02,.193,.13,.193,0,0,Math.PI/2);
    }
    put(g,ring,cherry,0,2.48,.07,.27,.25,.77,.16);
    put(g,box,steel,0,2.48,.06,.49,.033,.05,0,0,.48);
    return finish(g,{hw:1.02,hd:.47,yBottom:1.55,yTop:2.72,kind:'steamManifold',name:'低压蒸汽管组',move:'duck'},3.11);
  }

  function geyserVent() {
    const g=new T.Group(), elements=[];
    put(g,cylinder,basalt,0,.25,0,1.02,.47,.95);
    put(g,cylinder,sulfur,0,.45,0,.78,.10,.74);
    put(g,cylinder,hot,0,.511,0,.68,.033,.62);
    for(let i=0;i<10;i++){
      const angle=i*2.39, r=(i%3)*.158;
      const cloud=put(g,ball,vapor,Math.cos(angle)*r,1.35,Math.sin(angle)*r,.37,.57,.37);
      elements.push({cloud,angle,r,delay:i*.618%1});
    }
    return finish(g,{hw:1.05,hd:1.07,yBottom:0,yTop:3.20,kind:'geyserVent',name:'猛烈喷发的间歇泉',move:'lane',animate:t=>{
      for(const {cloud,angle,r,delay} of elements){
        const p=(t*.8+delay)%1, size=.32+p*.45;
        cloud.position.set(Math.cos(angle)*r*(p+1),.55+p*2.64,Math.sin(angle)*r*(p+1));
        cloud.scale.set(size,size*(.76+p*.42),size*.96);
      }
    }},3.71);
  }

  const cleatWood=matte(0x6a7159);
  const extraTrips = {
    orchardTwine:['松脱果树绑绳',bambooEnds,cedar,'cord'],
    sawmillChain:['横地木料链',steel,grain,'chain'],
    mangroveCleat:['绊脚系船桩',cleatWood,oldWood,'cleat'],
    mineCable:['裸露矿灯电线',rubber,paint,'cord'],
    desertRibs:['半埋风化枯枝',bambooEnds,redRock,'ribs'],
    dockChain:['拖地锚链',steel,cherry,'chain'],
    geothermalCable:['破损测温线',rubber,sulfur,'cord']
  };

  function extraTrip(kind) {
    const g=new T.Group(), [name,material,ends,form]=extraTrips[kind];
    if(form==='chain') {
      for(let i=0;i<11;i++) put(g,ring,material,(i-5)*.166,.12+.045*Math.sin(i*.7),.07*Math.cos(i*.44),.133,.079,.54,
        i%2 ? 1.22 : .28,.03,i*.04);
    } else if(form==='ribs') {
      for(let i=0;i<7;i++) {
        const x=(i-3)*.29;
        branch(g,[x,.023,-.31],[x*.94+.097,.23+.048*Math.sin(i),.077],.056,.027,material,6);
        put(g,roughRock,ends,x,.074,-.24,.17,.13,.28,0,i*.51);
      }
    } else {
      tube(g,[[-1,.06,.15],[-.68,.13,.02],[-.28,.23,.14],[.27,.18,-.064],[.68,.27,.14],[1,.05,.023]],.051,material,10);
      if(form==='cleat') put(g,box,ends,0,.24,0,.57,.09,.17,0,0,.10);
    }
    for(const x of [-.84,.84]) put(g,box,ends,x,.083,-.016,.33,.151,.37,.12,x*.21,.09);
    return finish(g,{hw:1.00,hd:.44,yBottom:0,yTop:.35,kind,name,move:'jump',trip:true},1.09);
  }

  const tripNames={
    tripRoot:'凸出树根',tripBridge:'松脱桥索',tripBamboo:'横卧竹枝',tripRiver:'浮出水面的缆绳',
    tripRuin:'翘起的石砖',tripSnow:'积雪下的断桩',tripCity:'破裂电缆槽',tripOrbit:'松脱固定带'
  };
  const blackRubber=matte(0x4e3c3b,{roughness:.81});
  const coldBraid=matte(0x9baabd,{roughness:.81});
  const wetCoil=surface('deck',0x53665c);
  const tripMats={
    tripRoot:surface('bark',0xa28863),tripBridge:oldWood,tripBamboo:bamboo,tripRiver:wetCoil,
    tripRuin:blocks,tripSnow:snow,tripCity:navy,tripOrbit:coldBraid
  };
  function trip(id) {
    const group=new T.Group();
    const material=tripMats[id];
    if(id==='tripRuin' || id==='tripSnow') {
      for(let i=0;i<4;i++){
        const x=(i-1.5)*.47;
        put(group,id==='tripSnow' ? roughRock : box,material,x,.116,(i%2)*.084,
          id==='tripSnow' ? .278 : .43,.22,.44,.055,i*.29,.11*(i-2));
      }
      if(id==='tripSnow') put(group,box,oldWood,.21,.196,.068,1.01,.158,.18,.07,.22,-.17);
    } else if(id==='tripCity' || id==='tripOrbit') {
      const stripe=id==='tripCity' ? cyan : gold;
      const cable=id==='tripCity' ? blackRubber : material;
      for(const x of [-.79,.81]) put(group,box,material,x,.12,0,.44,.26,.49,0,x*.11,.12);
      tube(group,[[-.95,.145,0],[-.49,.20,-.08],[.12,.31,.023],[.57,.23,.11],[.98,.15,0]],.063,cable,11);
      for(const x of [-.78,.81]) put(group,box,stripe,x,.269,.08,.285,.025,.096,0,x*.13,.16);
    } else {
      const radius=id==='tripRoot' ? .123 : .073;
      tube(group,[[-1.06,.06,.16],[-.6,.15,-.03],[-.17,.228,.012],[.44,.15,.17],[1.04,.06,.045]],radius,material,11);
      if(id==='tripRoot') {
        branch(group,[-.51,.15,0],[-.68,.08,-.40],.091,.034,material,6);
        branch(group,[.63,.14,.15],[.88,.05,.47],.074,.034,material,6);
      } else if(id==='tripBamboo') {
        branch(group,[-.77,.15,.06],[.81,.28,.066],.065,.055,bamboo,7);
        for(const x of [-.52,0,.52]) put(group,ring,bambooEnds,x,.20,.062,.068,.066,.40,0,Math.PI/2);
      } else {
        for(const x of [-.74,.71]) {
          put(group,ring,material,x,.08,.19,.231,.17,.51,Math.PI/2);
          if(id==='tripBridge') put(group,box,bambooEnds,x,.092,.17,.311,.121,.223,.11,x*.27,0);
        }
      }
    }
    return finish(group,{hw:.96,hd:.48,yBottom:0,yTop:.37,kind:id,name:tripNames[id],move:'jump',trip:true},1.09);
  }

  return {bambooWheel,bambooScreen,stoneLantern,pendulum,iceFangs,snowFence,maglev,streetLaser,bollards,drone,plasma,parcel,
    meteor,antenna,cargo,solar,airlock,thruster,
    appleCrate,orchardTrellis,orchardTractor,lumberStack,kilnHook,timberCarrier,oysterBaskets,mangroveLimb,strandedSkiff,
    mineSleepers,oreChute,runawayCart,sandstoneShelf,fallenSign,rollingTumbleweed,mooringFenders,hoistedContainer,
    rollingContainer,basaltLedge,steamManifold,geyserVent,
    ...Object.fromEntries(Object.keys(tripNames).map(id=>[id,()=>trip(id)])),
    ...Object.fromEntries(Object.keys(extraTrips).map(id=>[id,()=>extraTrip(id)]))};
};
