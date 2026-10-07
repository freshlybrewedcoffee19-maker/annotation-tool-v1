import {query,mutation} from './_generated/server';
import {v} from 'convex/values';
import {workspace,ownedEpisode} from './access';
export const list=query({args:{workspaceToken:v.string(),episodeId:v.optional(v.id('episodes'))},returns:v.array(v.string()),handler:async(ctx,{workspaceToken,episodeId})=>{
 const space=await workspace(ctx,workspaceToken);
 if(episodeId){const ep=await ownedEpisode(ctx,workspaceToken,episodeId);if(ep.setupFields!==undefined)return ep.setupFields;}
 const settings=await ctx.db.query('metadataFields').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();return settings?.fields??[];
}});
export const saveFields=mutation({args:{workspaceToken:v.string(),text:v.string(),episodeId:v.optional(v.id('episodes'))},returns:v.array(v.string()),handler:async(ctx,{workspaceToken,text,episodeId})=>{
 const space=await workspace(ctx,workspaceToken);
 const fields=[...new Set(text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
 if(fields.length>100||fields.some(s=>s.length>120))throw new Error('Use up to 100 fields, each up to 120 characters.');
 if(episodeId){const ep=await ownedEpisode(ctx,workspaceToken,episodeId);if(ep.setupFields!==undefined){await ctx.db.patch(episodeId,{setupFields:fields});return fields;}}
 const settings=await ctx.db.query('metadataFields').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();
 if(settings)await ctx.db.patch(settings._id,{fields});else await ctx.db.insert('metadataFields',{workspaceId:space._id,key:'shared',fields});return fields;
}});
export const saveValues=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),values:v.array(v.object({field:v.string(),value:v.string()}))},returns:v.null(),handler:async(ctx,{workspaceToken,episodeId,values})=>{
 const space=await workspace(ctx,workspaceToken);
 const episode=await ownedEpisode(ctx,workspaceToken,episodeId);if(!episode)throw new Error('Video not found.');
 const settings=await ctx.db.query('metadataFields').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();
 if(values.some(row=>!(episode.setupFields??settings?.fields)?.includes(row.field)||row.value.length>10000))throw new Error('Save your field list first; values can contain up to 10,000 characters.');
 const merged=new Map((episode.metadata??[]).map(row=>[row.field,row.value]));for(const row of values)merged.set(row.field,row.value);
 for(const row of values)if(episode.metadataLocks?.includes(row.field)&&row.value!==(episode.metadata??[]).find(saved=>saved.field===row.field)?.value)throw new Error('Unlock this field for this video before editing its value.');
 await ctx.db.patch(episodeId,{metadata:[...merged].map(([field,value])=>({field,value}))});return null;
}});
const defaultValue=v.object({field:v.string(),value:v.string(),locked:v.boolean()});
export const defaults=query({args:{workspaceToken:v.string(),},returns:v.array(defaultValue),handler:async(ctx,{workspaceToken})=>{
 const space=await workspace(ctx,workspaceToken);
 const saved=await ctx.db.query('metadataDefaults').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();return saved?.values??[];
}});
export const saveDefaults=mutation({args:{workspaceToken:v.string(),values:v.array(defaultValue)},returns:v.null(),handler:async(ctx,{workspaceToken,values})=>{
 const space=await workspace(ctx,workspaceToken);
 const fields=await ctx.db.query('metadataFields').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();
 if(values.some(row=>!fields?.fields.includes(row.field)||row.value.length>10000))throw new Error('Use your saved metadata fields with values up to 10,000 characters.');
 const saved=await ctx.db.query('metadataDefaults').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();
 const merged=new Map((saved?.values??[]).map(row=>[row.field,row]));for(const row of values)merged.set(row.field,row);
 if(saved)await ctx.db.patch(saved._id,{values:[...merged.values()]});else await ctx.db.insert('metadataDefaults',{workspaceId:space._id,key:'shared',values:[...merged.values()]});return null;
}});
export const unlockField=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),field:v.string()},returns:v.null(),handler:async(ctx,{workspaceToken,episodeId,field})=>{
 const episode=await ownedEpisode(ctx,workspaceToken,episodeId);if(!episode)throw new Error('Video not found.');await ctx.db.patch(episodeId,{metadataLocks:(episode.metadataLocks??[]).filter(name=>name!==field)});return null;
}});
export const lockValues=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),values:v.array(v.object({field:v.string(),value:v.string(),locked:v.boolean()}))},returns:v.null(),handler:async(ctx,{workspaceToken,episodeId,values})=>{
 const space=await workspace(ctx,workspaceToken),episode=await ownedEpisode(ctx,workspaceToken,episodeId);
 const settings=await ctx.db.query('metadataFields').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();
 if(values.length>100||values.some(row=>!(episode.setupFields??settings?.fields)?.includes(row.field)||row.value.length>10000))throw new Error('Use your saved fields and values up to 10,000 characters.');
 const merged=new Map((episode.metadata??[]).map(row=>[row.field,row.value])),locks=new Set(episode.metadataLocks??[]);
 for(const row of values){if(locks.has(row.field)&&row.value!==merged.get(row.field))throw new Error('Unlock this field before changing its value.');merged.set(row.field,row.value);if(row.locked)locks.add(row.field);}
 await ctx.db.patch(episodeId,{metadata:[...merged].map(([field,value])=>({field,value})),metadataLocks:[...locks]});return null;
}});
