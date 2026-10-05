import {test,expect} from '@playwright/test';
test('Cloudflare build plays bundled trial without a Convex video download',async({page})=>{
 test.skip(process.env.EXPECT_CLOUDFLARE_TRIAL!=='1','Run against a Cloudflare-configured build.');
 const storageDownloads:string[]=[];
 page.on('request',r=>{if(r.method()==='GET'&&/\.convex\.(cloud|site)\/api\/storage\//.test(r.url()))storageDownloads.push(r.url());});
 await page.goto('/');
 await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();
 const video=page.locator('video');
 await expect(video).toHaveAttribute('src','/videos/iron-e05a44b0.mp4');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await page.reload();
 await expect(video).toHaveAttribute('src','/videos/iron-e05a44b0.mp4');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 expect(storageDownloads).toEqual([]);
});
