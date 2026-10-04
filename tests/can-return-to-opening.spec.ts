import {test,expect} from '@playwright/test';
test('root opens landing after a previous trial while dashboard refresh retains saved work',async({page,context})=>{
 await page.goto('/');await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true');await expect(page).toHaveURL(/\/workspace$/);
 const token=await page.evaluate(()=>localStorage.getItem('np-workspace-token'));
 await page.reload();await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();
 await page.goto('/');await expect(page.getByRole('button',{name:'Annotate your own videos',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Trial video annotation',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('button',{name:'Trial video annotation',exact:true})).toBeVisible();
 const other=await context.newPage();await other.goto('/');await expect(other.getByRole('button',{name:'Trial video annotation',exact:true})).toBeVisible();
 expect(await other.evaluate(()=>localStorage.getItem('np-workspace-token'))).toBe(token);
 await page.getByRole('button',{name:'Open your dashboard',exact:true}).click();await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();
 await page.goBack();await expect(page.getByRole('button',{name:'Trial video annotation',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Annotate your own videos',exact:true}).click();await expect(page.getByLabel('Setup labels')).toBeVisible();await expect(page).toHaveURL(/\/setup$/);
});
