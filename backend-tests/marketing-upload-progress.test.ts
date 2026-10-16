import {afterEach,expect,test,vi} from 'vitest';
import {uploadWithProgress} from '../src/marketing/upload-progress';

class Request {
 static latest:Request;upload={onprogress:null as ((event:{loaded:number})=>void)|null};
 status=200;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;onabort:(()=>void)|null=null;
 open=vi.fn();setRequestHeader=vi.fn();send=vi.fn();abort=vi.fn(()=>this.onabort?.());
 constructor(){Request.latest=this;}
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
function start(){vi.stubGlobal('XMLHttpRequest',Request);const body=new Blob(['original-video']),progress=vi.fn(),result=uploadWithProgress('https://private-upload.example/video',body,'video/mp4',progress);return {body,progress,result,request:Request.latest};}

test('upload sends the unchanged file and reports byte progress without declaring success early',async()=>{
 const {body,progress,result,request}=start();let saved=false;void result.then(()=>{saved=true;});
 expect(request.open).toHaveBeenCalledWith('PUT','https://private-upload.example/video');expect(request.send).toHaveBeenCalledWith(body);expect(request.setRequestHeader).toHaveBeenCalledWith('Content-Type','video/mp4');
 request.upload.onprogress?.({loaded:4});expect(progress).toHaveBeenLastCalledWith({loaded:4,total:body.size});
 request.upload.onprogress?.({loaded:body.size});await Promise.resolve();expect(saved).toBe(false);
 request.onload?.();await expect(result).resolves.toEqual({ok:true,status:200});expect(request.upload.onprogress).toBeNull();
});
test('slow uploads remain active while bytes progress, but a stalled upload offers retry',async()=>{
 vi.useFakeTimers();const {result,request}=start();const rejected=expect(result).rejects.toThrow('stopped making progress');
 vi.advanceTimersByTime(59000);request.upload.onprogress?.({loaded:5});vi.advanceTimersByTime(59000);expect(request.abort).not.toHaveBeenCalled();
 vi.advanceTimersByTime(1000);await rejected;expect(request.abort).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
test('connection errors release the timer and report retry without a false success',async()=>{
 vi.useFakeTimers();const {result,request}=start(),rejected=expect(result).rejects.toThrow('connection was interrupted');request.onerror?.();await rejected;expect(vi.getTimerCount()).toBe(0);
});
test('a storage rejection remains a failed upload even after all bytes were sent',async()=>{
 const {result,request}=start();request.status=503;request.onload?.();await expect(result).resolves.toEqual({ok:false,status:503});
});
