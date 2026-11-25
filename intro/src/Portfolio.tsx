import { Landing, Arrow, Seated } from './Landing';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import CharacterRig from './components/ui/PoseSprite';
import { WorkstationDrawing } from './components/ui/workstation-drawing';
import { useSceneLoader } from './components/ui/desk-preloader';
import { clamp, sceneLayout, smooth, storyAt } from './motion/scene-motion';
const Hardware=memo(WorkstationDrawing);
function Mark(){return <span className="mark" aria-label="Manideep">m<span>.</span></span>;}
export default function Portfolio(){
 const [viewport,setViewport]=useState({width:innerWidth,height:innerHeight}),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[restart,setRestart]=useState(0);
 const [p,setP]=useState(0),[velocity,setVelocity]=useState(0),[idle,setIdle]=useState(false),[bypass,setBypass]=useState(false);
 const progress=useRef(0),lastInput=useRef(performance.now()),lastY=useRef(0),skipOnce=useRef(false);
 const load=useSceneLoader(restart,reduced),layout=useMemo(()=>sceneLayout(viewport.width,viewport.height),[viewport]);
 useEffect(()=>{const previous=history.scrollRestoration;history.scrollRestoration='manual';window.scrollTo({top:0,behavior:'instant'});return()=>{history.scrollRestoration=previous;};},[]);
 const story=storyAt(p,layout),landed=bypass||story.landed,ready=load.ready;
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(mq.matches);mq.addEventListener('change',sync);return()=>mq.removeEventListener('change',sync);},[]);
 useEffect(()=>{const resize=()=>{const keep=progress.current;setViewport({width:innerWidth,height:innerHeight});requestAnimationFrame(()=>{window.scrollTo({top:keep*Math.max(0,document.documentElement.scrollHeight-innerHeight),behavior:'instant'});lastY.current=scrollY;});};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 useEffect(()=>{if(ready||bypass)return;const original=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';window.scrollTo({top:0,behavior:'instant'});return()=>{document.documentElement.style.overflow=original;};},[ready,bypass,restart]);
 useEffect(()=>{if(!ready||bypass)return;let raf=0,previous=performance.now(),value=progress.current;
 const tick=(now:number)=>{const dt=Math.min(64,now-previous)/1000;previous=now;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight),target=clamp(scrollY/max);
 if(Math.abs(scrollY-lastY.current)>.4){lastInput.current=now;lastY.current=scrollY;}
 const k=reduced?1:1-Math.exp(-dt/0.085);value+= (target-value)*k;if(Math.abs(target-value)<.00003)value=target;
 const v=dt>0?(value-progress.current)/dt:0;progress.current=value;setP(value);setVelocity(v);setIdle(now-lastInput.current>1700&&value>.20&&value<.62);
 raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[ready,bypass,reduced,restart]);
 useEffect(()=>{if(ready&&!bypass&&progress.current===0){window.scrollTo({top:0,behavior:'instant'});lastY.current=0;}},[ready,bypass]);
 const skip=()=>{skipOnce.current=true;setBypass(true);setP(1);progress.current=1;load.finishDrawing();window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});};
 useEffect(()=>{if(reduced&&ready&&!skipOnce.current)skip();},[reduced,ready]);
 const replay=()=>{skipOnce.current=false;setBypass(false);setP(0);progress.current=0;lastY.current=0;lastInput.current=performance.now();window.scrollTo({top:0,behavior:'instant'});setRestart(v=>v+1);};
 const phase=p<.13?0:p<.215?1:p<.59?2:p<.71?3:p<.82?4:5;
 const labels=['A familiar face is just off-screen.','Hi! I’m Mani. Keep scrolling.','You scroll. I stroll.','Taking a seat.','Turning ideas into something real.','A little closer. You’re almost in.'];
 const drawLabel=load.draw<.075?'One line to get us started.':load.draw<.325?'Drawing the monitor.':load.draw<.49?'A place for all those shortcuts.':load.draw<.655?'A little computing power.':load.draw<.77?'Making room for ideas.':'And a seat for the curious.';
 const actorScale=story.scale,actorOpacity=ready?story.peek*(1-smooth(.815,.86,p)):0;
 const reveal=bypass?1:story.reveal;
 const screen={left:layout.monitorX-layout.monitorW*.455,top:layout.monitorY-layout.monitorH*.445,width:layout.monitorW*.91,height:layout.monitorH*.82};
 const cover=Math.max(viewport.width/screen.width,viewport.height/screen.height)*1.04;
 const cameraStyle={transformOrigin:`${layout.monitorX}px ${layout.monitorY}px`,transform:`translate(${(viewport.width/2-layout.monitorX)*story.zoom}px,${(viewport.height/2-layout.monitorY)*story.zoom}px) scale(${1+(cover-1)*story.zoom})`};
 const bubble=phase<2?'Hi! I’m Mani.':p<.40?'You scroll, I stroll. Keep going!':'My chair’s right there. A little more scroll?';
 const bubbleVisible=ready&&story.peek>.85&&(phase<2||idle)&&p<.62;
 return <div className="experience intro-v2">
  <div className="scroll-track" aria-hidden="true"/>
  <div className="viewport">
   <Landing onReplay={replay} visible={landed} progress={reveal}/>
   <section className="intro-stage" style={{display:landed?'none':undefined,opacity:1-reveal}} aria-label="An illustrated introduction controlled by your scroll" inert={landed}>
    <header className="intro-header"><Mark/><span>MANIDEEP’S LITTLE CORNER</span><button className="text-button" onClick={skip}>Skip intro</button></header>
    <div className="intro-heading" style={{opacity:1-smooth(.65,.82,p)}}>
     <h1>{!ready?<>Let’s draw<br/><em>a little possibility.</em></>:phase<2?<>Psst. Over here.<br/><em>Down by the edge.</em></>:phase===2?<>You scroll.<br/><em>I stroll.</em></>:<>Make yourself<br/><em>at home.</em></>}</h1>
     <p>{!ready?<>A monitor. A keyboard. A chair.<br/>A place to make things happen.</>:phase<2?<>A little scroll brings me out.<br/>Keep going — I’ll show you around.</>:phase===2?<>Keep scrolling to move me.<br/>Stop, and I’ll stop with you.</>:<>That’s my seat.<br/>Now let’s see what’s on screen.</>}</p>
    </div>
    <div className="workstation-camera" style={cameraStyle}>
     <Hardware layout={layout} draw={load.draw} turn={story.turn} chairOccupied={story.seat} zoom={story.zoom}/>
     <div className="intro-monitor-content" style={{...screen,opacity:smooth(.30,.37,load.draw)}} aria-hidden="true"><div className="monitor-mini-head"><span>m.</span><span>MANIDEEP REDDY</span></div><div className="monitor-mini-word">PORTFOLIO</div><div className="monitor-mini-seat"><Seated/></div><div className="monitor-mini-bottom">SOFTWARE ENGINEERING × UI DESIGN</div></div>
    </div>
    {ready&&<div className="actor-space" style={{opacity:actorOpacity}} aria-hidden={actorOpacity===0}>
     <div className="actor-viewport-anchor" style={{width:440*actorScale,height:600*actorScale,transform:`translate3d(${story.rootX-200*actorScale}px,${layout.floor-550*actorScale}px,0)`}}><CharacterRig layout={layout} progress={p} idle={idle} velocity={velocity} visible={actorOpacity>0} reduced={reduced}/></div>
     <div className={`actor-speech ${bubbleVisible?'on':''}`} style={{left:Math.max(18,Math.min(viewport.width-215,story.rootX+layout.actorHeight*.36)),top:layout.floor-layout.actorHeight*(viewport.width<700?1.43:.94)}}>{bubble}</div>
     {phase<2&&story.peek>.5&&<div className="edge-contact" style={{top:layout.floor-layout.actorHeight*.62}} aria-hidden="true"/>}
    </div>}
    <div className="intro-bottom" style={{opacity:1-smooth(.82,.91,p)}}>
     <div className="drawing-state" role="status" aria-live="polite">{!ready?<><span className="draw-dot"/>{load.draw<1?drawLabel:load.error?'The artwork could not load.':'Finishing the artwork…'}</>:<span>{labels[phase]}</span>}</div>
     <div className="intro-progress" aria-label={!ready?'Drawing progress':'Journey progress'}><span style={{transform:`scaleX(${!ready?load.draw:p})`}}/></div>
     {!ready?<button className="intro-continue" onClick={load.finishDrawing} disabled={load.draw===1}>{load.draw===1?'Almost ready':'Finish drawing'}</button>:<button className="intro-continue" aria-label="Continue the introduction" onClick={()=>window.scrollBy({top:innerHeight*.52,behavior:reduced?'instant':'smooth'})}>{phase<2?'Scroll to meet Mani':'Keep scrolling'}<Arrow down/></button>}
    </div>
    {load.error&&<div className="intro-error" role="alert">The character artwork couldn’t load.<button onClick={()=>location.reload()}>Try again</button><button onClick={skip}>Enter portfolio</button></div>}
   </section>
  </div>
 </div>;
}
