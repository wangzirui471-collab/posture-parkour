'use strict';

window.RunnerGear = (() => {
  const T=window.THREE;
  const {box,ball,cone,cylinder,ring,put,matte,unlit}=RunnerArt;
  const brass=matte(0xe8a059,{metalness:.43,roughness:.37,emissive:0x3c1a08});
  const gold=unlit(0xffd582), pearl=unlit(0xffffe9);
  const cyan=unlit(0x8ceaff), mint=unlit(0x8ffff2);
  const blue=matte(0x35769a,{metalness:.43,roughness:.35});
  const gray=matte(0xb7c3c9,{metalness:.55,roughness:.32});
  const dark=matte(0x283149,{metalness:.28,roughness:.61});
  const rocketRed=matte(0xe67854,{metalness:.23,roughness:.44});
  const flame=unlit(0xa5e8ff,{transparent:true,opacity:.80,depthWrite:false});
  const outerFlame=unlit(0x70a4f9,{transparent:true,opacity:.30,depthWrite:false});
  const honeyHex=new T.CylinderGeometry(1,1,1,6);
  const pickupColors={shield:0xffd583,shoes:0x92fbed,rocket:0x9fdbff};
  const captions={shield:'护盾蜂蜜罐',shoes:'弹跳鞋',rocket:'火箭背包'};

  function coin() {
    const g=new T.Group();
    put(g,cylinder,brass,0,0,0,.234,.099,.234,Math.PI/2);
    for(const sign of [-1,1]) {
      put(g,cylinder,gold,0,0,sign*.055,.201,.019,.201,Math.PI/2);
      put(g,box,brass,0,0,sign*.070,.096,.096,.018,0,0,Math.PI/4);
      put(g,box,pearl,0,0,sign*.082,.041,.041,.013,0,0,Math.PI/4);
    }
    return g;
  }

  function honeyJar() {
    const g=new T.Group();
    put(g,ball,brass,0,-.09,0,.37,.31,.34);
    put(g,cylinder,gold,0,.155,0,.25,.14,.25);
    put(g,cylinder,brass,0,.23,0,.29,.12,.28);
    put(g,ring,pearl,0,.176,0,.262,.25,.65,Math.PI/2);
    put(g,ball,pearl,0,-.075,.315,.125,.123,.045);
    put(g,honeyHex,brass,0,-.081,.357,.063,.028,.063,Math.PI/2);
    put(g,ring,gold,0,-.38,0,.49,.49,.38,Math.PI/2);
    return g;
  }

  function boot(parent) {
    const g=new T.Group();
    parent.add(g);
    put(g,ball,blue,0,-.027,.095,.161,.101,.258);
    put(g,ball,dark,0,-.077,.112,.165,.064,.246);
    put(g,box,gray,0,-.103,.064,.27,.048,.27,0,0,.06);
    put(g,ring,mint,0,-.079,.04,.131,.066,.49,Math.PI/2);
    put(g,box,cyan,0,-.003,.243,.22,.037,.046);
    return g;
  }

  function shoePickup() {
    const g=new T.Group();
    const a=boot(g),b=boot(g);
    a.position.set(-.21,-.024,0); a.rotation.set(.08,.41,-.09);
    b.position.set(.19,.069,.07); b.rotation.set(.12,-.29,.18);
    g.scale.setScalar(1.6);
    return g;
  }

  function rocketPack() {
    const g=new T.Group(), jets=new T.Group();
    put(g,box,dark,0,.04,.02,.62,.91,.30);
    put(g,box,gray,0,.05,.205,.42,.65,.12);
    put(g,box,cyan,0,.11,.277,.18,.18,.026);
    for(const x of [-.34,.34]){
      put(g,cylinder,gray,x,0,.021,.18,.76,.18);
      put(g,cone,rocketRed,x,.46,.02,.181,.28,.181);
      put(g,cylinder,blue,x,-.38,.023,.193,.126,.193);
      put(g,cylinder,mint,x,-.456,.023,.136,.047,.136);
      put(jets,cone,flame,x,-.84,.024,.088,.83,.088,Math.PI);
      put(jets,cone,outerFlame,x,-1.03,.027,.15,1.21,.15,Math.PI);
    }
    g.add(jets);
    return {g,jets};
  }

  function pickup(kind) {
    if(kind==='coin') return coin();
    const g=kind==='shield' ? honeyJar() : (kind==='shoes' ? shoePickup() : rocketPack().g);
    put(g,ring,unlitPickup[kind],0,-.43,0,.63,.63,.62,Math.PI/2);
    if(kind==='rocket') g.scale.setScalar(.77);
    return g;
  }

  const unlitPickup=Object.fromEntries(Object.entries(pickupColors).map(([k,v])=>[k,unlit(v)]));
  const shieldShape=new T.SphereGeometry(1,40,22,0,Math.PI*2,0,1.79);
  const shieldVertex=`
    varying vec3 vN; varying vec3 vV; varying vec3 p;
    void main(){
      vec4 mv=modelViewMatrix*vec4(position,1.);
      vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); p=position;
      gl_Position=projectionMatrix*mv;
    }`;
  const shieldFragment=`
    uniform float time; uniform float life;
    varying vec3 vN; varying vec3 vV; varying vec3 p;
    void main(){
      float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.25);
      float scan=pow(.5+.5*cos(p.y*49.-time*3.3),13.)*.19;
      float edge=smoothstep(-.198,-.08,p.y);
      vec3 col=mix(vec3(.98,.66,.24),vec3(.66,.96,1.),smoothstep(.18,.93,rim+scan));
      gl_FragColor=vec4(col,(.044+.55*rim+scan)*edge*life);
    }`;

  function equip(model) {
    const {head,feet,back,shieldScale=1,shoeScale=1}=model.equipment;
    const dome=new T.Group();
    dome.position.set(0,.13,.083);
    dome.name='bear-shield-dome';
    const screen=new T.ShaderMaterial({uniforms:{time:{value:0},life:{value:1}},
      transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:shieldVertex,fragmentShader:shieldFragment});
    dome.add(new T.Mesh(shieldShape,screen));
    const edge=put(dome,ring,unlit(0xffdb87,{opacity:.58,transparent:true,depthWrite:false}),0,-.145,0,.94,.94,.35,Math.PI/2);
    edge.renderOrder=2;
    head.add(dome);
    const boots=feet.map(boot);
    boots.forEach(b=>{
      b.name='bear-bounce-boot';
      b.scale.setScalar(shoeScale);
    });
    const pack=rocketPack();
    pack.g.name='bear-rocket-pack';
    pack.g.position.set(...(back ?? [0,1.48,-.65]));
    pack.g.rotation.y=Math.PI;
    pack.g.scale.setScalar(.84);
    model.group.add(pack.g);
    function update({guard,burst,shoes,flight,elapsed}) {
      dome.visible=guard || burst>0;
      screen.uniforms.time.value=elapsed;
      screen.uniforms.life.value=guard ? 1 : burst;
      edge.material.opacity=guard ? .46+.16*Math.sin(elapsed*3.5) : .55*burst;
      const swelling=guard ? 1 + .022*Math.sin(elapsed*4) : 1 + (1-burst)*.26;
      dome.scale.set(.98,.91,1.01).multiplyScalar(swelling*shieldScale);
      boots.forEach(b=>{b.visible=shoes>0;});
      pack.g.visible=flight;
      pack.jets.visible=flight;
      pack.jets.scale.y=.83+.24*Math.sin(elapsed*29.3);
    }
    update({guard:false,burst:0,shoes:0,flight:false,elapsed:0});
    return {update};
  }

  return {pickup,equip,captions};
})();
