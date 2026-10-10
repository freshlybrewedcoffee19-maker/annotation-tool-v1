import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {chromium} from '@playwright/test';
const records=JSON.parse(fs.readFileSync('scripts/license-evidence/onnx-source-files.json','utf8'));
for(const item of records){const bytes=fs.readFileSync('dist/licenses/onnx-sources/'+item.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);}
const archive=unzipSync(fs.readFileSync('dist/licenses/onnx-sources/eigen-source.zip'));
assert(Object.keys(archive).some(f=>f.endsWith('/Eigen/Core')));
const mpl=Object.keys(archive).find(f=>f.endsWith('/COPYING.MPL2'));assert(mpl);assert(strFromU8(archive[mpl]).includes('Mozilla Public License Version 2.0'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:4176/licenses/');await page.getByRole('link',{name:'ONNX Runtime library source access and notices'}).click();await page.getByRole('heading',{name:'ONNX Runtime source access',exact:true}).waitFor();
 const links=await page.locator('main a[href^="/licenses/"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 for(const href of links){const response=await page.request.get('http://127.0.0.1:4176'+href);assert.equal(response.status(),200,href);if(href.endsWith('eigen-source.zip'))assert.equal(createHash('sha256').update(await response.body()).digest('hex'),records.find(r=>r.file==='eigen-source.zip').sha256);}
 for(const width of [1280,390]){await page.setViewportSize({width,height:800});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page must fit width '+width);}
 console.log('ONNX source page, all local downloads, archived source contents and SHA-256 checks passed; desktop and phone fit.');
}finally{await browser.close();}
