// Boundary adapter for main.tsx's real export buttons and real export handler.
// Every query reaches the real Convex function in the test's in-memory database.
import {useCallback,useSyncExternalStore,type ReactNode} from 'react';
import {getFunctionName} from 'convex/server';

const config=(window as any).fixtureConfig;
const bridge=(kind:string,name:string,args:any)=>(window as any).fixtureBackend(kind,name,args);
type Entry={name:string;args:any;value:any;listeners:Set<()=>void>};
const entries=new Map<string,Entry>();
const workspace={workspaceToken:config.workspaceToken,kind:'trial',ready:true,connectionError:null,trialSetup:false,trialError:null,trialProgress:0,trialAttempt:{current:0},prepare:async()=>({kind:'trial'}),switchWorkspace:()=>{throw Error('Unexpected workspace switch');},setTrialSetup:()=>{},setTrialError:()=>{},setTrialProgress:()=>{}};
export const useWorkspace=()=>workspace;
export const WorkspaceProvider=({children}:{children:ReactNode})=>children;
export const newWorkspaceToken=()=>{throw Error('Unexpected workspace creation');};
export class ConvexReactClient {
 constructor(_url:string){}
 query(reference:any,args:any){return bridge('query',getFunctionName(reference),args);}
 mutation(reference:any,args:any){return bridge('mutation',getFunctionName(reference),args);}
}
const client=new ConvexReactClient('unused');
export const useConvex=()=>client;
export const useConvexAuth=()=>({isAuthenticated:false,isLoading:false});
export const ConvexAuthProvider=({children}:{children:ReactNode})=>children;
export const useAuthToken=()=>undefined;
export const useAuthActions=()=>({signOut:async()=>{throw Error('Unexpected sign-out');}});
export function useQuery(reference:any,args:any){
 const skip=args==='skip',name=getFunctionName(reference),key=JSON.stringify([name,args]);
 if(!entries.has(key)){
  const entry:Entry={name,args,value:undefined,listeners:new Set()};entries.set(key,entry);
  if(!skip)void bridge('query',name,args).then((value:any)=>{entry.value=value;entry.listeners.forEach(listener=>listener());});
 }
 const entry=entries.get(key)!;
 return useSyncExternalStore(useCallback((listener:()=>void)=>{entry.listeners.add(listener);return()=>{entry.listeners.delete(listener);};},[entry]),()=>entry.value);
}
export function useMutation(reference:any){const name=getFunctionName(reference);return useCallback((args:any)=>bridge('mutation',name,args),[name]);}
export function useAction(reference:any){const name=getFunctionName(reference);return useCallback(()=>{throw Error(`Unexpected action: ${name}`);},[name]);}
