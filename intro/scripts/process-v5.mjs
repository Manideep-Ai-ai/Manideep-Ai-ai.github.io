import sharp from 'sharp';
import {writeFile,mkdir} from 'node:fs/promises';
const dir='public/assets/mani/v5';
await mkdir(`${dir}/frames`,{recursive:true});
const specs={walk:{cols:4,rows:2,heights:[960,940,950,970,960,940,950,970],anchor:[.50,.49,.48,.49,.50,.49,.48,.49]},sit:{cols:3,rows:2,heights:[960,920,870,790,720,710],anchor:[.48,.43,.43,.40,.30,.30]},turn:{cols:3,rows:2,heights:[710,710,710,710,710,710],anchor:[.77,.57,.50,.35,.34,.34]},peek:{cols:1,rows:1,heights:[960],anchor:[.42]}};
const result={canvas:[880,1200],baseline:1100,sets:{}};
for(const [name,spec] of Object.entries(specs)){
 const raw=await sharp(`${dir}/raw/${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),frames=[],composite=[];
 for(let index=0;index<spec.heights.length;index++){
  const cw=Math.floor(raw.info.width/spec.cols),ch=Math.floor(raw.info.height/spec.rows),col=index%spec.cols,row=Math.floor(index/spec.cols);
  const data=Buffer.alloc(cw*ch*4);for(let y=0;y<ch;y++)raw.data.copy(data,y*cw*4,((row*ch+y)*raw.info.width+col*cw)*4,((row*ch+y)*raw.info.width+col*cw+cw)*4);
  // Retain the largest solid silhouette; remove low-alpha generation halos.
  const seen=new Uint8Array(cw*ch),queue=new Int32Array(cw*ch);let best=[];
  for(let n=0;n<cw*ch;n++){if(seen[n]||data[n*4+3]<170)continue;let head=0,tail=1;seen[n]=1;queue[0]=n;while(head<tail){const k=queue[head++],x=k%cw,y=Math.floor(k/cw);for(const q of [x>0?k-1:-1,x<cw-1?k+1:-1,y>0?k-cw:-1,y<ch-1?k+cw:-1])if(q>=0&&!seen[q]&&data[q*4+3]>=170){seen[q]=1;queue[tail++]=q;}}if(tail>best.length)best=Array.from(queue.subarray(0,tail));}
  const keep=new Uint8Array(cw*ch);let x0=cw,y0=ch,x1=0,y1=0;for(const k of best){keep[k]=1;const x=k%cw,y=Math.floor(k/cw);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}for(let n=0;n<cw*ch;n++)data[n*4+3]=keep[n]?255:0;
  const height=spec.heights[index],width=Math.round((x1-x0+1)/(y1-y0+1)*height),left=Math.round(400-width*spec.anchor[index]),top=1101-height;
  if(left<0||left+width>880)throw Error(`${name}${index}: image exceeds canvas ${left}/${width}`);
  const body=await sharp(data,{raw:{width:cw,height:ch,channels:4}}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(width,height).raw().toBuffer();for(let n=3;n<body.length;n+=4)body[n]=body[n]>=128?255:0;
  const im=await sharp({create:{width:880,height:1200,channels:4,background:'#0000'}}).composite([{input:body,raw:{width,height,channels:4},left,top}]).png().toBuffer();
  await writeFile(`${dir}/frames/${name}-${String(index).padStart(2,'0')}.png`,im);
  const normalized=await sharp(im).raw().toBuffer();let foot=0,count=0;for(let y=1093;y<=1100;y++)for(let x=0;x<880;x++)if(normalized[(y*880+x)*4+3]>0){foot+=x;count++;}
  frames.push({bbox:[left,top,width,height],foot:count?foot/count:400,baseline:1100});composite.push({input:im,left:index*880,top:0});
 }
 await sharp({create:{width:880*frames.length,height:1200,channels:4,background:'#0000'}}).composite(composite).png().toFile(`${dir}/${name}.png`);
 result.sets[name]=frames;console.log(name,frames.length,'full frames');
}
await writeFile('src/intro-v5/frames.json',JSON.stringify(result,null,2));await writeFile(`${dir}/frames.json`,JSON.stringify(result,null,2));
