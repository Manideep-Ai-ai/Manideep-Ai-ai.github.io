import {memo,useEffect,useRef,useState} from 'react';
import type {RigPose} from './character-rig';
import manifest from '../../motion/poses.json';
import './pose-sprite.css';
export type PoseName=keyof typeof manifest.poses;
const artwork:Record<string,string>={
 'contact-b':'/assets/mani/poses/contact-b.png','passing-b':'/assets/mani/poses/passing-b.png',neutral:'/assets/mani/poses/neutral.png',greeting:'/assets/mani/poses/greeting.png',contact:'/assets/mani/poses/contact.png',passing:'/assets/mani/poses/passing.png',lowering:'/assets/mani/poses/lowering.png',seated:'/assets/mani/poses/seated.png',turned:'/assets/mani/poses/turned.png',
};
export const POSE_URLS=Object.values(artwork);
export function poseFor(progress:number,phase=0,mode?:RigPose['mode']):PoseName{
 if(mode==='wave')return 'greeting';if(mode)return mode;
 if(progress<.13)return 'greeting';if(progress<.215)return 'neutral';
 if(progress<.59)return (['contact','passing','contact-b','passing-b'] as PoseName[])[Math.floor(((phase%1+1)%1)*4)];
 if(progress<.68)return 'lowering';if(progress<.76)return 'seated';return 'turned';
}
export function GroundShadow({pose}:{pose:PoseName}){const p=manifest.poses[pose];return <>{p.feet.map((a,i)=><span key={i} className="pose-ground-shadow" style={{left:`${a[0]/8.8}%`,top:'91.667%',width:`${(p.lift[i]?68:105)/8.8}%`,opacity:p.lift[i]?.22:.65}}/>)}</>;}
/** Complete illustrations, no joint rotations, mesh claims or transparent view blending. */
function PoseSprite(o:RigPose&{support?:boolean}){
 const [clock,setClock]=useState(0),[previous,setPrevious]=useState<PoseName|null>(null),ref=useRef<PoseName>('neutral');
 const moving=o.mode==='contact'&&o.phaseOverride!==undefined||(!o.mode&&o.progress>.215&&o.progress<.59&&Math.abs(o.velocity)>.002);
 useEffect(()=>{if(o.frozen||o.reduced||!moving)return;const id=setInterval(()=>{if(!document.hidden)setClock(t=>t+1);},125);return()=>clearInterval(id);},[moving,o.frozen,o.reduced]);
 const phase=o.phaseOverride??clock*.25;
 const pose=o.idle&&!o.mode&&o.progress<.59?'neutral':poseFor(o.progress,phase,o.mode==='contact'?undefined:o.mode);
 const active=o.mode==='contact'?(['contact','passing','contact-b','passing-b'] as PoseName[])[Math.floor(((phase%1+1)%1)*4)]:pose;
 const data=manifest.poses[active];
 useEffect(()=>{if(ref.current===active)return;const old=ref.current;ref.current=active;if(!moving&&!o.reduced){setPrevious(old);const t=setTimeout(()=>setPrevious(null),220);return()=>clearTimeout(t);}setPrevious(null);},[active,moving,o.reduced]);
 const stoolY=manifest.poses.seated.seat[1]/2;
 const chair=o.support&&(active==='seated'||active==='lowering'||active==='turned');
 return <div className={`pose-sprite ${o.reduced?'reduced':''} ${moving?'walking':'resting'}`} role="img" aria-label={`Mani — ${active}; complete hand-drawn illustration`} style={{visibility:o.visible?'visible':'hidden'}}>
  <GroundShadow pose={active}/>
  {chair&&<svg className="pose-support" viewBox="0 0 440 600" aria-hidden="true"><ellipse cx="200" cy="551" rx="71" ry="8" fill="#372a2117"/><path d={`M153 ${stoolY+8}l-9 ${550-stoolY-8}m102 -${550-stoolY-8}l10 ${550-stoolY-8}`} stroke="#766254" strokeWidth="8" strokeLinecap="round"/><ellipse cx="200" cy={stoolY+7} rx="64" ry="12" fill="#a78b71" stroke="#625043" strokeWidth="2"/><ellipse cx="200" cy={stoolY+3} rx="64" ry="10" fill="#cdb599" stroke="#625043" strokeWidth="2"/></svg>}
  {previous&&<img className="pose-image leaving" src={artwork[previous]} alt="" aria-hidden="true"/>}
  <img key={active} className={`pose-image ${previous?'arriving':''}`} src={artwork[active]} alt="" draggable={false}/>
  {o.debug&&<svg className="pose-anchors" viewBox="0 0 880 1200" aria-hidden="true"><path d="M45 1101H835" stroke="#a5352a" strokeDasharray="6 6"/>{[data.head,...data.hands,data.seat].map((a,i)=><g key={i}><circle cx={a[0]} cy={a[1]} r="7" fill="#fff8ed" stroke="#ba332c" strokeWidth="3"/><text x={a[0]+12} y={a[1]-12} fontSize="19" fill="#862e26">{['head','hand L','hand R','seat'][i]}</text></g>)}</svg>}
 </div>;
}
export default memo(PoseSprite);
