import sharp from 'sharp';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const dir='public/assets/mani/poses';
const definitions={
 neutral:{height:960,head:[.51,.075],hands:[[.20,.55],[.91,.56]],seat:[.5,.55]},
 greeting:{height:960,head:[.56,.075],hands:[[.20,.14],[.90,.55]],seat:[.5,.56]},
 contact:{height:960,head:[.54,.075],hands:[[.13,.57],[.88,.53]],seat:[.47,.55]},
 'contact-b':{height:960,head:[.54,.075],hands:[[.15,.53],[.85,.46]],seat:[.47,.55]},
 'passing-b':{height:946,head:[.54,.075],hands:[[.09,.58],[.85,.53]],seat:[.48,.55]},
 passing:{height:946,head:[.54,.075],hands:[[.09,.58],[.85,.53]],seat:[.48,.55]},
 lowering:{height:790,head:[.57,.09],hands:[[.43,.61],[.89,.61]],seat:[.40,.62]},
 seated:{height:710,head:[.45,.09],hands:[[.39,.59],[.88,.54]],seat:[.40,.66]},
 turned:{height:710,head:[.32,.09],hands:[[.80,.46],[.93,.48]],seat:[.36,.66]},
};
const result={version:4,canvas:[880,1200],baseline:1100,units:'pixels; origin top-left',architecture:'whole illustrations; no articulated body cuts',poses:{}};
for(const [name,def] of Object.entries(definitions)){
 const {data,info}=await sharp(`${dir}/raw/${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Alpha threshold applies only to alpha, preserving the pencil pigment RGB.
 let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;data[i+3]=data[i+3]>=150?255:0;if(data[i+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
 if(x1<=x0||y1<=y0)throw Error(`Empty art: ${name}`);
 const h=def.height,w=Math.round((x1-x0+1)*h/(y1-y0+1)),left=Math.round(400-w/2),top=1101-h;
 if(left<0||left+w>880)throw Error(`${name} exceeds canvas`);
 let {data:body,info:bi}=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(w,h).raw().toBuffer({resolveWithObject:true});
 for(let i=3;i<body.length;i+=4)body[i]=body[i]>=128?255:0;
 const composite=await sharp({create:{width:880,height:1200,channels:4,background:'#0000'}}).composite([{input:body,raw:bi,left,top}]).png().toBuffer();
 await writeFile(`${dir}/${name}.png`,composite);await sharp(composite).webp({lossless:true}).toFile(`${dir}/${name}.webp`);
 const point=([x,y])=>[Math.round(left+x*w),Math.round(top+y*h)];
 const meta={png:`${name}.png`,webp:`${name}.webp`,baseline:1100,bbox:[left,top,w,h],head:point(def.head),hands:def.hands.map(point),seat:point(def.seat),ground:[400,1100],feet:[[left+w*.15,1100],[left+w*.85,1100]],lift:name.startsWith('passing')?[0,48]:[0,0],shadow:{width:name==='passing'?150:name==='seated'?220:190,opacity:name==='passing'?.45:.65},support:['lowering','seated','turned'].includes(name),alpha:'binary'};
 result.poses[name]=meta;
 console.log(`${name}: ${w}×${h}, baseline1100, two hand anchors`);
}
await writeFile(`${dir}/poses.json`,JSON.stringify(result,null,2));
await writeFile('src/motion/poses.json',JSON.stringify(result,null,2));
