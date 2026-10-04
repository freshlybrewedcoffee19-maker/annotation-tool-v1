"""Developer preparation only; users never need Python. Weights are unchanged."""
import hashlib,json,urllib.request
from pathlib import Path
import onnx
root=Path(__file__).parent
commit='248663fde6bf7c40190cf10ee396d5662919ecd3'
base=f'https://raw.githubusercontent.com/HonglinChu/SiamTrackers/{commit}/NanoTrack/'
files={'backbone.onnx':'models/nanotrackv3/nanotrack_backbone.onnx','head.onnx':'models/nanotrackv3/nanotrack_head.onnx'}
expected={'backbone.onnx':'50be1320abf9384fd3479ea829f95e244cf3f3838190c5ab60c750fb8c1ce828','head.onnx':'75357903be3f4817c965af16cb5a11fd32b1467f597a408405a98635ac63f61d'}
manifest={'upstreamCommit':commit,'runtime':'onnxruntime-web 1.24.3','adapter':'phase0-v1','license':'Apache-2.0; see LICENSE','files':[]}
for name,source in files.items():
    destination=root/name
    if not destination.exists(): urllib.request.urlretrieve(base+source,destination)
    data=destination.read_bytes()
    if hashlib.sha256(data).hexdigest()!=expected[name]: raise RuntimeError('Model hash mismatch: '+name)
    manifest['files'].append({'name':name,'url':base+source,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
model=onnx.load(root/'backbone.onnx')
for dim in (2,3):
    model.graph.input[0].type.tensor_type.shape.dim[dim].dim_value=127
    model.graph.output[0].type.tensor_type.shape.dim[dim].dim_value=8
onnx.checker.check_model(model)
onnx.save(model,root/'template.onnx')
data=(root/'template.onnx').read_bytes()
manifest['files'].append({'name':'template.onnx','derivedFrom':'backbone.onnx','change':'Input spatial dimensions 255 to 127; output 16 to 8. No weights or operators changed.','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
