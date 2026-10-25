// Replace only the server/auth boundary: the application, player, voice controls,
// review screen and mutation handlers are real. All records are in convex-test.
import {useCallback,useSyncExternalStore,type ReactNode} from 'react';
import {getFunctionName} from 'convex/server';

const config=(window as any).fixtureConfig;
const bridge=(kind:string,name:string,args:any)=>(window as any).fixtureBackend(kind,name,args);
type Entry={name:string;args:any;value:any;listeners:Set<()=>void>};
const entries=new Map<string,Entry>();
const workspace={workspaceToken:config.workspaceToken,kind:config.kind,ready:true,connectionError:null,trialSetup:false,trialError:null,trialProgress:100,trialAttempt:{current:0},prepare:async()=>({kind:config.kind}),switchWorkspace:()=>{throw Error('Unexpected workspace switch');},setTrialSetup:()=>{},setTrialError:()=>{},setTrialProgress:()=>{}};
export const useWorkspace=()=>workspace;
export const WorkspaceProvider=({children}:{children:ReactNode})=>children;
export const newWorkspaceToken=()=>{throw Error('Unexpected workspace creation');};
async function refresh(){await Promise.all([...entries.values()].filter(entry=>entry.args!=='skip').map(async entry=>{entry.value=await bridge('query',entry.name,entry.args);entry.listeners.forEach(listener=>listener());}));}
async function mutate(name:string,args:any){const value=await bridge('mutation',name,args);await refresh();return value;}
export class ConvexReactClient {
 constructor(_url:string){}
 query(reference:any,args:any){return bridge('query',getFunctionName(reference),args);}
 mutation(reference:any,args:any){return mutate(getFunctionName(reference),args);}
}
const client=new ConvexReactClient('unused');
export const useConvex=()=>client;
export const useConvexAuth=()=>({isAuthenticated:config.kind==='personal',isLoading:false});
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
export function useMutation(reference:any){const name=getFunctionName(reference);return useCallback((args:any)=>mutate(name,args),[name]);}
export function useAction(reference:any){const name=getFunctionName(reference);return useCallback(()=>{throw Error(`Unexpected action: ${name}`);},[name]);}

// A controlled speech API lets a test check the real voice controller without
// opening a microphone or sending anyone's audio to a speech service.
const recognizers:FixtureRecognition[]=[];
class FixtureRecognition {
 continuous=false;interimResults=false;lang='';starts=0;stops=0;aborts=0;
 onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror:((event:any)=>void)|null=null;onresult:((event:any)=>void)|null=null;
 constructor(){recognizers.push(this);}
 start(){this.starts++;this.onstart?.();}
 stop(){this.stops++;this.onend?.();}
 abort(){this.aborts++;}
}
(window as any).SpeechRecognition=FixtureRecognition;
(window as any).editingVoiceFixture={
 result(text:string,index:number,time?:number){
  const video=document.querySelector<HTMLVideoElement>('#panel-annotate video');if(video&&time!==undefined)video.currentTime=time;
  recognizers.at(-1)?.onresult?.({resultIndex:index,results:{length:index+1,[index]:{isFinal:true,0:{transcript:text}}}});
 },
 snapshot:()=>recognizers.map(recognizer=>({starts:recognizer.starts,stops:recognizer.stops,aborts:recognizer.aborts})),
};
