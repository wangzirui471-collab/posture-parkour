'use strict';

window.RunnerArt = (() => {
  const T = window.THREE;
  const TAU = Math.PI * 2;
  const box = new T.BoxGeometry(1, 1, 1);
  const ball = new T.SphereGeometry(1, 16, 12);
  const pebble = new T.IcosahedronGeometry(1, 1);
  const cone = new T.CylinderGeometry(.11, 1, 1, 8);
  const trunk = new T.CylinderGeometry(.75, 1, 1, 9);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 16);
  const ring = new T.TorusGeometry(1, .065, 6, 28);
  const roughRock = createRoughRock();
  const blade = new T.BufferGeometry();
  blade.setAttribute('position',new T.Float32BufferAttribute([-1,0,0,0,.55,0,0,0,1,1,0,0,0,0,-1],3));
  blade.setIndex([0,2,1,2,3,1,3,4,1,4,0,1]);
  blade.computeVertexNormals();
  const linear = (color) => new T.Color(color).convertSRGBToLinear();
  const matte = (color, options) => new T.MeshStandardMaterial({ color:linear(color), roughness:.87, ...options });
  const unlit = (color, options) => new T.MeshBasicMaterial({ color:linear(color), ...options });

  const bitmaps=new Map();
  function bitmap(url,srgb=true) {
    const key=(srgb ? 'c' : 'n')+url;
    if(!bitmaps.has(key)) {
      const texture=new T.TextureLoader().load(url);
      texture.encoding=srgb ? T.sRGBEncoding : T.LinearEncoding;
      texture.anisotropy=8;
      bitmaps.set(key,texture);
    }
    return bitmaps.get(key);
  }

  const surfaces=new Map();
  function surface(name,color,x=1,z=1,norm=.63) {
    const key=[name,color,x,z,norm].join(':');
    if(surfaces.has(key)) return surfaces.get(key);
    const images=window.RUNNER_SURFACES?.[name];
    if(!images) return matte(color);
    function mapped(url,srgb) {
      const texture=bitmap(url,srgb).clone();
      const source=bitmap(url,srgb);
      // Texture.clone() on r128 does not follow images assigned after cloning.
      if(source.image) texture.image=source.image;
      else {
        const image=new Image();
        image.onload=()=>{ texture.image=image; texture.needsUpdate=true; };
        image.src=url;
      }
      texture.wrapS=texture.wrapT=T.RepeatWrapping;
      texture.repeat.set(x,z);
      texture.needsUpdate=!!texture.image;
      return texture;
    }
    const material=matte(color,{ map:mapped(images.color,true), normalMap:mapped(images.normal,false),
      normalScale:new T.Vector2(norm,norm) });
    surfaces.set(key,material);
    return material;
  }

  function put(group, geometry, material, x, y, z, sx=1, sy=1, sz=1, rx=0, ry=0, rz=0) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    group.add(mesh);
    return mesh;
  }

  function branch(group, from, to, r1, r2, material, segments=8) {
    const a = new T.Vector3(...from), b = new T.Vector3(...to);
    const direction = b.clone().sub(a);
    const mesh = new T.Mesh(new T.CylinderGeometry(r2, r1, direction.length(), segments), material);
    mesh.position.copy(a).addScaledVector(direction, .5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    group.add(mesh);
    return mesh;
  }

  function tube(group, points, radius, material, segments=14) {
    const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
    const mesh = new T.Mesh(new T.TubeGeometry(path, segments, radius, 7, false), material);
    group.add(mesh);
    return mesh;
  }

  function seeded(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  const themes = {
    forest: { fog:0x94a595, top:0x507b8e, horizon:0xd9c6a1, sun:0xffe2a0, light:0xffe0ad, bounce:0x78906f, density:.013 },
    bridge: { fog:0xbca998, top:0x668eaa, horizon:0xe6b78e, sun:0xffcba0, light:0xffce9f, bounce:0x928373, density:.010 },
    river: { fog:0x9abdb8, top:0x5d93a9, horizon:0xd5e3ca, sun:0xffe6b2, light:0xffeac3, bounce:0x6e8e7a, density:.013 },
    bamboo: { fog:0xa2bfb3, top:0x658a98, horizon:0xbfdbb8, sun:0xf4efc1, light:0xd5e7c0, bounce:0x7c9d88, density:.018 },
    ruins: { fog:0xaf9e83, top:0x7b8ba0, horizon:0xf1c290, sun:0xffc290, light:0xffd0a0, bounce:0x8e8674, density:.012 },
    snow: { fog:0xbecbd8, top:0x698cb0, horizon:0xe0e6df, sun:0xf1dcc3, light:0xe4efff, bounce:0xa5b3c3, density:.016 },
    cyber: { fog:0x1d2445, top:0x12192f, horizon:0x625078, sun:0xb9b6ed, light:0xd5ddff, bounce:0x717294, density:.009, night:1 },
    orbit: { fog:0x151d36, top:0x080e22, horizon:0x192945, sun:0xaacefc, light:0xe2eaff, bounce:0x8095b6, density:.004, night:2 },
    launch: { fog:0x758daf, top:0x101d43, horizon:0x607b9f, sun:0xcce5ff, light:0xdef0ff, bounce:0x97a6b5, density:.008, night:2 }
  };

  const cyclingLength = 88;
  function sceneryBatches() {
    const source = new Map();
    return {
      add(geometry, material, x, y, z, sx, sy, sz, rx=0, ry=0, rz=0, shade=false) {
        const key = geometry.id + '/' + material.id + '/' + shade;
        if (!source.has(key)) source.set(key, { geometry, material, shade, pieces: [] });
        source.get(key).pieces.push({ x, y, z, sx, sy, sz, rx, ry, rz });
      },
      assemble(root) {
        const dummy = new T.Object3D();
        for (const { geometry, material, shade, pieces } of source.values()) {
          const mesh = new T.InstancedMesh(geometry, material, pieces.length * 5);
          const color = new T.Color();
          let id = 0;
          for (let tile = 0; tile < 5; tile++) {
            for (const p of pieces) {
              dummy.position.set(p.x, p.y, p.z + cyclingLength * (1 - tile));
              dummy.scale.set(p.sx, p.sy, p.sz);
              dummy.rotation.set(p.rx, p.ry, p.rz);
              dummy.updateMatrix();
              mesh.setMatrixAt(id, dummy.matrix);
              mesh.setColorAt(id++, color.setScalar(.87 + (id * .071 % .19)));
            }
          }
          mesh.frustumCulled = false;
          mesh.castShadow = shade;
          mesh.receiveShadow = shade;
          root.add(mesh);
        }
      }
    };
  }

  function terrainMap(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const rand = seeded(162);
    ctx.fillStyle = '#bcbcbc';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3500; i++) {
      const tone = 156 + Math.floor(rand() * 77);
      ctx.fillStyle = 'rgb(' + tone + ',' + tone + ',' + tone + ')';
      ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 2.4, 1 + rand() * 1.4);
    }
    if (kind === 'path') {
      for (let i = 0; i < 63; i++) {
        ctx.fillStyle = i % 3 ? '#969085' : '#d7ceba';
        ctx.beginPath();
        ctx.ellipse(3 + rand() * 122, 3 + rand() * 122, 1 + rand() * 2.7, 1 + rand(), rand() * 3, 0, TAU);
        ctx.fill();
      }
    }
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(kind === 'path' ? 4 : 42, 148);
    texture.anisotropy = 4;
    return texture;
  }

  function flatFloor(width, y, material) {
    const geometry = new T.PlaneGeometry(width, 440).rotateX(-Math.PI / 2).translate(0, y, -168);
    const mesh = new T.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  function valleyGround(width,material,height=1) {
    const geometry=new T.PlaneGeometry(width,440,70,126).rotateX(-Math.PI/2).translate(0,-.055,-168);
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),z=p.getZ(i);
      const edge=Math.min(1,Math.max(0,(Math.abs(x)-5.1)/8.8));
      const h=.11+.48*Math.sin(x*.18-z*.074)+.27*Math.cos(x*.38+z*.045)+.22*Math.sin(z*.17+x*.31);
      p.setY(i,p.getY(i)+edge*h*height);
    }
    geometry.computeVertexNormals();
    const ground=new T.Mesh(geometry,material);
    ground.receiveShadow=true;
    return ground;
  }

  function edgeTrail(material,width) {
    material.transparent=true;
    material.depthWrite=false;
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 trailPoint;\n'+shader.vertexShader
        .replace('#include <begin_vertex>','#include <begin_vertex>\n trailPoint=position;');
      shader.fragmentShader='varying vec3 trailPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        float wav=sin(trailPoint.z*.23)*.29+sin(trailPoint.z*.77+trailPoint.x*.84)*.11;
        float margin=abs(trailPoint.x+wav);
        diffuseColor.a*=1.-smoothstep(3.91,4.64,margin);
      `);
    };
    return flatFloor(width,0,material);
  }

  function foliage(key) {
    const url=window.RUNNER_VEGETATION?.[key];
    return url && matte(0xffffff,{map:bitmap(url),transparent:false,alphaTest:.37,side:T.DoubleSide,roughness:1});
  }

  function makeSky(scene) {
    const sky = new T.Mesh(new T.SphereGeometry(290, 32, 18), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { top: {value: new T.Color()}, horizon: {value:new T.Color()}, sunColor: {value:new T.Color()}, night:{value:0}, overcast:{value:0} },
      vertexShader: 'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 top, horizon, sunColor; uniform float night, overcast;
        void main(){
          vec3 d=normalize(vDir);
          float height=max(0.,d.y);
          float disk=distance(d,normalize(vec3(.31,.29,-.9)));
          float clearSky=(1.-step(1.5,night))*(1.-overcast);
          vec3 color=mix(horizon,top,smoothstep(-.04,.72,height));
          color=mix(color,sunColor,(1.-smoothstep(.036,.105,disk))*.50*clearSky);
          color=mix(color,night>.5 ? vec3(.73,.80,.98) : vec3(1.,.94,.73),(1.-smoothstep(.025,.034,disk))*clearSky);
          color+=vec3(.07,.015,.045)*exp(-abs(d.y-.045)*16.)*step(.5,night)*(1.-step(1.5,night));
          if(overcast>0.){
            vec2 cloud=d.xz/(.25+height);
            float banks=sin(cloud.x*5.+cloud.y*8.)*.56+sin(cloud.x*1.4-cloud.y*14.4)*.29
              +sin(cloud.x*18.2+cloud.y*7.1)*.15;
            color*=1.-overcast*.46*smoothstep(-.65,.65,banks)*smoothstep(.02,.19,height);
          }
          gl_FragColor=vec4(color,1.);
        }`
    }));
    sky.renderOrder = -10;
    scene.add(sky);
    return sky.material.uniforms;
  }

  function ridges(group,rand,colors,heights,snow=false) {
    for(let layer=0;layer<3;layer++) {
      const z=-207+layer*38, position=[], indices=[], tints=[];
      const base=new T.Color(colors[layer]).convertSRGBToLinear();
      const high=new T.Color(snow ? 0xdce9ed : colors[Math.max(0,layer-1)]).convertSRGBToLinear();
      const c=new T.Color();
      const steps=95;
      for(let i=0;i<=steps;i++) {
        const x=(i-steps*.5)*4.05;
        const side=1-Math.exp(-Math.pow(x/43,2));
        const folded=.59+.18*Math.sin(i*.152+layer)+.12*Math.sin(i*.38+layer*2)
          +.065*Math.sin(i*.89-layer)+.035*Math.sin(i*2.21);
        const h=heights[layer]*(.29+side*.88)*folded;
        const depth=z+Math.sin(i*.14+layer*1.7)*10+rand()*5;
        position.push(x,-31,depth,x,h*.37,depth+4,x,h,depth);
        c.copy(base).multiplyScalar(.75); tints.push(c.r,c.g,c.b);
        c.copy(base).lerp(high,.12); tints.push(c.r,c.g,c.b);
        c.copy(base).lerp(high,snow ? .40+side*.42 : .38); tints.push(c.r,c.g,c.b);
        if(i) {
          const a=(i-1)*3,b=i*3;
          indices.push(a,b,a+1,b,b+1,a+1,a+1,b+1,a+2,b+1,b+2,a+2);
        }
      }
      const shape=new T.BufferGeometry();
      shape.setAttribute('position',new T.Float32BufferAttribute(position,3));
      shape.setAttribute('color',new T.Float32BufferAttribute(tints,3));
      shape.setIndex(indices);
      group.add(new T.Mesh(shape,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,fog:false})));
    }
  }

  function forestTrees(tiles,rand,material,heightFactor=1) {
    const leaves=foliage('spruce');
    const card=leaves && new T.PlaneGeometry(1,1);
    const fallback = matte(0x334e39);
    for (const side of [-1,1]) {
      for (let i=0;i<33;i++) {
        const z=-i*2.67+(rand()-.5)*4.7;
        const x=side*(6.9+Math.pow(rand(),1.15)*22.9);
        const h=(6.9+rand()*9.4)*heightFactor, width=h*(.32+rand()*.16);
        const turn=rand()*TAU;
        if (card) {
          tiles.add(card,leaves,x,h*.475,z,width,h,1,0,turn,(rand()-.5)*.09);
          tiles.add(card,leaves,x,h*.475,z,width,h,1,0,turn+Math.PI/2,(rand()-.5)*.09);
        } else {
          tiles.add(trunk,material,x,h*.37,z,.30,h*.76,.33,0,0,(rand()-.5)*.12,true);
          for(let j=0;j<5;j++) {
            const w=(1-j*.17)*width*.45;
            tiles.add(cone,fallback,x,h*(.33+j*.141),z,w,h*.32,w,0,turn+j,.12*Math.sin(i+j),true);
          }
        }
        if(i%5===0 && x*side<16) {
          tiles.add(trunk,material,x,h*.18,z,.40,h*.40,.43,0,0,.06*(side),true);
        }
      }
    }
  }

  function addFerns(tiles,materials,x,z,scale,spin) {
    for(let j=0;j<6;j++) {
      const a=spin+j*2.39, dx=Math.cos(a), dz=Math.sin(a);
      const branchLength=scale*(.58+.09*j);
      for(let n=0;n<4;n++) {
        const f=(n+.8)/5;
        const reach=f*branchLength*.9;
        const y=(Math.sin(f*1.11)*.55 + f*.12)*branchLength;
        const leafLength=Math.sin(f*Math.PI)*.15*branchLength+.025;
        for(const side of [-1,1]) {
          tiles.add(blade,materials[(j+n)%materials.length],x+dx*reach+side*dz*leafLength*.50,y,z+dz*reach-side*dx*leafLength*.50,
            leafLength,.015*scale,.039*scale,0,-a+side*1.27,.16*side);
        }
      }
    }
  }

  function createRoughRock() {
    const geometry=new T.SphereGeometry(1,15,11);
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const f=.98+.077*Math.sin(x*4.5+y*4.2+z*4.8)+.043*Math.sin(z*5.4-x*6.9+y*7.3);
      p.setXYZ(i,x*f+.12*y,y*f*.92,z*f+.09*x);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  function atmosPoints(root,seed,count,color,size,shape) {
    const rand=seeded(seed), values=[];
    for(let i=0;i<count;i++) values.push((rand()-.5)*shape[0],.8+rand()*shape[1],-shape[2]*rand());
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(values,3));
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=24;
    const ctx=canvas.getContext('2d'), gradient=ctx.createRadialGradient(12,12,0,12,12,11);
    gradient.addColorStop(0,'#ffffff');
    gradient.addColorStop(.42,'#ffffffc8');
    gradient.addColorStop(1,'#ffffff00');
    ctx.fillStyle=gradient; ctx.fillRect(0,0,24,24);
    const points=new T.Points(geometry,new T.PointsMaterial({color,size,map:new T.CanvasTexture(canvas),transparent:true,opacity:.72,depthWrite:false}));
    root.add(points);
    return points;
  }

  function buildForest(root,tiles) {
    const rand=seeded(911);
    root.add(valleyGround(210,surface('forest',0x8f9c78,57,112),1.25),edgeTrail(surface('trail',0xd2b895,3.3,155),9.35));
    ridges(root,rand,[0x9fae9b,0x7c9587,0x5a7568],[35,33,23]);
    const bark=surface('bark',0xc0ada0,.85,2.3);
    const shale=surface('cliff',0xa7a69a,.75,.9);
    const moss=surface('forest',0x759668,.65,.55);
    const ferns=[matte(0x456e3d),matte(0x647e45),matte(0x365b38),matte(0x819153)];
    const grass=matte(0x637347,{side:T.DoubleSide});
    forestTrees(tiles,rand,bark);
    for(const side of [-1,1]) {
      for(let i=0;i<31;i++) {
        const z=-i*2.81+rand()*2.6;
        const x=side*(4.6+rand()*3.3);
        const s=.2+rand()*.59;
        tiles.add(roughRock,i%4===1 ? moss : shale,x,.10,z,s*1.3,s*.54,s,0,rand()*TAU,.06);
        if(i%3===0) addFerns(tiles,ferns,x+side*.78,z-.39,.7+rand()*.62,rand()*TAU);
        for(let sprig=0;sprig<5;sprig++) {
          const xx=side*(4.61+rand()*1.16), zz=z+(rand()-.5)*2.7;
          const h=.13+rand()*.25, a=rand()*TAU;
          tiles.add(blade,grass,xx,h*.49,zz,.45*h,.043,.038,a*.12,a,.94);
        }
        if(i%5===1) {
          const width=.85+rand()*1.5;
          tiles.add(roughRock,moss,x+side*3.1,.20,z,width,.45+rand()*.68,width*.75,.16,rand()*TAU,.18);
        }
      }
    }
    return atmosPoints(root,3911,95,0xffe9b4,.11,[33,7,76]);
  }

  function buildBamboo(root,tiles) {
    const rand=seeded(9308);
    root.add(valleyGround(175,surface('forest',0x75896c,53,112)),edgeTrail(surface('scree',0xa5aaa0,3.7,158),9.40));
    ridges(root,rand,[0x99bcb3,0x6e9b8f,0x4e8072],[44,34,23]);
    const stems=[matte(0x52713e),matte(0x78804c),matte(0x335941)];
    const joint=matte(0x8a925e), rock=surface('cliff',0x869a8f,1.35,1.1);
    const greenery=[matte(0x587f49),matte(0x486a3a),matte(0x809554)];
    const leaves=foliage('bamboo'), canopy=leaves && new T.PlaneGeometry(1,1);
    for(const side of [-1,1]) {
      for(let i=0;i<48;i++) {
        const x=side*(5.4+Math.pow(rand(),1.25)*16.3), z=-i*1.84+rand()*2.3;
        const h=6.1+rand()*8.4, r=.067+rand()*.078, lean=(rand()-.5)*.22;
        tiles.add(cylinder,stems[i%3],x,h*.48,z,r,h,r,0,0,lean,i%3===0);
        for(let j=1;j<=7;j++) {
          const y=j*h/8;
          const dx=Math.sin(lean)*(h*.48-y);
          tiles.add(cylinder,joint,x+dx,y,z,r*1.12,.038,r*1.12,0,0,lean);
          if(j<4 || (j===4 && i%2)) continue;
          const leanSide=((i+j)%2 ? -1 : 1);
          if(canopy) {
            const a=rand()*TAU,w=1.9+rand()*1.35;
            tiles.add(canopy,leaves,x+dx+leanSide*.50,y+.30,z+(rand()-.5)*1.2,w,w*.68,1,.17,a,leanSide*.48);
            if(j>=6) tiles.add(canopy,leaves,x+dx-leanSide*.65,y-.02,z-.75,w*1.16,w*.76,1,.54,a+1.2,leanSide*-.59);
          } else {
            for(let k=0;k<5;k++) {
              const a=k*1.44+rand()*.4;
              tiles.add(blade,greenery[(j+k)%3],x+dx+Math.cos(a)*.62,y+.20,z+Math.sin(a)*.72,
                .79,.06,.19,.31,-a,.27);
            }
          }
        }
        if(i%4===0) tiles.add(roughRock,rock,side*(5.5+rand()*2.2),.15,z,.78,.39,.57,.08,i*.54,0);
        if(i%7===3) addFerns(tiles,greenery,side*(5.32+rand()),z,.7,rand()*TAU);
      }
    }
    return atmosPoints(root,321,85,0xcbe9ce,.13,[33,6,53]);
  }

  function buildRuins(root,tiles) {
    const rand=seeded(798);
    const masonry=surface('ruin',0xc3ad92,.96,.83);
    const path=surface('ruin',0xcbb698,3.1,152);
    const dirt=surface('scree',0xa09575,45,103);
    const oldRock=surface('cliff',0xaba193,.9,1.1);
    const moss=surface('forest',0x849056,1.4,1.1);
    root.add(flatFloor(230,-.035,dirt),flatFloor(9.25,0,path));
    ridges(root,rand,[0xa7a697,0x8f887b,0x716f62],[48,38,35]);
    for (const side of [-1,1]) {
      for(let i=0;i<22;i++) {
        const z=-i*4.0+rand()*.85, x=side*(5.62+rand()*1.52);
        if(i%4!==0) {
          for(let row=0;row<4+i%3;row++) {
            const spin=(rand()-.5)*.31;
            tiles.add(box,masonry,x+(rand()-.5)*.24,row*.60+.27,z+row*.055,.89+rand()*.46,.54,1.28+rand()*.82,
              spin*.44,(rand()-.5)*.22,spin*.36,row<3);
          }
          tiles.add(box,oldRock,x,(4+i%3)*.60,z,1.38,.36,1.82,0,rand()*.29,.07);
        } else {
          tiles.add(roughRock,oldRock,x,.39,z,1.52,.67,1.75,.5,rand()*TAU,.2);
          tiles.add(roughRock,moss,x+.22,.62,z+.18,1.52,.29,1.43,.06,0,.09);
        }
        tiles.add(roughRock,oldRock,side*(10+rand()*9),-1.55,z,2.8,5+rand()*5,3.7,.2,rand()*TAU,.14);
        for(let j=0;j<3;j++) {
          tiles.add(box,j%2?moss:masonry,x+side*(rand()-.4),.17,z+rand()*3.1,.30+rand()*.24,.22,.34+rand()*.46,.4,rand()*TAU,.3);
        }
      }
    }
    for(const z of [-31,-68]) {
      for(const side of [-1,1]) {
        for(let row=0;row<5;row++) tiles.add(box,masonry,side*5.23,.25+row*.54,z,.93,.53,1.10,.03,side*.035,.02,true);
      }
      for(let i=0;i<15;i++) {
        const a=Math.PI*i/14;
        tiles.add(box,masonry,Math.cos(a)*5.23,2.66+Math.sin(a)*4.31,z,.80,1.10,1.04,0,0,a,i%2===0);
      }
    }
    return atmosPoints(root,2981,80,0xffe6b8,.12,[32,6,74]);
  }

  function buildSnow(root,tiles) {
    const rand=seeded(832);
    const snow=surface('snow',0xe0e7e9,49,148,.36);
    const crust=surface('snow',0xb6ccd3,4.1,155,.44);
    const dark=surface('cliff',0x9ba5ac,1.6,1.3);
    const wood=surface('deck',0xb29d8e,.75,1.15);
    root.add(flatFloor(235,-.045,snow),flatFloor(9.1,0,crust));
    ridges(root,rand,[0xb7c5ce,0x98aab7,0x748c9f],[56,53,44],true);
    for(const side of [-1,1]) {
      for(let i=0;i<23;i++) {
        const z=-i*3.8+rand()*1.5;
        const x=side*(6.9+rand()*8.1), w=1.12+rand()*2.94, h=.45+rand()*3.1;
        tiles.add(roughRock,dark,x,h*.38,z,w,h,w*.76,.12,rand()*TAU,.20);
        tiles.add(roughRock,snow,x-side*.24,h*.83,z+.19,w*.84,h*.46,w*.66,.21,i*.7,.23);
        if(i%2===0) {
          const post=side*(4.49+rand()*.18);
          tiles.add(box,wood,post,.49,z,.19,1.28,.22,.16,0,side*.15,true);
          tiles.add(box,wood,post,1.07,z-1.77,.12,.15,4.2,-.02,0,.02);
          tiles.add(box,snow,post,1.16,z-1.76,.15,.067,4.1,.01,0,.01);
        }
        if(i%4===0) tiles.add(roughRock,snow,side*(4.43+rand()*.43),.115,z+.44,.83,.39,1.08,.1,rand()*TAU,0);
      }
    }
    return atmosPoints(root,488,420,0xe4f3ff,.24,[36,10,65]);
  }

  function buildBridge(root, tiles, uniforms) {
    const rand = seeded(77);
    ridges(root, rand, [0xcca58c,0xae8579,0x866b6d], [65,60,50]);
    root.add(flatFloor(125,-13,matte(0x476d70)));
    const deckMaterial = surface('deck',0xd2b9a0,2.6,147,.68);
    deckMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 deckPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n deckPosition=position;');
      shader.fragmentShader = 'varying vec3 deckPosition; uniform float deckTravel; uniform vec3 deckGaps[10];\n' +
        shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          for(int i=0;i<10;i++){
            vec3 gap=deckGaps[i];
            if(abs(deckPosition.x-gap.x) < gap.z && abs(deckPosition.z-gap.y) < 2.4) discard;
          }
          float board=(deckPosition.z-deckTravel)/.67;
          float lane=floor((deckPosition.x + 3.9) / 2.6);
          float shade=fract(sin(floor(board)*3.37 + lane*9.31)*4736.1);
          float grain=sin(deckPosition.x*11.+sin(board*15.)*2.)*.05;
          float nails=1.-.20*(1.-step(.034,abs(fract((deckPosition.x+.25)/2.60)-.5)))*(1.-step(.14,fract(board)));
          float seams=smoothstep(.012,.09,fract(board))*smoothstep(.005,.058,1.-fract(board));
          diffuseColor.rgb *= (shade*.18+.79+grain)*mix(.21,1.,seams)*nails;
        `);
    };
    root.add(flatFloor(7.8,0,deckMaterial));
    const rocks = [surface('cliff',0xaa9287,1.4,1.3),surface('cliff',0xc4a98d,1.4,1.3),surface('cliff',0x988c8b,1.4,1.3)];
    const rawWood = surface('deck',0xa29180,.85,1.7), tops = surface('deck',0xcdb095,.78,1.15), rope = matte(0xb4a389), bush = surface('forest',0x80986c);
    for (const side of [-1,1]) {
      for (let i=0;i<19;i++) {
        const z = -i * 4.6;
        tiles.add(box,rawWood,side*4.06,.38,z,.27,2.75,.30,0,0,side*.14,true);
        tiles.add(box,tops,side*4.22,1.72,z,.35,.21,.37,0,0,side*.14);
        for (const y of [.61,1.36]) {
          tiles.add(cylinder,rope,side*4.18,y,z-1.15,.045,2.3,.045,Math.PI/2,0,0);
          tiles.add(cylinder,rope,side*4.18,y,z-3.45,.045,2.3,.045,Math.PI/2,0,0);
        }
        tiles.add(box,rawWood,side*4.05,-1.65,z+1.1,.19,2.5,.2,.55,0,side*-.12);
        const x = side * (10+rand()*11);
        tiles.add(roughRock,rocks[i%3],x,-9+rand()*6,z,3+rand()*4,8+rand()*8,3.4+rand()*4,.2,rand()*TAU,side*.15);
        tiles.add(roughRock,rocks[(i+1)%3],side*(23+rand()*12),-4,z,8,11+rand()*13,8,.15,rand()*TAU,0);
        if (i % 3 === 0) tiles.add(pebble,bush,x,-.6,z+.5,2.2,1.8,2.4,0,rand()*TAU);
      }
    }
    return deckMaterial.map;
  }

  function buildRiver(root, tiles, time) {
    const rand = seeded(7931);
    ridges(root,rand,[0xa8c7bd,0x80b5a8,0x54897a],[60,50,28]);
    const water = matte(0x4aa69f, {roughness:.6});
    water.onBeforeCompile = (shader) => {
      shader.uniforms.flowTime = time;
      shader.vertexShader = 'varying vec3 riverPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n riverPosition=position;');
      shader.fragmentShader = 'varying vec3 riverPosition; uniform float flowTime;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        float x=riverPosition.x;
        float z=riverPosition.z-flowTime*8.0;
        float w=sin(z*.5+sin(x*.8)*2.)*.5 + sin(z*.29+x*.72)*.27 + sin(z*1.2-x*.24)*.23;
        float fast=pow(max(0., sin(x*1.55 + sin(z*.26)*.75 + z*.18)*sin(z*.44+x*.51)),9.);
        float edge=smoothstep(5.9,9.4,abs(x));
        float ripple=sin(x*5.6+z*.92+sin(z*2.0))*.007+sin(x*14.+z*2.7)*.004;
        float reflection=pow(max(0.,sin(x*.69+z*.64+w)),9.)*.085;
        vec3 deep=mix(vec3(.019,.105,.109),vec3(.078,.24,.18),edge)+ripple;
        diffuseColor.rgb=mix(deep,vec3(.34,.60,.49),smoothstep(.22,1.1,w)*.20+fast*.55+reflection);
      `);
    };
    root.add(flatFloor(20.5,-.06,water));
    const soil = surface('forest',0x829778,43,140), shore=surface('riverbank',0xc5bd9f,1.25,1.15), rock=surface('cliff',0x8faaa2,1.03,.95);
    const silt=surface('cliff',0x617d73), reed = matte(0x526b42), reedTop = matte(0xb4a579);
    const lilly = matte(0x7fa45c), bloom = matte(0xffaa91), bark=surface('bark',0xb1aba0,.8,2.1);
    const leaf = matte(0x407d62), leafTop = matte(0x6b9c67);
    const crowns=foliage('willow'), crownCard=crowns && new T.PlaneGeometry(1,1);
    for (const side of [-1,1]) {
      const bank = flatFloor(100,-.08,soil);
      bank.position.x = side * 59;
      root.add(bank);
      for (let i=0;i<24;i++) {
        const z = -i * 3.6 + rand();
        const x = side*(8.3+rand()*1.3);
        tiles.add(roughRock,shore,x,-.25,z,2.2,.65,2.8,.14,rand()*TAU,0);
        tiles.add(roughRock,i % 3 ? rock : silt,x + side*rand(),.06,z,1.1+rand(),.40+rand()*.70,1.35,0,rand()*TAU,0);
        if (i%2===0) {
          const tx=side*(10.8+rand()*6.3),h=5.3+rand()*3.5;
          if(crownCard) {
            const angle=rand()*TAU,w=h*(1.+rand()*.25);
            tiles.add(crownCard,crowns,tx,h*.47,z,w,h,1,0,angle,side*.075);
            tiles.add(crownCard,crowns,tx,h*.47,z,w*.93,h,1,0,angle+Math.PI/2,side*.052);
          } else {
            tiles.add(trunk,bark,tx,h*.34,z,.35,h*.7,.35,0,0,side*.17,true);
            tiles.add(roughRock,leaf,tx-side,h*.76,z,2.6,1.35,2.5,.13,rand()*TAU,0,true);
            tiles.add(roughRock,leafTop,tx,h,z+.75,2.2,1.3,2.3,.5,rand()*TAU,0,true);
          }
        }
        const lx=side*(5.8+rand()*2.1);
        tiles.add(cylinder,lilly,lx,.012,z,.34,.038,.29,0,rand()*TAU);
        if (i%3===0) tiles.add(ball,bloom,lx,.088,z,.13,.10,.13);
        for(let j=0;j<4;j++) {
          const rx=x-side*(.9+rand()), rz=z+rand()*1.2, h=.49+rand()*.93;
          tiles.add(cylinder,reed,rx,h*.5,rz,.032,h,.031,0,0,.1);
          tiles.add(ball,reedTop,rx-h*.045,h,rz,.06,.153,.061);
        }
      }
    }
  }

  function makeRaft() {
    const group = new T.Group();
    const wood = [matte(0x815641),matte(0xbb8450),matte(0xa47248)];
    const cut = matte(0xe5b87e), rope = matte(0xe6c593), brass = matte(0xad774b);
    for (let i=0;i<7;i++) {
      const x = (i-3) * .32, len = 3.2 - Math.abs(i-3)*.12;
      put(group,cylinder,wood[i%3],x,.12,.03,.18,len,.18,Math.PI/2).castShadow = true;
      put(group,cylinder,cut,x,.12,.036+len*.5,.146,.045,.146,Math.PI/2);
    }
    for (const z of [-.98,.98]) {
      put(group,box,wood[0],0,.27,z,2.25,.13,.20,0,0).castShadow = true;
      for (const x of [-.77,.77]) {
        put(group,ring,rope,x,.28,z,.19,.20,1,0,Math.PI/2,0);
      }
    }
    put(group,box,brass,.87,.31,-.39,.12,.11,1.13,0,.20,0);
    return group;
  }

  function createWorld(scene, renderer) {
    scene.fog = new T.FogExp2(themes.forest.fog,.016);
    const sky = makeSky(scene);
    const hemi = new T.HemisphereLight(0xfff7e1, 0x7d9b70, 1.10);
    scene.add(hemi);
    const sun = new T.DirectionalLight(0xffe4b6,1.55);
    sun.position.set(9,15,4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 19; sun.shadow.camera.bottom = -24;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 66;
    sun.shadow.normalBias = .045;
    scene.add(sun);
    const fill = new T.DirectionalLight(0xcae9d9,.48);
    fill.position.set(-6,4,-10);
    scene.add(fill);
    const zones = {};
    const deckGaps = Array.from({length:10},()=>new T.Vector3(0,1000,0));
    const deckUniforms = { deckTravel: {value:0}, deckGaps:{value:deckGaps} };
    const time = {value:0};
    const particles={}, effects={};
    let deckMap;
    function buildZone(kind) {
      const root = new T.Group(), cycle = new T.Group(), tiles = sceneryBatches();
      root.add(cycle);
      if (kind === 'forest') particles.forest=buildForest(root,tiles);
      else if (kind === 'bridge') deckMap=buildBridge(root,tiles,deckUniforms);
      else if (kind === 'river') buildRiver(root,tiles,time);
      else if (kind === 'bamboo') particles.bamboo=buildBamboo(root,tiles);
      else if (kind === 'ruins') particles.ruins=buildRuins(root,tiles);
      else if(kind==='snow') particles.snow=buildSnow(root,tiles);
      else if(window.RunnerExtraScenes?.themes[kind]) {
        effects[kind]=window.RunnerExtraScenes.build(kind,root,tiles,{
          box,ball,pebble,roughRock,cone,trunk,cylinder,matte,unlit,surface,flatFloor,seeded,cyclingLength
        });
      }
      else effects[kind]=RunnerFuture[kind](root,tiles,{box,ball,roughRock,cone,cylinder,ring,matte,unlit,flatFloor,put,seeded});
      tiles.assemble(cycle);
      zones[kind] = {root,cycle};
      scene.add(root);
    }
    for (const kind of Object.keys(themes)) buildZone(kind);
    const raft = makeRaft();
    zones.river.root.add(raft);
    const wake = new T.Group();
    const ripple = new T.RingGeometry(.88,1,28,1,.13,2.85).rotateX(-Math.PI/2);
    for(let i=0;i<4;i++) {
      const wave = put(wake,ripple,unlit(0xdaf9db,{transparent:true,opacity:.23,depthWrite:false,side:T.DoubleSide}),0,.001,1.25-i*.57,.6+i*.16,1,1,0,Math.PI,0);
      wave.userData.phase = i/4;
    }
    zones.river.root.add(wake);

    let active = 'forest';
    let travels = 0;
    function activate(kind, reset=false) {
      active = kind;
      if (reset) travels=0;
      if (!zones[kind]) buildZone(kind);
      for (const [key, zone] of Object.entries(zones)) zone.root.visible = key===kind;
      const theme = themes[kind] ?? window.RunnerExtraScenes?.themes[kind];
      const color = new T.Color();
      for (const [name,field] of [['top','top'],['horizon','horizon'],['sunColor','sun']]) {
        sky[name].value.copy(color.setHex(theme[field]));
      }
      sky.night.value=theme.night || 0;
      sky.overcast.value=theme.overcast || 0;
      scene.fog.color.setHex(theme.fog);
      scene.fog.density=theme.density;
      sun.color.setHex(theme.light).convertSRGBToLinear();
      sun.intensity=theme.sunPower ?? 1.55;
      fill.intensity=theme.fillPower ?? .48;
      hemi.groundColor.setHex(theme.bounce).convertSRGBToLinear();
      renderer.shadowMap.needsUpdate = true;
    }
    function step({ distance, elapsed, playerX, bank, obstacles }) {
      travels+=distance;
      time.value=elapsed;
      zones[active].cycle.position.z=travels % cyclingLength;
      effects[active]?.(elapsed,travels);
      if (active === 'bridge') {
        deckUniforms.deckTravel.value=travels;
        if(deckMap) deckMap.offset.y=-(travels/2.99)%1;
        let index=0;
        for (const obstacle of obstacles) {
          if (obstacle.userData.kind === 'gap' && index < deckGaps.length) {
            deckGaps[index++].set(obstacle.position.x,obstacle.position.z,obstacle.userData.hw);
          }
        }
        while(index<deckGaps.length) deckGaps[index++].set(0,1000,0);
      } else if (active === 'river') {
        raft.position.set(playerX,Math.sin(elapsed*4.7)*.035,0);
        raft.rotation.z=bank*.50;
        wake.position.x=playerX;
        for(const wave of wake.children) {
          const p = (elapsed*1.04+wave.userData.phase)%1;
          wave.position.z = 1 + p*3.1;
          wave.scale.x = .59 + p*.95;
          wave.material.opacity = .38*(1-p);
        }
      } else if(particles[active]) {
        const flock=particles[active];
        if(active==='snow') flock.position.set(Math.sin(elapsed*.52)*4.3,-(elapsed*.72)%4,travels%7);
        else flock.position.set(Math.sin(elapsed*.54)*1.4,Math.sin(elapsed*.93)*.24,travels%11);
      }
    }
    activate('forest');
    return { activate, step, deckHeight: () => active==='river' ? raft.position.y+.29 : 0 };
  }

  return { box, ball, pebble, roughRock, cone, trunk, cylinder, ring, matte, unlit, surface, put, branch, tube, seeded, createWorld };
})();
