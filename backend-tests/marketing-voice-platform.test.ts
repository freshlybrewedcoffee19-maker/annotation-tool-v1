import {expect,test} from 'vitest';
import {phoneVoiceMode} from '../src/marketing/voice-platform';

test('iPhone and Android use one speech microphone and save the transcript',()=>{
 expect(phoneVoiceMode({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',platform:'iPhone',maxTouchPoints:5})).toEqual({textOnly:true,apple:true});
 expect(phoneVoiceMode({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130',platform:'Linux armv8l',maxTouchPoints:5})).toEqual({textOnly:true,apple:false});
});

test('iPad desktop mode is recognized without switching a touchscreen Windows laptop',()=>{
 expect(phoneVoiceMode({userAgent:'Mozilla/5.0 Macintosh',platform:'MacIntel',maxTouchPoints:5})).toEqual({textOnly:true,apple:true});
 expect(phoneVoiceMode({userAgent:'Mozilla/5.0 Windows Chrome',platform:'Win32',maxTouchPoints:10})).toEqual({textOnly:false,apple:false});
 expect(phoneVoiceMode({userAgent:'Mozilla/5.0 Macintosh',platform:'MacIntel',maxTouchPoints:0})).toEqual({textOnly:false,apple:false});
});
