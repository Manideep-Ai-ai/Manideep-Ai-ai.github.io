export const ATLAS='/assets/mani-rig-v3.png';
export const PART_NAMES=['head-front','head-profile','head-back','neck','torso-front','torso-profile','torso-back','pelvis','upper-arm','forearm','hand-rest','hand-wave','thigh','calf','shoe','hand-grip'] as const;
export type PartName=typeof PART_NAMES[number];
export type Pivot=[number,number];
export type Attachment={name:PartName;cell:[number,number,number,number];proximal:Pivot;distal?:Pivot;overlap:number};
// Source rectangles follow the actual exported artwork, not an assumed equal-height grid.
const rows=[0,250,610,905,1247];
export const ATTACHMENTS:Attachment[]=PART_NAMES.map((name,index)=>{
 const col=index%4,row=Math.floor(index/4),x=Math.floor(col*1261/4),right=Math.floor((col+1)*1261/4);
 const a:Attachment={name,cell:[x,rows[row],right-x,rows[row+1]-rows[row]],proximal:[.5,.10],distal:[.5,.90],overlap:.10};
 if(name==='upper-arm'){a.proximal=[.43,.08];a.distal=[.57,.90];}
 if(name==='forearm'){a.proximal=[.50,.08];a.distal=[.49,.93];}
 if(name==='thigh'){a.proximal=[.55,.08];a.distal=[.50,.92];}
 if(name==='calf'){a.proximal=[.51,.08];a.distal=[.48,.91];}
 if(name.startsWith('head')){a.proximal=[.50,.97];delete a.distal;}
 if(name.startsWith('torso')){a.proximal=[.50,.035];a.distal=[.50,.975];}
 if(name==='pelvis'){a.proximal=[.5,.72];delete a.distal;}
 if(name==='neck'){a.proximal=[.50,.12];a.distal=[.50,.88];}
 if(name==='hand-rest'){a.proximal=[.50,.12];delete a.distal;}
 if(name==='hand-wave'){a.proximal=[.43,.96];delete a.distal;}
 if(name==='hand-grip'){a.proximal=[.57,.95];delete a.distal;}
 if(name==='shoe'){a.proximal=[.29,.25];delete a.distal;}
 return a;
});
