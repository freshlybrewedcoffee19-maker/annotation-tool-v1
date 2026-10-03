export type MediaFacts={name:string;duration:number;fileSize?:number;mimeType?:string;width?:number;height?:number};
export function MediaDetails({episode}:{episode:MediaFacts}){
 return <section className="media-details" aria-label="Video details"><h2>Video details</h2><dl><div><dt>Filename</dt><dd>{episode.name}</dd></div><div><dt>File size</dt><dd>{episode.fileSize!==undefined?`${episode.fileSize.toLocaleString()} bytes`:'Not recorded'}</dd></div><div><dt>Format</dt><dd>{episode.mimeType??'Not recorded'}</dd></div><div><dt>Resolution</dt><dd>{episode.width&&episode.height?`${episode.width} x ${episode.height}`:'Not recorded'}</dd></div><div><dt>Duration</dt><dd>{episode.duration.toFixed(3)} sec</dd></div></dl></section>;
}
