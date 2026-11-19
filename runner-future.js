'use strict';

window.RunnerFuture = (() => {
  const T=window.THREE;

  function graphic(width,height,draw) {
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    draw(canvas.getContext('2d'),width,height);
    const texture=new T.CanvasTexture(canvas);
    texture.encoding=T.sRGBEncoding;
    texture.anisotropy=8;
    return texture;
  }

  function facade(seed,color) {
    const rand=seed;
    return graphic(128,384,(c,w,h)=>{
      c.fillStyle='#121727';
      c.fillRect(0,0,w,h);
      for(let j=0;j<24;j++) {
        c.fillStyle=j%6 ? '#202940' : '#34435b';
        c.fillRect(0,j*16,w,j%6 ? 1 : 3);
        for(let i=0;i<7;i++) {
          const x=8+i*17,y=j*16+5;
          c.fillStyle=rand()<.64?'#1b2638':color;
          c.fillRect(x,y,9,7);
          c.fillStyle='#080c17';
          c.fillRect(x,y+6,9,1);
          c.fillRect(x+4,y,1,7);
        }
      }
      c.fillStyle='#080c16';
      c.fillRect(0,0,4,h);
      c.fillRect(w-4,0,4,h);
    });
  }

  function signTexture(text,base,ink) {
    return graphic(256,96,(c,w,h)=>{
      c.fillStyle=base;
      c.fillRect(0,0,w,h);
      c.lineWidth=3;
      c.strokeStyle=ink;
      c.strokeRect(5,5,w-10,h-10);
      c.fillStyle=ink;
      c.font='bold 47px Microsoft YaHei,sans-serif';
      c.textBaseline='middle';
      c.textAlign='center';
      c.fillText(text,w*.5,h*.52);
    });
  }

  function wetStreet(art) {
    const road=art.matte(0x333d53,{roughness:.42,metalness:.24});
    road.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 streetPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n streetPoint=position;');
      shader.fragmentShader='varying vec3 streetPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        float x=streetPoint.x, z=streetPoint.z;
        float n=fract(sin(dot(floor(vec2(x,z)*42.),vec2(17.24,93.1)))*24132.);
        vec3 wet=vec3(.017,.025,.049)*(n*.39+.70);
        float streak=pow(max(0.,sin(z*.18+x*1.3)*sin(z*.31-x*2.)),4.);
        vec3 cyan=vec3(.021,.16,.22)*streak*exp(-abs(x+2.6)*.69);
        vec3 rose=vec3(.21,.026,.11)*streak*exp(-abs(x-2.6)*.73);
        float line=1.-smoothstep(.023,.062,abs(abs(x)-1.3));
        float dashed=smoothstep(.63,.70,fract(z*.153));
        diffuseColor.rgb=wet+cyan+rose+vec3(.16,.21,.28)*line*dashed;
      `);
    };
    return road;
  }

  function cyber(root,tiles,art) {
    const {box,cone,cylinder,matte,unlit,flatFloor,put,seeded}=art;
    const rand=seeded(60915);
    const curb=matte(0x344150), dark=matte(0x172334,{metalness:.36,roughness:.61});
    const teal=unlit(0x57e9fa), pink=unlit(0xff619a), purple=unlit(0xc896ff), white=unlit(0xeee9db);
    const rail=matte(0x344967,{roughness:.47,metalness:.47});
    root.add(flatFloor(9.1,0,wetStreet(art)),flatFloor(210,-.16,unlit(0x253146)));
    const litMaterials=['#79d5e8','#ff9a7f','#bd9dff','#c0ebf6'].map(color=>{
      const map=facade(rand,color);
      return matte(0x637591,{map,emissive:0x7892bc,emissiveMap:map,emissiveIntensity:.56,roughness:.71});
    });
    const panels=['云端站','环城线','空港','第七码'].map((name,i)=>unlit(0xffffff,{
      map:signTexture(name,i%2 ? '#1a102d':'#122733',i%2 ? '#f7a5ed':'#a5f5ff')
    }));
    const sign=new T.PlaneGeometry(1,1);
    for(const side of [-1,1]) {
      const glow=side<0 ? teal : pink;
      for(let i=0;i<16;i++) {
        const z=-i*5.5+(rand()-.5)*1.8,w=3.4+rand()*4.2,h=10+rand()*22;
        const x=side*(11+rand()*5.7);
        tiles.add(box,litMaterials[i%4],x,h*.5,z,w,h,4.6+rand()*2.7,0,(rand()-.5)*.14,0);
        tiles.add(box,dark,x,h+.18,z,w*1.06,.42,5.7,0,0,0);
        tiles.add(box,litMaterials[(i+1)%4],x+side*(7+rand()*9),h*.71,z-3.25,w*1.2,h*1.43,6.8,0,(rand()-.5)*.1,0);
        if(i%3===0) {
          tiles.add(box,dark,side*7.73,1.49,z,w*.66,2.96,2.73,0,side*.17,0);
          tiles.add(box,rail,side*7.21,2.93,z+1.01,w*.57,.37,.92,0,side*.17,0);
          tiles.add(box,glow,side*7.21,2.75,z+1.49,w*.50,.054,.064,0,side*.17,0);
          tiles.add(box,glow,x-side*w*.49,h*.51,z+.04,.085,h*.77,.065);
          tiles.add(box,purple,x,3.0,z+2.7,w*.88,.09,.14);
          tiles.add(sign,panels[(i+(side+1))%panels.length],side*(6.58+rand()*.8),4.1+rand()*3.15,z,3.22,1.17,1,0,side*-.36,0);
          tiles.add(box,dark,side*6.7,3.8,z-.08,3.31,1.28,.09,0,side*-.36,0);
        }
        tiles.add(box,curb,side*4.94,-.085,z,1.12,.17,5.74,0,0,0,true);
        tiles.add(box,glow,side*4.51,.055,z,.064,.028,4.52);
        if(i%2===0) {
          tiles.add(cylinder,rail,side*5.17,1.93,z,.068,3.96,.068,0,0,side*.08);
          tiles.add(box,white,side*4.92,3.92,z,.72,.092,.26,0,0,side*.1);
          tiles.add(box,rail,side*5.81,.48,z+.83,.56,.93,.87,0,0,.04);
          tiles.add(box,glow,side*5.52,.51,z+1.04,.037,.66,.071);
        }
      }
    }
    for(const z of [-28,-71]){
      tiles.add(box,rail,0,7.02,z,15.1,.72,2.50);
      tiles.add(box,dark,0,7.65,z,14.9,.53,2.09);
      tiles.add(box,teal,0,6.81,z+.86,13.5,.065,.059);
      tiles.add(box,pink,0,7.89,z+.91,13.5,.056,.058);
    }
    put(root,cone,unlit(0xe88acd,{transparent:true,opacity:.13,depthWrite:false}),-25,23,-151,12,34,12,.5,.14,-.30);
  }

  function stars(root,art,seed=22,count=580,dy=72) {
    const rand=art.seeded(seed), positions=[], colors=[];
    for(let i=0;i<count;i++) {
      positions.push((rand()-.5)*450,dy+(rand()-.30)*186,-112-rand()*142);
      const c=.32+rand()*.54;
      colors.push(c*.81,c*.93,c);
    }
    const points=new T.BufferGeometry();
    points.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    points.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const texture=graphic(32,32,(c,w,h)=>{
      const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
      g.addColorStop(0,'#fff'); g.addColorStop(.40,'#ffffffb8'); g.addColorStop(1,'#ffffff00');
      c.fillStyle=g; c.fillRect(0,0,w,h);
    });
    const sky=new T.Points(points,new T.PointsMaterial({vertexColors:true,map:texture,size:.68,
      transparent:true,opacity:.84,depthWrite:false,fog:false}));
    root.add(sky);
    return sky;
  }

  function planet(root,x,y,z,rad,ringed=false) {
    const shader=new T.ShaderMaterial({
      uniforms:{ringed:{value:ringed ? 1 : 0}},
      vertexShader:`
        varying vec3 n; varying vec3 view;
        void main(){
          n=normalize(normal); vec4 p=modelViewMatrix*vec4(position,1.);
          view=normalize(cameraPosition-(modelMatrix*vec4(position,1.)).xyz);
          gl_Position=projectionMatrix*p;
        }`,
      fragmentShader:`
        varying vec3 n; varying vec3 view; uniform int ringed;
        float hash(vec3 p){return fract(sin(dot(p,vec3(17.1,79.2,43.6)))*31324.6);}
        float noise(vec3 p){
          vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }
        void main(){
          vec3 p=normalize(n);
          float day=smoothstep(-.37,.64,dot(p,normalize(vec3(.71,.35,.54))));
          float ed=pow(1.-max(0.,dot(p,normalize(view))),3.2);
          float continents=noise(p*3.8)*.56+noise(p*10.)*.26+noise(p*24.)*.14+noise(p*64.)*.04;
          float shore=smoothstep(.45,.51,continents);
          vec3 ocean=mix(vec3(.045,.20,.38),vec3(.15,.54,.66),smoothstep(.34,.52,continents));
          vec3 land=mix(vec3(.22,.39,.31),vec3(.53,.39,.22),noise(p*14.));
          float bands=sin(36.*p.y+noise(p*7.)*3.2)*.36+.52+noise(p*35.)*.13;
          vec3 surface=ringed==1 ? mix(vec3(.59,.28,.38),vec3(.89,.67,.61),bands) : mix(ocean,land,shore);
          float clouds=smoothstep(.53,.72,noise(p*11.+vec3(1.,3.,1.))*0.62+noise(p*29.)*.30+noise(p*71.)*.08);
          if(ringed==0) surface=mix(surface,vec3(.86,.96,1.),clouds*.76+max(0.,abs(p.y)-.74)*.83);
          vec3 color=surface*(.12+.88*day)+vec3(.20,.52,.85)*ed*(.46+day*.36);
          gl_FragColor=vec4(color,1.);
        }`
    });
    const sphere=new T.Mesh(new T.SphereGeometry(rad,48,28),shader);
    sphere.position.set(x,y,z);
    root.add(sphere);
    if(ringed){
      const geometry=new T.RingGeometry(rad*1.32,rad*1.96,72,12);
      const texture=graphic(128,8,(c,w,h)=>{
        for(let i=0;i<w;i++){
          const p=i/w,stripe=.22+.49*Math.pow(Math.max(0,Math.sin(p*92)),.8);
          c.fillStyle='rgba(227,177,184,'+stripe+')'; c.fillRect(i,0,1,h);
        }
      });
      const uv=geometry.attributes.uv,p=geometry.attributes.position;
      for(let i=0;i<p.count;i++) uv.setXY(i,(Math.hypot(p.getX(i),p.getY(i))-rad*1.32)/(rad*.64),.5);
      const band=new T.Mesh(geometry,new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,transparent:true,
        depthWrite:false,fog:false}));
      band.position.copy(sphere.position);
      band.rotation.set(-1.06,.27,-.14);
      root.add(band);
    }
  }

  function orbit(root,tiles,art) {
    const {box,cylinder,ring,matte,unlit,flatFloor,put,seeded}=art;
    stars(root,art);
    planet(root,-47,50,-148,39);
    planet(root,102,68,-184,22,true);
    const metal=matte(0x647892,{roughness:.61,metalness:.38});
    const dark=matte(0x213047,{roughness:.50,metalness:.31});
    const rail=matte(0x365b72,{roughness:.44,metalness:.50});
    const lamp=unlit(0x7cdff7), honey=unlit(0xffbc72), red=unlit(0xe77593);
    const rand=seeded(32712);
    root.add(flatFloor(8.85,-.074,dark));
    for(let i=0;i<40;i++) {
      const z=-i*2.2;
      for(let lane=-1;lane<=1;lane++) {
        const x=lane*2.72;
        tiles.add(box,metal,x,-.032,z,2.56,.12,2.05,0,0,0,true);
        tiles.add(box,i%4 ? dark : rail,x,.038,z-.58,1.92,.016,.43);
        if(i%4===0){
          tiles.add(box,lamp,x-.88,.043,z+.80,.43,.023,.069);
          tiles.add(box,lamp,x+.88,.043,z+.80,.43,.023,.069);
        }
      }
      for(const side of [-1,1]) {
        tiles.add(box,rail,side*4.2,.13,z,.41,.34,2.08);
        tiles.add(box,i%5 ? lamp : honey,side*4.17,.309,z,.11,.035,1.43);
        if(i%3===0) {
          tiles.add(box,metal,side*4.64,-.80,z,.45,1.75,.61);
          tiles.add(box,rail,side*5.2,-1.68,z,1.37,.17,2.10,0,0,-side*.37);
        }
        if(i%7===0){
          const x=side*(9+rand()*6);
          tiles.add(box,rail,side*(4.18+Math.abs(x))*.5,-1.61,z,Math.abs(x)-3.81,.43,.91,0,0,-side*.10);
          tiles.add(cylinder,metal,x,-1.96,z,2.39,5.9,2.39,Math.PI/2);
          tiles.add(cylinder,dark,x,-1.96,z+3.04,1.66,.17,1.66,Math.PI/2);
          tiles.add(ring,lamp,x,-1.96,z+2.89,2.29,2.29,.68);
          tiles.add(box,rail,x+side*4.19,-.77,z-.16,5.0,.125,3.46,-.23,side*.12,.07);
          for(let panel=0;panel<4;panel++)
            tiles.add(box,dark,x+side*(2.59+panel*1.05),-.64,z-.18,.92,.085,3.12,-.23,side*.12,.07);
          tiles.add(box,red,x,-.31,z,.35,.13,.35);
        }
      }
    }
    for(const z of [-18,-55,-78]) {
      for(const side of [-1,1]) {
        tiles.add(box,metal,side*5.02,2.04,z,.52,4.16,.72,0,0,side*.11,true);
        tiles.add(box,lamp,side*4.81,2.10,z+.38,.12,2.51,.064,0,0,side*.1);
      }
      tiles.add(box,rail,0,4.60,z,9.41,.57,.76,0,0,0,true);
      tiles.add(box,honey,0,4.65,z+.397,7.64,.065,.033);
    }
  }

  function launch(root,tiles,art) {
    const {box,put,flatFloor,unlit,seeded}=art;
    stars(root,art,90,540,85);
    const rand=seeded(4590);
    const streak=unlit(0xaddffa,{transparent:true,opacity:.31,depthWrite:false});
    for(let i=0;i<61;i++){
      const x=(rand()-.5)*77,z=-rand()*88,y=-9+rand()*32;
      if(Math.abs(x)<3 && y>1) continue;
      tiles.add(box,streak,x,y,z,.018,.028,.7+rand()*4.3,.03,0,0);
    }
    const haze=new T.ShaderMaterial({uniforms:{flow:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader:`
        varying vec3 p; uniform float flow;
        float hash(vec2 q) { return fract(sin(dot(q,vec2(231.7,79.4)))*14789.3); }
        float noise(vec2 q) {
          vec2 i=floor(q),f=fract(q); f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
        }
        void main(){
          vec2 q=vec2(p.x*.072,p.z*.044-flow*.038);
          float n=.53*noise(q)+.28*noise(2.12*q+6.1)+.13*noise(4.31*q)+.06*noise(8.81*q-2.6);
          float mass=smoothstep(.37,.69,n);
          float fade=1.-smoothstep(86.,222.,length(p.xz));
          vec3 low=vec3(.27,.39,.56), high=vec3(.78,.84,.94);
          gl_FragColor=vec4(mix(low,high,mass*.90),mass*fade*.90);
        }
      `});
    root.add(flatFloor(295,-.85,haze));
    root.add(flatFloor(300,-2.4,haze));
    planet(root,31,52,-181,21,true);
    return (_elapsed,travel)=>{haze.uniforms.flow.value=travel;};
  }

  return {cyber,orbit,launch};
})();
