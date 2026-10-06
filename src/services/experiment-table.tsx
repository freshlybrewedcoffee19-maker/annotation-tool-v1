

import { useVisibleMotion } from "./use-visible-motion";
import styles from "./experiment-table.module.css";

export function ExperimentTable() {
  const { ref, playing } = useVisibleMotion<HTMLElement>();
  return <figure ref={ref} className={styles.scene} data-playing={playing} aria-label="Illustrated examples of physical interactions: folding fabric, sliding a block, and rolling a ball">
    <svg viewBox="0 0 320 165" aria-hidden="true">
      <path d="M10 102 54 75h210l45 27-43 30H52Z" fill="#DBEAFE" stroke="#b6ccee" strokeWidth="1.2" />
      <path d="M10 102v7l42 30h214l43-30v-7M52 132v7m214-7v7" fill="none" stroke="#b6ccee" strokeWidth="1.2" />
      <g className={styles.fabric}>
        <path d="m30 96 32-18 43 20-30 19Z" fill="#fff" stroke="currentColor" strokeWidth="1.6" />
        <path d="m53 86 44 19" fill="none" stroke="currentColor" strokeDasharray="2 3" opacity=".5" />
        <path className={styles.fold} d="m30 96 23-10 44 19-22 12Z" fill="#b9d0f8" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <path className={styles.slideTrail} d="M131 106h17m-23-6h14" stroke="currentColor" opacity=".3" strokeLinecap="round" />
      <g className={styles.block} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="m128 76 23-12 24 12-23 13Z" fill="#fff" />
        <path d="m128 76 24 13v27l-24-14Z" fill="#b9d0f8" />
        <path d="m152 89 23-13v27l-23 13Z" fill="#DBEAFE" />
      </g>
      <ellipse className={styles.shadow} cx="248" cy="108" rx="19" ry="5" fill="#2563EB" opacity=".1" />
      <g className={styles.ball}>
        <circle cx="248" cy="88" r="19" fill="#fff" stroke="currentColor" strokeWidth="1.6" />
        <g className={styles.ballMark} stroke="currentColor" strokeWidth="1.2" fill="none">
          <ellipse cx="248" cy="88" rx="7" ry="19" /><path d="M229 88h38" /><circle cx="248" cy="69" r="2.5" fill="#F59E0B" stroke="none" />
        </g>
      </g>
      <g fill="#626b78" fontSize="10" textAnchor="middle"><text x="67" y="157">Fold</text><text x="158" y="157">Slide</text><text x="254" y="157">Roll</text></g>
    </svg>
    <figcaption>Your task. Your objects. Your environment.</figcaption>
  </figure>;
}
