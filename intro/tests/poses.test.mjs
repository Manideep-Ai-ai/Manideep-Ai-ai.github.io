import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
const dir='public/assets/mani/poses';
const manifest=JSON.parse(await readFile(`${dir}/poses.json`));
for(const [name,p] of Object.entries(manifest.poses))test(`${name}: opaque continuous artwork, shared baseline, anchors and fallback`,async()=>{
 const {data,info}=await sharp(`${dir}/${p.png}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,880);assert.equal(info.height,1200);
 let lowest=-1,count=0,partial=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a>0&&a<255)partial++;if(a===255){count++;lowest=y;}}
 assert.equal(partial,0,'No semitransparent body pixels');assert.ok(count>20000);assert.equal(lowest,1100,'Sole baseline exactly1100');
 assert.equal(p.hands.length,2);for(const [x,y] of [p.head,...p.hands,p.seat]){assert.ok(x>=0&&x<880&&y>=0&&y<1200);}
 assert.ok(p.shadow.width>0&&p.shadow.opacity>0);
 assert.equal(p.support,['lowering','seated','turned'].includes(name));
 const webp=await sharp(`${dir}/${p.webp}`).metadata();assert.equal(webp.width,880);assert.equal(webp.height,1200);
});
