import {csv,downloadText} from './csv';
export type MetadataEpisode={name:string;duration:number;fileSize?:number;mimeType?:string;width?:number;height?:number;frameRate?:number|null};
export function MetadataExport({episode}:{episode:MetadataEpisode}){
 function exportMetadata(){downloadText('metadata.csv',csv(['episode','file_size_bytes','mime_type','duration_sec','width','height','frame_rate'],[[episode.name,episode.fileSize??'',episode.mimeType??'',episode.duration,episode.width??'',episode.height??'',episode.frameRate??'']]));}
 return <section className="metadata-export" aria-label="Metadata export"><h2>Metadata CSV</h2><p>Export the selected video's saved file details.</p><button type="button" onClick={exportMetadata}>Export metadata CSV</button></section>;
}
