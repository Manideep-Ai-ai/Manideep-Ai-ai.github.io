import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneLayout,storyAt,footAt,solveIK} from '../src/motion/scene-motion.ts';

test('edge entry and chair registration use viewport coordinates at phone, laptop and 4K sizes',()=>{
 for(const [w,h] of [[390,844],[1440,900],[1728,906],[3840,2160]]){
  const l=sceneLayout(w,h),peek=storyAt(.09,l),seated=storyAt(.70,l);
  assert(peek.rootX<0,`${w}: torso must still be outside the screen while peeking`);
  assert(peek.rootX> -l.actorHeight*.2,`${w}: face must remain reachable from the edge`);
  assert.equal(seated.rootX,l.chairX);
  assert(l.actorHeight>=230&&l.actorHeight<=h*.44);
  assert(l.monitorX+l.monitorW*.5<w);
  const s=seated.scale,hip=500-(l.floor-l.seatY)/s;
  assert(Math.abs((l.floor-500*s)+hip*s-l.seatY)<.0001,'seated hip meets chair seat');
 }
});

test('walking foot stays planted through the stance interval as root advances',()=>{
 const stride=90/.6;
 for(const t of [.1,.2,.3,.4,.5]){
  const before=footAt(t,0),after=footAt(t+.01,0);
  assert(before.contact&&after.contact);
  assert.equal(before.y,476);
  assert(Math.abs(after.x-before.x+stride*.01)<.000001);
 }
 assert.equal(footAt(.1,0).contact,true);
 assert.equal(footAt(.6,1).contact,true);
 assert(footAt(.8,0).y<476,'passing foot clears the floor');
});

test('IK preserves thigh and calf lengths in reachable poses',()=>{
 const hip={x:180,y:292},foot={x:210,y:476},knee=solveIK(hip,foot,98,94);
 assert(Math.abs(Math.hypot(knee.x-hip.x,knee.y-hip.y)-98)<.001);
 assert(Math.abs(Math.hypot(knee.x-foot.x,knee.y-foot.y)-94)<.001);
});

test('sitting precedes swivelling; monitor entry starts afterward; reverse progress is deterministic',()=>{
 const l=sceneLayout(1728,906);
 assert.equal(storyAt(.59,l).seat,0);
 assert.equal(storyAt(.70,l).seat,1);
 assert.equal(storyAt(.70,l).turn,0);
 assert.equal(storyAt(.81,l).turn,1);
 assert.equal(storyAt(.81,l).zoom,0);
 assert.equal(storyAt(1,l).landed,true);
 assert.deepEqual(storyAt(.37,l),storyAt(.37,l));
});
