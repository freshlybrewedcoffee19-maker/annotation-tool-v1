import {query,mutation} from './_generated/server';
import {v} from 'convex/values';
export const list=query({args:{},returns:v.array(v.string()),handler:async ctx=>{
 const saved=await ctx.db.query('labelLists').withIndex('by_key',q=>q.eq('key','shared')).unique();
 return saved?.labels??[];
}});
export const save=mutation({args:{text:v.string()},returns:v.array(v.string()),handler:async(ctx,{text})=>{
 const labels=[...new Set(text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
 if(!labels.length || labels.length>100 || labels.some(s=>s.length>120))throw new Error('Enter 1 to 100 labels, each up to 120 characters.');
 const saved=await ctx.db.query('labelLists').withIndex('by_key',q=>q.eq('key','shared')).unique();
 if(saved)await ctx.db.patch(saved._id,{labels});else await ctx.db.insert('labelLists',{key:'shared',labels});
 return labels;
}});
