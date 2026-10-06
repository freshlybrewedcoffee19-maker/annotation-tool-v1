import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useConvex,useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
const Context=createContext<{workspaceToken:string;kind:'personal'|'trial'|'owner';ready:boolean;connectionError:string;prepare:()=>Promise<{kind:'personal'|'trial'|'owner'}>;switchWorkspace:(token:string)=>void;trialSetup:boolean;setTrialSetup:(pending:boolean)=>void}|null>(null);
export function newWorkspaceToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');}
function initialToken(){const incoming=new URLSearchParams(location.hash.slice(1)).get('workspace');if(incoming&&/^[a-f0-9]{64}$/.test(incoming)){localStorage.setItem('np-workspace-token',incoming);history.replaceState(null,'',location.pathname+location.search);}let token=localStorage.getItem('np-workspace-token');if(!token){token=newWorkspaceToken();localStorage.setItem('np-workspace-token',token);}return token;}
export function WorkspaceProvider({children}:{children:ReactNode}){
 const [token,setToken]=useState(initialToken),[ready,setReady]=useState<string|null>(null),[error,setError]=useState(''),[trialSetup,setTrialSetup]=useState(false);const create=useMutation(api.workspaces.create),convex=useConvex();
 const pending=useRef<{token:string;promise:Promise<null>}|null>(null);
 useEffect(()=>{let cancelled=false;setReady(null);setError('');const promise=create({workspaceToken:token});pending.current={token,promise};void promise.then(()=>{if(!cancelled)setReady(token);}).catch(()=>{if(!cancelled)setError('Could not open your private workspace. Refresh to try again.');});return()=>{cancelled=true;};},[create,token]);
 const info=useQuery(api.workspaces.info,ready===token?{workspaceToken:token}:'skip');
 async function prepare(){await (pending.current?.token===token?pending.current.promise:create({workspaceToken:token}));return await convex.query(api.workspaces.info,{workspaceToken:token});}
 return <Context.Provider value={{workspaceToken:token,kind:info?.kind??'personal',ready:!!info,connectionError:error,prepare,trialSetup,setTrialSetup,switchWorkspace:next=>{localStorage.setItem('np-workspace-token',next);setToken(next);}}}><div key={token}>{children}</div></Context.Provider>;
}
export function useWorkspace(){const value=useContext(Context);if(!value)throw new Error('Workspace is not ready.');return value;}
