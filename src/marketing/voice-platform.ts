type BrowserDevice={userAgent:string;platform:string;maxTouchPoints:number};

export function phoneVoiceMode(device:BrowserDevice=navigator){
 const apple=/iPhone|iPad|iPod/i.test(device.userAgent)||(device.platform==='MacIntel'&&device.maxTouchPoints>1);
 // A second microphone capture can interrupt a phone's native speech service.
 return {textOnly:apple||/Android/i.test(device.userAgent),apple};
}
