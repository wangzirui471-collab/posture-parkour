'use strict';

window.RunnerExtraScenes = (() => {
  const T=window.THREE;
  const zones = [
    {name:'秋阳果园',type:'orchard',tier:0,len:570,cadence:[2.25,2.74],rows:[
      ['appleCrate',30,6],['orchardTrellis',25,5],['orchardTractor',23,4,'major'],['orchardTwine',22,5]
    ]},
    {name:'山麓锯木场',type:'sawmill',tier:1,len:590,cadence:[2.10,2.60],rows:[
      ['lumberStack',28,6],['kilnHook',25,5],['timberCarrier',24,4,'major'],['sawmillChain',23,5]
    ]},
    {name:'红树林潮滩',type:'mangrove',tier:1,len:600,cadence:[2.03,2.55],rows:[
      ['oysterBaskets',28,6],['mangroveLimb',27,5],['strandedSkiff',26,4,'major'],['mangroveCleat',19,5]
    ]},
    {name:'琥珀矿洞',type:'mine',tier:2,len:630,cadence:[1.94,2.44],rows:[
      ['mineSleepers',25,6],['oreChute',29,5],['runawayCart',31,5,'major'],['mineCable',15,5]
    ]},
    {name:'赤壁风蚀峡谷',type:'badlands',tier:2,len:630,cadence:[1.85,2.33],rows:[
      ['sandstoneShelf',27,6],['fallenSign',26,5],['rollingTumbleweed',30,5,'major'],['desertRibs',17,5]
    ]},
    {name:'雷雨货运港',type:'harbor',tier:3,len:660,cadence:[1.74,2.23],rows:[
      ['mooringFenders',27,6],['hoistedContainer',29,5],['rollingContainer',32,5,'major'],['dockChain',12,5]
    ]},
    {name:'黑曜石热泉谷',type:'geothermal',tier:3,len:700,cadence:[1.65,2.14],rows:[
      ['basaltLedge',28,6],['steamManifold',30,5],['geyserVent',31,5,'major'],['geothermalCable',11,5]
    ]}
  ];

  const themes = {
    orchard:{fog:0xc7b98d,top:0x679eac,horizon:0xffdb97,sun:0xffdc8a,light:0xffe2a6,bounce:0x96a46c,density:.011},
    sawmill:{fog:0xa8ae93,top:0x648c97,horizon:0xe8c791,sun:0xffd597,light:0xffd8a1,bounce:0x859371,density:.012},
    mangrove:{fog:0x8db7ab,top:0x4b8d98,horizon:0xc5dbab,sun:0xf5ebbb,light:0xe1fadc,bounce:0x689e94,density:.015},
    mine:{fog:0x4e3938,top:0x2f2b37,horizon:0x8e5e3d,sun:0xea9d5a,light:0xffc874,bounce:0x897b78,density:.017,night:1,sunPower:1.08,fillPower:.68},
    badlands:{fog:0xcd9978,top:0x6286af,horizon:0xf6bc80,sun:0xffc17d,light:0xffcf9f,bounce:0xb58666,density:.010},
    harbor:{fog:0x667b89,top:0x283c55,horizon:0x829993,sun:0xc8e3d9,light:0xd6e6ff,bounce:0x778496,density:.014,sunPower:1.12,fillPower:.75,overcast:1},
    geothermal:{fog:0x776b76,top:0x495671,horizon:0xd99a7a,sun:0xffbd98,light:0xffc5a8,bounce:0x91849e,density:.014,sunPower:1.26}
  };

  const floor = {
    orchard:{track:['trail',0xcbab75,5,95],shoulder:['forest',0x9aa756,20,75]},
    sawmill:{track:['scree',0xb5a18a,4,100],shoulder:['forest',0x969684,19,71]},
    mangrove:{track:['deck',0xa39169,3,45],shoulder:[null,0x397e75]},
    mine:{track:['scree',0xa2927d,3,95],shoulder:['cliff',0x4d4242,18,76]},
    badlands:{track:['trail',0xc48964,4,107],shoulder:['scree',0xc58763,23,84]},
    harbor:{track:[null,0x8b9498],shoulder:[null,0x3d6572]},
    geothermal:{track:['cliff',0x766777,4,89],shoulder:['scree',0x625963,19,68]}
  };

  function build(kind, root, tiles, art) {
    const {box, ball, pebble, roughRock, cone, trunk, cylinder, matte, unlit, surface, flatFloor, seeded, cyclingLength:tileLength}=art;
    const add=tiles.add;
    const rand=seeded(701+zones.findIndex(zone=>zone.type===kind)*263);
    const getMaterial=([texture,color,x,z],roughness)=>texture ? surface(texture,color,x,z) :
      matte(color,{roughness});
    const {track,shoulder}=floor[kind];
    const dock=kind==='harbor' || kind==='mangrove';
    root.add(flatFloor(dock ? 124 : 154,dock ? -.53 : -.075,getMaterial(shoulder,kind==='harbor' ? .70 : .43)));
    root.add(flatFloor(kind==='harbor' ? 8.1 : 8.0,0,getMaterial(track,.79)));
    const wood=surface('deck',0x8d694c);
    const bark=surface('bark',0x977c55);
    const soil=matte(0x7f694c);
    const black=matte(0x41454a);
    const iron=matte(0x68666b,{roughness:.54,metalness:.44});
    const leaf=matte(0x6c863a);
    const olive=matte(0x87944b);
    const pine=matte(0x4e7053);
    const gold=matte(0xeaad5d);
    const cream=matte(0xf4d599);
    const salt=matte(0xbcc8b5);

    function each(step, action) {
      for(let z=-step*.35,i=0;z>-tileLength;z-=step,i++) {
        for(const side of [-1,1]) action(side,z,i);
      }
    }

    function timber(x,y,z,width,depth,wall,roof) {
      add(box,wall,x,y+1.57,z,width,3.16,depth,0,0,0,true);
      const pitch=.39, slope=width*.55;
      for(const side of [-1,1]) {
        add(box,roof,x+side*width*.247,y+3.47,z,slope,.18,depth+.54,0,0,-side*pitch,true);
        add(box,wood,x+side*width*.462,y+1.54,z+depth*.504,.16,3.03,.15);
        add(box,wood,x+side*width*.462,y+1.54,z-depth*.504,.16,3.03,.15);
      }
      add(box,black,x,y+1.17,z+depth*.51,width*.28,2.30,.05);
      add(box,roof,x,y+width*.102+3.49,z,.23,.16,depth+.58);
    }

    function fence(side,z,woodColor,high=1) {
      add(box,woodColor,side*4.45,high*.52,z,.17,high,.20,0,0,side*.03,true);
      for(const y of [.34,.69]) add(box,woodColor,side*4.45,high*y,z-2.75,.105,.105,5.58);
    }

    function grass(x,z,color,h) {
      for(let i=-1;i<=1;i++) add(cone,color,x+i*.12,h*.45,z+i*.11,.062,h,.067,0,0,i*.25);
    }

    function orchard() {
      const apple=matte(0xd55737), sunlit=matte(0xf1a743), clay=matte(0xb9704a);
      const rut=surface('trail',0xbfa078,6,26);
      each(5.5,(side,z,i)=>{
        add(box,rut,side*2.57,.002,z,.53,.015,5.46);
        add(roughRock,olive,side*(3.92+rand()*.26),.055,z+rand()*2,.33,.17,.62,0,rand()*6);
        if(i%3!==2) fence(side,z,wood,.88);
        for(let row=0;row<2;row++){
          const tx=side*(6.2+row*4.7+rand()*.48), tz=z-1.9*row, h=2.7+rand()*.73;
          add(trunk,bark,tx,h*.45,tz,.185,h*.92,.21,0,0,side*.08,true);
          add(trunk,bark,tx+side*.44,h*.65,tz,.125,h*.62,.116,0,0,side*-.49);
          for(let j=0;j<5;j++){
            const a=j*2.399, sx=Math.cos(a)*.86, sz=Math.sin(a)*.98;
            add(pebble,j%2 ? leaf : olive,tx+sx,h+rand()*.52,tz+sz,1.06,.82,1.10,0,a,.15,true);
            add(pebble,(i+j)%4 ? apple : sunlit,tx+sx*1.48,h-.23+rand()*.24,tz+sz*1.55,.129,.135,.132);
          }
        }
        if(i===5 && side===1) timber(14.2,-.10,z,5.25,6.1,cream,clay);
        if(i===11 && side===-1) {
          timber(-13.4,-.13,z,4.65,5.80,clay,wood);
          add(cylinder,iron,-16.59,2.05,z-2.8,1.29,4.1,1.29,0,0,0,true);
          add(cone,iron,-16.59,4.67,z-2.8,1.52,1.27,1.52);
        }
      });
    }

    function sawmill() {
      const logEnd=matte(0xddad73), galvanized=matte(0x546b69), panel=matte(0xaa784f);
      const darkRut=surface('trail',0x817467,2,31);
      each(5.5,(side,z,i)=>{
        add(box,darkRut,side*2.55,.005,z,.78,.021,5.47);
        add(box,wood,side*4.07,.016,z,.21,.035,5.44);
        grass(side*4.53,z,olive,.36+rand()*.26);
        const distance=side*(7.5+rand()*1.1);
        if(i%4===0 || i%4===1) {
          for(let row=0;row<3;row++){
            for(let j=0;j<4-row;j++){
              const x=distance+(j-(3-row)*.5)*.61, y=.32+row*.53;
              add(cylinder,bark,x,y,z,.32,4.0,.32,Math.PI/2,0,0,true);
              add(cylinder,logEnd,x,y,z+2.01,.285,.046,.285,Math.PI/2);
            }
          }
          add(box,wood,distance,.087,z,3.12,.16,4.75);
        }
        for(let j=0;j<2;j++){
          const x=side*(12.8+j*4.8+rand()*4.5), h=4+rand()*6;
          add(trunk,bark,x,h*.39,z,.27,h*.80,.28,0,0,0,true);
          for(let k=0;k<3;k++) add(cone,pine,x,h*(.53+k*.17),z,1.62-k*.39,h*.47,1.55-k*.35,0,i*.43);
        }
        if(i===4 || i===11){
          timber(side*8.5,-.02,z,5.75,6.3,panel,galvanized);
          add(cylinder,black,side*10,4.11,z-1.5,.27,2.7,.28);
          add(cylinder,galvanized,side*10,5.47,z-1.5,.42,.16,.42);
        }
      });
    }

    function mangrove() {
      const teal=matte(0x426f53), deep=matte(0x506f44), glow=unlit(0x83baa4,{transparent:true,opacity:.42,depthWrite:false});
      const posts=surface('deck',0x756f57), planks=surface('deck',0xaf9166), seam=matte(0x625748);
      each(4.4,(side,z,i)=>{
        add(box,planks,side*4.05,-.087,z,.36,.21,4.39);
        add(cylinder,posts,side*4.24,0,z,.128,1.27,.136,0,0,side*.03,true);
        if(i%4===0) add(box,cream,side*4.24,.61,z,.28,.097,.29);
        add(box,seam,side*2.0,.004,z+.90,3.94,.017,.032);
        add(box,seam,side*2.0,.004,z+.14,3.93,.017,.032);
        add(box,seam,side*2.0,.004,z-1.43,3.96,.017,.032);
        const x=side*(5.8+rand()*7.3), h=2.8+rand()*2.4;
        add(trunk,bark,x,h*.43,z,.29,h,.31,0,0,.09*side,true);
        for(let j=0;j<7;j++){
          const a=j*Math.PI*2/7;
          add(trunk,bark,x+Math.cos(a)*.61,.42,z+Math.sin(a)*.61,.11,2.00,.12,
            Math.sin(a)*-.58,0,Math.cos(a)*.58);
        }
        for(let j=0;j<4;j++){
          const a=j*2.4;
          add(roughRock,j%3 ? teal : deep,x+Math.cos(a)*1.01,h-.20+j*.27,z+Math.sin(a)*.99,
            1.61,.86,1.47,.23,a,.13,true);
        }
        for(let j=0;j<4;j++){
          const wx=side*(4.65+rand()*8.3), wz=z+rand()*3;
          add(box,glow,wx,-.508,wz,.30+rand()*1.43,.012,.022,0,rand()*.2);
          if(j<2) grass(wx,wz,olive,.19+rand()*.36);
        }
        if(i%5===0) add(roughRock,soil,side*18,-.35,z,4.15,1.4,5.4,.13,rand()*6);
      });
    }

    function mine() {
      const shale=surface('cliff',0x79615d), rock=surface('cliff',0x8a6250), quartz=matte(0xc58d54);
      const lamp=unlit(0xffcb80);
      each(4.4,(side,z,i)=>{
        add(roughRock,shale,side*(6.6+rand()*.64),2.62,z,2.36,4.78,3.25,.33,i,side*.12,true);
        add(roughRock,rock,side*(4.8+rand()*.52),.36,z,.75,.57,1.24,.44,rand()*6,.12);
        add(roughRock,shale,side*(3.7+rand()*.44),5.92,z,4.27,1.78,3.27,.10,i*.62,.12*side);
        add(box,wood,side*3.95,.028,z+.12,.53,.06,.46);
        add(box,iron,side*3.72,.039,z,.073,.076,4.4);
        if(i%2===0){
          add(box,wood,side*4.82,2.21,z,.33,4.55,.43,0,0,side*.15,true);
          add(box,wood,side*3.86,4.40,z,2.05,.31,.45,0,0,-side*.35,true);
          add(box,wood,side*1.21,4.74,z,3.97,.31,.46,0,0,side*.04,true);
          add(box,black,side*3.88,3.89,z,.32,.33,.39);
          add(box,lamp,side*3.72,3.88,z+.02,.104,.24,.29);
          add(roughRock,quartz,side*6.06,1.41,z+.94,.42,.74,.33,-.18,i*.31,.12);
        }
      });
    }

    function badlands() {
      const [cap,body,shadow]=[0xc08462,0xb76c4b,0x9f563e].map(color=>surface('cliff',color));
      const cactus=matte(0x7d8254), brightSand=matte(0xd6ad7b), brush=matte(0xb9985c);
      each(4.4,(side,z,i)=>{
        const x=side*(7+rand()*3.5), tall=1.85+rand()*2.25;
        for(let k=0;k<3;k++){
          const mat=[shadow,body,cap][k];
          add(roughRock,mat,x+side*.35*k,tall*(.33+k*.42),z,3.4-k*.55,tall*.67,3.10-k*.31,
            .08,Math.PI*i*.29,.085*k,true);
        }
        add(roughRock,cap,side*(18.6+rand()*9),1.3,z,4.5+rand()*3.4,6.4+rand()*5.5,4.2,.16,i*.7,.12);
        if(i%3===0){
          const tx=side*(4.5+rand()*.6), h=1.34+rand()*.79;
          add(cylinder,cactus,tx,h*.49,z,.16,h,.19);
          add(ball,cactus,tx,h*.99,z,.158,.16,.17);
          for(const s of [-1,1]){
            add(cylinder,cactus,tx+s*.2,h*.57,z,.106,.55,.113,0,0,s*.90);
            add(cylinder,cactus,tx+s*.37,h*.72,z,.102,h*.31,.110);
            add(ball,cactus,tx+s*.37,h*.89,z,.105,.12,.105);
          }
        } else {
          grass(side*(4.28+rand()*1.7),z,brush,.23+rand()*.26);
          add(roughRock,brightSand,side*(4.23+rand()*1.1),.035,z+.43,.28,.19,.41,.13,i*.41);
        }
      });
    }

    function harbor() {
      const concrete=surface('ruin',0x92918b), rust=matte(0xa45439), marine=matte(0x447587);
      const yellow=matte(0xd19449), signal=unlit(0xf9d38c), pool=matte(0x63727b,{roughness:.21,metalness:.30});
      const seam=matte(0x737b81);
      each(4.4,(side,z,i)=>{
        add(box,concrete,side*4.16,-.22,z,.55,.50,4.4,0,0,0,true);
        add(box,yellow,side*3.83,.009,z,.084,.019,3.43);
        add(box,seam,side*1.98,.004,z+.91,3.97,.010,.030);
        add(box,pool,side*(2.35+rand()*.98),.012,z+.4,.50+rand()*.5,.012,.46+rand()*.85,0,i*.88);
        if(i%2===0){
          add(cylinder,black,side*4.33,.16,z,.18,.48,.18,0,0,0,true);
          add(cylinder,yellow,side*4.33,.43,z,.25,.13,.24);
        }
        if(i%4===1){
          const x=side*8.7, y=side===1 ? 0 : -.18;
          add(box,concrete,x,-.44,z,6,.4,8.52);
          for(let level=0;level<2;level++){
            const c=(i+level)%3===0 ? yellow : ((i+level)%2 ? rust : marine);
            add(box,c,x,y+level*1.63+.79,z,2.65,1.59,6.9,0,0,0,true);
            for(let bar=0;bar<9;bar++) add(box,c,x-side*1.36,y+level*1.63+.79,z+(bar-4)*.75,.086,1.43,.11);
            for(const end of [-1,1]) add(box,iron,x+end*1.23,y+level*1.63+.81,z+3.47,.086,1.31,.039);
          }
        }
        if(i===3 || i===14){
          const x=side*13.5;
          add(box,marine,x,4.6,z,1.35,9.2,1.21,0,0,0,true);
          add(box,rust,x-side*3.9,9.05,z,9.75,.43,1.16,0,0,side*.11,true);
          add(box,marine,x-side*1.42,7.42,z,3.85,.40,1.05,0,0,side*-.48);
          add(box,yellow,x-side*8.38,7.92,z,.94,.31,.79);
          add(cylinder,iron,x-side*8.35,6.00,z,.047,3.71,.048);
          add(ball,signal,x-side*8.40,8.19,z,.14,.18,.14);
        }
      });
      const strokes=Array.from({length:350},()=>[rand()*30-15,rand(),rand()*70-60,.19+rand()*.35]);
      const geometry=new T.BufferGeometry();
      const position=new T.Float32BufferAttribute(new Float32Array(strokes.length*6),3);
      position.setUsage(T.DynamicDrawUsage);
      geometry.setAttribute('position',position);
      const rain=new T.LineSegments(geometry,new T.LineBasicMaterial({
        color:0xa4b9ca,transparent:true,opacity:.30,depthWrite:false
      }));
      rain.frustumCulled=false;
      root.add(rain);
      return elapsed=>{
        for(const [i,[x,phase,z,length]] of strokes.entries()){
          const y=11*(1-(elapsed*(.91+length)+phase)%1);
          const wind=x+y*.28;
          position.setXYZ(i*2,wind,y,z);
          position.setXYZ(i*2+1,wind+length*.28,y+length,z);
        }
        position.needsUpdate=true;
      };
    }

    function geothermal() {
      const basalt=surface('cliff',0x524e60), purplish=surface('cliff',0x7b5368);
      const ochre=matte(0xbf9668), mineral=matte(0x5fb5aa,{roughness:.34,metalness:.18});
      const vapor=unlit(0xcde0dc,{transparent:true,opacity:.13,depthWrite:false});
      const groundPipe=matte(0x785744,{roughness:.58,metalness:.26});
      const vents=[];
      each(4.4,(side,z,i)=>{
        for(let j=0;j<3;j++){
          const x=side*(5.20+j*.92+rand()*.34), h=.49+rand()*2.2;
          add(trunk,j%3 ? basalt : purplish,x,h*.42,z+j*.6,.54,h,.63,.09,i*.81,side*.13,true);
        }
        add(roughRock,basalt,side*(13+rand()*4),.96,z,3.0,3.83,3.42,.19,rand()*6,.29);
        if(i%2===0){
          const tx=side*(7.8+rand()*1.4), tz=z+1.20;
          add(cylinder,salt,tx,-.009,tz,1.97,.19,1.70,0,i*.73);
          add(cylinder,ochre,tx,.092,tz,1.61,.09,1.34,0,i*.73);
          add(cylinder,mineral,tx,.146,tz,1.31,.04,1.11,0,i*.73);
          if(i%4===0) vents.push([tx,tz]);
        }
        add(cylinder,groundPipe,side*4.17,.13,z,.085,4.40,.088,Math.PI/2);
        add(cylinder,iron,side*4.17,.13,z+.76,.113,.15,.113,Math.PI/2);
      });
      const steam=new T.Group();
      root.add(steam);
      const clouds=vents.map(([x,z],i)=>{
        const mesh=new T.Mesh(ball,vapor);
        steam.add(mesh);
        return {mesh,x,z,phase:i*.618%1};
      });
      return (elapsed,travel)=>{
        for(const {mesh,x,z,phase} of clouds){
          const p=(elapsed*.28+phase)%1;
          mesh.position.set(x+Math.sin(p*3)*.35,.16+2.35*p,((z+travel+8)%tileLength+tileLength)%tileLength-tileLength+8);
          mesh.scale.set(.24+p*.63,.17+p*.33,.25+p*.64);
        }
      };
    }

    return {orchard,sawmill,mangrove,mine,badlands,harbor,geothermal}[kind]();
  }

  return {zones,themes,build};
})();
