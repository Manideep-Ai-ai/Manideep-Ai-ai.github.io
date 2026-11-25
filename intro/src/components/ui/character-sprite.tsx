import { useEffect, useRef } from 'react';
let source:Promise<HTMLImageElement>|null=null;
const frames=new Map<number,HTMLCanvasElement>();
function atlas(){return source??=(new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='/assets/mani-atlas.png';}));}
/** Render unevenly spaced source drawings on a common transparent foot baseline.
 * This is runtime atlas sampling, not a replacement drawing or a generated rig.
 */
async function getFrame(index:number){
 if(frames.has(index))return frames.get(index)!;
 const im=await atlas(),row=Math.floor(index/4),col=index%4;
 const cellW=im.width/4,edges=[0,414,825,im.height],y=edges[row],h=edges[row+1]-y;
 const sample=document.createElement('canvas');sample.width=Math.ceil(cellW);sample.height=h;
 const ctx=sample.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(im,col*cellW,y,cellW,h,0,0,cellW,h);
 const data=ctx.getImageData(0,0,sample.width,sample.height).data;
 let x0=sample.width,y0=sample.height,x1=0,y1=0;
 for(let py=0;py<sample.height;py++)for(let px=0;px<sample.width;px++){if(data[(py*sample.width+px)*4+3]>150){x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);}}
 const out=document.createElement('canvas');out.width=320;out.height=520;
 if(x1>x0&&y1>y0){const w=x1-x0+1,sh=y1-y0+1,k=Math.min(280/w,480/sh),dw=w*k,dh=sh*k;const bob=index<8?[0,4,0,-4,0,4,0,-4][index]:0;out.getContext('2d')!.drawImage(sample,x0,y0,w,sh,(320-dw)/2,500-dh+bob,dw,dh);}
 frames.set(index,out);return out;
}
export default function CharacterSprite({index}:{index:number}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let active=true;getFrame(index).then(frame=>{if(active&&ref.current){const c=ref.current.getContext('2d')!;c.clearRect(0,0,320,520);c.drawImage(frame,0,0);}});return()=>{active=false;};},[index]);
 return <canvas ref={ref} width="320" height="520" className="sprite" role="img" aria-label="Mani, illustrated character"/>;
}
