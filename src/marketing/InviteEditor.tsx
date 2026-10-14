import {useState} from 'react';
import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import {useMutation} from './hooks';
import {message,secret,type CardData} from './types';

export function InviteEditor({data}:{data:CardData}){
 const invite=useMutation(api.marketing.invite);
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 const [created,setCreated]=useState<{email:string;link:string}|null>(null);

 async function createInvitation(){
  setBusy(true);setError('');setCopied(false);setCreated(null);
  try{
   const recipient=email.trim().toLowerCase();
   if(data.access.some(grant=>grant.email.toLowerCase()===recipient&&grant.status==='editor'))throw Error('This person already has editor access to this project.');
   const token=secret();
   await invite({cardId:data.card.id as Id<'marketingCards'>,email:recipient,token});
   setCreated({email:recipient,link:`${location.origin}/video-feedback/invite/${token}`});
  }catch(error){setError(message(error));}finally{setBusy(false);}
 }

 async function copyLink(){
  if(!created)return;
  setError('');
  try{await navigator.clipboard.writeText(created.link);setCopied(true);}catch{setError('Copy the invitation link from the field below.');}
 }

 if(!data.owner)return null;
 const draft=created?`mailto:${encodeURIComponent(created.email)}?subject=${encodeURIComponent(`Review ${data.card.title} on Cheddar Vox`)}&body=${encodeURIComponent(`You're invited to review "${data.card.title}" on Cheddar Vox.\n\nWatch the marked clips, read or reply to feedback, and upload revised videos in the same project. Sign in with ${created.email} to accept your editor invitation.\n\n${created.link}\n\nThis invitation expires in 7 days.`)}`:'';
 return <section className="feedback-invite-editor" aria-label="Invite an editor">
  <h3>Invite an editor</h3>
  <p>Editors can review, reply and upload revisions. They need to sign in with the email you invite.</p>
  <form onSubmit={event=>{event.preventDefault();void createInvitation();}}>
   <label>Editor email<input type="email" autoComplete="email" required disabled={busy} value={email} onChange={event=>{setEmail(event.target.value);setCreated(null);setCopied(false);setError('');}}/></label>
   <button type="submit" disabled={busy}>{busy?'Creating invitation…':'Create invitation'}</button>
  </form>
  {created&&<div className="feedback-invitation-ready">
   <p role="status">Invitation ready. Open the email draft, then send it to your editor.</p>
   <div className="marketing-actions"><a className="feedback-email-invitation" href={draft}>Open email invitation</a><button type="button" onClick={()=>void copyLink()}>{copied?'Link copied':'Copy invitation link'}</button></div>
   <label>Invitation link<input readOnly value={created.link} onFocus={event=>event.target.select()}/></label>
   <p>Creating an invitation does not send an email.</p>
  </div>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
