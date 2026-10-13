// Runs on the browser audio thread. The output is silent; microphone audio is never echoed.
class MarketingFeedbackCapture extends AudioWorkletProcessor {
 buffer=new Float32Array(1024);used=0;
 process(inputs,outputs){
  for(const output of outputs)for(const channel of output)channel.fill(0);
  const input=inputs[0]?.[0];if(input)for(const sample of input){this.buffer[this.used++]=sample;if(this.used===this.buffer.length){this.port.postMessage(this.buffer,[this.buffer.buffer]);this.buffer=new Float32Array(1024);this.used=0;}}
  return true;
 }
}
registerProcessor('marketing-feedback-capture',MarketingFeedbackCapture);
