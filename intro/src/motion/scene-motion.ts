/** Viewport-space choreography. The actor never inherits workstation zoom or scale. */
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export type Point={x:number;y:number};
export type SceneLayout={width:number;height:number;floor:number;actorHeight:number;chairX:number;seatY:number;monitorX:number;monitorY:number;monitorW:number;monitorH:number};
export function sceneLayout(width:number,height:number):SceneLayout{
 const mobile=width<700;
 const actorHeight=mobile?Math.min(285,height*.36,width*.70):Math.min(height*.43,width*.27);
 const floor=height*(mobile?.83:.84);
 const monitorW=actorHeight*.64;
 const monitorH=monitorW*.66;
 const monitorX=width*(mobile?.59:.71);
 const monitorY=floor-actorHeight*.52-monitorH*.5;
 const chairX=monitorX-monitorW*.62-actorHeight*.025;
 return {width,height,floor,actorHeight,chairX,seatY:floor-actorHeight*.235,monitorX,monitorY,monitorW,monitorH};
}
export function storyAt(progress:number,l:SceneLayout){
 const peek=smooth(.006,.055,progress),release=smooth(.13,.215,progress),travel=clamp((progress-.215)/.365);
 const seat=smooth(.59,.70,progress),turn=smooth(.71,.80,progress),zoom=smooth(.82,.99,progress),reveal=smooth(.92,.995,progress);
 // The start is tied to the physical viewport edge, not an illustration's bounding box.
 const edgeX=-l.actorHeight*.025;
 const clearX=Math.min(l.actorHeight*.27,l.width*.09);
 const rootX=progress<.215?lerp(edgeX,clearX,release):lerp(clearX,l.chairX,travel);
 const scale=l.actorHeight/480;
 const distance=Math.max(0,(rootX-clearX)/scale);
 return {peek,release,travel,seat,turn,zoom,reveal,rootX,scale,distance,phase:distance/(90/.6),landed:progress>=.995};
}
export function footAt(phase:number,side:0|1){
 const t=((phase+side*.5)%1+1)%1;
 const u=t/.6;
 if(t<.6)return {x:lerp(45,-45,u),y:476,roll:lerp(-.12,.10,u),contact:true};
 const swing=(t-.6)/.4;
 return {x:lerp(-45,45,smooth(0,1,swing)),y:476-Math.sin(swing*Math.PI)*29,roll:-Math.sin(swing*Math.PI)*.16,contact:false};
}
/** Two-bone IK; positive bend puts a knee forward in a rightward walk. */
export function solveIK(a:Point,b:Point,l1:number,l2:number,bend=1):Point{
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.01,Math.min(Math.hypot(dx,dy),l1+l2-.01));
 const along=(l1*l1-l2*l2+d*d)/(2*d),high=Math.sqrt(Math.max(0,l1*l1-along*along));
 const len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
 return {x:a.x+ux*along+uy*high*bend,y:a.y+uy*along-ux*high*bend};
}
export const DRAW_SECONDS=5.4;
