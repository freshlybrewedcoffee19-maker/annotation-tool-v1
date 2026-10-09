import {test,expect} from '@playwright/test';

test('password recovery guides the user through codes and password confirmation',async({page})=>{
 await page.goto('/signin');
 await page.getByLabel('Email',{exact:true}).fill('recovery-check@example.invalid');
 await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Reset your password.'})).toBeVisible();
 await page.getByRole('button',{name:'Send reset code',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('If an account exists for this email, a code has been sent.');
 await page.getByLabel('Email code',{exact:true}).fill('12345678');
 await page.getByLabel('New password',{exact:true}).fill('Example-new-password-42');
 await page.getByLabel('Confirm new password',{exact:true}).fill('Different-password-42');
 await page.getByRole('button',{name:'Save password & sign in',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('The passwords do not match.');
 await page.getByLabel('Confirm new password',{exact:true}).fill('Example-new-password-42');
 await page.getByRole('button',{name:'Save password & sign in',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('That code could not be verified. Check the code or request a new one.');
 await page.getByRole('button',{name:'Use another email',exact:true}).click();
 await expect(page.getByLabel('Email',{exact:true})).toBeEnabled();
 await expect(page.getByLabel('Email code',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Back to sign in',exact:true}).click();
 await expect(page.getByRole('button',{name:'Forgot password?',exact:true})).toBeVisible();
});
