import {useWorkspace} from './workspace';
import {useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import {csv,downloadText} from './csv';
export type MetadataEpisode={setupFields?:string[];name:string;duration:number;fileSize?:number;mimeType?:string;width?:number;height?:number;frameRate?:number|null;metadata?:{field:string;value:string}[]};
export function MetadataExport({episode}:{episode:MetadataEpisode}){
 const {workspaceToken}=useWorkspace();
 const sharedFields=useQuery(api.metadata.list,{workspaceToken})??[];const fields=episode.setupFields??sharedFields;const values=new Map((episode.metadata??[]).map(row=>[row.field,row.value]));
 function exportMetadata(){downloadText('metadata.csv',csv(['episode','file_size_bytes','mime_type','duration_sec','width','height','frame_rate',...fields.map(field=>'metadata.'+field)],[[episode.name,episode.fileSize??'',episode.mimeType??'',episode.duration,episode.width??'',episode.height??'',episode.frameRate??'',...fields.map(field=>values.get(field)??'')]]));}
 return <section className="metadata-export" aria-label="Metadata export"><h2>Metadata CSV</h2><p>Export the selected video's saved file details and your metadata values.</p><button type="button" onClick={exportMetadata}>Export metadata CSV</button></section>;
}
