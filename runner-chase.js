'use strict';

window.RunnerChase = (() => {
  const T=window.THREE;
  const {lerp,clamp,smoothstep}=T.MathUtils;

  function makeSkeleton() {
    const bones=[];
    function joint(name,x,y,z,parent) {
      const bone=new T.Bone();
      bone.name=name;
      bone.position.set(x,y,z);
      if(parent){
        bone.position.sub(parent.getWorldPosition(new T.Vector3()));
        parent.add(bone);
      }
      bone.userData.index=bones.length;
      bones.push(bone);
      return bone;
    }
    const root=joint('logger-root',0,0,0);
    const neck=joint('logger-neck',0,1.64,.018,root);
    const limbs=[-1,1].map(side=>{
      const arm=joint('logger-shoulder',side*.255,1.43,-.023,root);
      const elbow=joint('logger-elbow',side*.40,1.08,-.064,arm);
      const wrist=joint('logger-wrist',side*.433,.743,.071,elbow);
      const thigh=joint('logger-hip',side*.146,.901,-.020,root);
      const knee=joint('logger-knee',side*.150,.466,-.015,thigh);
      const boot=joint('logger-boot',side*.165,.134,-.025,knee);
      return {side,arm,elbow,wrist,thigh,knee,boot};
    });
    return {root,neck,limbs,bones};
  }

  function skin(mesh,transform,rig,skeleton) {
    const geo=mesh.geometry.clone().applyMatrix4(transform);
    const p=geo.attributes.position;
    const joints=new Uint16Array(p.count*4), weights=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i), y=p.getY(i), side=rig.limbs[x<0 ? 0 : 1], spread=Math.abs(x);
      let a=rig.root, b=rig.neck, blend=smoothstep(y,1.57,1.82), armShare=1;
      if(spread>.254+clamp((1.48-y)*.105,0,.083) && y>.40 && y<1.54){
        if(y>1.345) {
          a=rig.root; b=side.arm;
          blend=smoothstep(spread,.26,.36)*(1-smoothstep(y,1.43,1.57));
        } else if(y<.92) {
          a=side.elbow; b=side.wrist; blend=1-smoothstep(y,.721,.92);
        } else {
          a=side.arm; b=side.elbow; blend=1-smoothstep(y,.98,1.24);
          armShare=smoothstep(spread,.27,.37);
        }
      } else if(y<.91){
        if(y<.29) {
          a=side.knee; b=side.boot; blend=1-smoothstep(y,.122,.29);
        } else if(y<.58) {
          a=side.thigh; b=side.knee; blend=1-smoothstep(y,.414,.58);
        } else {
          a=rig.root; b=side.thigh; blend=1-smoothstep(y,.681,.91);
        }
      }
      const at=i*4;
      joints[at]=a.userData.index; joints[at+1]=b.userData.index; joints[at+2]=rig.root.userData.index;
      weights[at]=(1-blend)*armShare; weights[at+1]=blend*armShare; weights[at+2]=1-armShare;
    }
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));
    geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const part=new T.SkinnedMesh(geo,mesh.material);
    part.material.skinning=true;
    part.material.roughness=.86;
    part.castShadow=part.receiveShadow=true;
    part.frustumCulled=false;
    part.bind(skeleton,new T.Matrix4());
    return part;
  }

  async function load() {
    const data=window.RUNNER_CAST.vick;
    delete window.RUNNER_CAST.vick;
    const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
    const gltf=await new Promise((ok,fail)=>new T.GLTFLoader().parse(bytes.buffer,'',ok,fail));
    gltf.scene.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(gltf.scene), center=bounds.getCenter(new T.Vector3());
    const ratio=2.55/(bounds.max.y-bounds.min.y);
    const toRunner=new T.Matrix4().makeRotationY(Math.PI).scale(new T.Vector3(ratio,ratio,ratio));
    toRunner.setPosition(center.x*ratio,-bounds.min.y*ratio,center.z*ratio);
    const group=new T.Group(), body=new T.Group();
    group.name='chaser-logger-vick';
    group.visible=false;
    group.rotation.order='YXZ';
    group.add(body);
    const rig=makeSkeleton();
    body.add(rig.root);
    body.updateMatrixWorld(true);
    const skeleton=new T.Skeleton(rig.bones);
    gltf.scene.traverse(mesh=>{
      if(mesh.isMesh) body.add(skin(mesh,toRunner.clone().multiply(mesh.matrixWorld),rig,skeleton));
    });

    function pose({phase,pressure=0,catching=0}) {
      const stride=Math.sin(phase);
      const reach=smoothstep(catching,.23,.81);
      const gait=1-reach;
      body.position.y=(1-Math.cos(phase*2))*.045*gait-.082*reach;
      group.rotation.x=lerp(.11+pressure*.12,.065,reach);
      group.rotation.z=.032*stride*gait;
      rig.neck.rotation.x=-.08-pressure*.08+reach*.10;
      for(const {side,arm,elbow,wrist,thigh,knee,boot} of rig.limbs){
        const motion=side*stride;
        arm.rotation.x=lerp(motion*.83,-1.11-side*.14,reach);
        arm.rotation.z=side*(.10+.21*reach);
        elbow.rotation.x=lerp(-.49-Math.max(0,-motion)*.29,-.43,reach);
        wrist.rotation.x=reach*.22;
        thigh.rotation.x=lerp(-motion*.77,side*.11,reach);
        knee.rotation.x=lerp(.12+Math.max(0,motion)*.58,.17,reach);
        boot.rotation.x=-.17*Math.max(0,motion)*gait;
      }
    }
    return {group,pose};
  }

  return {load};
})();
