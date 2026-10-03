import type {QueryCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
export async function workspace(ctx:QueryCtx,token:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Private workspace unavailable.');
 const saved=await ctx.db.query('workspaces').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(!saved)throw new Error('Private workspace unavailable.');return saved;
}
export async function ownedEpisode(ctx:QueryCtx,token:string,id:Id<'episodes'>){
 const space=await workspace(ctx,token),episode=await ctx.db.get(id);
 if(!episode||episode.workspaceId!==space._id)throw new Error('Video not found in this workspace.');return episode;
}
