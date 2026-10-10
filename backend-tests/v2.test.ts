import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';
import {cocoFrames,translated,yoloFrame,type SavedShape} from '../src/v2/model';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
test('V2 saves are isolated, revision checked and edits return verified shapes to pending',async()=>{
 const t=convexTest(schema,modules),token='a'.repeat(64),other='b'.repeat(64);
 const ids=await t.run(async ctx=>{const workspaceId=await ctx.db.insert('workspaces',{token,kind:'personal'});await ctx.db.insert('workspaces',{token:other,kind:'personal'});const v1=await ctx.db.insert('episodes',{workspaceId,name:'V1',duration:10});const v2=await ctx.db.insert('episodes',{workspaceId,name:'V2',duration:10});await ctx.db.insert('v2Videos',{workspaceId,episodeId:v2,sample:false});return {v1,v2};});
 const args={workspaceToken:token,episodeId:ids.v2},shape={key:'car',kind:'box' as const,label:'Car',time:2,points:[.1,.2,.4,.6]};
 expect((await t.query(api.annotations.episodes,{workspaceToken:token})).map(e=>e._id)).toEqual([ids.v1]);
 await expect(t.mutation(api.v2.save,{...args,workspaceToken:other,shape,revision:0})).rejects.toThrow();
 await expect(t.mutation(api.v2.save,{...args,episodeId:ids.v1,shape,revision:0})).rejects.toThrow('Version 1');
 await expect(t.mutation(api.v2.save,{...args,shape:{...shape,points:[.4,.2,.1,.6]},revision:0})).rejects.toThrow('Complete');
 expect(await t.mutation(api.v2.save,{...args,shape,revision:0})).toBe(1);expect(await t.mutation(api.v2.save,{...args,shape,revision:0})).toBe(1);
 const [row]=await t.query(api.v2.shapes,args);await t.mutation(api.v2.decide,{workspaceToken:token,id:row._id,revision:1,status:'verified'});
 await expect(t.mutation(api.v2.save,{...args,shape:{...shape,label:'Van'},revision:1})).rejects.toThrow('changed elsewhere');
 await t.mutation(api.v2.save,{...args,shape:{...shape,label:'Van'},revision:2});expect(await t.mutation(api.v2.save,{...args,shape:{...shape,label:'Van'},revision:2})).toBe(3);expect((await t.query(api.v2.shapes,args))[0]).toMatchObject({revision:3,status:'pending',label:'Van'});
 await t.mutation(api.v2.decide,{workspaceToken:token,id:row._id,revision:3,status:'pending',deleted:true});expect((await t.query(api.v2.shapes,args))[0].deleted).toBe(true);
 await expect(t.mutation(api.v2.save,{...args,shape,revision:0})).rejects.toThrow('changed elsewhere');
});
test('training exports contain only verified geometry and use the original frame dimensions',()=>{
 const box:SavedShape={key:'box',kind:'box',label:'Car',time:1,points:[.1,.2,.4,.6],revision:2,status:'verified',deleted:false};
 const polygon:SavedShape={...box,key:'polygon',kind:'polygon',points:[0,0,1,0,0,1]};const pending={...box,key:'pending',status:'pending' as const};
 const data=cocoFrames([box,polygon,pending,{...box,key:'gone',deleted:true}],'clip.mp4',100,200);expect(data.annotations).toHaveLength(2);expect(data.annotations[0].bbox).toEqual([10,40,30.000000000000004,80]);expect(data.annotations[1].area).toBe(10000);expect(data.images[0].timestamp_sec).toBe(1);
 expect(yoloFrame([box,pending],['Car'],1).split('\n')).toHaveLength(1);expect(translated(box,1,1).points).toEqual([.7,.6000000000000001,1,1]);
});
