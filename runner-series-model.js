'use strict';

window.RunnerSeriesModel = (() => {
  const T = window.THREE;
  const {clamp, lerp, smoothstep} = T.MathUtils;

  // Joint landmarks refer to each upright mesh before scaling, in fractions of its source height.
  // Symmetric limb landmarks are stored for the positive X side.
  const profiles = {
    vick: {
      name:'光头强',price:0,height:2.52,originZ:-.028,neck:[.602,-.015],
      arms:[[.113,.543,-.062],[.264,.538,-.055],[.395,.529,-.051]],
      legs:[[.054,.307,-.042],[.065,.162,-.024],[.067,.034,-.030]],
      shield:[.656,.007,.82],back:[.496,-.200],shoe:.62,stride:1.04
    },
    luobotou: {
      name:'萝卜头',price:90,height:1.91,originZ:.147,neck:[.742,.180],
      arms:[[.221,.597,.120],[.444,.597,.091],[.653,.588,.105]],
      legs:[[.123,.233,.113],[.130,.118,.107],[.132,.040,.124]],
      tail:[[.216,-.075],[.088,-.209],[.024,-.419]],tailSeam:-.071,tailLift:.21,tailWidth:[.14,.115,.092],
      shield:[.775,.226,.61],back:[.535,-.060],shoe:.66,stride:1.13
    },
    bengbeng: {
      name:'蹦蹦',price:120,height:1.80,originZ:.497,neck:[.672,.561],
      arms:[[.071,.576,.494],[.220,.572,.507],[.351,.554,.538]],
      legs:[[.070,.195,.510],[.097,.100,.456],[.093,.032,.486]],
      tail:[[.234,.405],[.217,-.135],[.230,-.655]],tailSeam:.394,tailLift:.33,tailWidth:[.092,.108,.244],
      shield:[.728,.612,.59],back:[.462,.361],shoe:.53,stride:1.18
    },
    maomao: {
      name:'毛毛',price:145,height:1.77,originZ:.444,neck:[.548,.453],
      arms:[[.073,.505,.444],[.286,.506,.452],[.493,.493,.448]],
      legs:[[.055,.218,.453],[.074,.106,.445],[.081,.036,.445]],
      tail:[[.241,.376],[.230,-.119],[.254,-.622]],tailSeam:.366,tailLift:.35,
      shield:[.692,.479,.77],back:[.414,.322],shoe:.57,stride:1.19
    },
    jiji: {
      name:'吉吉',price:180,height:2.36,floor:.202,originZ:.193,neck:[.638,.185],
      arms:[[.109,.588,.156],[.307,.579,.158],[.447,.577,.168]],
      legs:[[.045,.357,.179],[.061,.292,.160],[.062,.234,.178]],
      tail:[[.402,.096],[.207,-.112],[.020,-.329]],tailSeam:.081,tailLift:.75,
      shield:[.680,.219,.78],back:[.471,.033],shoe:.72,stride:1.11
    },
    cuihua: {
      name:'翠花',price:215,height:2.63,originZ:.008,neck:[.744,.021],
      arms:[[.140,.651,-.041],[.329,.631,-.027],[.501,.632,-.026]],
      legs:[[.107,.205,.013],[.107,.111,.009],[.102,.041,.004]],
      shield:[.787,.060,.72],back:[.554,-.188],shoe:.74,stride:1.05
    },
    croc: {
      name:'老鳄',price:250,height:2.42,originZ:.334,neck:[.681,.268],
      arms:[[.125,.532,.297],[.302,.534,.334],[.467,.532,.353]],
      legs:[[.136,.226,.314],[.144,.122,.318],[.141,.039,.322]],
      tail:[[.215,.155],[.122,-.250],[.042,-.611]],tailSeam:.139,tailLift:.18,tailWidth:[.19,.13,.081],
      shield:[.734,.496,.86],back:[.518,.129],shoe:.84,stride:1.02
    },
    tiger: {
      name:'铁掌大师',price:300,height:2.62,originZ:.156,neck:[.736,.238],
      arms:[[.166,.623,.224],[.359,.616,.219],[.525,.612,.239]],
      legs:[[.091,.331,.150],[.105,.178,.156],[.111,.047,.172]],
      tail:[[.299,.065],[.193,-.239],[.177,-.449]],tailSeam:.056,tailLift:.22,
      shield:[.788,.299,.78],back:[.554,-.002],shoe:.84,stride:1.03
    }
  };

  const sources = new Map();

  function loadMesh(key) {
    if (!sources.has(key)) {
      const loading = new Promise((resolve,reject) => {
        const data = window.RUNNER_SERIES_ASSETS[key];
        const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
        new T.GLTFLoader().parse(bytes.buffer,'',gltf => {
          gltf.scene.updateMatrixWorld(true);
          const mesh = gltf.scene.getObjectByProperty('isMesh',true);
          if (mesh) resolve(mesh);
          else reject(new Error(`Missing character mesh: ${key}`));
        },reject);
      });
      sources.set(key, loading);
      loading.catch(() => sources.delete(key));
    }
    return sources.get(key);
  }

  function makeRig(profile, toWorld) {
    const bones = [];
    function joint(name, x, y, z, parent) {
      const bone = new T.Bone();
      const rest = toWorld(x,y,z);
      bone.name = name;
      bone.position.copy(rest);
      if (parent) {
        bone.position.sub(parent.userData.rest);
        parent.add(bone);
      }
      bone.userData.rest = rest;
      bone.userData.index = bones.length;
      bones.push(bone);
      return bone;
    }

    const root = joint('hips',0,profile.floor ?? 0,profile.originZ);
    const neck = joint('neck',0,...profile.neck,root);
    const limbs = [-1,1].map(side => {
      const id = side < 0 ? 'left-' : 'right-';
      function chain(names, points) {
        let parent = root;
        return points.map(([x,y,z],i) => {
          parent = joint(id+names[i],side*x,y,z,parent);
          return parent;
        });
      }
      const [arm,elbow,wrist] = chain(['shoulder','elbow','wrist'],profile.arms);
      const [hip,knee,ankle] = chain(['hip','knee','ankle'],profile.legs);
      return {side,arm,elbow,wrist,hip,knee,ankle,
        upperRest:elbow.position.clone().normalize(),foreRest:wrist.position.clone().normalize()};
    });
    const tail = profile.tail && joint('tail-base',0,...profile.tail[0],root);
    const tailEnd = tail && joint('tail-tip',0,...profile.tail[1],tail);
    return {bones,root,neck,limbs,tail,tailEnd};
  }

  const cuihuaColors = [0x85563d,0xe8c396,0x4d3228,0xfcf6e6,0x241d1b]
    .map(color=>new T.Color(color).convertSRGBToLinear());

  function colorCuihua(x,y,z,color) {
    const [fur,light,dark,white,eyeDark] = cuihuaColors;
    const side = Math.abs(x);
    const bib = 1-Math.hypot(x/.183,(y-.436)/.288);
    const belly = smoothstep(bib,-.04,.16)*smoothstep(z,.061,.121);
    const muzzle = smoothstep(z,.107,.172)*smoothstep(y,.758,.793)*(1-smoothstep(y,.853,.873));
    const nose = (1-smoothstep(side,.028,.052))*smoothstep(z,.179,.200)*smoothstep(y,.826,.854);
    const features = Math.max(nose, .23*(1-smoothstep(y,.010,.080)));
    const eyeDepth = smoothstep(z,.105,.128);
    const sclera = (1-smoothstep(Math.hypot((side-.042)/.029,(y-.894)/.019),.57,1.01))*eyeDepth;
    const pupil = (1-smoothstep(Math.hypot((side-.041)/.012,(y-.894)/.012),.58,1.07))*smoothstep(z,.123,.138);
    return color.copy(fur).lerp(light,Math.max(belly,muzzle)).lerp(dark,features).lerp(white,sclera).lerp(eyeDark,pupil);
  }

  function tailShare(profile, x, y, z) {
    if (!profile.tail || z >= profile.tailSeam+.039) return 0;
    const [base,middle,tip] = profile.tail;
    const [baseWidth,midWidth,tipWidth] = profile.tailWidth ?? [.092,.106,.130];
    const first = z > middle[1];
    const [from,to] = first ? [base,middle] : [middle,tip];
    const t = clamp((z-from[1])/(to[1]-from[1]),0,1);
    const center = lerp(from[0],to[0],t);
    const width = first ? lerp(baseWidth,midWidth,t) : lerp(midWidth,tipWidth,t);
    const distance = Math.hypot(x,y-center);
    const rear = 1-smoothstep(z,profile.tailSeam-.24,profile.tailSeam-.09);
    const seam = (1-smoothstep(distance,width*.64,width))*(1-smoothstep(z,profile.tailSeam-.12,profile.tailSeam+.039));
    return Math.max(rear,seam);
  }

  function skin(mesh, rig, profile, key, factor, sourceFrame) {
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const positions = geo.attributes.position;
    const indices = new Uint16Array(positions.count*4);
    const weights = new Float32Array(positions.count*4);
    const colors = key === 'cuihua' ? new Float32Array(positions.count*3) : null;
    const tint = new T.Color();
    const [shoulder, elbow, wrist] = profile.arms;
    const [hip, knee, ankle] = profile.legs;
    const {min, middleX, middleZ, sourceHeight} = sourceFrame;
    const floor = profile.floor ?? 0;
    const lowerElbow = lerp(elbow[0],wrist[0],.22);
    const lowerHip = lerp(knee[1],hip[1],.30);
    const lowerKnee = lerp(ankle[1],knee[1],.40);
    const rootIndex = rig.root.userData.index;
    const shares = new Float32Array(rig.bones.length);
    const strongest = new Uint16Array(4);

    for (let i=0; i<positions.count; i++) {
      const x = (positions.getX(i)-middleX)/sourceHeight;
      const y = (positions.getY(i)-min.y)/sourceHeight;
      const z = (positions.getZ(i)-middleZ)/sourceHeight;
      const spread = Math.abs(x);
      const limb = rig.limbs[x<0 ? 0 : 1];
      let a = rig.root, b = rig.neck, weight = smoothstep(y,profile.neck[0]-.043,profile.neck[0]+.044), strength = 1;
      const armShare = smoothstep(spread,shoulder[0]*.78,lerp(shoulder[0],elbow[0],.41))
        * smoothstep(y,shoulder[1]-.163,shoulder[1]-.096)
        * (1-smoothstep(y,shoulder[1]+.076,shoulder[1]+.134));
      if (armShare > 0) {
        strength = armShare;
        if (spread >= lowerElbow) {
          a = limb.elbow;
          b = limb.wrist;
          weight = smoothstep(spread,lowerElbow,wrist[0]+.063);
        } else {
          a = limb.arm;
          b = limb.elbow;
          weight = smoothstep(spread,lerp(shoulder[0],elbow[0],.60),lowerElbow);
        }
      } else if (y < hip[1]+.050) {
        const splitWidth = lerp(hip[0]*.19,hip[0]*.70,smoothstep(y,knee[1],hip[1]));
        strength = smoothstep(spread,.002,splitWidth);
        if (y < lowerKnee) {
          a = limb.knee;
          b = limb.ankle;
          weight = 1-smoothstep(y,ankle[1]-.018,lowerKnee);
        } else if (y < lowerHip) {
          a = limb.hip;
          b = limb.knee;
          weight = 1-smoothstep(y,lowerKnee,lowerHip);
        } else {
          a = rig.root;
          b = limb.hip;
          weight = 1-smoothstep(y,lowerHip,hip[1]+.050);
        }
      }

      const tail = tailShare(profile,x,y,z);
      const body = 1-tail;
      shares.fill(0);
      shares[rootIndex] = (1-strength)*body;
      shares[a.userData.index] += (1-weight)*strength*body;
      shares[b.userData.index] += weight*strength*body;
      if (tail > 0) {
        const mid = profile.tail[1][1];
        const tipShare = 1-smoothstep(z,mid-.15,mid+.15);
        shares[rig.tail.userData.index] = tail*(1-tipShare);
        shares[rig.tailEnd.userData.index] = tail*tipShare;
      }
      const offset = i*4;
      let total = 0;
      for (let n=0; n<4; n++) {
        let largest = 0;
        for (let index=1; index<shares.length; index++) {
          if (shares[index]>shares[largest]) largest = index;
        }
        strongest[n] = largest;
        weights[offset+n] = shares[largest];
        total += shares[largest];
        shares[largest] = 0;
      }
      for (let n=0; n<4; n++) {
        indices[offset+n] = strongest[n];
        weights[offset+n] /= total;
      }
      positions.setXYZ(i,x*factor,(y-floor)*factor,(z-profile.originZ)*factor);
      if (colors) colorCuihua(x,y,z,tint).toArray(colors, i*3);
    }
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
    geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const material = mesh.material.clone();
    if (colors) {
      geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      material.color.setRGB(1,1,1);
      material.vertexColors = true;
    }
    material.skinning = true;
    const skinned = new T.SkinnedMesh(geo,material);
    skinned.castShadow = skinned.receiveShadow = true;
    skinned.frustumCulled = false;
    return skinned;
  }

  function createActor(key, mesh) {
    const profile = profiles[key];
    const group = new T.Group();
    group.name = `runner-series-${key}`;
    group.rotation.order = 'YXZ';
    mesh.geometry.computeBoundingBox();
    const limits = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    const center = limits.getCenter(new T.Vector3());
    const floor = profile.floor ?? 0;
    const factor = profile.height/(1-floor);
    const toWorld = (x,y,z) => new T.Vector3(x*factor,(y-floor)*factor,(z-profile.originZ)*factor);
    const rig = makeRig(profile,toWorld);
    group.add(rig.root);
    group.updateMatrixWorld(true);
    const surface = skin(mesh,rig,profile,key,factor,{
      min:limits.min, middleX:center.x, middleZ:center.z, sourceHeight:limits.max.y-limits.min.y
    });
    group.add(surface);
    surface.bind(new T.Skeleton(rig.bones),new T.Matrix4());

    const head = new T.Object3D();
    head.name = 'shield-mount';
    head.position.copy(toWorld(0,...profile.shield.slice(0,2))).sub(rig.neck.userData.rest);
    rig.neck.add(head);
    const equipment = {head,feet:rig.limbs.map(limb=>limb.ankle),
      back:toWorld(0,...profile.back).toArray(),shieldScale:profile.shield[2],shoeScale:profile.shoe};

    const forward = new T.Vector3(0,0,1);
    const upper = new T.Vector3(), fore = new T.Vector3(), bendDirection = new T.Vector3();
    const shoulderTarget = new T.Quaternion(), elbowTarget = new T.Quaternion();
    const inverseShoulder = new T.Quaternion(), sole = new T.Vector3();
    let firstPose = true, lift = 0;

    function pose({phase=0,elapsed=0,airborne=false,crouch=0,menu=false,playing=false,floating=false,
      flight=false,stumble=0,caught=0,facing,bank=0,dt=.016,pursuing=0,grabbing=0} = {}) {
      const running = playing && !airborne && !floating && !flight;
      const stride = running ? Math.sin(phase)*profile.stride*(1-grabbing*.75) : 0;
      const tuck = airborne ? 0 : Math.max(crouch,stumble*.33,caught*.30);
      const mix = firstPose ? 1 : 1-Math.exp(-dt*27);
      const bob = running ? (1-Math.cos(phase*2))*.022 : Math.sin(elapsed*2.5)*.012;
      lift = lerp(lift,airborne ? 1 : 0,mix);
      group.scale.y = 1-tuck*.29;
      group.rotation.set(tuck*.63+(flight ? .45 : running ? .12+pursuing*.15 : 0)+stumble*.23,
        facing ?? (menu ? -.18 : Math.PI),-bank*.18+stride*.036+stumble*.26-caught*.18);
      rig.neck.rotation.set(-tuck*.37-stride*.027-flight*.18-grabbing*.10,
        menu ? Math.sin(elapsed*1.8)*.108 : -.23*caught,-stride*.038);
      if (rig.tail) {
        const wave = running ? Math.sin(phase-.7) : Math.sin(elapsed*2.3);
        rig.tail.rotation.set(profile.tailLift+lift*.17-tuck*.39+wave*.10, wave*.15-bank*.12, 0);
        rig.tailEnd.rotation.set(.11+wave*.13, running ? -wave*.24 : -wave*.12, 0);
      }

      let lowestSole = Infinity;
      for (const {side,arm,elbow,wrist,hip,knee,ankle,upperRest,foreRest} of rig.limbs) {
        const swing = side*stride;
        const reach = lerp(lerp(-.10+swing*.89,.76,tuck),.36+side*.18,lift);
        const spread = .15+(floating ? .23+Math.abs(bank)*.38 : 0)+stumble*.48+caught*.24;
        upper.set(side*(spread+.06*Math.abs(swing)+lift*.10),lerp(-1,-.46,grabbing),lerp(reach,1.56,grabbing)).normalize();
        shoulderTarget.setFromUnitVectors(upperRest,upper);
        arm.quaternion.slerp(shoulderTarget,mix);
        const bend = lerp(lerp(running ? .41+(swing+1)*.20 : .23,.64,Math.max(tuck,lift)),.23,grabbing);
        bendDirection.copy(forward).addScaledVector(upper,-forward.dot(upper)).normalize();
        fore.copy(upper).multiplyScalar(Math.cos(bend)).addScaledVector(bendDirection,Math.sin(bend));
        fore.applyQuaternion(inverseShoulder.copy(shoulderTarget).invert());
        elbowTarget.setFromUnitVectors(foreRest,fore);
        elbow.quaternion.slerp(elbowTarget,mix);
        wrist.rotation.x = -.09+side*bank*.14;
        wrist.rotation.z = side*(.06+tuck*.15);
        hip.rotation.x = lerp(lerp(-swing*.74,-1.02,tuck),-.32+side*.49,lift);
        knee.rotation.x = lerp(lerp(.095+Math.max(0,swing)*.68,1.37,tuck),.62+side*.14,lift);
        ankle.rotation.x = lerp(-.15*Math.max(0,swing)-tuck*.27,-.23,lift);

        // Place the lower shoe on the course as the other foot recovers.
        sole.set(0,-ankle.userData.rest.y,.027).applyQuaternion(ankle.quaternion).add(ankle.position)
          .applyQuaternion(knee.quaternion).add(knee.position).applyQuaternion(hip.quaternion).add(hip.position)
          .multiply(group.scale).applyQuaternion(group.quaternion);
        lowestSole = Math.min(lowestSole,sole.y);
      }
      group.position.set(0,bob-(airborne || floating || flight ? 0 : clamp(lowestSole,-.16,.31)),-tuck*.12);
      firstPose = false;
    }

    pose({menu:true});
    return {group,equipment,pose};
  }

  async function loadActor(key) {
    if (!Object.hasOwn(profiles,key)) throw new Error(`Unknown runner character: ${key}`);
    return createActor(key,await loadMesh(key));
  }

  async function load() {
    const entries = await Promise.all(Object.entries(profiles).map(async ([key,{name,price}]) =>
      [key,{name,price,actor:await loadActor(key)}]));
    return Object.fromEntries(entries);
  }

  return {load,loadActor};
})();
