import {type Layout,clamp} from './timeline';
export type Path={d:string;fill:string;start:number;end:number;kind:string;weight?:number;press?:boolean};
const ink='#51473f',ivory='#f6f1e7';
const project=(l:Layout,x:number,y:number,z=0)=>[l.ox+(x+z*.38)*l.s,l.floor-(y+z*.22)*l.s];
const path=(pts:number[][],close=true)=>'M'+pts.map(q=>q.map(n=>n.toFixed(2)).join(' ')).join('L')+(close?'Z':'');
export function hardware(l:Layout):Path[]{
 const all:Path[]=[];
 const kShift=l.w<700?100:0,mShift=l.w<700?97:7;
 const add=(kind:string,points:number[][],fill=ivory,close=true)=>all.push({kind,d:path(points.map(q=>project(l,q[0]+(kind==='keyboard'?kShift:kind==='mouse'?mShift:0),q[1],q[2]||0)),close),fill,start:0,end:0});
 const rect=(kind:string,x:number,y:number,w:number,h:number,z:number,fill=ivory)=>add(kind,[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],fill);
 add('floor',[[-400,0,0],[390,0,0]],'none',false);
 // Legs are visible on either side of the tower. No viewport clamps.
 rect('desk',-275,0,12,211,16,'#c5b7a3');rect('desk',270,0,12,211,16,'#c5b7a3');
 add('desk',[[-302,210,-75],[295,210,-75],[295,210,75],[-302,210,75]],'#eee5d6');
 add('desk',[[-302,201,-75],[295,201,-75],[295,210,-75],[-302,210,-75]],'#cbbca7');
 // Monitor face registered to the actual DOM hero.
 const z=40,x=-z*.38,y=344-z*.22;
 rect('monitor',x-10,211,20,36,z,'#bcb2a2');
 add('monitor',[[x-48,211,z-5],[x+49,211,z-5],[x+30,211,z+25],[x-29,211,z+25]],'#d7cbbb');
 rect('monitor',x-161,y-104,322,214,z,'#e2d8c7');
 rect('monitor',x-150,y-95,300,190,z,'#282a29');
 add('monitor',[[x+161,y-104,z],[x+170,y-99,z+5],[x+170,y+106,z+5],[x+161,y+110,z]],'#b7ab99');
 rect('monitor',x+120,y-102,5,3,z,'#b74031');
 // Keyboard plane and mouse share the desk projection, both within reach.
 add('keyboard',[[-181,212,-60],[-17,212,-60],[-17,212,-14],[-181,212,-14]],'#d8cdbb');
 for(let r=0;r<4;r++)for(let c=0;c<12;c++)add('keyboard',[[-174+c*12.7,213,-54+r*8],[-164+c*12.7,213,-54+r*8],[-164+c*12.7,213,-48+r*8],[-174+c*12.7,213,-48+r*8]],'#fffaf0');
 add('mouse',[[18,211,-64],[81,211,-64],[81,211,-7],[18,211,-7]],'#c5b8a0');
 add('mouse',[[29,213,-50],[50,213,-50],[56,220,-35],[52,227,-19],[37,230,-17],[28,225,-30]],'#f0e7d7');
 add('mouse',[[39,230,-19],[41,224,-34]],'none',false);all[all.length-1].press=true;
 add('mouse',[[41,227,-17],[80,212,0],[154,196,40],[169,109,40]],'none',false);
 // Tower has the same depth direction, stands on the floor, and clears desktop.
 rect('tower',166,4,75,131,28,'#ded2bf');
 add('tower',[[241,4,28],[255,4,64],[255,135,64],[241,135,28]],'#baac98');
 add('tower',[[166,135,28],[241,135,28],[255,135,64],[180,135,64]],'#eee4d4');
 rect('tower',177,105,54,12,28,'#b6a891');rect('tower',180,89,8,4,28,'#76695a');
 for(let i=0;i<6;i++)add('tower',[[180,28+i*6,28],[226,28+i*6,28]],'none',false);
 rect('tower',174,0,12,4,28,'#76695a');rect('tower',225,0,12,4,28,'#76695a');
 const ranges:Record<string,[number,number]>={floor:[0,.05],desk:[.05,.26],monitor:[.26,.50],keyboard:[.50,.66],mouse:[.66,.77],tower:[.77,.88]};
 const counts:Record<string,number>={},seen:Record<string,number>={};for(const p of all)counts[p.kind]=(counts[p.kind]||0)+1;
 for(const p of all){const [a,b]=ranges[p.kind],i=seen[p.kind]||0;seen[p.kind]=i+1;p.start=a+(b-a)*i/counts[p.kind];p.end=a+(b-a)*(i+1)/counts[p.kind];p.weight=p.kind==='keyboard'?.65:1.25;}
 return all;
}
type V=[number,number,number];
export function paintChair(c:CanvasRenderingContext2D,l:Layout,angle:number,draw:number,settle:number,frontOnly=false){
 const s=l.s,x=l.chairX,y=l.floor;
 c.save();c.translate(x,y);c.scale(s,s);c.lineWidth=1.4;c.lineJoin='round';c.strokeStyle=ink;
 const P=([a,b,z]:V)=>[a+z*.38,-b-z*.22];
 const rotate=([a,b,z]:V):V=>[a*Math.cos(angle)+z*Math.sin(angle),b,-a*Math.sin(angle)+z*Math.cos(angle)];
 let strokeIndex=0;
 const trace=(length:number)=>{const t=draw>=1?1:clamp((draw-.72)/.28*20-strokeIndex++);c.setLineDash([length,length]);c.lineDashOffset=length*(1-t);c.stroke();c.setLineDash([]);c.lineDashOffset=0;return t;};
 const points=(p:V[],fill:string,rot=true)=>{if(!p.length)return;c.beginPath();p.forEach((q,i)=>{const v=P(rot?rotate(q):q);i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]);});c.closePath();c.fillStyle=fill;if(draw>=.99)c.fill();const projected=p.map(q=>P(rot?rotate(q):q));const length=projected.reduce((sum,q,i)=>{const next=projected[(i+1)%projected.length];return sum+Math.hypot(next[0]-q[0],next[1]-q[1]);},0);trace(length);};
 const line=(a:V,b:V,w:number,col:string,rot=false)=>{const p=P(rot?rotate(a):a),q=P(rot?rotate(b):b);c.beginPath();c.moveTo(...p as [number,number]);c.lineTo(...q as [number,number]);c.lineWidth=w;c.strokeStyle=col;trace(Math.hypot(q[0]-p[0],q[1]-p[1]));c.lineWidth=1.4;c.strokeStyle=ink;};
 const compress=3*Math.sin(Math.PI*clamp(settle));
 if(!frontOnly){
  c.globalAlpha=draw>=.72?1:0;c.fillStyle='#372a2116';c.beginPath();c.ellipse(0,0,95,7,0,0,Math.PI*2);if(draw>=.99)c.fill();
  // Base never swivels with the seat. Five spokes rotate only if chair translates.
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5+.25,ex=Math.cos(a)*74,ez=Math.sin(a)*60;line([0,31,0],[ex,12,ez],7,'#a99a84');const p=P([ex,8,ez]);c.fillStyle='#5d584f';c.beginPath();c.ellipse(p[0],p[1],8,7,0,0,Math.PI*2);if(draw>=.99)c.fill();trace(48);}
  line([0,31,0],[0,106-compress,0],10,'#b3a68f');line([0,70,0],[0,101-compress,0],5,'#686254');
  c.globalAlpha=draw>=.72?1:0;
  // Rotated 3D surfaces; painter order follows depth continuously, without flipping whole views.
  const sy=112-compress;
  const rounded=(x0:number,y0:number,w:number,h:number,r:number,z:number):V[]=>{const out:V[]=[];for(const [cx,cy,start] of [[x0+w-r,y0+h-r,0],[x0+r,y0+h-r,Math.PI/2],[x0+r,y0+r,Math.PI],[x0+w-r,y0+r,Math.PI*1.5]])for(let j=0;j<=4;j++){const a=start+j*Math.PI/8;out.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r,z]);}return out;};
  const cushion:V[]=[];for(let i=0;i<28;i++){const a=i*Math.PI*2/28;cushion.push([Math.cos(a)*58,sy,Math.sin(a)*46]);}
  const faces:{pts:V[];fill:string}[]=[
   {pts:cushion,fill:'#c6b69b'},
   {pts:[[-57,sy-9,-45],[57,sy-9,-45],[57,sy,-45],[-57,sy,-45]],fill:'#8f806d'},
   {pts:rounded(-50,sy+17,100,139,14,-48),fill:'#c8bba4'},
   {pts:rounded(-42,sy+27,84,119,11,-49),fill:'#e1d5c1'},
  ];
  faces.sort((a,b)=>a.pts.reduce((t,p)=>t+rotate(p)[2],0)/a.pts.length-b.pts.reduce((t,p)=>t+rotate(p)[2],0)/b.pts.length);
  for(const f of faces)points(f.pts,f.fill);
  for(const side of [-1,1]){line([side*62,sy-4,-20],[side*62,sy+60,-20],4,'#8b7e69',true);line([side*62,sy+60,-29],[side*62,sy+60,25],7,'#a5967e',true);}
 }else if(draw>=1){
  // Near armrest belongs in front of the sitter; depth derived from the same pivot.
  const side=Math.cos(angle)>=0?1:-1,sy=112-compress;
  line([side*62,sy-4,-20],[side*62,sy+60,-20],4,'#8b7e69',true);line([side*62,sy+60,-29],[side*62,sy+60,25],7,'#a5967e',true);
 }
 c.restore();
}
