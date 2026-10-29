import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

// Presentation only: this timer never controls recognition or persistence.
export function useVoiceConfirmation(){
 const [notice,setNotice]=useState<{text:string;id:number}|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),serial=useRef(0),mounted=useRef(true);
 const confirm=useCallback((text:string)=>{
  if(!mounted.current)return;
  clearTimeout(timer.current);setNotice({text,id:++serial.current});
  timer.current=setTimeout(()=>setNotice(null),1500);
 },[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(timer.current);};},[]);
 // Native dialogs sit above ordinary z-index layers, including body portals.
 const host=Array.from(document.querySelectorAll('dialog[open]')).at(-1)??document.body;
 return {confirm,confirmation:notice?createPortal(<div key={notice.id} className="voice-confirmation" role="status" aria-label="Voice confirmation" aria-live="polite" aria-atomic="true">{notice.text}</div>,host):null};
}

export function annotationShortcutBlocked(event:KeyboardEvent){
 if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return true;
 if(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'))return true;
 return event.composedPath().some(target=>target instanceof HTMLElement&&(
  target.isContentEditable||!!target.closest('input,textarea,select,form,[role="textbox"],[role="combobox"],[contenteditable]:not([contenteditable="false"])')||
  ((event.code==='Space'||event.key===' ')&&!!target.closest('button,a,[role="button"]'))
 ));
}

export function AnnotationShortcuts({labels,prompt}:{labels:string[];prompt:string}){
 return <aside className="annotation-voice-assistance" aria-label="Annotation shortcuts">
  {prompt&&<p className="voice-speech-help" role="status" aria-label="Speech help">{prompt}</p>}
  <p><strong>Shortcuts:</strong> <kbd>Space</kbd> Play/pause · <kbd>S</kbd> Start · <kbd>E</kbd> Stop · <kbd>1–9</kbd> Apply label after Stop</p>
  {!!labels.length&&<ol className="voice-shortcut-labels">{labels.slice(0,9).map((label,index)=><li key={label}><kbd>{index+1}</kbd> {label}</li>)}</ol>}
 </aside>;
}
