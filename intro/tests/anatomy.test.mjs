import test from 'node:test';
import assert from 'node:assert/strict';
import {anatomyPose,BODY,dist,sagittalChain,gaitFoot} from '../src/motion/anatomy.ts';
import {sceneLayout} from '../src/motion/scene-motion.ts';
const layout=sceneLayout(1728,906);
const near=(a,b,epsilon=.0001)=>assert(Math.abs(a-b)<epsilon,`${a} must equal ${b}`);

test('no arm or leg changes anatomical length anywhere in the sequence',()=>{
 for(let i=0;i<=200;i++)for(const activity of [0,1]){
  const p=i/200,pose=anatomyPose({layout,progress:p,activity,idle:activity===0,time:i*.03});
  for(const leg of pose.legs){near(dist(leg.root,leg.joint),BODY.thigh);near(dist(leg.joint,leg.end),BODY.calf);assert(leg.flex>=2.99&&leg.flex<=138.01);}
  for(const arm of pose.arms){near(dist(arm.root,arm.joint),BODY.upperArm);near(dist(arm.joint,arm.end),BODY.forearm);assert(Number.isFinite(arm.flex));}
  near(dist(pose.neckTop,pose.neckBase),13);
 }
});

test('unreachable targets clamp the end as well as the knee',()=>{
 const root={x:0,y:0,z:0},result=sagittalChain(root,{x:0,y:400,z:100},110,110);
 near(dist(root,result.joint),110);near(dist(result.joint,result.end),110);assert(dist(root,result.end)<220);
});

test('wave wrist is above elbow, elbow is below shoulder, hand is separate',()=>{
 const wave=anatomyPose({layout,progress:.09,activity:0,idle:false,time:0,mode:'wave'}).arms[1];
 assert(wave.joint.y>wave.root.y);assert(wave.end.y<wave.joint.y);assert.equal(wave.hand,'wave');assert(wave.flex<145);
});

test('standing and seated soles share the floor, seated knees are naturally forward of the hips',()=>{
 for(const mode of ['neutral','seated','turned']){
  const pose=anatomyPose({layout,progress:.3,activity:0,idle:false,time:0,mode});
  for(const leg of pose.legs){near(leg.end.y,535,.2);if(mode!=='neutral'){assert(leg.joint.z>90);assert(leg.flex>65&&leg.flex<110);}}
 }
});

test('stance does not slide relative to a root advancing at the matching stride rate',()=>{
 const stride=70/.6;
 for(const t of [.1,.2,.3,.4,.5]){const a=gaitFoot(t,0),b=gaitFoot(t+.01,0);near((b.z-a.z)+stride*.01,0);near(a.y,535);}
 assert(gaitFoot(.8,0).y<535);
});


test('the seated pelvis underside meets the chair cushion at every supported viewport',()=>{
 for(const [w,h] of [[390,844],[1728,906],[3840,2160]]){
 const l=sceneLayout(w,h),pose=anatomyPose({layout:l,progress:.705,activity:0,idle:false,time:0}),scale=l.actorHeight/480;
 near(l.floor-550*scale+(pose.hip.y+14)*scale,l.seatY);
 }
});
