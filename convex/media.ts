import {mutation} from './_generated/server';
import {v} from 'convex/values';
export const setFrameRate=mutation({args:{episodeId:v.id('episodes'),frameRate:v.union(v.number(),v.null())},returns:v.null(),handler:async(ctx,{episodeId,frameRate})=>{
 if(frameRate!==null&&(!Number.isFinite(frameRate)||frameRate<=0||frameRate>1000))throw new Error('Enter a frame rate greater than 0 and up to 1000.');
 if(!await ctx.db.get(episodeId))throw new Error('Episode not found.');
 await ctx.db.patch(episodeId,{frameRate});return null;
}});
