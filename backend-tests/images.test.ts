import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {internal,api} from '../convex/_generated/api';
import {imageSpeechResults} from '../src/image-labels';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
test('images save untimed labels idempotently, review and export without changing timed videos',async()=>{
 const t=convexTest(schema,modules),token='d'.repeat(64);const ids=await t.run(async ctx=>{const user=await ctx.db.insert('users',{}),other=await ctx.db.insert('users',{}),space=await ctx.db.insert('workspaces',{userId:user,token,kind:'personal'});const video=await ctx.db.insert('episodes',{workspaceId:space,name:'old.mp4',duration:10,metadata:[{field:'Keep',value:'Saved'}]});await ctx.db.insert('segments',{episodeId:video,label:'walk',start_sec:1,end_sec:2});return {user,other,video};});
 const owner=t.withIdentity({subject:`${ids.user}|test`}),other=t.withIdentity({subject:`${ids.other}|test`});
 const uploadId=await owner.mutation(internal.r2Records.reserve,{workspaceToken:token,mediaType:'image',key:'staging/image',name:'portrait.png',size:100,mime:'image/png',duration:0,width:320,height:640});
 const episodeId=await owner.mutation(internal.r2Records.finish,{workspaceToken:token,uploadId,key:'images/saved'});
 const args={workspaceToken:token,episodeId,label:'Red shirt',clientKey:'recognition-1',source:'voice' as const};
 const id=await owner.mutation(api.images.save,args);expect(await owner.mutation(api.images.save,args)).toBe(id);expect(await owner.mutation(api.images.save,{...args,clientKey:'duplicate',label:'red shirt'})).toBe(id);
 const rows=await owner.query(api.images.labels,{workspaceToken:token,episodeId});expect(rows).toHaveLength(1);expect(rows[0]).not.toHaveProperty('start_sec');expect(rows[0]).not.toHaveProperty('end_sec');
 await expect(other.mutation(api.images.save,args)).rejects.toThrow('Sign in');await expect(owner.mutation(api.images.save,{...args,episodeId:ids.video})).rejects.toThrow('Choose an image');
 await expect(owner.mutation(api.annotations.save,{workspaceToken:token,episodeId,label:'bad',start_sec:0,end_sec:1})).rejects.toThrow('Use image labels');
 await owner.mutation(api.images.save,{...args,id,label:'Blue shirt'});await owner.mutation(api.images.review,{workspaceToken:token,id,status:'verified'});
 expect(await owner.query(api.images.exportLabels,{workspaceToken:token})).toEqual([{filename:'portrait.png',labels:['Blue shirt']}]);
 await owner.mutation(api.images.review,{workspaceToken:token,id,status:'disqualified'});expect(await owner.query(api.images.exportLabels,{workspaceToken:token,episodeId})).toEqual([{filename:'portrait.png',labels:[]}]);
 await owner.mutation(api.images.remove,{workspaceToken:token,id});expect(await owner.query(api.images.labels,{workspaceToken:token,episodeId})).toEqual([]);
 expect(await owner.query(api.annotations.exportAll,{workspaceToken:token})).toEqual([{episode:'old.mp4',label:'walk',start_sec:1,end_sec:2}]);expect((await owner.query(api.annotations.episodes,{workspaceToken:token})).find(e=>e._id===ids.video)?.metadata).toEqual([{field:'Keep',value:'Saved'}]);
 await expect(owner.mutation(internal.r2Records.reserve,{workspaceToken:token,mediaType:'image',key:'bad',name:'bad.png',size:100,mime:'video/mp4',duration:0,width:320,height:640})).rejects.toThrow('valid image');
});
test('image speech saves final phrases once, including start and stop as ordinary labels',()=>{
 const labels:string[]=[];const speech=imageSpeechResults(label=>labels.push(label));speech.result(0,'red',false);speech.result(0,'red shirt.',true);speech.result(0,'red shirt.',true);speech.result(1,'start',true);speech.result(2,'stop',true);expect(labels).toEqual(['red shirt','start','stop']);speech.reset();speech.result(0,'new image',true);expect(labels.at(-1)).toBe('new image');
});
