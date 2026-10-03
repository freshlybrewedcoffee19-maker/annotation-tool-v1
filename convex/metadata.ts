import {query,mutation} from './_generated/server';
import {v} from 'convex/values';
export const list=query({args:{},returns:v.array(v.string()),handler:async ctx=>{
 const settings=await ctx.db.query('metadataFields').withIndex('by_key',q=>q.eq('key','shared')).unique();return settings?.fields??[];
}});
export const saveFields=mutation({args:{text:v.string()},returns:v.array(v.string()),handler:async(ctx,{text})=>{
 const fields=[...new Set(text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
 if(fields.length>100||fields.some(s=>s.length>120))throw new Error('Use up to 100 fields, each up to 120 characters.');
 const settings=await ctx.db.query('metadataFields').withIndex('by_key',q=>q.eq('key','shared')).unique();
 if(settings)await ctx.db.patch(settings._id,{fields});else await ctx.db.insert('metadataFields',{key:'shared',fields});return fields;
}});
export const saveValues=mutation({args:{episodeId:v.id('episodes'),values:v.array(v.object({field:v.string(),value:v.string()}))},returns:v.null(),handler:async(ctx,{episodeId,values})=>{
 const episode=await ctx.db.get(episodeId);if(!episode)throw new Error('Video not found.');
 const settings=await ctx.db.query('metadataFields').withIndex('by_key',q=>q.eq('key','shared')).unique();
 if(values.some(row=>!settings?.fields.includes(row.field)||row.value.length>10000))throw new Error('Save your field list first; values can contain up to 10,000 characters.');
 const merged=new Map((episode.metadata??[]).map(row=>[row.field,row.value]));for(const row of values)merged.set(row.field,row.value);
 for(const row of values)if(episode.metadataLocks?.includes(row.field)&&row.value!==(episode.metadata??[]).find(saved=>saved.field===row.field)?.value)throw new Error('Unlock this field for this video before editing its value.');
 await ctx.db.patch(episodeId,{metadata:[...merged].map(([field,value])=>({field,value}))});return null;
}});
const defaultValue=v.object({field:v.string(),value:v.string(),locked:v.boolean()});
export const defaults=query({args:{},returns:v.array(defaultValue),handler:async ctx=>{
 const saved=await ctx.db.query('metadataDefaults').withIndex('by_key',q=>q.eq('key','shared')).unique();return saved?.values??[];
}});
export const saveDefaults=mutation({args:{values:v.array(defaultValue)},returns:v.null(),handler:async(ctx,{values})=>{
 const fields=await ctx.db.query('metadataFields').withIndex('by_key',q=>q.eq('key','shared')).unique();
 if(values.some(row=>!fields?.fields.includes(row.field)||row.value.length>10000))throw new Error('Use your saved metadata fields with values up to 10,000 characters.');
 const saved=await ctx.db.query('metadataDefaults').withIndex('by_key',q=>q.eq('key','shared')).unique();
 const merged=new Map((saved?.values??[]).map(row=>[row.field,row]));for(const row of values)merged.set(row.field,row);
 if(saved)await ctx.db.patch(saved._id,{values:[...merged.values()]});else await ctx.db.insert('metadataDefaults',{key:'shared',values:[...merged.values()]});return null;
}});
export const unlockField=mutation({args:{episodeId:v.id('episodes'),field:v.string()},returns:v.null(),handler:async(ctx,{episodeId,field})=>{
 const episode=await ctx.db.get(episodeId);if(!episode)throw new Error('Video not found.');await ctx.db.patch(episodeId,{metadataLocks:(episode.metadataLocks??[]).filter(name=>name!==field)});return null;
}});
