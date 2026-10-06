import {createContext,useContext,useEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
import {useConvex,useMutation,useQuery,useConvexAuth} from 'convex/react';
import {api} from '../convex/_generated/api';
const Context=createContext<{workspaceToken:string;kind:'personal'|'trial'|'owner';ready:boolean;connectionError:string;prepare:()=>Promise<{kind:'personal'|'trial'|'owner'}>;switchWorkspace:(token:string)=>void;trialSetup:boolean;setTrialSetup:(pending:boolean)=>void;trialError:string;setTrialError:(message:string)=>void;trialProgress:number|null;setTrialProgress:(value:number|null)=>void;trialAttempt:RefObject<number>}|null>(null);
export function newWorkspaceToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');}
function initialToken(){const incoming=new URLSearchParams(location.hash.slice(1)).get('workspace');if(incoming&&/^[a-f0-9]{64}$/.test(incoming)){localStorage.setItem('np-workspace-token',incoming);history.replaceState(null,'',location.pathname+location.search);}let token=localStorage.getItem('np-workspace-token');if(!token){token=newWorkspaceToken();localStorage.setItem('np-workspace-token',token);}return token;}
export function WorkspaceProvider({children}:{children:ReactNode}){
 const {isLoading:authLoading,isAuthenticated}=useConvexAuth();
 const [token,setToken]=useState(initialToken),[ready,setReady]=useState<string|null>(null),[error,setError]=useState(''),[trialSetup,setTrialSetup]=useState(false);const create=useMutation(api.workspaces.create),convex=useConvex();
 const pending=useRef<{token:string;promise:Promise<null>}|null>(null);
 const [trialError,setTrialErrorState]=useState(''),[trialProgress,setTrialProgress]=useState<number|null>(null),[trialStarted,setTrialStarted]=useState(0);const trialAttempt=useRef(0);
 function beginTrial(value:boolean){if(value){trialAttempt.current++;setTrialErrorState('');setTrialProgress(null);setTrialStarted(Date.now());}setTrialSetup(value);}
 function failTrial(message:string){trialAttempt.current++;setTrialErrorState(message);setTrialSetup(true);}
 useEffect(()=>{if(!trialSetup||trialError)return;const timer=setTimeout(()=>failTrial('Loading took longer than 15 seconds. Check your connection and try again.'),Math.max(0,15000-(Date.now()-trialStarted)));return()=>clearTimeout(timer);},[trialSetup,trialStarted,trialError]);
 const owned=localStorage.getItem('cv-account-workspace')===token;
 useEffect(()=>{if(authLoading)return;if(owned&&!isAuthenticated){const guest=newWorkspaceToken();localStorage.setItem('np-workspace-token',guest);setToken(guest);return;}let cancelled=false;setReady(null);setError('');const promise=create({workspaceToken:token});pending.current={token,promise};void promise.then(()=>{if(!cancelled)setReady(token);}).catch(()=>{if(!cancelled)setError('Could not open your private workspace. Sign in or refresh to try again.');});return()=>{cancelled=true;};},[create,token,authLoading,isAuthenticated,owned]);
 const info=useQuery(api.workspaces.info,!authLoading&&(!owned||isAuthenticated)&&ready===token?{workspaceToken:token}:'skip');
 async function prepare(){await (pending.current?.token===token?pending.current.promise:create({workspaceToken:token}));return await convex.query(api.workspaces.info,{workspaceToken:token});}
 return <Context.Provider value={{workspaceToken:token,kind:info?.kind??'personal',ready:!!info,connectionError:error,prepare,trialSetup,setTrialSetup:beginTrial,trialError,setTrialError:failTrial,trialProgress,setTrialProgress,trialAttempt,switchWorkspace:next=>{localStorage.setItem('np-workspace-token',next);setToken(next);}}}><div key={token}>{children}</div></Context.Provider>;
}
export function useWorkspace(){const value=useContext(Context);if(!value)throw new Error('Workspace is not ready.');return value;}
