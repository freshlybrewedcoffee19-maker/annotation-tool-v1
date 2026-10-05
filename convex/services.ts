import {mutation} from './_generated/server';
import {v} from 'convex/values';
import {workspace} from './access';
export const requestDataset=mutation({args:{workspaceToken:v.string(),name:v.string(),email:v.string(),organization:v.string(),task:v.string(),dataSource:v.union(v.literal('collect'),v.literal('existing'),v.literal('both')),volume:v.string()},returns:v.id('datasetRequests'),handler:async(ctx,a)=>{
 const space=await workspace(ctx,a.workspaceToken);
 const name=a.name.trim(),email=a.email.trim(),organization=a.organization.trim(),task=a.task.trim(),volume=a.volume.trim();
 if(!name||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||organization.length>200||task.length<10||task.length>4000||volume.length>200)throw Error('Enter your name, a valid email, and at least ten characters about your dataset.');
 const recent=await ctx.db.query('datasetRequests').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).order('desc').take(3);
 if(recent.length===3&&recent[2]._creationTime>Date.now()-86400000)throw Error('Three requests have already been sent today. Please try again tomorrow.');
 return ctx.db.insert('datasetRequests',{workspaceId:space._id,name,email,organization,task,dataSource:a.dataSource,volume,status:'new'});
}});
