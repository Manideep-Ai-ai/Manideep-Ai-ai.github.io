import {ease} from './timeline.ts';
export type Vertex={x:number;y:number};
export function pinVertex(v:Vertex,foot:number,correction:number):Vertex{
 const weight=ease(850,1095,v.y)*Math.exp(-Math.pow((v.x-foot)/155,2));
 return {x:v.x-correction*2*weight,y:v.y};
}
/** One continuous texture with a smooth planted-foot deformation, no knee cuts. */
export function paintPinned(c:CanvasRenderingContext2D,im:CanvasImageSource,bbox:number[],foot:number,correction:number,handLift=0){
 const [left,top,w,h]=bbox,cols=6,rows=14;
 const tri=(a:Vertex,b:Vertex,d:Vertex)=>{
  const deform=(v:Vertex)=>{const q=pinVertex(v,foot,correction),weight=ease(450,620,v.x)*Math.exp(-Math.pow((v.y-730)/150,4))*handLift;return {x:q.x+32*weight,y:q.y-60*weight};};
  const A=deform(a),B=deform(b),D=deform(d);
  const den=a.x*(b.y-d.y)+b.x*(d.y-a.y)+d.x*(a.y-b.y);if(Math.abs(den)<.01)return;
  const m=(v1:number,v2:number,v3:number)=>[(v1*(b.y-d.y)+v2*(d.y-a.y)+v3*(a.y-b.y))/den,(v1*(d.x-b.x)+v2*(a.x-d.x)+v3*(b.x-a.x))/den,(v1*(b.x*d.y-d.x*b.y)+v2*(d.x*a.y-a.x*d.y)+v3*(a.x*b.y-b.x*a.y))/den];
  const X=m(A.x,B.x,D.x),Y=m(A.y,B.y,D.y);
  // Each clip overlaps its neighbours by ~1.5 source px: exact edges leave anti-aliased hairline seams (banding).
  const cx=(A.x+B.x+D.x)/3,cy=(A.y+B.y+D.y)/3,grow=(v:Vertex)=>{const dx=v.x-cx,dy=v.y-cy,l=Math.hypot(dx,dy)||1;return {x:v.x+dx/l*1.5,y:v.y+dy/l*1.5};};
  const GA=grow(A),GB=grow(B),GD=grow(D);
  c.save();c.beginPath();c.moveTo(GA.x,GA.y);c.lineTo(GB.x,GB.y);c.lineTo(GD.x,GD.y);c.closePath();c.clip();c.transform(X[0],Y[0],X[1],Y[1],X[2],Y[2]);c.drawImage(im,0,0);c.restore();
 };
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const a={x:left+w*x/cols,y:top+h*y/rows},b={x:left+w*(x+1)/cols,y:a.y},d={x:a.x,y:top+h*(y+1)/rows},e={x:b.x,y:d.y};tri(a,b,d);tri(b,e,d);
 }
}
