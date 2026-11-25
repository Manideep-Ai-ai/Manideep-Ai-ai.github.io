export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const ease=(a:number,b:number,p:number)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
export const beats=[
 {from:0,to:.08,name:'Peek',title:'Psst. Down here.',note:'Someone’s at the edge.'},
 {from:.08,to:.16,name:'Hello',title:'Hey, I’m Mani.',note:'Saying hello.'},
 {from:.16,to:.46,name:'Walk',title:'You scroll. I stroll.',note:'Walking over.'},
 {from:.46,to:.54,name:'Chair',title:'One moment. My seat.',note:'Getting the chair ready.'},
 {from:.54,to:.64,name:'Sit',title:'Make yourself at home.',note:'Feet planted. Taking a seat.'},
 {from:.64,to:.74,name:'Turn',title:'A little change of perspective.',note:'Turning toward the desk.'},
 {from:.74,to:.80,name:'Click',title:'Let’s wake this up.',note:'One click. A world of work.'},
 {from:.80,to:.97,name:'Enter',title:'',note:'Almost in.'},
 {from:.97,to:1.01,name:'Portfolio',title:'',note:''},
];
export const beatAt=(p:number)=>beats.findIndex(b=>p>=b.from&&p<b.to);
export type Layout={w:number;h:number;s:number;floor:number;ox:number;chairX:number;chairY:number;monitor:{x:number;y:number;w:number;h:number};mouse:{x:number;y:number};start:number;stop:number;};
export function layoutFor(w:number,h:number):Layout{
 const mobile=w<700,s=Math.min(w/(mobile?760:1060),h/1020),floor=h*.5+344*s,ox=w/2;
 // All props use this one orthographic oblique projection.
 const monitor={x:ox,y:floor-344*s,w:300*s,h:190*s};
 const chairX=ox-(mobile?8:103)*s,chairY=floor-112*s;
 // Start pelvis off-screen; the lean-in artwork exposes only face and hands.
 const start=-62*s,stop=chairX-90*s;
 return {w,h,s,floor,ox,chairX,chairY,monitor,mouse:{x:ox+(mobile?128:38)*s,y:floor-217*s},start,stop};
}
export function sample(p:number,l:Layout){
 const beat=Math.max(0,beatAt(p)),walk=ease(.16,.46,p),sit=ease(.54,.64,p),turn=ease(.64,.74,p),zoom=ease(.80,.995,p);
 const greeting=ease(.08,.105,p)*(1-ease(.14,.16,p));
 const root=p<.16?mix(l.start,8*l.s,greeting):p<.46?mix(l.start,l.stop,walk):l.stop;
 const distance=Math.max(0,(root-l.start)/l.s),stride=160;
 const cover=Math.max(l.w/l.monitor.w,l.h/l.monitor.h),scale=mix(1,cover,zoom);
 const tx=zoom*(l.w/2-l.monitor.x*cover),ty=zoom*(l.h/2-l.monitor.y*cover);
 return {beat,walk,sit,turn,zoom,root,distance,walkFrame:Math.floor(distance/(stride/8))%8,chairAngle:mix(-.52,-Math.PI/2,ease(.46,.54,p))+Math.PI*turn,scale,tx,ty,cover,heroScale:scale/cover,heroX:scale*(l.monitor.x-l.w/(2*cover))+tx,heroY:scale*(l.monitor.y-l.h/(2*cover))+ty,awake:p>=.785,finished:p>=.999};
}

export function advance(current:number,target:number,dt:number,reduced=false){if(reduced)return target;const v=current+(target-current)*(1-Math.exp(-dt/.065));return Math.abs(target-v)<.00005?target:v;}
