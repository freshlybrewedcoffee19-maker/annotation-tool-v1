import {mutation,internalMutation} from './_generated/server';
import {v} from 'convex/values';
export const configure=internalMutation({args:{storageId:v.id('_storage'),name:v.string(),duration:v.number(),width:v.number(),height:v.number(),frameRate:v.number(),labels:v.array(v.string()),metadata:v.array(v.object({field:v.string(),value:v.string()}))},returns:v.null(),handler:async(ctx,args)=>{
 if(args.duration<30||args.duration>60||!args.labels.length)throw new Error('Trial needs a 30 to 60 second clip with labels.');
 const saved=await ctx.db.query('trialDatasets').withIndex('by_key',q=>q.eq('key','active')).unique();if(saved)await ctx.db.patch(saved._id,args);else await ctx.db.insert('trialDatasets',{key:'active',...args});return null;
}});
export const start=mutation({args:{workspaceToken:v.string()},returns:v.id('episodes'),handler:async(ctx,{workspaceToken})=>{
 if(!/^[a-f0-9]{64}$/.test(workspaceToken))throw new Error('Invalid trial workspace.');
 const existing=await ctx.db.query('workspaces').withIndex('by_token',q=>q.eq('token',workspaceToken)).unique();
 if(existing){if(existing.kind!=='trial')throw new Error('Create a separate trial workspace.');const episode=await ctx.db.query('episodes').withIndex('by_workspace',q=>q.eq('workspaceId',existing._id)).first();if(episode)return episode._id;}
 const dataset=await ctx.db.query('trialDatasets').withIndex('by_key',q=>q.eq('key','active')).unique();if(!dataset)throw new Error('Trial clip is not available yet.');
 const file=await ctx.db.system.get(dataset.storageId);if(!file)throw new Error('Trial clip is not available yet.');
 const workspaceId=existing?existing._id:await ctx.db.insert('workspaces',{token:workspaceToken,kind:'trial',accountType:'anonymous'});
 await ctx.db.insert('labelLists',{workspaceId,key:'shared',labels:dataset.labels});
 await ctx.db.insert('metadataFields',{workspaceId,key:'shared',fields:dataset.metadata.map(row=>row.field)});
 const id=await ctx.db.insert('episodes',{workspaceId,name:dataset.name,storageId:dataset.storageId,duration:dataset.duration,width:dataset.width,height:dataset.height,frameRate:dataset.frameRate,fileSize:file.size,mimeType:file.contentType??'video/mp4',metadata:dataset.metadata});return id;
}});
