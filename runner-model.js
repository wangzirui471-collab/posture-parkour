'use strict';

window.RunnerModel = (() => {
  const T = window.THREE;
  const { clamp, lerp, smoothstep } = T.MathUtils;
  const sourceFloor = -1.4566823;
  const scale = .94;
  const worldY = (y) => (y - sourceFloor) * scale;
  const adjustArm = (x) => Math.sign(x) * (Math.min(.55,Math.abs(x)) + Math.max(0,Math.abs(x)-.55)*.84);

  // The source asset has separate arm meshes and a single torso/leg mesh.
  // Joint coordinates refer to its unscaled, upright rest pose.
  function makeSkeleton() {
    const bones = [];
    function joint(name, x, y, z, parent) {
      const bone = new T.Bone();
      bone.name = name;
      bone.position.set(x * scale, worldY(y), z * scale);
      if (parent) {
        bone.position.sub(parent.getWorldPosition(new T.Vector3()));
        parent.add(bone);
      }
      bone.userData.index = bones.length;
      bones.push(bone);
      return bone;
    }
    const root = joint('hips',0,sourceFloor,0);
    const neck = joint('neck',0,.86,-.055,root);
    const sides = [-1,1].map((side) => {
      const arm = joint('upper-arm',side*.55,.75,-.125,root);
      const elbow = joint('forearm',adjustArm(side*1.19),.68,-.15,arm);
      const wrist = joint('wrist',adjustArm(side*1.76),.64,-.145,elbow);
      const thigh = joint('thigh',side*.24,-.73,-.055,root);
      const knee = joint('shin',side*.28,-1.08,-.061,thigh);
      const ankle = joint('foot',side*.29,-1.40,-.05,knee);
      return { side, arm, elbow, wrist, thigh, knee, ankle,
        restUpper:elbow.position.clone().normalize(),
        restFore:wrist.position.clone().normalize() };
    });
    return { root, neck, sides, bones };
  }

  function weightMesh(mesh, transform, rig, briar) {
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(transform);
    const positions = geometry.getAttribute('position');
    const indices = new Uint16Array(positions.count * 4);
    const weights = new Float32Array(positions.count * 4);
    const left = rig.sides[0], right = rig.sides[1];
    const sourceIsArm = mesh.name === 'Object_14' || mesh.name === 'Object_18';
    for (let i=0;i<positions.count;i++) {
      const x = positions.getX(i)/scale;
      const y = positions.getY(i)/scale + sourceFloor;
      const side = x<0 ? left : right;
      let a=rig.root, b=rig.neck, amount=smoothstep(y,.72,1.06), influence=1;
      const isArm=sourceIsArm || (briar && Math.abs(x)>.53 && y>.37 && y<1.085);
      if (isArm) {
        positions.setX(i,adjustArm(x)*scale);
        if (Math.abs(x) >= 1.52) {
          a=side.elbow; b=side.wrist; amount=smoothstep(Math.abs(x),1.57,1.88);
        } else {
          a=side.arm; b=side.elbow; amount=smoothstep(Math.abs(x),.97,1.46);
          influence=smoothstep(Math.abs(x),.51,.82);
        }
      } else if (y < -.69) {
        if (y < -1.25) { a=side.knee; b=side.ankle; amount=1-smoothstep(y,-1.425,-1.25); }
        else if (y < -1) { a=side.thigh; b=side.knee; amount=1-smoothstep(y,-1.23,-1); }
        else { a=rig.root; b=side.thigh; amount=1-smoothstep(y,-.99,-.69); }
      } else if (mesh.name === 'Object_12' || mesh.name === 'Object_5') {
        amount = mesh.name === 'Object_5' ? 1 : smoothstep(y,.69,1.02);
      }
      const offset=i*4;
      indices[offset]=a.userData.index; indices[offset+1]=b.userData.index;
      indices[offset+2]=rig.root.userData.index;
      weights[offset]=(1-amount)*influence;
      weights[offset+1]=amount*influence;
      weights[offset+2]=1-influence;
    }
    if (sourceIsArm || briar) positions.needsUpdate = true;
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const skinned = new T.SkinnedMesh(geometry,mesh.material);
    skinned.castShadow = true;
    skinned.receiveShadow = true;
    skinned.frustumCulled = false;
    skinned.material.roughness = .82;
    skinned.material.skinning = true;
    skinned.material.needsUpdate = true;
    return skinned;
  }

  async function load(character='er') {
    const briar=character==='da';
    const source=briar ? window.RUNNER_CAST.briar : window.XIONGER_GLB;
    const bytes = window.__b64 ? window.__b64(source) : Uint8Array.from(atob(source),c=>c.charCodeAt(0));
    if(briar) delete window.RUNNER_CAST.briar;
    else delete window.XIONGER_GLB;
    const gltf = await new Promise((resolve,reject) => {
      new T.GLTFLoader().parse(bytes.buffer,'',resolve,reject);
    });
    gltf.scene.updateMatrixWorld(true);
    const group = new T.Group();
    const rig = makeSkeleton();
    group.add(rig.root);
    group.rotation.order='YXZ';
    group.updateMatrixWorld(true);
    const skeleton = new T.Skeleton(rig.bones);
    const normalize=new T.Matrix4().makeScale(scale,scale,scale);
    normalize.setPosition(0,-sourceFloor*scale,0);
    if(briar) {
      const box=new T.Box3().setFromObject(gltf.scene);
      const center=box.getCenter(new T.Vector3());
      const ratio=2.88/(box.max.y-box.min.y);
      normalize.makeScale(ratio,ratio,ratio);
      normalize.setPosition(-center.x*ratio,-box.min.y*ratio,-center.z*ratio);
    }
    gltf.scene.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const transform = normalize.clone().multiply(mesh.matrixWorld);
      const part = weightMesh(mesh,transform,rig,briar);
      group.add(part);
      part.bind(skeleton,new T.Matrix4());
      mesh.geometry.dispose();
    });
    const upper = new T.Vector3(), fore = new T.Vector3(), bendPlane = new T.Vector3();
    const aim = new T.Vector3(), forward = new T.Vector3(0,0,1);
    const shoulderTarget = new T.Quaternion(), elbowTarget = new T.Quaternion(), wristTarget = new T.Quaternion();
    const inverseShoulder = new T.Quaternion(), inverseElbow = new T.Quaternion();
    let lift = 0, firstPose = true;
    group.name=briar ? 'runner-briar' : 'runner-bramble';
    return {
      group,
      equipment:{head:rig.neck,feet:rig.sides.map(side=>side.ankle)},
      pose({ phase, elapsed, airborne, crouch, menu, playing, floating=false, flight=false, stumble=0, caught=0, facing, bank, dt=.016, pursuing=0, grabbing=0 }) {
        const run = playing && !airborne && !floating;
        const stride = run ? Math.sin(phase)*(1-grabbing*.90) : 0;
        const bob = run ? (1-Math.cos(phase*2))*.042 : Math.sin(elapsed*2.15)*.025;
        const tuck = airborne ? 0 : Math.max(crouch,caught*.33,stumble*.34);
        const smoothing = firstPose ? 1 : 1-Math.exp(-dt*23);
        lift=lerp(lift,airborne ? 1 : 0,smoothing);
        group.position.set(0,bob-.21*tuck,-.19*tuck);
        group.scale.set(1,1-.14*tuck,1);
        group.rotation.set(tuck*.96+(flight ? .42 : (run ? .09+pursuing*.12 : 0))+.23*stumble,
          facing ?? (menu ? -.18 : Math.PI),-bank*.18+stride*.028+.27*stumble-.13*caught);
        rig.neck.rotation.set(-tuck*.42 + stride*.028,menu ? Math.sin(elapsed*1.24)*.085 : -.22*caught,-stride*.047);
        for (const {side,arm,elbow,wrist,thigh,knee,ankle,restUpper,restFore} of rig.sides) {
          const swing = stride * side;
          const balance = (floating ? .14 + Math.abs(bank)*.33 : 0) + .39*stumble+.29*caught;
          upper.set(side*(.17+balance+.04*Math.abs(swing)+.09*lift),
            lerp(-1,-.69,Math.max(tuck,lift,grabbing)),
            lerp(lerp(lerp(-.12+swing*.88,.67,tuck),.35+side*.17,lift),1.72,grabbing)).normalize();
          shoulderTarget.setFromUnitVectors(restUpper,upper);
          arm.quaternion.slerp(shoulderTarget,smoothing);
          const bend = lerp(run ? .36 + (swing+1)*.23 : .17,.60,Math.max(tuck,lift));
          bendPlane.copy(forward).addScaledVector(upper,-forward.dot(upper)).normalize();
          fore.copy(upper).multiplyScalar(Math.cos(bend)).addScaledVector(bendPlane,Math.sin(bend));
          aim.copy(fore).applyQuaternion(inverseShoulder.copy(shoulderTarget).invert());
          elbowTarget.setFromUnitVectors(restFore,aim);
          elbow.quaternion.slerp(elbowTarget,smoothing);
          aim.copy(fore).lerp(upper,.21).normalize()
            .applyQuaternion(inverseElbow.copy(elbowTarget).invert().multiply(inverseShoulder));
          wristTarget.setFromUnitVectors(restFore,aim);
          wrist.quaternion.slerp(wristTarget,smoothing);
          thigh.rotation.x = airborne ? (side === 1 ? -.71 : .46) : lerp(-swing*.70,-.97,tuck);
          knee.rotation.x = airborne ? .54 : lerp((floating ? .19 : .10) + Math.max(0,swing)*.58,1.31,tuck);
          ankle.rotation.x = airborne ? -.20 : -.22*clamp(swing,0,1) - tuck*.24;
        }
        firstPose=false;
      }
    };
  }
  return { load };
})();
