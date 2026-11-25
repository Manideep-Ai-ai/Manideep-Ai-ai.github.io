import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {readFile} from 'node:fs/promises';
const meta=JSON.parse(await readFile('src/intro-v5/frames.json'));
for(const [name,frames]of Object.entries(meta.sets))test(`${name}: all complete frames are opaque, padded and grounded`,async()=>{
 for(let i=0;i<frames.length;i++){const {data,info}=await sharp(`public/assets/mani/v5/frames/${name}-${String(i).padStart(2,'0')}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,880);assert.equal(info.height,1200);let bottom=-1,count=0;for(let y=0;y<1200;y++)for(let x=0;x<880;x++){const a=data[(y*880+x)*4+3];assert.ok(a===0||a===255);if(a){bottom=y;count++;assert.ok(x>0&&x<879&&y>0&&y<1199,'Full silhouette stays inside canvas');}}assert.equal(bottom,1100);assert.ok(count>10000);}
 const sheet=await sharp(`public/assets/mani/v5/${name}.png`).metadata();assert.equal(sheet.width,880*frames.length);assert.equal(sheet.height,1200);
});
