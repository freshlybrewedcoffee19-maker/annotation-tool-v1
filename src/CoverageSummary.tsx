import {coverage,type Interval} from './coverage';
export function CoverageSummary({duration,segments}:{duration:number;segments:Interval[]}){
 const result=coverage(duration,segments);
 return <section className="coverage-summary" aria-label="Coverage checks"><h2>Coverage checks</h2><p>Annotated: {result.covered.toFixed(3)} sec ({result.percent.toFixed(1)}%) · Unannotated: {result.unannotated.toFixed(3)} sec</p><p>{result.pass?'Coverage pass: no gaps or overlaps.':'Coverage warning: review gaps or overlaps.'}</p><p>Gaps: {result.gaps.length?result.gaps.map(r=>`${r.start_sec.toFixed(3)}–${r.end_sec.toFixed(3)} sec`).join(', '):'None'}</p><p>Overlaps: {result.overlaps.length?result.overlaps.map(r=>`${r.start_sec.toFixed(3)}–${r.end_sec.toFixed(3)} sec`).join(', '):'None'}</p></section>;
}
