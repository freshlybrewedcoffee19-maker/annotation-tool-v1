import {zipSync,strToU8} from 'fflate';
import {loadTrackingVideo,readTrackingFrame} from '../tracking/frames';
import {cocoFrames,type SavedShape} from './model';
export async function exportFramePackage(source:string,episode:{name:string;width:number;height:number},shapes:SavedShape[],signal:AbortSignal,progress:(text:string)=>void){
 const data=cocoFrames(shapes,episode.name,episode.width,episode.height);
 if(!data.images.length)throw Error('Verify at least one box or polygon first.');
 if(data.images.length>50||episode.width*episode.height*data.images.length>200_000_000)throw Error('This browser export supports up to 50 frames and 200 million pixels. Export the full backup for larger datasets.');
 const video=await loadTrackingVideo(source,signal),files:Record<string,Uint8Array>={};let bytes=0;
 try{for(let i=0;i<data.images.length;i++){
  if(signal.aborted)throw Error('Export cancelled.');const frame=data.images[i];progress(`Preparing frame ${i+1} of ${data.images.length}`);
  const capture=await readTrackingFrame(video,frame.timestamp_sec,episode.width,episode.height,signal);const canvas=document.createElement('canvas');canvas.width=episode.width;canvas.height=episode.height;canvas.getContext('2d')!.drawImage(capture.image,0,0);capture.image.close();
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Could not create a frame image.')),'image/png'));
  bytes+=blob.size;if(bytes>128_000_000)throw Error('This export exceeds the browser memory allowance. Download the full backup instead.');
  frame.file_name=frame.file_name.replace('.jpg','.png');files[frame.file_name]=new Uint8Array(await blob.arrayBuffer());
  Object.assign(frame,{decoded_timestamp_sec:capture.decodedTime});
 }
 if(signal.aborted)throw Error('Export cancelled.');data.info.description='Cheddar Vox V2 verified frame annotations. Matching source frames are included in this archive.';
 files['annotations.coco.json']=strToU8(JSON.stringify(data,null,2));files['README.txt']=strToU8('Verified boxes and polygons only. Frame coordinates are pixels. Each image records source_video, timestamp_sec (annotation time), and decoded_timestamp_sec (extracted video frame time). No pending, disqualified, brush or keypoint records are included.');
 progress('Packing verified frames…');return zipSync(files,{level:0});
 }finally{video.removeAttribute('src');video.load();}
}
