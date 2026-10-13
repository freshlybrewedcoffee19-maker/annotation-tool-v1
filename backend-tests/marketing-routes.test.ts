import {test,expect} from 'vitest';
import {canonical,safeReturn} from '../src/marketing/routes';
test('marketing return paths accept only internal marketing destinations',()=>{
 for(const value of ['https://evil.invalid','//evil.invalid','/signin','/dashboard','/video-feedback/signin','/video-feedback/../dashboard','/video-feedback/workspace\\evil','javascript:alert(1)'])expect(safeReturn(value)).toBe('/video-feedback/workspace');
 expect(safeReturn('/video-feedback/cards/card-one')).toBe('/video-feedback/cards/card-one');
 expect(safeReturn('/video-feedback/invite/'+'a'.repeat(64))).toBe('/video-feedback/invite/'+'a'.repeat(64));
 expect(canonical('/marketing/card/old')).toBe('/video-feedback/cards/old');
 expect(safeReturn('/marketing/board')).toBe('/video-feedback/workspace');
});
