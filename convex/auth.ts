import {convexAuth} from '@convex-dev/auth/server';
import {Password} from '@convex-dev/auth/providers/Password';
import Google from '@auth/core/providers/google';
export const {auth,signIn,signOut,store,isAuthenticated}=convexAuth({providers:[Password({profile(params){const email=String(params.email??'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');return {email,name:String(params.name??'').trim().slice(0,100),phone:String(params.phone??'').trim().slice(0,40)};}}),...(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET?[Google]:[])]});
