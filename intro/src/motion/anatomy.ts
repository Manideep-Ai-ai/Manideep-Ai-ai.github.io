import {clamp,lerp,smooth,storyAt,type SceneLayout} from './scene-motion.ts';
export type V3={x:number;y:number;z:number};
export type V2={x:number;y:number};
const rad=(d:number)=>d*Math.PI/180;
export const BODY={floor:550,ankle:535,hip:316,thigh:110,calf:110,upperArm:77,forearm:70,headHeight:68,headWidth:55,shoulderHalf:29,hipHalf:16};
export const add=(a:V3,b:V3):V3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
export const dist=(a:V3,b:V3)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export const project=(v:V3,yaw:number):V2=>({x:200+v.x*Math.cos(rad(yaw))+v.z*Math.sin(rad(yaw)),y:v.y});
const mix3=(a:V3,b:V3,t:number):V3=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)});

/** Clamp the END POINT as well as the joint. No limb is scaled to an unreachable target. */
export function sagittalChain(root:V3,target:V3,l1:number,l2:number,minFlex=3,maxFlex=145,bend=1){
 const dz=target.z-root.z,dy=target.y-root.y,raw=Math.hypot(dz,dy)||.001;
 const span=(flex:number)=>Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(rad(flex)));
 const d=Math.max(span(maxFlex),Math.min(span(minFlex),raw));
 const uz=dz/raw,uy=dy/raw,along=(l1*l1-l2*l2+d*d)/(2*d),out=Math.sqrt(Math.max(0,l1*l1-along*along));
 return {joint:{x:root.x,y:root.y+uy*along-uz*out*bend,z:root.z+uz*along+uy*out*bend},end:{x:root.x,y:root.y+uy*d,z:root.z+uz*d},flex:Math.acos(Math.max(-1,Math.min(1,(d*d-l1*l1-l2*l2)/(2*l1*l2))))*180/Math.PI};
}
export function gaitFoot(phase:number,side:number){
 const t=((phase+side*.5)%1+1)%1;
 if(t<.6)return{z:lerp(35,-35,t/.6),y:535,roll:lerp(-.10,.08,t/.6),contact:true};
 const f=(t-.6)/.4;
 return{z:lerp(-35,35,smooth(0,1,f)),y:535-Math.sin(f*Math.PI)*27,roll:-Math.sin(f*Math.PI)*.10,contact:false};
}
function gaitHip(phase:number){
 const t=(((phase% .5)+.5)%.5)/.5*4,i=Math.floor(t),f=smooth(0,1,t-i),keys=[319,323,317,315,319];
 return lerp(keys[i],keys[i+1],f);
}
export type Limb={root:V3;joint:V3;end:V3;flex:number};
export type Arm=Limb&{hand:'relaxed'|'wave'|'grip';handAngle:number};
export type Leg=Limb&{roll:number;contact:boolean};
export type AnatomyPose={hip:V3;torsoTop:V3;torsoBottom:V3;neckTop:V3;neckBase:V3;arms:[Arm,Arm];legs:[Leg,Leg];bodyYaw:number;legYaw:number;headYaw:number;seat:number;phase:number;lean:number;roll:number};
export type PoseOptions={layout:SceneLayout;progress:number;activity:number;idle:boolean;time:number;phaseOverride?:number;mode?:'neutral'|'wave'|'contact'|'passing'|'lowering'|'seated'|'turned'};

export function anatomyPose(o:PoseOptions):AnatomyPose{
 let p=o.progress,activity=clamp(o.activity);
 const review=o.mode;
 if(review){p={neutral:.30,wave:.09,contact:.35,passing:.35,lowering:.65,seated:.705,turned:.81}[review];activity=review==='contact'||review==='passing'?1:0;}
 const s=storyAt(p,o.layout),peek=1-s.release,walkStage=p>=.215&&p<.59;
 let legYaw=lerp(lerp(35,72,s.release),lerp(35,115,s.turn),s.seat);
 if((walkStage&&o.idle)||review==='neutral')legYaw=35;
 let bodyYaw=walkStage&&o.idle?35:legYaw;
 if(review==='neutral')bodyYaw=35;
 const phase=o.phaseOverride??(review==='contact'?0:review==='passing'?.25:s.distance/((70/.6)*Math.sin(rad(72))));
 const hipY=lerp(lerp(BODY.hip,gaitHip(phase),activity),550-(o.layout.floor-o.layout.seatY)/s.scale-14,s.seat);
 const lowerLean=Math.sin(s.seat*Math.PI)*.16;
 const lean=peek*.27+lowerLean+(walkStage?.025:0)*(1-s.seat);
 const roll=Math.sin(phase*Math.PI*2)*.018*activity*(1-s.seat);
 const hip:V3={x:0,y:hipY,z:0};
 const body=(x:number,y:number,z=0):V3=>{const yy=y*Math.cos(lean)+z*Math.sin(lean),zz=-y*Math.sin(lean)+z*Math.cos(lean);return{x:x*Math.cos(roll)-yy*Math.sin(roll),y:hipY+x*Math.sin(roll)+yy*Math.cos(roll),z:zz};};
 const legs=([0,1] as const).map(side=>{
  const sign=side===0?-1:1,f=gaitFoot(phase,side);
  const root:V3={x:sign*BODY.hipHalf,y:hipY+sign*Math.sin(phase*Math.PI*2)*1.1*activity,z:0};
  const target:V3={x:root.x,y:lerp(lerp(535,f.y,activity),535,s.seat),z:lerp(f.z*activity,108,s.seat)};
  const chain=sagittalChain(root,target,BODY.thigh,BODY.calf,3,138,1);
  return {root,...chain,roll:f.roll*activity*(1-s.seat),contact:f.contact||activity<.05||s.seat>.95};
 }) as [Leg,Leg];
 const arms=([0,1] as const).map(side=>{
  const sign=side===0?-1:1,root=body(sign*BODY.shoulderHalf,-143);
  const swing=Math.sin(phase*2*Math.PI+(side===0?Math.PI:0))*.34*activity*(1-s.seat);
  let a=swing,b=swing+.12;
  let joint=add(root,{x:0,y:Math.cos(a)*BODY.upperArm,z:Math.sin(a)*BODY.upperArm});
  let end=add(joint,{x:0,y:Math.cos(b)*BODY.forearm,z:Math.sin(b)*BODY.forearm});
  let hand:Arm['hand']='relaxed',handAngle=0;
  const wave=(peek>.2&&side===1)||(o.idle&&walkStage&&side===1)||review==='wave'&&side===1;
  if(wave){
   // Elbow stays below the shoulder; the raised forearm ends at a separate wrist.
   a=rad(58);b=rad(172+Math.sin(o.time*6)*10);
   joint=add(root,{x:sign*Math.sin(a)*BODY.upperArm,y:Math.cos(a)*BODY.upperArm,z:0});
   end=add(joint,{x:sign*Math.sin(b)*BODY.forearm,y:Math.cos(b)*BODY.forearm,z:0});
   hand='wave';
  }
  if(peek>.2&&side===0){
   const screenX=(3-s.rootX)/s.scale;
   const projectedRoot=project(root,bodyYaw),targetX=screenX+200+8;
   // A planar arm IK with consistent bone lengths for the hand gripping the viewport.
   const dx=targetX-projectedRoot.x,dy=hipY-90-root.y,raw=Math.hypot(dx,dy)||1;
   const d=Math.min(145,Math.max(45,raw)),ux=dx/raw,uy=dy/raw;
   const along=(77*77-70*70+d*d)/(2*d),height=Math.sqrt(Math.max(0,77*77-along*along));
   const ex=projectedRoot.x+ux*along-uy*height,ey=root.y+uy*along+ux*height;
   const wx=projectedRoot.x+ux*d,wy=root.y+uy*d;
   const c=Math.cos(rad(bodyYaw)),sn=Math.sin(rad(bodyYaw));
   joint={x:root.x+(ex-projectedRoot.x)*c,y:ey,z:root.z+(ex-projectedRoot.x)*sn};end={x:root.x+(wx-projectedRoot.x)*c,y:wy,z:root.z+(wx-projectedRoot.x)*sn};
   // The grip is expressed in screen plane: renderer uses its dedicated landmark override.
   hand='grip';
  }
  if(s.seat>0){
   const target={x:root.x,y:hipY-lerp(24,79,s.turn),z:lerp(50,108,s.turn)};
   const chain=sagittalChain(root,target,77,70,8,145,-1);
   // Interpolate bone directions, not the positions: both anatomical lengths remain constant.
   const lerpAngle=(from:number,to:number,t:number)=>{let d=to-from;while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;return from+d*t;};
   const currentA=Math.atan2(joint.z-root.z,joint.y-root.y),sitA=Math.atan2(chain.joint.z-root.z,chain.joint.y-root.y);
   const currentB=Math.atan2(end.z-joint.z,end.y-joint.y),sitB=Math.atan2(chain.end.z-chain.joint.z,chain.end.y-chain.joint.y);
   a=lerpAngle(currentA,sitA,s.seat);b=lerpAngle(currentB,sitB,s.seat);
   joint=add(root,{x:0,y:Math.cos(a)*77,z:Math.sin(a)*77});end=add(joint,{x:0,y:Math.cos(b)*70,z:Math.sin(b)*70});hand='relaxed';
  }
  const v1={x:joint.x-root.x,y:joint.y-root.y,z:joint.z-root.z},v2={x:end.x-joint.x,y:end.y-joint.y,z:end.z-joint.z};
  const flex=Math.acos(Math.max(-1,Math.min(1,(v1.x*v2.x+v1.y*v2.y+v1.z*v2.z)/(Math.hypot(v1.x,v1.y,v1.z)*Math.hypot(v2.x,v2.y,v2.z)))))*180/Math.PI;
  return{root,joint,end,flex,hand,handAngle};
 }) as [Arm,Arm];
 return {hip,torsoTop:body(0,-158),torsoBottom:body(0,2),neckTop:body(0,-166),neckBase:body(0,-153),arms,legs,bodyYaw,legYaw,headYaw:walkStage&&o.idle?35:bodyYaw,seat:s.seat,phase,lean,roll};
}
