import {useEffect,useState} from 'react';
import CharacterRig from './components/ui/PoseSprite';
import {sceneLayout} from './motion/scene-motion';
import type {PoseOptions} from './motion/anatomy';
import './rig-review.css';
const layout=sceneLayout(1440,900);
type Mode=NonNullable<PoseOptions['mode']>;
const poses: {mode:Mode;name:string;note:string}[]=[{mode:'neutral',name:'Neutral',note:'Weight over the feet'},{mode:'wave',name:'Greeting',note:'Elbow below the raised wrist'},{mode:'contact',name:'Contact',note:'Heel and opposite toe'},{mode:'passing',name:'Passing',note:'Forward swing, one foot grounded'},{mode:'lowering',name:'Lowering',note:'Hips back, feet planted'},{mode:'seated',name:'Seated',note:'Thighs bear on the seat'},{mode:'turned',name:'Turned',note:'The body turns with the chair'}];
export default function RigReview(){
 const [mode,setMode]=useState<Mode>('neutral'),[debug,setDebug]=useState(true),[play,setPlay]=useState(false),[phase,setPhase]=useState(0);
 useEffect(()=>{if(!play)return;let raf=0,start=performance.now();const loop=(t:number)=>{setPhase(((t-start)/1450)%1);raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);},[play]);
 const choose=(m:Mode)=>{setPlay(false);setMode(m);};
 return <main className="rig-review">
  <header><div><h1>Mani <span>/ motion study</span></h1><p>Whole illustrations, grounded poses and natural weight.</p></div><a href="?">View the intro</a></header>
  <nav aria-label="Review character poses">{poses.map(p=><button key={p.mode} className={mode===p.mode?'selected':''} onClick={()=>choose(p.mode)} aria-pressed={mode===p.mode}>{p.name}</button>)}</nav>
  <div className="review-controls"><button onClick={()=>{setMode('contact');setPlay(v=>!v);}}>{play?'Pause walk':'Play walk'}</button><label><input type="checkbox" checked={debug} onChange={e=>setDebug(e.target.checked)}/> Show anchors</label><label className="phase-control">Step phase <input type="range" min="0" max="1" step=".005" value={phase} onChange={e=>{setPlay(false);setMode('contact');setPhase(Number(e.target.value));}}/></label></div>
  <section className="large-pose" aria-label="Character anatomy close-up">
   <div className="pose-art"><CharacterRig layout={layout} progress={.35} idle={false} velocity={1} visible reduced={false} mode={mode} phaseOverride={mode==='contact'?phase:undefined} support frozen={!play}/></div>
   <div className="pose-joints"><CharacterRig layout={layout} progress={.35} idle={false} velocity={1} visible reduced={false} mode={mode} phaseOverride={mode==='contact'?phase:undefined} debug={debug} support frozen={!play}/></div>
   <div className="review-notes"><h2>{poses.find(p=>p.mode===mode)?.name}</h2><p className="pose-caption">{poses.find(p=>p.mode===mode)?.note}</p><dl><dt>Complete drawings</dt><dd>Each pose is one continuous illustration: neck, clothing, hands and knees are drawn together.</dd><dt>Two visible hands</dt><dd>Both hands are drawn into every pose, with natural elbow bends and view-specific overlap.</dd><dt>Ground and support</dt><dd>Every illustration shares a sole baseline and contact shadow. A stool supports the seated studies.</dd></dl></div>
  </section>
  <section className="pose-strip" aria-label="Pose comparisons">{poses.filter(p=>p.mode!=='wave').map(p=><figure key={p.mode}><div><CharacterRig layout={layout} progress={.35} idle={false} velocity={1} visible reduced={false} mode={p.mode} support frozen/></div><figcaption>{p.name}</figcaption></figure>)}</section>
  <section className="attachment-study"><div><h2>Draw the posture.<br/>Keep the body whole.</h2><p>Continuous trouser folds replace rotating knee caps. The profile and rear have their own clothing, head angle and limb overlap.</p><p>Only complete pose images change. Red markers are head, hands and seat anchors; they do not cut or rotate the artwork.</p></div><img src="/assets/mani/poses/greeting.png" alt="Mani greeting the viewer with both hands visible and a continuous hand-drawn silhouette"/></section>
 </main>;
}
