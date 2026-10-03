import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:90000,use:{baseURL:process.env.APP_URL??'http://127.0.0.1:5173',channel:'chrome',headless:true},workers:1,reporter:'list'});
