import { useEffect, useRef, useState } from 'react';
import {POSE_URLS} from './PoseSprite';
import { DRAW_SECONDS } from '../../motion/scene-motion';
/** The supplied Darwaza pattern: scheduled normalized strokes, then a ready scroll state.
 * Drawing completion and real asset readiness are separate conditions.
 */
export function useSceneLoader(restart=0,reduced=false){
 const [draw,setDraw]=useState(0),[assetsReady,setAssetsReady]=useState(false),[error,setError]=useState(false);
 const rush=useRef(false);
 useEffect(()=>{let alive=true,raf=0,elapsed=0,previous=0;rush.current=false;setDraw(0);setAssetsReady(false);setError(false);
 const jobs=[...POSE_URLS,'/assets/mani-seated.png'].map(src=>new Promise<void>((resolve,reject)=>{const im=new Image();im.onload=()=>im.decode().then(()=>resolve(),reject);im.onerror=reject;im.src=src;}));
 jobs.push(document.fonts.ready.then(()=>{}));
 Promise.all(jobs).then(()=>{if(alive)setAssetsReady(true);}).catch(()=>{if(alive)setError(true);});
 const tick=(now:number)=>{if(!alive)return;const dt=previous?Math.min(64,now-previous):0;previous=now;if(!document.hidden)elapsed+=dt;const progress=reduced||rush.current?1:Math.min(1,elapsed/(DRAW_SECONDS*1000));setDraw(progress);if(progress<1)raf=requestAnimationFrame(tick);};
 raf=requestAnimationFrame(tick);return()=>{alive=false;cancelAnimationFrame(raf);};
 },[restart,reduced]);
 return {draw,assetsReady,ready:draw===1&&assetsReady,error,finishDrawing:()=>{rush.current=true;setDraw(1);}};
}
