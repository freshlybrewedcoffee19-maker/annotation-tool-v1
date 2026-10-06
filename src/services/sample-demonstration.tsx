

import { useEffect, useRef, useState } from "react";
import { useVisibleMotion } from "./use-visible-motion";
import styles from "./sample-demonstration.module.css";

// IRON_001 v0.2 human annotations. The vertical crop preserves source timing.
const segments = [
  { label: "Initial state", start: 0, end: 9.137 },
  { label: "Approach", start: 9.137, end: 11.876 },
  { label: "Iron stroke", start: 11.876, end: 30.813 },
  { label: "Reposition", start: 30.813, end: 42.394 },
  { label: "Iron stroke", start: 42.394, end: 83.81 },
  { label: "Release", start: 83.81, end: 91.752 },
];
const annotationDuration = segments[segments.length - 1].end;
const timestamp = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export function SampleDemonstration() {
  const { ref, playing } = useVisibleMotion<HTMLElement>();
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeIndex = Math.max(0, segments.findIndex((segment, index) => time >= segment.start && (time < segment.end || index === segments.length - 1)));
  const active = segments[activeIndex];

  useEffect(() => {
    const media = video.current;
    if (!media) return;
    if (playing && !paused) {
      // Muted inline playback is normally permitted. Keep the still if blocked.
      void media.play().catch(() => {});
    } else media.pause();
    return () => media.pause();
  }, [playing, paused]);

  return <figure ref={ref} className={styles.figure} aria-label="Sample ironing video with human-annotated action segments">
    <div className={styles.frame}>
      <video ref={video} muted loop playsInline preload="none" poster="/services/iron-vertical.jpg" aria-label="Human ironing demonstration" onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}>
        <source src="/services/iron-vertical.mp4" type="video/mp4" />
        Your browser does not support video.
      </video>
      <div className={styles.source}><span aria-hidden="true" />RGB · IRON_001</div>
      <div className={styles.overlay}>
        <span className={styles.annotation}>Human-annotated action</span>
        <div className={styles.action}><strong key={activeIndex}>{active.label}</strong><span>{timestamp(time)}</span></div>
        <span className={styles.range}>{active.start.toFixed(2)}–{active.end.toFixed(2)} s</span>
      </div>
    </div>
    <div className={styles.timeline} aria-label="Action timeline">
      {segments.map((segment, index) => <span key={segment.start} className={`${styles.segment} ${index === activeIndex ? styles.active : ""}`} style={{ flexGrow: segment.end - segment.start }} title={`${segment.label}: ${segment.start}–${segment.end} seconds`} />)}
      <span className={styles.playhead} style={{ left: `${Math.min(100, time / annotationDuration * 100)}%` }} aria-hidden="true" />
    </div>
    <figcaption>Real footage. Labels aligned to each action.</figcaption>
    <button className={styles.playToggle} type="button" onClick={()=>{const media=video.current;if(!media)return;if(media.paused){setPaused(false);void media.play().catch(()=>setIsPlaying(false));}else{setPaused(true);media.pause();}}}>{isPlaying?'Pause sample video':'Play sample video'}</button>
  </figure>;
}
