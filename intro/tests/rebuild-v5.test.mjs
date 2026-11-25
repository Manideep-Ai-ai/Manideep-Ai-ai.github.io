import test from 'node:test';import assert from 'node:assert/strict';
import {layoutFor,sample,beatAt,advance} from '../src/intro-v5/timeline.ts';
import {pinVertex} from '../src/intro-v5/foot-mesh.ts';
import {readFile} from 'node:fs/promises';
const art=JSON.parse(await readFile('src/intro-v5/frames.json'));
for(const [w,h] of [[390,844],[768,1024],[1440,900],[3840,2160]])test(`${w}×${h}: monitor centre and exact DOM hero landing`,()=>{
 const l=layoutFor(w,h),s=sample(1,l);assert.equal(l.monitor.x,w/2);assert.ok(Math.abs(l.monitor.y-h/2)<.001);
 assert.ok(Math.abs(s.heroX)<1e-8&&Math.abs(s.heroY)<1e-8);assert.ok(Math.abs(s.heroScale-1)<1e-8);
 if(w<700)assert.ok(l.stop-l.start>=w*.45,'Walk covers45% of phone width');
});
test('all authored beats reverse deterministically; sitting before swivel before click and dive',()=>{
 const l=layoutFor(1440,900);for(let i=0;i<=1000;i++){const p=i/1000;assert.deepEqual(sample(p,l),sample(p,l));assert.ok(beatAt(p)>=0);}
 assert.equal(sample(.60,l).turn,0);assert.equal(sample(.73,l).awake,false);assert.equal(sample(.79,l).awake,true);assert.equal(sample(.79,l).zoom,0);
});
test('weighted whole-image foot deformation pins the supporting foot without cutting the knee',()=>{
 for(let d=0;d<640;d+=.37){const i=Math.floor(d/20)%8,foot=art.sets.walk[i].foot,plant=-62+Math.floor(d/160)*160+(d%160<100?60:140),root=-62+d,delta=root+(foot-400)/2-plant;
 assert.ok(Math.abs(delta)<50);const p=pinVertex({x:foot,y:1100},foot,delta);assert.ok(Math.abs(root+(p.x-400)/2-plant)<1e-7);assert.equal(p.y,1100);
 const torso=pinVertex({x:400,y:500},foot,delta);assert.deepEqual(torso,{x:400,y:500});}
});

test('reduced motion jumps immediately, while normal progress is interruptible in both directions',()=>{assert.equal(advance(0,1,.016,true),1);assert.equal(advance(.5,.5,.016),.5);assert.ok(advance(.8,.2,.016)<.8);assert.ok(advance(.2,.8,.016)>.2);});
