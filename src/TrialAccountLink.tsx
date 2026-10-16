import {useEffect} from 'react';
import {useConvexAuth,useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';

// Mounted for both annotation and video-feedback routes, including Google returns.
export function TrialAccountLink(){
 const {isAuthenticated,isLoading}=useConvexAuth();
 const profile=useQuery(api.accounts.me,isAuthenticated?{}:'skip');
 const link=useMutation(api.accounts.linkTrial);
 useEffect(()=>{
  if(isLoading||!isAuthenticated||!profile)return;
  let stopped=false,pending=false;const checked=new Set<string>();
  async function connect(){
   const workspaceToken=localStorage.getItem('np-trial-token');
   if(stopped||pending||!workspaceToken||!/^[a-f0-9]{64}$/.test(workspaceToken)||checked.has(workspaceToken))return;
   pending=true;
   try{await link({workspaceToken});if(!stopped)checked.add(workspaceToken);}
   catch{ /* Retry after a temporary connection failure without blocking sign-in. */ }
   finally{pending=false;}
  }
  void connect();const timer=setInterval(()=>void connect(),15000);
  window.addEventListener('focus',connect);window.addEventListener('storage',connect);
  window.addEventListener('cv-trial-ready',connect);
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',connect);window.removeEventListener('storage',connect);window.removeEventListener('cv-trial-ready',connect);};
 },[isLoading,isAuthenticated,profile?.email,link]);
 return null;
}
