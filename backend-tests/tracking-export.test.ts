import {test,expect} from 'vitest';
import {trackingCSV} from '../src/tracking/export';
test('tracking CSV exports only accepted current samples with source lineage and safe quoted names',()=>{
 const frame={time:1.2,decodedTime:1.208,x:.2,y:.3,width:.4,height:.1,uncertain:false},track={_id:'track',episodeId:'episode',objectId:'iron',name:'Iron, "red"\nhandle',model:'NanoTrack',status:'verified',blocked:[],sourceTrack:{id:'parent',revision:3},frames:[frame]};
 const out=trackingCSV([track,{...track,_id:'pending',status:'pending'},{...track,_id:'old-source',blocked:['Source changed']},{...track,_id:'rejected',status:'disqualified'},{...track,_id:'unchecked',frames:[{...frame,uncertain:true}]}]);
 expect(out).toContain('"Iron, ""red""\nhandle"');expect(out).toContain('1.2,1.208,0.2,0.3,0.4,0.1,"normalized-video","true"');expect(out).toContain('"parent",3,"NanoTrack"');expect(out).not.toContain('"pending"');expect(out).not.toContain('"old-source"');expect(out).not.toContain('"rejected"');expect(out).not.toContain('"unchecked"');
 const unsafe=trackingCSV([{...track,name:'=SUM(1,2)',objectId:' +formula',frames:[{...frame,decodedTime:undefined}]}]);expect(unsafe).toContain('"\'=SUM(1,2)"');expect(unsafe).toContain('"\' +formula"');expect(unsafe).toContain('1.2,"",0.2');expect(trackingCSV([]).split('\r\n')).toHaveLength(2);
});
