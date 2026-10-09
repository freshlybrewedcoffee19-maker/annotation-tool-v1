import {useState} from 'react';
import {useAuthActions} from '@convex-dev/auth/react';

export function AccountSecurity({mode,email:initialEmail,done,back}:{mode:'reset'|'verify';email:string;done:()=>void;back:()=>void}){
 const {signIn}=useAuthActions();
 const [email,setEmail]=useState(initialEmail),[code,setCode]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const [sent,setSent]=useState(mode==='verify'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function request(){
  await signIn('password',{flow:mode==='reset'?'reset':'email-verification',email:email.trim().toLowerCase()});
  setSent(true);setNotice(mode==='reset'?'If an account exists for this email, a code has been sent.':'A verification code has been sent.');
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');setNotice('');
  if(sent&&mode==='reset'&&password!==confirmation){setError('The passwords do not match.');return;}
  setBusy(true);
  try{
   if(!sent){try{await request();}catch{setSent(true);setNotice('If an account exists for this email, a code has been sent.');}return;}
   const result=await signIn('password',{flow:mode==='reset'?'reset-verification':'email-verification',email:email.trim().toLowerCase(),code,...(mode==='reset'?{newPassword:password}:{})});
   if(result.signingIn){setPassword('');setConfirmation('');setCode('');done();}else setError('That code could not be verified. Request a new code and try again.');
  }catch{setError('That code could not be verified. Check the code or request a new one.');}finally{setBusy(false);}
 }
 return <section className="setup-page sign-in-page progressive-signin"><header className="auth-header"><button className="brand text-button" disabled={busy} onClick={back}>Cheddar Vox</button></header><div className="setup-card auth-content"><h1>{mode==='reset'?'Reset your password.':'Verify your email.'}</h1><p>{sent?'Enter the 8-digit code from your email. It expires in 10 minutes.':'Enter your account email to request a reset code.'}</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} disabled={busy||sent} onChange={e=>setEmail(e.target.value)}/></label>{sent&&<><label>Email code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} disabled={busy} onChange={e=>setCode(e.target.value)}/></label>{mode==='reset'&&<><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)}/></label></>}</>}<button className="sprint-button" disabled={busy}>{busy?'Please wait…':!sent?'Send reset code':mode==='reset'?'Save password & sign in':'Verify & sign in'}</button></form>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}<div className="auth-switch">{sent&&<button className="text-button" disabled={busy} onClick={()=>{setSent(false);setCode('');setError('');setNotice('');}}>Use another email</button>}<button className="text-button" disabled={busy} onClick={back}>Back to sign in</button>{sent&&<button className="text-button" disabled={busy} onClick={()=>{setBusy(true);setError('');void request().catch(()=>setError('Could not send a new code. Try again shortly.')).finally(()=>setBusy(false));}}>Send a new code</button>}</div></div></section>;
}
