import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
const Context=createContext<{workspaceToken:string;kind:'personal'|'trial'|'owner';switchWorkspace:(token:string)=>void}|null>(null);
export function newWorkspaceToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');}
function initialToken(){const incoming=new URLSearchParams(location.hash.slice(1)).get('workspace');if(incoming&&/^[a-f0-9]{64}$/.test(incoming)){localStorage.setItem('np-workspace-token',incoming);history.replaceState(null,'',location.pathname+location.search);}let token=localStorage.getItem('np-workspace-token');if(!token){token=newWorkspaceToken();localStorage.setItem('np-workspace-token',token);}return token;}
export function WorkspaceProvider({children}:{children:ReactNode}){
 const [token,setToken]=useState(initialToken),[ready,setReady]=useState(false),[error,setError]=useState('');const create=useMutation(api.workspaces.create);
 useEffect(()=>{let cancelled=false;setReady(false);void create({workspaceToken:token}).then(()=>{if(!cancelled)setReady(true);}).catch(()=>{if(!cancelled)setError('Could not open your private workspace. Refresh to try again.');});return()=>{cancelled=true;};},[create,token]);
 const info=useQuery(api.workspaces.info,ready?{workspaceToken:token}:'skip');
 if(!info)return <main><h1>nP Tools</h1><p role="status">{error||'Opening your private workspace...'}</p></main>;
 return <Context.Provider value={{workspaceToken:token,kind:info.kind,switchWorkspace:next=>{localStorage.setItem('np-workspace-token',next);setToken(next);}}}><div key={token}>{children}</div></Context.Provider>;
}
export function useWorkspace(){const value=useContext(Context);if(!value)throw new Error('Workspace is not ready.');return value;}
