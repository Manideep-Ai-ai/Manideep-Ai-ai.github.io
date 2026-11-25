import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SceneLayout = {
  width:number; height:number; floor:number; actorHeight:number;
  chairX:number; seatY:number;
  /** Center of the registered monitor face, in viewport pixels. */
  monitorX:number; monitorY:number; monitorW:number; monitorH:number;
};
export type HardwarePath = {d:string;start:number;duration:number;kind:string};
type Face = {d:string;fill?:string;weight?:number;detail?:boolean};
type Part = {kind:string;faces:Face[]};
type ScheduledFace = Face & HardwarePath;
const ink='#39332e',paper='#faf9f6';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const p=(x:number,y:number)=>`${+x.toFixed(2)} ${+y.toFixed(2)}`;
const line=(...q:number[][])=>`M${q.map(([x,y])=>p(x,y)).join(' L')}`;
const poly=(...q:number[][])=>`${line(...q)} Z`;
const rr=(x:number,y:number,w:number,h:number,r:number)=>`M${p(x+r,y)} H${+(x+w-r).toFixed(2)} Q${p(x+w,y)} ${p(x+w,y+r)} V${+(y+h-r).toFixed(2)} Q${p(x+w,y+h)} ${p(x+w-r,y+h)} H${+(x+r).toFixed(2)} Q${p(x,y+h)} ${p(x,y+h-r)} V${+(y+r).toFixed(2)} Q${p(x,y)} ${p(x+r,y)} Z`;
const ellipse=(x:number,y:number,rx:number,ry:number)=>`M${p(x+rx,y)} A${p(rx,ry)} 0 1 1 ${p(x-rx,y)} A${p(rx,ry)} 0 1 1 ${p(x+rx,y)} Z`;

function dimensions(l:SceneLayout){
 const a=l.actorHeight,w=l.monitorW,h=l.monitorH,x=l.monitorX-w*.5,y=l.monitorY-h*.5;
 const top=l.floor-a*.42,slab=Math.max(6,a*.021),depth=a*.07;
 const left=Math.max(16,Math.min(x-w*.25,l.chairX-a*.12));
 const right=Math.min(l.width-18,Math.max(x+w*1.14,l.chairX+a*.59));
 const cpuW=Math.max(43,w*.28),cpuD=Math.max(8,w*.045),cpuH=Math.min(h*.96,a*.385);
 const cpuX=Math.min(l.width-22-cpuW-cpuD,Math.max(left+a*.48,l.monitorX+w*.57));
 return {a,w,h,x,y,top,slab,depth,left,right,cpuW,cpuD,cpuH,cpuX,cpuY:l.floor-8-cpuH};
}

function desk(l:SceneLayout):Part{
 const g=dimensions(l),{a,left,right,top,slab,depth}=g;
 const front=top+depth*.48,back=top-depth*.52;
 // The two tapered legs attach below the slab, not to an unrelated baseline.
 const lx=left+23,rx=right-26,foot=l.floor-7;
 return {kind:'desk',faces:[
  {d:poly([lx+1,front+slab],[lx+13,front+slab],[lx+7,foot],[lx-2,foot]),fill:'#e8e3da'},
  {d:poly([rx-12,front+slab],[rx,front+slab],[rx+12,foot],[rx+3,foot]),fill:'#d9d2c7'},
  {d:poly([left+11,back],[right-13,back],[right+4,front],[left-9,front]),fill:'#f3efe7'},
  {d:poly([left-9,front],[right+4,front],[right+4,front+slab],[left-9,front+slab]),fill:'#d4ccbf'},
  {d:line([left+12,back+3],[right-17,back+3]),weight:.7,detail:true},
  {d:line([left-8,front+slab+2],[left+3,front+slab+2]),weight:.8,detail:true},
 ]};
}
function monitor(l:SceneLayout):Part{
 const {a,x,y,w,h,top}=dimensions(l),postTop=y+h-4,postBase=top-5;
 return {kind:'monitor',faces:[
  // The plinth and stem are painted first, so the face hides their joins.
  {d:`M${p(l.monitorX-w*.15,postBase-1)} Q${p(l.monitorX-w*.19,postBase+3)} ${p(l.monitorX-w*.15,postBase+6)} L${p(l.monitorX+w*.18,postBase+6)} Q${p(l.monitorX+w*.21,postBase+3)} ${p(l.monitorX+w*.17,postBase)} L${p(l.monitorX+w*.07,postBase-5)} H${+(l.monitorX-w*.06).toFixed(2)} Z`,fill:'#cec8bc'},
  {d:poly([l.monitorX-w*.045,postTop],[l.monitorX+w*.043,postTop],[l.monitorX+w*.053,postBase],[l.monitorX-w*.057,postBase]),fill:'#d8d2c7'},
  {d:poly([x+w-3,y+2],[x+w+Math.max(5,a*.015),y+7],[x+w+Math.max(5,a*.015),y+h-5],[x+w-3,y+h]),fill:'#c8c2b8'},
  {d:rr(x,y,w,h,Math.max(4,a*.012)),fill:'#eee9e0'},
  // Exact registration retained for the HTML screen placed by the parent.
  {d:rr(x+w*.045,y+h*.055,w*.91,h*.82,1.5),fill:paper,weight:1.2},
  {d:line([x+w*.07,y+h*.905],[x+w*.33,y+h*.905]),weight:.7,detail:true},
  {d:ellipse(x+w*.83,y+h*.935,w*.006,w*.006),fill:'#bb3e33',weight:.6},
  {d:line([x+5,y+5],[x+w*.28,y+5]),weight:.65,detail:true},
 ]};
}
function keyboard(l:SceneLayout):Part{
 const {a,x,w,top,depth}=dimensions(l),kw=w*.90,kh=a*.075;
 const kx=x+w*.04,ky=top-depth*.34;
 const tl=[kx+kw*.045,ky],tr=[kx+kw*.94,ky],br=[kx+kw,ky+kh],bl=[kx-kw*.055,ky+kh];
 const at=(u:number,v:number)=>{
  const tx=tl[0]+(tr[0]-tl[0])*u,ty=tl[1]+(tr[1]-tl[1])*u;
  const bx=bl[0]+(br[0]-bl[0])*u,by=bl[1]+(br[1]-bl[1])*u;
  return [tx+(bx-tx)*v,ty+(by-ty)*v];
 };
 const faces:Face[]=[
  {d:poly(bl,br,[br[0],br[1]+3],[bl[0],bl[1]+3]),fill:'#d4cdc1'},
  {d:poly(tl,tr,br,bl),fill:'#e9e3d8'},
 ];
 // Every key shares the same projective plane; no floating rows or crossed bases.
 for(let r=0;r<4;r++){
  let d='';
  for(let c=0;c<12;c++){
   const u=.045+c*.076,v=.12+r*.19;
   d+=poly(at(u,v),at(u+.056,v),at(u+.056,v+.135),at(u,v+.135))+' ';
  }
  faces.push({d,fill:'#f8f5ed',weight:.62});
 }
 faces.push({d:poly(at(.26,.90),at(.64,.90),at(.64,.96),at(.26,.96)),fill:'#f8f5ed',weight:.65});
 const mx=kx+kw*1.12,my=ky+kh*.42,mw=a*.041,mh=a*.056;
 faces.push({d:`M${p(mx-mw/2,my+mh*.4)} Q${p(mx-mw*.75,my-mh*.45)} ${p(mx,my-mh*.5)} Q${p(mx+mw*.65,my-mh*.45)} ${p(mx+mw*.5,my+mh*.3)} Q${p(mx,my+mh*.65)} ${p(mx-mw/2,my+mh*.4)} Z`,fill:'#e3ddcf',weight:1.1});
 faces.push({d:line([mx,my-mh*.43],[mx+1,my-mh*.05]),weight:.8,detail:true});
 return {kind:'keyboard',faces};
}
function cpu(l:SceneLayout):Part{
 const {cpuX:x,cpuY:y,cpuW:w,cpuH:h,cpuD:d}=dimensions(l);
 return {kind:'cpu',faces:[
  {d:poly([x+w,y+3],[x+w+d,y-3],[x+w+d,y+h-5],[x+w,y+h]),fill:'#c7c0b4'},
  {d:poly([x+3,y],[x+d,y-5],[x+w+d,y-3],[x+w,y+3]),fill:'#e4ded3'},
  {d:rr(x,y,w,h,4),fill:'#eee9df'},
  {d:rr(x+w*.13,y+h*.10,w*.74,h*.075,2),fill:'#d2cabc',weight:.9},
  {d:rr(x+w*.15,y+h*.23,w*.16,h*.035,1),fill:'#7b746b',weight:.6},
  {d:ellipse(x+w*.71,y+h*.25,w*.05,w*.05),fill:'#a94539',weight:.9},
  {d:Array.from({length:6},(_,i)=>line([x+w*.20,y+h*(.63+i*.041)],[x+w*.80,y+h*(.63+i*.041)])).join(' '),weight:.8,detail:true},
  {d:poly([x+7,y+h],[x+18,y+h],[x+18,y+h+4],[x+7,y+h+4]),fill:'#6f675c',weight:.8},
  {d:poly([x+w-18,y+h],[x+w-7,y+h],[x+w-7,y+h+4],[x+w-18,y+h+4]),fill:'#6f675c',weight:.8},
 ]};
}

function chair(l:SceneLayout,turn:number):Part{
 const h=l.actorHeight,x=l.chairX,sy=l.seatY,f=l.floor,t=smooth(0,1,turn);
 const spin=Math.cos(t*Math.PI),edge=Math.abs(spin),rear=t>.5;
 const breadth=.64+.36*edge,bx=x+h*.065*spin,bw=h*.325*breadth,bh=h*.285,by=sy-h*.335;
 const sx=x-h*.028*spin,sw=h*.375*(.80+.20*edge),sd=h*.082;
 const baseY=f-h*.075,stemTop=sy+sd*.62;
 const back=rr(bx-bw/2,by,bw,bh,h*.035);
 const seat=`M${p(sx-sw/2,sy-sd*.43)} Q${p(sx-sw*.52,sy-sd*.94)} ${p(sx-sw*.36,sy-sd)} Q${p(sx+sw*.06,sy-sd*1.12)} ${p(sx+sw*.43,sy-sd*.67)} Q${p(sx+sw*.58,sy-sd*.14)} ${p(sx+sw*.46,sy+sd*.35)} Q${p(sx,sy+sd*.83)} ${p(sx-sw*.44,sy+sd*.38)} Q${p(sx-sw*.55,sy+sd*.15)} ${p(sx-sw/2,sy-sd*.43)} Z`;
 const legs=[[-.13,-.063],[.13,-.052],[-.205,-.020],[.205,-.013],[.005,0]];
 const faces:Face[]=[];
 legs.forEach(([dx,dy],i)=>{
  const ex=x+h*dx,ey=f-h*.023+h*dy;
  const k=i===4?1:Math.sign(dx);
  faces.push({d:`M${p(x-4,baseY-5)} Q${p(x+h*dx*.53,baseY-3)} ${p(ex-k*h*.014,ey-h*.021)} L${p(ex+k*h*.013,ey-h*.01)} Q${p(x+h*dx*.50,baseY+6)} ${p(x+4,baseY+3)} Z`,fill:i<2?'#aaa193':'#bcb3a5',weight:1.15});
  faces.push({d:rr(ex-h*.018,ey-h*.006,h*.036,h*.035,h*.012),fill:i<2?'#7c756b':'#68635d',weight:1.1});
  faces.push({d:line([ex,ey-h*.001],[ex,ey+h*.023]),weight:.7,detail:true});
 });
 faces.push({d:rr(x-h*.012,stemTop,h*.024,baseY-stemTop+3,2),fill:'#b8afa0',weight:1.2});
 faces.push({d:rr(x-h*.024,stemTop-h*.013,h*.048,h*.037,3),fill:'#6a645b',weight:1.1});
 faces.push({d:ellipse(x,baseY,h*.029,h*.015),fill:'#bcb3a6',weight:1.15});
 // A mechanical bracket joins the padded back and seat, then disappears behind them.
 faces.push({d:poly([bx-h*.018,by+bh-h*.028],[bx+h*.018,by+bh-h*.028],[x+h*.025,sy],[x-h*.017,sy]),fill:'#a39a8c',weight:1.15});
 const arm=(side:number,near:boolean):Face[]=>{
  const ax=x+side*h*.163*breadth,ay=sy-h*.125;
  const reach=h*.089,lean=spin*h*.018;
  return [
   {d:poly([ax-h*.009,sy-sd*.05],[ax-h*.018+lean,ay+9],[ax+h*.002+lean,ay+8],[ax+h*.012,sy-sd*.03]),fill:near?'#9f9689':'#b8afa0',weight:1.2},
   {d:rr(ax-reach*.44+lean,ay,reach,h*.026,h*.012),fill:near?'#8c8376':'#a79f93',weight:1.15},
  ];
 };
 faces.push(...arm(1,false));
 if(!rear){
  faces.push({d:back,fill:'#c6bdae',weight:1.6});
  faces.push({d:rr(bx-bw/2+7,by+7,bw-14,bh-14,h*.026),fill:'#e0d8ca',weight:.85});
  faces.push({d:`M${p(bx-bw*.34,by+bh*.26)} Q${p(bx,by+bh*.18)} ${p(bx+bw*.34,by+bh*.26)} M${p(bx-bw*.34,by+bh*.80)} Q${p(bx,by+bh*.89)} ${p(bx+bw*.34,by+bh*.80)}`,weight:.7,detail:true});
 }
 faces.push({d:seat,fill:'#b8ad9b',weight:1.5});
 faces.push({d:`M${p(sx-sw*.44,sy-sd*.30)} Q${p(sx,sy+sd*.14)} ${p(sx+sw*.45,sy-sd*.30)}`,weight:.85,detail:true});
 faces.push(...arm(-1,true));
 if(rear){
  faces.push({d:back,fill:'#b9b0a2',weight:1.6});
  faces.push({d:rr(bx-bw/2+8,by+7,bw-16,bh-15,h*.025),fill:'#cec5b6',weight:.8});
  faces.push({d:line([bx,by+bh*.21],[bx,by+bh*.80]),weight:.7,detail:true});
  faces.push({d:ellipse(bx,by+bh*.79,h*.011,h*.011),fill:'#a09789',weight:.75});
 }
 const leverX=x+h*.067;
 faces.push({d:line([x+h*.022,stemTop-1],[leverX,stemTop-h*.019]),weight:2});
 faces.push({d:rr(leverX-2,stemTop-h*.031,h*.047,h*.019,h*.008),fill:'#777065',weight:1});
 return {kind:'chair',faces};
}

function build(l:SceneLayout,turn:number):ScheduledFace[]{
 const g=dimensions(l);
 const incoming:Part={kind:'incoming',faces:[{d:`M${p(g.x+10,0)} V${+(g.y-35).toFixed(2)} Q${p(g.x+10,g.y-14)} ${p(g.x+8,g.y)}`,weight:1.5}]};
 const objects=[incoming,monitor(l),keyboard(l),cpu(l),desk(l),chair(l,turn)];
 const ranges:Record<string,[number,number]>={incoming:[0,.065],monitor:[.055,.32],keyboard:[.32,.47],cpu:[.47,.62],desk:[.62,.75],chair:[.75,.997]};
 const scheduled=new Map<string,ScheduledFace[]>();
 objects.forEach(o=>{const [a,b]=ranges[o.kind],step=(b-a)/o.faces.length;scheduled.set(o.kind,o.faces.map((f,i)=>({...f,start:a+i*step,duration:step*1.18,kind:o.kind})));});
 // Painter's order is independent of reveal order: each opaque face conceals
 // the lines behind it. A completed chair therefore hides the desk legs.
 return ['incoming','desk','cpu','monitor','keyboard','chair'].flatMap(k=>scheduled.get(k)!);
}
export function hardwarePaths(layout:SceneLayout):HardwarePath[]{
 return build(layout,0).map(({d,start,duration,kind})=>({d,start,duration,kind})).sort((a,b)=>a.start-b.start);
}

export function WorkstationDrawing({layout,draw,turn,chairOccupied,zoom,children}:{layout:SceneLayout;draw:number;turn:number;chairOccupied:number;zoom:number;children?:ReactNode}){
 const refs=useRef<Array<SVGPathElement|null>>([]),[pen,setPen]=useState<{x:number;y:number}|null>(null);
 const faces=useMemo(()=>build(layout,turn),[layout,turn]);
 const weight=Math.max(.88,Math.min(1.38,layout.actorHeight/390));
 useLayoutEffect(()=>{
  if(draw<=0||draw>=1){setPen(null);return;}
  let index=-1,start=-1;
  faces.forEach((f,i)=>{if(draw>=f.start&&draw<f.start+f.duration&&f.start>start){index=i;start=f.start;}});
  const el=refs.current[index];
  if(el){const f=faces[index],pt=el.getPointAtLength(el.getTotalLength()*clamp((draw-f.start)/f.duration));setPen({x:pt.x,y:pt.y});}
 },[draw,faces]);
 return <div className="workstation-drawing" data-draw={draw.toFixed(3)} data-turn={turn.toFixed(3)} data-occupied={chairOccupied.toFixed(3)} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
  <svg width="100%" height="100%" viewBox={`0 0 ${layout.width} ${layout.height}`} fill="none" role="img" aria-label="An illustrated monitor, keyboard, computer tower, desk and swivel chair drawing themselves into view" style={{position:'absolute',inset:0,overflow:'visible'}}>
   {faces.map((face,i)=>{
    const local=clamp((draw-face.start)/face.duration),lead=face.kind==='incoming';
    const fill=draw>=1?1:smooth(.73,1,local);
    return <g key={`${face.kind}-${i}`} opacity={lead?1-smooth(.07,.14,draw):1}>
     {face.fill&&<path d={face.d} fill={face.fill} opacity={fill} stroke="none"/>}
     <path ref={el=>{refs.current[i]=el;}} data-kind={face.kind} d={face.d} pathLength="1" strokeDasharray="1" strokeDashoffset={1-local} opacity={local>0?1:0} stroke={lead?'#d63c32':ink} strokeWidth={(face.weight??1.45)*weight} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </g>;
   })}
   {pen&&draw<1&&<g aria-hidden="true" opacity={1-zoom}><circle cx={pen.x} cy={pen.y} r={5*weight} fill="#d63c32" opacity=".08"/><circle cx={pen.x} cy={pen.y} r={2.1*weight} fill="#d63c32"/></g>}
  </svg>
  {children}
 </div>;
}
