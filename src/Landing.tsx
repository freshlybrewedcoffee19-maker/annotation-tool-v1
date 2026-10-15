import {useEffect, useRef, useState} from 'react';
import './landing.css';

function LaunchVideo() {
 const video = useRef<HTMLVideoElement>(null);
 const [failed, setFailed] = useState(false);
 useEffect(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
   if (preference.matches) video.current?.pause();
   else void video.current?.play().catch(() => { /* Native play remains available. */ });
  };
  update();
  preference.addEventListener('change', update);
  return () => preference.removeEventListener('change', update);
 }, []);
 return <div className="home-launch-media">
  <video ref={video} className="home-launch-video" src="/videos/launch-video-2026-10.mp4"
   poster="/videos/launch-video-2026-10-poster.jpg" aria-label="Cheddar Vox launch video"
   controls muted loop playsInline preload="metadata" onError={() => setFailed(true)}>
   <a href="/videos/launch-video-2026-10.mp4">Watch the launch video</a>
  </video>
  {failed && <p className="home-video-error" role="status">The video couldn’t load. <a href="/videos/launch-video-2026-10.mp4">Open the video</a></p>}
 </div>;
}

export function Landing({own,trial,busy,error,services}:{services:()=>void;own:()=>void;trial:()=>void;resume?:()=>void;busy:boolean;error:string}) {
 return <main className="landing home-page">
  <header className="home-header">
   <span className="home-wordmark">Cheddar Vox</span>
   <nav aria-label="Main navigation"><button className="home-sign-in" onClick={own}>Sign in</button></nav>
  </header>
  <section className="home-hero" aria-labelledby="home-title">
   <h1 id="home-title"><span>Your voice.</span> <span>Your annotations.</span></h1>
   <LaunchVideo/>
   <div className="home-actions">
    <button className="home-action home-action-primary" disabled={busy} onClick={trial}>Try a sample video</button>
    <button className="home-action home-action-secondary" disabled={busy} onClick={own}>Use my own video</button>
    {error && <p className="error" role="alert">{error}</p>}
   </div>
  </section>
  <footer className="home-footer">
   <nav className="home-footer-links" aria-label="Contact and legal links">
    <a className="home-contact-link" href="mailto:riya.shah@cheddarvox.com" title="riya.shah@cheddarvox.com">
     <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="m4 6 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>
     <span>Contact us<small className="home-email">riya.shah@<wbr/>cheddarvox.com</small></span>
    </a>
    <a className="home-contact-link" href="https://www.linkedin.com/company/cheddarvox/" target="_blank" rel="noopener noreferrer">
     <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="3" fill="currentColor"/><path d="M5 9h3v10H5zm1.5-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M10 9h3v1.4c.7-1.1 1.6-1.7 3-1.7 2.5 0 3.5 1.6 3.5 4.4V19h-3v-5.2c0-1.4-.3-2.3-1.6-2.3-1.4 0-1.9 1-1.9 2.4V19h-3z" fill="white"/></svg>
     <span>LinkedIn</span>
    </a>
    <a href="/privacy/">Privacy policy</a>
    <a href="/terms/">Terms of use</a>
   </nav>
   <div className="home-datasets">
    <p>Need a labelled dataset instead?</p>
    <button type="button" onClick={services}>Dataset services</button>
   </div>
  </footer>
 </main>;
}
