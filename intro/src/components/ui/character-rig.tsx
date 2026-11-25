import {memo,useEffect,useRef} from 'react';
import {anatomyPose,BODY,project,type AnatomyPose,type PoseOptions,type V2,type V3} from '../../motion/anatomy';
import {ATTACHMENTS,ATLAS,type Attachment,type PartName} from '../../motion/rig-attachments';
import {smooth,storyAt,type SceneLayout} from '../../motion/scene-motion';
export type RigPose={layout:SceneLayout;progress:number;idle:boolean;velocity:number;visible:boolean;reduced:boolean;debug?:boolean;mode?:PoseOptions['mode'];phaseOverride?:number;frozen?:boolean};
type Part={source:HTMLImageElement;x:number;y:number;w:number;h:number;meta:Attachment};
let atlas:Promise<Map<PartName,Part>>|undefined;
/** Largest solid connected silhouette avoids stray alpha flecks becoming attachment bounds. */
function solidBounds(data:Uint8ClampedArray,width:number,height:number){
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let best={x:0,y:0,w:width,h:height,count:0};
 for(let i=0;i<seen.length;i++){
  if(seen[i]||data[i*4+3]<150)continue;
  let head=0,tail=1,x0=width,y0=height,x1=0,y1=0;queue[0]=i;seen[i]=1;
  while(head<tail){const n=queue[head++],x=n%width,y=Math.floor(n/width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
   for(const k of [x>0?n-1:-1,x<width-1?n+1:-1,y>0?n-width:-1,y<height-1?n+width:-1])if(k>=0&&!seen[k]&&data[k*4+3]>=150){seen[k]=1;queue[tail++]=k;}
  }
  if(tail>best.count)best={x:Math.max(0,x0-1),y:Math.max(0,y0-1),w:Math.min(width-1,x1+1)-Math.max(0,x0-1)+1,h:Math.min(height-1,y1+1)-Math.max(0,y0-1)+1,count:tail};
 }
 if(best.count<100)throw Error('An attachment silhouette is missing');return best;
}
function loadArt(){return atlas??=new Promise<Map<PartName,Part>>((resolve,reject)=>{const im=new Image();im.onerror=reject;im.onload=()=>{try{const parts=new Map<PartName,Part>();for(const meta of ATTACHMENTS){const [x,y,w,h]=meta.cell,cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d',{willReadFrequently:true})!;c.drawImage(im,x,y,w,h,0,0,w,h);const bounds=solidBounds(c.getImageData(0,0,w,h).data,w,h);parts.set(meta.name,{source:im,x:x+bounds.x,y:y+bounds.y,w:bounds.w,h:bounds.h,meta});}resolve(parts);}catch(e){reject(e);}};im.src=ATLAS;});}
function pixels(c:CanvasRenderingContext2D,p:Part){c.drawImage(p.source,p.x,p.y,p.w,p.h,0,0,p.w,p.h);}
/** Map the measured source pivot axis onto the projected anatomical bone; caps overlap joints. */
function attachment(c:CanvasRenderingContext2D,p:Part,a:V2,b:V2,width:number,alpha=1){
 if(alpha<.001)return;const u=p.meta.proximal,v=p.meta.distal!;
 const ax=u[0]*p.w,ay=u[1]*p.h,bx=v[0]*p.w,by=v[1]*p.h,sourceAngle=Math.atan2(by-ay,bx-ax),sourceLength=Math.hypot(bx-ax,by-ay);
 const targetLength=Math.hypot(b.x-a.x,b.y-a.y),cross=Math.abs(Math.sin(sourceAngle))*p.w+Math.abs(Math.cos(sourceAngle))*p.h;
 c.save();c.globalAlpha*=alpha;c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));c.scale(targetLength/sourceLength,width/cross);c.rotate(-sourceAngle);c.translate(-ax,-ay);pixels(c,p);c.restore();
}
function anchored(c:CanvasRenderingContext2D,p:Part,at:V2,w:number,h:number,angle=0,alpha=1,mirror=false){
 if(alpha<.001)return;c.save();c.globalAlpha*=alpha;c.translate(at.x,at.y);c.rotate(angle);if(mirror)c.scale(-1,1);c.scale(w/p.w,h/p.h);c.translate(-p.meta.proximal[0]*p.w,-p.meta.proximal[1]*p.h);pixels(c,p);c.restore();
}
/** Small pigment overlaps cover interior cut lines without adding mechanical joint outlines. */
function pigmentJoin(c:CanvasRenderingContext2D,p:Part,at:V2,radius:number){
 c.save();c.beginPath();c.ellipse(at.x,at.y,radius,radius*.9,0,0,Math.PI*2);c.clip();
 c.drawImage(p.source,p.x+p.w*.32,p.y+p.h*.35,p.w*.32,p.h*.25,at.x-radius,at.y-radius,radius*2,radius*2);c.restore();
}
function weights(yaw:number){const front=1-smooth(46,82,yaw),back=smooth(90,118,yaw);return [front,1-front-back,back];}
function drawBody(c:CanvasRenderingContext2D,parts:Map<PartName,Part>,pose:AnatomyPose,debug=false){
 const part=(name:PartName)=>parts.get(name)!;
 const P=(v:V3)=>project(v,pose.bodyYaw),L=(v:V3)=>project(v,pose.legYaw);
 const [front,side,back]=weights(pose.bodyYaw),headWeights=weights(pose.headYaw);
 const torsoWidth=84*front+58*side+84*back;
 const drawLeg=(index:number)=>{const leg=pose.legs[index];attachment(c,part('thigh'),L(leg.root),L(leg.joint),35);attachment(c,part('calf'),L(leg.joint),L(leg.end),28);pigmentJoin(c,part('thigh'),L(leg.joint),11);
  const foot=L(leg.end);anchored(c,part('shoe'),foot,22+38*Math.sin(pose.legYaw*Math.PI/180),19,leg.roll);};
 const drawArm=(index:number)=>{const a=pose.arms[index],root=P(a.root),joint=P(a.joint),wrist=P(a.end);
  attachment(c,part('upper-arm'),root,joint,29);attachment(c,part('forearm'),joint,wrist,20);pigmentJoin(c,part('forearm'),joint,6);
  const direction=Math.atan2(wrist.y-joint.y,wrist.x-joint.x);
  if(a.hand==='wave')anchored(c,part('hand-wave'),wrist,29,40,direction+Math.PI/2);
  else if(a.hand==='grip')anchored(c,part('hand-grip'),wrist,26,34,0);
  else anchored(c,part('hand-rest'),wrist,24,38,direction-Math.PI/2);
  pigmentJoin(c,part('forearm'),wrist,4.8);
 };
 // One consistent painter order; opaque cloth covers the hidden attachment caps.
 drawArm(0);drawLeg(0);drawLeg(1);
 anchored(c,part('pelvis'),P(pose.hip),68,49,pose.roll);
 attachment(c,part('neck'),P(pose.neckTop),P(pose.neckBase),17);
 (['torso-front','torso-profile','torso-back'] as const).forEach((name,i)=>attachment(c,part(name),P(pose.torsoTop),P(pose.torsoBottom),torsoWidth,[front,side,back][i]));
 const neck=P(pose.neckTop),tilt=Math.atan2(P(pose.neckBase).y-neck.y,P(pose.neckBase).x-neck.x)-Math.PI/2;
 (['head-front','head-profile','head-back'] as const).forEach((name,i)=>anchored(c,part(name),neck,BODY.headWidth,BODY.headHeight,tilt*.45,headWeights[i]));
 drawArm(1);
 if(pose.arms[0].hand==='grip')anchored(c,part('hand-grip'),P(pose.arms[0].end),26,34);
 if(debug){c.save();c.strokeStyle='#d32d2b';c.fillStyle='#fffdf6';c.lineWidth=1.25;
  for(const limb of [...pose.legs,...pose.arms]){const proj=pose.legs.includes(limb as never)?L:P;const a=proj(limb.root),b=proj(limb.joint),d=proj(limb.end);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(d.x,d.y);c.stroke();for(const q of [a,b,d]){c.beginPath();c.arc(q.x,q.y,3.4,0,Math.PI*2);c.fill();c.stroke();}}
  for(const v of [pose.neckTop,pose.neckBase,pose.hip]){const q=P(v);c.beginPath();c.arc(q.x,q.y,3.4,0,Math.PI*2);c.fill();c.stroke();}c.restore();}
}
function CharacterRig(props:RigPose){
 const ref=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{let alive=true,raf=0,last=performance.now(),activity=0,time=0,lastDrawn:RigPose|undefined;
 loadArt().then(parts=>{if(!alive)return;const frame=(now:number)=>{if(!alive)return;const cv=ref.current;if(!cv)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;const o=latest.current;if(o.frozen&&lastDrawn===o){raf=requestAnimationFrame(frame);return;}lastDrawn=o;if(!o.frozen&&!o.reduced&&!document.hidden)time+=dt;
  const c=cv.getContext('2d')!;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,440,600);
  if(o.visible&&!document.hidden){const target=o.progress>.215&&o.progress<.59&&Math.abs(o.velocity)>.002?1:0;activity+=(target-activity)*(1-Math.exp(-dt/0.10));
   const pose=anatomyPose({layout:o.layout,progress:o.progress,activity,idle:o.idle,time,mode:o.mode,phaseOverride:o.phaseOverride});drawBody(c,parts,pose,o.debug);}
  raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
 }).catch(()=>ref.current?.setAttribute('aria-label','Character attachments could not load'));
 return()=>{alive=false;cancelAnimationFrame(raf);};
 },[]);
 return <canvas ref={ref} width={880} height={1200} className="mani-rig" role="img" aria-label="Mani, an articulated hand-drawn character"/>;
}

export default memo(CharacterRig);
