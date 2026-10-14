import {home} from './routes';
import './keyboard-home.css';
export function KeyboardHome({upload}:{upload:()=>void}){
 return <section className="feedback-flow feedback-flow-visual" aria-labelledby="feedback-flow-title">
  <h1 id="feedback-flow-title"><span className="flow-ad-label">Video ad feedback.</span>Still writing<br/>timestamps?</h1>
  <div className="flow-link" aria-hidden="true">↓</div>
  <div className="flow-world"><img src="/images/video-feedback-key-world.webp" alt="A miniature reviewer and editor connected by film inside an Enter key."/></div>
  <div className="flow-solution"><h2>Say it instead.</h2></div>
  <ol className="flow-commands" aria-label="Speak these commands; no clicking needed"><li><div className="flow-key">“Start”</div></li><li className="flow-between" aria-hidden="true">→</li><li><div className="flow-key">“Stop”</div></li><li className="flow-between" aria-hidden="true">→</li><li><div className="flow-key flow-key-pink">Feedback</div></li></ol>
  <p className="flow-spoken">Turn on your mic. Speak—no clicking needed.</p>
  <div className="flow-link" aria-hidden="true">↓</div>
  <div className="flow-result"><h2>Your editor gets<br/>the exact clip.</h2></div>
  <div className="flow-cta"><a className="flow-action flow-action-primary" href={home+'/sample'}>Try a sample <span aria-hidden="true">↵</span></a><button className="flow-action" onClick={upload}>Upload video <span aria-hidden="true">↑</span></button></div>
  <p className="flow-footnote">Try the sample without signing in.</p>
 </section>;
}

