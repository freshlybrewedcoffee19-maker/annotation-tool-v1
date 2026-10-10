import type {Shape} from './model';
export function ShapeDrawing({shape,selected=false,onDown,onVertex}:{shape:Shape;selected?:boolean;onDown?:(e:React.PointerEvent)=>void;onVertex?:(e:React.PointerEvent,index:number)=>void}){
 const p=shape.points,color=selected?'#FFB82E':'#60A5FA';const common={stroke:color,strokeWidth:2,vectorEffect:'non-scaling-stroke' as const,fill:'rgba(37,99,235,.16)',onPointerDown:onDown};
 return <g aria-label={`${shape.kind} ${shape.label}`}>
 {shape.kind==='box'&&<rect {...common} x={p[0]*1000} y={p[1]*1000} width={(p[2]-p[0])*1000} height={(p[3]-p[1])*1000}/>}
 {shape.kind==='polygon'&&<polygon {...common} points={p.map(v=>v*1000).reduce((s,v,i)=>s+(i%2?',':' ')+v,'').trim()}/>}
 {shape.kind==='brush'&&<polyline {...common} fill="none" stroke={color} opacity=".65" strokeWidth={(shape.brushSize??.02)*1000} vectorEffect="none" strokeLinecap="round" strokeLinejoin="round" points={p.map(v=>v*1000).reduce((s,v,i)=>s+(i%2?',':' ')+v,'').trim()}/>}
 {shape.kind==='keypoint'&&<circle {...common} cx={p[0]*1000} cy={p[1]*1000} r="7"/>}
 {p.length>0&&<text x={p[0]*1000+8} y={Math.max(22,p[1]*1000-10)} fill="white" stroke="#172033" strokeWidth="3" paintOrder="stroke" fontSize="22" pointerEvents="none">{shape.label}</text>}
 {selected&&onVertex&&(shape.kind==='box'||shape.kind==='polygon'||shape.kind==='keypoint')&&p.map((v,i)=>i%2?null:<circle key={i} cx={v*1000} cy={p[i+1]*1000} r="8" fill="white" stroke="#172033" strokeWidth="2" onPointerDown={e=>onVertex(e,i)}/>)}
 </g>;
}
