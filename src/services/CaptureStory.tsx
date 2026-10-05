import { useVisibleMotion } from "./use-visible-motion";
import styles from "./capture-story.module.css";

function Fabric({ moving = false }: { moving?: boolean }) {
  return <g className={moving ? styles.fabric : undefined}>
    <path d="M38 86 77 64 148 73 169 99 124 115 57 105Z" fill="#DBEAFE" stroke="currentColor" strokeWidth="1.7" />
    <path d="m57 105 28-25 39 35M85 80l63-7M85 80l-8-16" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".45" />
    <path d="m66 95 28-9 43 10" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
  </g>;
}

function Hand() {
  return <g className={styles.hand} fill="#fff" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="m116 20-13 23-19 14c-6 4-3 10 2 9l15-7-9 17c-3 6 3 9 7 4l16-19 11-5 20-29" />
    <path d="m117 20 28 8m-44 31 8-8" fill="none" />
  </g>;
}

function Demonstration() {
  return <svg viewBox="0 0 200 140" aria-hidden="true">
    <path d="M20 119h160" stroke="#dce4f0" />
    <path className={styles.motionTrail} d="m45 54 17-9m-21 24 16-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <Fabric moving /><Hand />
  </svg>;
}

function Capture() {
  return <svg viewBox="0 0 200 140" aria-hidden="true">
    <g transform="translate(15 7) scale(.85)"><Fabric /><Hand /></g>
    <g className={styles.frame} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M29 44V25h20m102 0h20v19M29 96v19h20m102 0h20V96" /></g>
    <g className={styles.recording} fill="#F59E0B"><circle cx="147" cy="40" r="3" /><text x="155" y="43" fontSize="8">REC</text></g>
    <path className={styles.scan} d="M38 59h124" stroke="currentColor" strokeWidth="1" />
  </svg>;
}

function Labels() {
  return <svg viewBox="0 0 200 140" aria-hidden="true">
    <rect x="25" y="19" width="150" height="78" rx="7" fill="#fff" stroke="#c6d6ee" />
    <g transform="translate(44 4) scale(.57)"><Fabric /><Hand /></g>
    <g className={styles.annotation}>
      <rect x="73" y="47" width="69" height="38" rx="3" fill="none" stroke="currentColor" strokeDasharray="3 3" />
      <rect x="92" y="25" width="66" height="17" rx="4" fill="#2563EB" />
      <text x="125" y="36.5" textAnchor="middle" fontSize="9" fill="#fff">fabric pull</text>
    </g>
    <path d="M25 110h150" stroke="#dce4f0" strokeWidth="8" strokeLinecap="round" />
    <g className={styles.segments}>
      <rect x="25" y="106" width="35" height="8" rx="3" fill="#a9c3ef" /><rect x="63" y="106" width="64" height="8" rx="3" fill="#2563EB" /><rect x="130" y="106" width="45" height="8" rx="3" fill="#a9c3ef" />
    </g>
    <path className={styles.playhead} d="M91 101v18" stroke="#F59E0B" strokeWidth="2" />
  </svg>;
}

function Dataset() {
  return <svg viewBox="0 0 200 140" aria-hidden="true">
    <g className={styles.cards}>
      <rect x="42" y="19" width="121" height="90" rx="7" fill="#edf3ff" stroke="#c6d6ee" /><rect x="35" y="26" width="121" height="90" rx="7" fill="#f7faff" stroke="#c6d6ee" /><rect x="28" y="33" width="121" height="90" rx="7" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M28 55h121" stroke="#dce4f0" /><text x="40" y="47" fontSize="8.5" letterSpacing="1" fill="currentColor">DATASET</text>
      <g stroke="#c6d6ee" strokeLinecap="round"><path d="M58 68h73M58 86h73M58 104h73M103 61v50" /></g>
      <g fill="#DBEAFE" stroke="currentColor"><rect x="39" y="62" width="11" height="11" rx="2" /><rect x="39" y="80" width="11" height="11" rx="2" /><rect x="39" y="98" width="11" height="11" rx="2" /></g>
    </g>
    <g className={styles.ready}><circle cx="152" cy="107" r="15" fill="#2563EB" /><path d="m145 107 5 5 9-10" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
  </svg>;
}

const steps = [
  { label: "Demonstrate", detail: "Human interaction", Scene: Demonstration },
  { label: "Capture", detail: "Real-world video", Scene: Capture },
  { label: "Label", detail: "Actions & timing", Scene: Labels },
  { label: "Structure", detail: "Research-ready data", Scene: Dataset },
];

export function CaptureStory() {
  const { ref, playing } = useVisibleMotion<HTMLElement>();

  return <figure ref={ref} className={styles.story} aria-label="Illustration of turning a human demonstration into a labelled dataset">
    <figcaption className={styles.caption}>
      <span className={styles.captionText}>From interaction to dataset</span>
    </figcaption>
    <ol className={styles.steps} data-state={playing ? "playing" : "paused"}>
      {steps.map(({ label, detail, Scene }) => <li className={styles.step} key={label}>
        <Scene /><div className={styles.label}>{label}</div><p>{detail}</p>
      </li>)}
    </ol>
  </figure>;
}