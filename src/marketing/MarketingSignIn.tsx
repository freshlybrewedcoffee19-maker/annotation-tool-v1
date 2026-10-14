import {useEffect,useRef} from 'react';
import {SignIn} from '../SignIn';
import {KeyboardHome} from './KeyboardHome';
export function MarketingSignIn({back,done,redirectTo}:{back:()=>void;done:()=>void;redirectTo:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>{node?.close();};},[]);
 return <><div aria-hidden="true" inert><KeyboardHome upload={()=>{}}/></div><dialog ref={dialog} className="marketing-auth-dialog" aria-label="Sign in to Video Feedback" onCancel={event=>{event.preventDefault();back();}}><button type="button" className="marketing-modal-close" aria-label="Close sign in" onClick={back}>×</button><SignIn marketing back={back} done={done} redirectTo={redirectTo}/></dialog></>;
}
