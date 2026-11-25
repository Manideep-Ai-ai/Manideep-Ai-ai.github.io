import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Landing} from './Landing';
import {beats,beatAt,clamp,ease,layoutFor,sample,advance} from './intro-v5/timeline';
import {hardware,paintChair} from './intro-v5/hardware';
import frames from './intro-v5/frames.json';
import {paintPinned} from './intro-v5/foot-mesh';
import './intro-v5/experience.css';
const urls:Record<string,string>={walk:'/assets/mani/v5/walk.webp',sit:'/assets/mani/v5/sit.webp',turn:'/assets/mani/v5/turn.webp',peek:'/assets/mani/v5/peek.webp',greeting:'/assets/mani/poses/greeting.webp',neutral:'/assets/mani/poses/neutral.webp'};
type Art=Record<string,HTMLImageElement>;
const walkCache:Record<string,HTMLCanvasElement>={};
function loadArt():Promise<Art>{return Promise.all(Object.entries(urls).map(([name,url])=>new Promise<[string,HTMLImageElement]>((resolve,reject)=>{const im=new Image();im.onload=()=>im.decode().then(()=>resolve([name,im]),reject);im.onerror=()=>reject(new Error(name));im.src=url;}))).then(x=>Object.fromEntries(x));}
function frame(c:CanvasRenderingContext2D,art:Art,key:'walk'|'sit'|'turn'|'peek'|'greeting'|'neutral',i:number,x:number,floor:number,s:number,correction=0,handLift=0){
 const im=art[key];if(!im)return;const index=Math.max(0,Math.min(key==='walk'?7:key==='peek'||key==='greeting'||key==='neutral'?0:5,i));
 const sx=(key==='greeting'||key==='neutral')?0:index*880;
 if(key==='walk'||handLift>0){
  const cacheKey=key+index;
  if(!walkCache[cacheKey]){const tile=document.createElement('canvas');tile.width=880;tile.height=1200;tile.getContext('2d')!.drawImage(im,sx,0,880,1200,0,0,880,1200);walkCache[cacheKey]=tile;}
  c.save();c.translate(x-200*s,floor-550*s);c.scale(s/2,s/2);const meta=key==='walk'?frames.sets.walk[index]:frames.sets.turn[index];paintPinned(c,walkCache[cacheKey],meta.bbox,meta.foot,correction,handLift);c.restore();
 }else c.drawImage(im,sx,0,880,1200,x-200*s,floor-550*s,440*s,600*s);
}
export default function IntroExperience(){
 const section=useRef<HTMLDivElement>(null),camera=useRef<HTMLDivElement>(null),hero=useRef<HTMLDivElement>(null),cv=useRef<HTMLCanvasElement>(null),ui=useRef<HTMLDivElement>(null),label=useRef<HTMLSpanElement>(null),bubble=useRef<HTMLDivElement>(null),bar=useRef<HTMLSpanElement>(null),screenStatus=useRef<HTMLDivElement>(null),scrub=useRef<HTMLInputElement>(null);
 const latest=useRef({p:0,draw:0,art:null as Art|null,ready:false,lastInput:performance.now(),rush:false,beat:-1,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,force:false,drawStarted:performance.now()});
 // ponytail: a plain ref; framer-motion's useMotionValue was the only reason the library shipped.
 const progress=useRef({v:0,set(x:number){this.v=x;},get(){return this.v;}}).current;
 const [viewport,setViewport]=useState({w:innerWidth,h:innerHeight}),[beat,setBeat]=useState(0);
 const l=useMemo(()=>layoutFor(viewport.w,viewport.h),[viewport]),paths=useMemo(()=>hardware(l),[l]),layoutRef=useRef(l);layoutRef.current=l;
 const pathRefs=useRef<(SVGPathElement|null)[]>([]),fillRefs=useRef<(SVGPathElement|null)[]>([]);
 const review=new URLSearchParams(location.search).has('storyboard')||new URLSearchParams(location.search).has('rig-review')||document.documentElement.dataset.storyboard==='true';
 const go=(p:number)=>{const el=section.current;if(!el)return;latest.current.rush=true;latest.current.lastInput=performance.now();window.scrollTo({top:el.offsetTop+p*(el.offsetHeight-innerHeight),behavior:'instant'});};
 const replay=()=>{latest.current.force=false;go(0);};
 useEffect(()=>{let live=true;loadArt().then(art=>{if(live){latest.current.art=art;latest.current.ready=true;}}).catch(()=>{if(live&&!location.hash)go(1);});return()=>{live=false;};},[]);
 useEffect(()=>{
 // The intro is the top of a longer page: only hold the story position while the visitor is still inside it.
 const resize=()=>{const keep=latest.current.p,inside=(section.current?.getBoundingClientRect().bottom??0)>innerHeight+1;setViewport({w:innerWidth,h:innerHeight});if(inside)requestAnimationFrame(()=>go(keep));};
 const input=()=>{latest.current.rush=true;latest.current.lastInput=performance.now();};
 const mq=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>{latest.current.reduced=mq.matches;if(mq.matches)go(1);};
 const previous=history.scrollRestoration;if(!location.hash){history.scrollRestoration='manual';window.scrollTo(0,0);}
 window.addEventListener('resize',resize);window.addEventListener('wheel',input,{passive:true});window.addEventListener('touchstart',input,{passive:true});window.addEventListener('keydown',input);mq.addEventListener('change',change);
 return()=>{history.scrollRestoration=previous;window.removeEventListener('resize',resize);window.removeEventListener('wheel',input);window.removeEventListener('touchstart',input);window.removeEventListener('keydown',input);mq.removeEventListener('change',change);};
 },[]);
 useLayoutEffect(()=>{let raf=0,previous=performance.now(),lastDraw=-1;
 const tick=(now:number)=>{
  const dt=Math.min(50,now-previous)/1000;previous=now;const a=latest.current,L=layoutRef.current,el=section.current;if(!el)return;
  const raw=clamp(-el.getBoundingClientRect().top/Math.max(1,el.offsetHeight-L.h));
  if(raw>0)a.rush=true;a.draw=a.rush||a.reduced?1:Math.min(1,(now-a.drawStarted)/3200);
  const target=a.reduced||a.force?1:raw,prior=a.p;
  a.p=advance(a.p,target,dt,a.reduced);
  if(Math.abs(a.p-prior)>.00005)a.lastInput=now;
  progress.set(a.p);const state=sample(progress.get(),L),idle=now-a.lastInput>1700&&a.p>.16&&a.p<.46;
  if(state.beat!==a.beat){a.beat=state.beat;setBeat(state.beat);}
  el.dataset.progress=a.p.toFixed(5);el.dataset.beat=beats[state.beat].name;el.dataset.draw=a.draw.toFixed(3);
  if(camera.current){camera.current.style.transform=`translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;camera.current.style.visibility=state.finished?'hidden':'visible';}
  if(hero.current){
   // The landing fills the monitor screen (cropped to it) instead of letterboxing a tall phone page inside a
   // wide monitor, and eases to exactly full-viewport as the camera finishes entering.
   const mw=L.monitor.w*state.scale,mh=L.monitor.h*state.scale,mx=L.monitor.x*state.scale+state.tx,my=L.monitor.y*state.scale+state.ty;
   const fill=Math.max(mw/L.w,mh/L.h),fit=Math.min(mw/L.w,mh/L.h),hs=fill+(fit-fill)*state.zoom;
   const insetX=Math.max(0,(L.w*hs-mw)/2/hs),insetY=Math.max(0,(L.h*hs-mh)/2/hs);
   hero.current.style.transform=`translate(${mx-L.w*hs/2}px,${my-L.h*hs/2}px) scale(${hs})`;
   hero.current.style.clipPath=state.finished?'none':`inset(${insetY}px ${insetX}px)`;hero.current.style.opacity=state.awake?'1':'0';hero.current.style.pointerEvents=state.finished?'auto':'none';hero.current.style.setProperty('--hero-mani',a.p>=.97?'1':'0');hero.current.inert=!state.finished;}
  if(ui.current){ui.current.setAttribute('aria-hidden',a.p>.82?'true':'false');ui.current.style.opacity=String(1-ease(.79,.82,a.p));ui.current.style.visibility=state.finished?'hidden':'visible';}
  if(label.current){const copy=!a.ready||a.draw<1?'Drawing a place for ideas.':beats[state.beat].note;if(label.current.textContent!==copy)label.current.textContent=copy;}
  if(bar.current)bar.current.style.transform=`scaleX(${a.draw<1?a.draw:a.p})`;
  if(screenStatus.current){screenStatus.current.style.opacity=state.awake?'0':String(ease(.48,.52,a.draw));screenStatus.current.style.transform=`translate(${L.monitor.x-L.monitor.w/2}px,${L.monitor.y-L.monitor.h/2}px)`;}
  if(bubble.current){bubble.current.setAttribute('aria-hidden',a.ready&&a.draw===1&&(a.p>.035&&a.p<.16||idle)?'false':'true');bubble.current.style.opacity=a.ready&&a.draw===1&&(a.p>.035&&a.p<.16||idle)?'1':'0';bubble.current.textContent=idle?'My desk is right there.':'Hi! I’m Mani.';bubble.current.style.left=`${Math.max(16,Math.min(L.w-220,state.root+L.s*85))}px`;bubble.current.style.top=`${L.floor-440*L.s-75}px`;}
  if(scrub.current&&document.activeElement!==scrub.current)scrub.current.value=String(a.p);
  for(let i=0;i<paths.length;i++)if(paths[i].press){const press=ease(.773,.78,a.p)*(1-ease(.784,.79,a.p));pathRefs.current[i]?.setAttribute('transform',`translate(0,${press*1.5*L.s})`);}
  if(a.draw!==lastDraw){for(let i=0;i<paths.length;i++){const path=paths[i],t=clamp((a.draw-path.start)/(path.end-path.start));pathRefs.current[i]?.setAttribute('stroke-dashoffset',String(1-t));pathRefs.current[i]?.setAttribute('opacity',t>0?'1':'0');fillRefs.current[i]?.setAttribute('opacity',String(ease(.7,1,t)));}lastDraw=a.draw;}
  const canvas=cv.current;if(canvas){
   canvas.style.transform=`translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;canvas.style.visibility=state.finished?'hidden':'visible';
   const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(L.w*dpr)||canvas.height!==Math.round(L.h*dpr)){canvas.width=Math.round(L.w*dpr);canvas.height=Math.round(L.h*dpr);}
   const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,L.w,L.h);
   paintChair(c,L,state.chairAngle,a.draw,state.sit);
   if(a.ready&&a.draw===1&&a.art){
    c.save();c.globalAlpha=1-ease(.83,.89,a.p);
    const actorX=a.p<.54?state.root:a.p<.64?L.stop:L.chairX;
    c.fillStyle='#42332818';c.beginPath();c.ellipse(actorX,L.floor+1,52*L.s,5*L.s,0,0,Math.PI*2);c.fill();
    if(a.p>=.16&&a.p<.46&&!idle){const plant=-62+Math.floor(state.distance/160)*160+(state.distance%160<100?60:140);c.fillStyle='#42332835';c.beginPath();c.ellipse(plant*L.s,L.floor+1,23*L.s,3*L.s,0,0,Math.PI*2);c.fill();}
    if(a.p<.08)frame(c,a.art,'peek',0,state.root,L.floor,L.s);
    else if(a.p<.16)frame(c,a.art,'greeting',0,state.root,L.floor,L.s);
    else if(a.p<.46){
     const planted=-62+Math.floor(state.distance/160)*160+(state.distance%160<100?60:140),foot=frames.sets.walk[state.walkFrame].foot;
     const delta=state.distance+(foot-400)/2-62-planted;
     frame(c,a.art,idle?'neutral':'walk',idle?0:state.walkFrame,state.root,L.floor,L.s,Math.max(-50,Math.min(50,delta)));
    }
    else if(a.p<.54)frame(c,a.art,'sit',1,state.root,L.floor,L.s);
    else if(a.p<.64)frame(c,a.art,'sit',Math.min(5,Math.floor((a.p-.54)/.10*6)),L.stop,L.floor,L.s);
    else frame(c,a.art,'turn',Math.min(4,Math.floor(ease(.64,.74,a.p)*5)),L.chairX,L.floor,L.s,0,ease(.74,.78,a.p));
    c.restore();if(a.p>.57&&a.p<.86)paintChair(c,L,state.chairAngle,a.draw,state.sit,true);
    // The press follows contact; a small ring is feedback, never a substitute hand.
    if(a.p>.775&&a.p<.795){const t=(a.p-.775)/.02;c.strokeStyle=`rgba(183,49,40,${1-t})`;c.lineWidth=1.2;c.beginPath();c.arc(L.mouse.x,L.mouse.y,(4+18*t)*L.s,0,Math.PI*2);c.stroke();}
   }
  }
  raf=requestAnimationFrame(tick);
 };raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[l,paths,progress]);
 const b=beats[beat];
 return <div ref={section} className="intro5-track">
  <div className="intro5-stage">
   <div ref={camera} className="intro5-camera">
    <svg className="intro5-hardware" width="100%" height="100%" viewBox={`0 0 ${l.w} ${l.h}`} fill="none" role="img" aria-label="Centred workstation: desk, monitor, keyboard, mousepad, cable and tower drawing in sequence">{paths.map((p,i)=><g key={i}><path ref={n=>{fillRefs.current[i]=n;}} d={p.d} fill={p.fill} opacity="0"/><path ref={n=>{pathRefs.current[i]=n;}} d={p.d} pathLength="1" strokeDasharray="1" strokeDashoffset="1" stroke="#51473f" strokeWidth={p.weight} strokeLinecap="round" strokeLinejoin="round" opacity="0"/></g>)}</svg>
    <div ref={screenStatus} className="intro5-screen" style={{width:l.monitor.w,height:l.monitor.h}}><span className="sleep-dot"/><span>GOOD THINGS START HERE.</span></div>

   </div>
    <canvas ref={cv} className="intro5-actor" role="img" aria-label="Mani peeking, walking, taking his chair and turning toward his computer"/>
   <div ref={hero} className="intro5-hero"><Landing onReplay={replay} visible progress={1}/></div>
   <div ref={ui} className="intro5-interface">
    <header><a className="intro5-logo" href="./" aria-label="Manideep Reddy, home"><img src="/assets/logo.png" alt="" width="360" height="361"/></a><span>MANIDEEP’S LITTLE CORNER</span><button onClick={()=>{latest.current.force=false;go(1);}}>Skip intro <span aria-hidden="true">↗</span></button></header>
    <div className="intro5-heading"><h1>{b.title}</h1><p>{beat===0?'Someone’s been waiting for you.':beat===1?'Come on in. I’ll show you around.':beat===2?'Same desk, every morning.':beat===3||beat===4?'Every good idea needs somewhere to begin.':beat===5?'Comfortable? Let’s get to work.':beat===6?'From this desk, to your screen.':''}</p></div>
    <div ref={bubble} className="intro5-bubble"/>
    <footer><span ref={label} role="status" aria-live="polite"/><div className="intro5-progress"><span ref={bar}/></div><span/></footer>
   </div>
   {review&&<aside className="intro5-review"><label>Scene review <input ref={scrub} type="range" min="0" max="1" step=".001" defaultValue="0" onChange={e=>go(Number(e.target.value))}/></label><span>{b.name}</span><button onClick={()=>go(0)}>Start</button><button onClick={()=>{go(0);latest.current.p=0;progress.set(0);latest.current.rush=false;latest.current.drawStarted=performance.now();}}>Draw again</button><button onClick={()=>go(1)}>End</button></aside>}
  </div>
 </div>;
}
