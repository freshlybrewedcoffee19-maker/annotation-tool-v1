import {test,expect} from 'vitest';
import {unzipSync,strFromU8} from 'fflate';
import fs from 'node:fs/promises';
import {wordFeedback,excelFeedback,feedbackLinks,exportRows} from '../src/marketing/office-export';
import type {CardData} from '../src/marketing/types';
const data:CardData={card:{id:'card-check',title:'Cheddar Vox Product Launch',status:'revised',latestVersionId:'version-2',approvedVersionId:null,finalised:false,cleaning:false},owner:true,versions:[{id:'version-1',number:1,name:'Opening cut.mp4',size:100,duration:60,width:1920,height:1080,uploadedAt:1760000000000,uploader:'Riya',deleted:true},{id:'version-2',number:2,name:'Revised cut.mp4',size:100,duration:60,width:1920,height:1080,uploadedAt:1760000100000,uploader:'Alex',deleted:false}],feedback:[{id:'feedback-1',versionId:'version-1',start:1.125,end:3.875,text:'Start with the logo instead. Keep the original voice recording.',audioId:'audio-1',author:'Riya',createdAt:1760000000000,reviewed:true},{id:'feedback-2',versionId:'version-2',start:10.5,end:14.25,text:'Shorten the opening & keep the “Cheddar Vox” title.\nShow the final frame longer.',audioId:'audio-2',author:'Alex',createdAt:1760000200000,reviewed:false}],replies:[{id:'reply-1',feedbackId:'feedback-2',text:'Updated in the next revision. Please check the ending.',author:'Riya',createdAt:1760000300000}],events:[],access:[],links:[]};
async function parts(blob:Blob){return Object.fromEntries(Object.entries(unzipSync(new Uint8Array(await blob.arrayBuffer()))).map(([key,value])=>[key,strFromU8(value)]));}
test('Office exports retain versions, replies, timestamps and access-controlled links without exposing private media',async()=>{
 const base='https://cheddarvox.com/video-feedback/cards/card-check';
 const word=wordFeedback(data,'all',base),excel=excelFeedback(data,'all',base),doc=await parts(word),book=await parts(excel);
 expect(doc['word/document.xml']).toContain('00:00:01.125 to 00:00:03.875');expect(doc['word/document.xml']).toContain('Original footage deleted');expect(doc['word/document.xml']).toContain('Reply from Riya');expect(doc['word/document.xml']).toContain('Resolved');expect(doc['word/document.xml']).toContain('Open');
 expect(book['xl/worksheets/sheet1.xml']).toContain('autoFilter ref="A1:M3"');expect(book['xl/worksheets/sheet1.xml']).toContain('state="frozen"');expect(book['xl/worksheets/sheet1.xml']).toContain('Deleted - footage unavailable');
 const clip=feedbackLinks(data,data.feedback[0],base);expect(clip.clip).toBe('');expect(clip.audio).toContain('feedback=feedback-1');expect(clip.audio).toContain('play=audio');
 const links=doc['word/_rels/document.xml.rels']+book['xl/worksheets/_rels/sheet1.xml.rels'];expect(links).not.toContain('/api/marketing/media');expect(links).not.toContain('audio-1');expect(links).not.toContain('marketing/video/');expect(links).toContain('version=version-2');
 const selected=await parts(wordFeedback(data,'version-2',base));expect(selected['word/document.xml']).not.toContain('Version 1 Opening cut');expect(selected['word/document.xml']).toContain('Version 2 Revised cut');
 const publicBase='https://cheddarvox.com/video-feedback/review/'+'a'.repeat(64);expect(feedbackLinks(data,data.feedback[1],publicBase).clip).toContain(publicBase+'?version=version-2');
 expect(()=>exportRows({...data,feedback:[]},'all')).toThrow('No saved feedback');
 await fs.mkdir('outputs/marketing-office-check',{recursive:true});await fs.writeFile('outputs/marketing-office-check/unit-feedback.docx',new Uint8Array(await word.arrayBuffer()));await fs.writeFile('outputs/marketing-office-check/unit-feedback.xlsx',new Uint8Array(await excel.arrayBuffer()));
});
