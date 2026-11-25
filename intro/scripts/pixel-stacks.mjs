import sharp from 'sharp';
import fs from 'node:fs/promises';
const out='public/assets/pixels', W=40,H=40,N=36;
const palette={ink:[54,43,47],red:[183,51,43],light:[233,91,62],cream:[239,219,180],paper:[255,243,215],green:[86,108,75],leaf:[138,153,97]};
function volume(kind){const v=new Uint8Array(W*H*N*4);const put=(x,y,z,col)=>{if(x<0||x>=W||y<0||y>=H||z<0||z>=N)return;v.set([...col,255],((z*H+y)*W+x)*4);};
if(kind==='books')for(let b=0;b<3;b++)for(let z=0;z<7;z++)for(let y=9+b*2;y<30-b;y++)for(let x=5+b*2;x<35-b;x++){let col=z===0||z===6?[palette.red,palette.ink,palette.cream][b]:y%3===0?palette.cream:palette.paper;put(x,y,b*7+z,col);}
if(kind==='plant'){for(let z=0;z<13;z++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){const r=7+z*.23,d=Math.hypot(x-19.5,y-19.5);if(d<r&&(z<10||d>r-2))put(x,y,z,x<18?palette.red:palette.light);if(z===10&&d<r-2)put(x,y,z,palette.ink);}
for(let z=12;z<30;z++)for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++)put(19+dx,19+dy,z,palette.green);
for(let n=0;n<6;n++){const a=n*2.4;for(let t=0;t<12;t++){const r=t*.9,z=19+n*2+Math.sin(t/12*Math.PI)*3;for(let dx=-3;dx<=3;dx++)for(let dy=-2;dy<=2;dy++)if(dx*dx/10+dy*dy/5<1)put(Math.round(20+Math.cos(a)*r+dx),Math.round(20+Math.sin(a)*r+dy),Math.round(z),n%2?palette.green:palette.leaf);}}}
return v;}
async function carve(file){const {data,info}=await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});const views=[];for(let panel=0;panel<4;panel++){let x0=info.width,y0=info.height,x1=0,y1=0;for(let y=0;y<info.height;y++)for(let x=Math.floor(panel*info.width/4);x<(panel+1)*info.width/4;x++){const i=(y*info.width+x)*3;if(Math.min(data[i],data[i+1],data[i+2])<210){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}views.push(await sharp(file).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(W,H,{fit:'fill',kernel:'nearest'}).removeAlpha().raw().toBuffer());}
const v=new Uint8Array(W*H*N*4),solid=(view,x,y)=>Math.min(...view.subarray((y*W+x)*3,(y*W+x)*3+3))<225;
for(let z=0;z<32;z++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){const row=Math.round((31-z)*39/31);if(!solid(views[0],x,y)||!solid(views[1],39-y,row)||!solid(views[2],x,row)||!solid(views[3],39-x,row))continue;const view=y>27?views[2]:y<10?views[3]:views[1];const ix=view===views[1]?39-y:view===views[3]?39-x:x;const c=view.subarray((row*W+ix)*3,(row*W+ix)*3+3);v.set([...c,255],((z*H+y)*W+x)*4);}
return v;}
async function save(kind,v){const strip=new Uint8Array(W*N*H*4);for(let z=0;z<N;z++)for(let y=0;y<H;y++)for(let x=0;x<W;x++)strip.set(v.subarray(((z*H+y)*W+x)*4,((z*H+y)*W+x)*4+4),(y*W*N+z*W+x)*4);await sharp(strip,{raw:{width:W*N,height:H,channels:4}}).png().toFile(`${out}/${kind}-slices.png`);
for(let k=0;k<16;k++){const a=k*Math.PI/8,cs=Math.cos(a),sn=Math.sin(a),size=100,buf=new Uint8Array(size*size*4);for(let z=0;z<N;z++)for(let py=-29;py<30;py++)for(let px=-29;px<30;px++){const x=Math.round(cs*px+sn*py+19.5),y=Math.round(-sn*px+cs*py+19.5);if(x<0||x>=W||y<0||y>=H)continue;const i=((z*H+y)*W+x)*4;if(!v[i+3])continue;const dx=px+50,dy=Math.round(py*.75)-z+67;buf.set(v.subarray(i,i+4),(dy*size+dx)*4);}await sharp(buf,{raw:{width:size,height:size,channels:4}}).png().toFile(`${out}/${kind}-${k}.png`);}}
await save('books',volume('books'));await save('plant',volume('plant'));if(process.argv[2])await save('computer',await carve(process.argv[2]));
