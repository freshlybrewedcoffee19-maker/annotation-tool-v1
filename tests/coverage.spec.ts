import {test,expect} from '@playwright/test';
import {coverage} from '../src/coverage';
test('coverage counts nested overlaps once and handles adjacent boundaries and edge gaps',()=>{
 const result=coverage(10,[{start_sec:1,end_sec:8},{start_sec:2,end_sec:3},{start_sec:3,end_sec:5},{start_sec:4,end_sec:6}]);
 expect(result.covered).toBe(7);expect(result.gaps).toEqual([{start_sec:0,end_sec:1},{start_sec:8,end_sec:10}]);expect(result.overlaps).toEqual([{start_sec:2,end_sec:6}]);
 expect(coverage(4,[{start_sec:0,end_sec:2},{start_sec:2,end_sec:4}]).pass).toBe(true);
 expect(coverage(4,[]).unannotated).toBe(4);
});
