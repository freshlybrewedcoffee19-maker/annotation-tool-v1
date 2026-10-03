export function segmentId(row:{_id:string;segmentNumber?:number}){return row.segmentNumber===undefined?'LEGACY_'+row._id.slice(-8):'ANN_'+String(row.segmentNumber).padStart(3,'0');}
export function boundaryFrame(time:number,rate?:number|null){return rate?String(Math.round(time*rate)):'Not recorded';}
