'use strict';

window.RunnerCampaign = (() => {
  // Base weights per biome and per-visit caps, before recent-hazard exclusions.
  const zones = [
    { name:'晨雾松林',type:'forest',tier:0,len:560, cadence:[2.36,2.84], rows:[
      ['log',18,4],['treehole',15,3],['stump',10,3],['vine',13,3],['elephant',9,2],
      ['hive',9,3],['bees',7,2],['tiger',5,2,'major'],['apes',4,1,'major'],['tripRoot',10,5]
    ] },
    { name:'峡谷断桥',type:'bridge',tier:1,len:430, cadence:[2.18,2.67], rows:[
      ['plank',33,5],['halfgap',26,3,'major'],['bridgeRope',19,3],['gap',12,2,'major'],['tripBridge',10,4]
    ] },
    { name:'雾谷竹林',type:'bamboo',tier:0,len:555, cadence:[2.04,2.54], rows:[
      ['bambooBundle',21,5],['bambooCanes',19,4],['monkey',19,3,'major'],
      ['bambooWheel',16,3,'major'],['bambooScreen',15,4],['tripBamboo',10,5]
    ] },
    { name:'翡翠溪流',type:'river',tier:1,len:530, cadence:[2.10,2.62], rows:[
      ['drift',43,6],['riverRock',27,5],['whirl',20,3,'major'],['tripRiver',10,4]
    ] },
    { name:'石壁遗迹',type:'ruins',tier:2,len:570, cadence:[1.91,2.46], rows:[
      ['ruinStep',22,5],['ruinedGate',20,4],['statue',18,3,'major'],
      ['stoneLantern',16,4],['pendulum',14,3,'major'],['tripRuin',10,5]
    ] },
    { name:'雪岭栈道',type:'snow',tier:2,len:560, cadence:[1.85,2.42], rows:[
      ['snowbank',22,5],['frozenLimb',20,4],['rockslide',19,3,'major'],
      ['iceFangs',16,4],['snowFence',13,4,'major'],['tripSnow',10,5]
    ] },
    { name:'霓虹未来城',type:'cyber',tier:3,len:800,cadence:[1.90,2.38],rows:[
      ['maglev',18,4,'major'],['streetLaser',19,5],['bollards',18,5],
      ['drone',15,4],['plasma',12,3,'major'],['parcel',8,4],['tripCity',10,5]
    ] },
    { name:'轨道空间站',type:'orbit',tier:4,len:710,cadence:[1.56,1.91],rows:[
      ['meteor',20,5,'major'],['antenna',16,5],['cargo',17,5],
      ['solar',14,4,'major'],['airlock',14,4],['thruster',9,4,'major'],['tripOrbit',10,5]
    ] },
    ...(window.RunnerExtraScenes?.zones ?? [])
  ];
  const orbitIndex=zones.findIndex(zone=>zone.type==='orbit');

  const difficulties = {
    normal:{name:'普通',base:24,limit:54,scale:1.0,floor:1.52,warning:1.58,recovery:1.06,majorWeight:1,targetBias:0,pairs:.14,triples:.055},
    hard:{name:'困难',base:34,limit:74,scale:.66,floor:1.27,warning:1.45,recovery:.96,majorWeight:1.77,targetBias:.62,pairs:.38,triples:.19},
    devil:{name:'魔鬼',base:42,limit:88,scale:.52,floor:1.16,warning:1.35,recovery:.90,majorWeight:2.58,targetBias:.85,pairs:.46,triples:.34}
  };
  const defaultMode=difficulties.normal;
  function pace(mode,distance,orbit) {
    const progressive=mode.base+distance*.0094;
    return orbit ? Math.min(mode.limit+11,Math.max(mode.base+22,progressive)+6) : Math.min(mode.limit,progressive);
  }
  function spawnDepth(mode,speed,obstacle,previous) {
    const contact=obstacle.hd+.4;
    const closing=speed+(obstacle.advance || 0);
    let seconds=mode.warning;
    if(previous && previous.z<previous.hd+.4) {
      const clear=(-previous.z+previous.hd+.4)/(speed*.91);
      const recover=previous.kind==='gap' ? 1.10 : mode.recovery;
      seconds=Math.max(seconds,clear+recover);
    }
    return Math.max(72,closing*seconds+contact);
  }

  function weighted(rows,weight,random) {
    let roll=random()*rows.reduce((sum,row)=>sum+weight(row),0);
    return rows.find(row=>(roll-=weight(row))<0);
  }

  function formationSize(mode,section,random=Math.random) {
    const gate=mode===defaultMode ? 3 : mode===difficulties.hard ? 1 : 0;
    const triples=section>=gate ? mode.triples : 0;
    const roll=random();
    return roll<triples ? 3 : roll<triples+mode.pairs ? 2 : 1;
  }

  function playlist(zone,random=Math.random,mode=defaultMode) {
    const counts=new Map();
    let previous;
    const weight=row=>row[1]*(row[3]==='major' ? mode.majorWeight : 1);
    function draw() {
      const candidates=zone.rows.filter(([key,,limit,tier]) => {
        return key!==previous?.[0] && (counts.get(key) || 0)<limit &&
          !(tier==='major' && (!previous || previous[3]==='major'));
      });
      const pick=weighted(candidates,weight,random);
      if(!pick) return null;
      counts.set(pick[0],(counts.get(pick[0]) || 0)+1);
      previous=pick;
      return pick[0];
    }
    function companion(excluded,accept) {
      const pool=zone.rows.filter(([id,,limit])=>!excluded.has(id) && (counts.get(id) || 0)<limit);
      while(pool.length) {
        const pick=weighted(pool,weight,random);
        const id=pick[0];
        if(accept(id)) {
          counts.set(id,(counts.get(id) || 0)+1);
          return id;
        }
        pool.splice(pool.indexOf(pick),1);
      }
      return null;
    }
    function interval(speed,completed,setting=mode) {
      const [min,max]=zone.cadence;
      const tightening=zone.type==='orbit' ? .02 : Math.min(.23,completed*.048);
      return speed*Math.max(setting.floor,(min+(max-min)*random()-tightening)*setting.scale);
    }
    return {draw,companion,interval};
  }

  function supplyDrop({guard,shoes,orbital,shieldPlaced,shoesPlaced},random=Math.random) {
    const roll=random();
    if(!orbital && !guard && !shieldPlaced && roll<.035) return 'shield';
    if(!shoes && !shoesPlaced && roll>=.035 && roll<.175) return 'shoes';
    return null;
  }

  const tierLabels=['入门','进阶','险境','极限'];
  function route(random=Math.random) {
    const bands=tierLabels.map((_,tier)=>zones.map((zone,index)=>({zone,index}))
      .filter(({zone,index})=>zone.tier===tier && index!==orbitIndex).map(({index})=>index));
    const opensAt=[0,1,3,5], chance=[0,.47,.34,.25];
    const seen=[];
    let section=0, tier=0, tierStart=0;
    function pick() {
      const fresh=bands[tier].filter(index=>!seen.includes(index));
      const other=bands[tier].filter(index=>index!==seen.at(-1));
      const list=fresh.length ? fresh : other.length ? other : bands[tier];
      return list[Math.floor(random()*list.length)];
    }
    function visit(index) {
      seen.push(index);
      if(seen.length>2) seen.shift();
      return index;
    }
    return {
      get section(){return section;},
      start(index) {
        seen.length=0;
        section=tierStart=0;
        const forced=index!==orbitIndex && Number.isInteger(index) && zones[index];
        tier=forced ? zones[index].tier : 0;
        return visit(forced ? index : pick());
      },
      advance() {
        section++;
        const next=tier+1, spent=section-tierStart;
        if(next<bands.length && bands[next].length && section>=opensAt[next] &&
          (spent>=4 || random()<chance[next]+.10*Math.max(0,spent-1))) {
          tier=next;
          tierStart=section;
        }
        return visit(pick());
      }
    };
  }

  return {zones,orbitIndex,difficulties,pace,spawnDepth,playlist,supplyDrop,formationSize,route,tierLabels};
})();
