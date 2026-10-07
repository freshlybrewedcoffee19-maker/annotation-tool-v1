import {test,expect} from 'vitest';
import {shouldOfferContinue,RECENT_PROJECT_WINDOW} from '../src/project-session';
test('continuation is offered only within 24 hours and never for future or invalid dates',()=>{const now=100000000;expect(shouldOfferContinue(now-RECENT_PROJECT_WINDOW+1,now)).toBe(true);expect(shouldOfferContinue(now-RECENT_PROJECT_WINDOW,now)).toBe(false);expect(shouldOfferContinue(now-RECENT_PROJECT_WINDOW-1,now)).toBe(false);expect(shouldOfferContinue(now+1,now)).toBe(false);expect(shouldOfferContinue(NaN,now)).toBe(false);});
