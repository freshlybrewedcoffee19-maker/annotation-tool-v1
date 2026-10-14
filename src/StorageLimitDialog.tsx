import {useEffect,useId,useRef} from 'react';
import {storageSize,type StorageLimitDetails} from './storage-quota';
import './storage-limit.css';

export function StorageLimitDialog({details,close}:{details:StorageLimitDetails|null;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId(),description=useId();
 useEffect(()=>{if(details&&!dialog.current?.open)dialog.current?.showModal();else if(!details&&dialog.current?.open)dialog.current.close();},[details]);
 return <dialog ref={dialog} className="storage-limit-dialog" aria-labelledby={title} aria-describedby={description} onClose={close}>
  <button type="button" className="storage-limit-close" aria-label="Close storage notice" onClick={close}>×</button>
  <p className="storage-limit-kicker">FREE STORAGE</p>
  <h2 id={title}>Your free storage is 1 GB.</h2>
  {details&&<>
   <p id={description}>{details.owner?'This upload would exceed your account’s free storage.':'This upload would exceed the project owner’s free storage.'} Videos and revisions share this allowance with your other saved files.</p>
   <div className="storage-limit-usage"><span>{storageSize(details.stored)} stored</span><span>1 GB free</span><meter min={0} max={details.storageLimit} value={Math.min(details.storageLimit,details.stored+details.reserved)} aria-label="Account storage used"/>{details.reserved>0&&<small>{storageSize(details.reserved)} reserved for unfinished uploads</small>}{details.requested>0&&<small>This file needs {storageSize(details.requested)} · {storageSize(details.available)} available</small>}</div>
   <p>Storage above 1 GB costs <strong>$0.020 per extra GB per month.</strong> {details.owner?'Contact us to arrange more storage.':'Ask the project owner to arrange more storage.'}</p>
   <p className="storage-limit-note">Your saved videos and feedback are still available.</p>
   <div className="storage-limit-actions">{details.owner&&<a href="mailto:riya.shah@cheddarvox.com?subject=More%20storage%20for%20Cheddar%20Vox">Contact us about storage</a>}<button type="button" onClick={close}>Back to my videos</button></div>
  </>}
 </dialog>;
}
