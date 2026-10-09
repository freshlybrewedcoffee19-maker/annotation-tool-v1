import {Email} from '@convex-dev/auth/providers/Email';

export const securityEmailFrom='Cheddar Vox <riya.shah@cheddarvox.com>';
export function securityEmailProvider(purpose:'reset'|'verify'){
 const config={
  id:`security-${purpose}`,
  from:securityEmailFrom,
  maxAge:10*60,
  async generateVerificationToken(){
   const random=new Uint32Array(1);
   do{crypto.getRandomValues(random);}while(random[0]>=4_200_000_000);
   return String(random[0]%100_000_000).padStart(8,'0');
  },
  async sendVerificationRequest({identifier,token}:{identifier:string;token:string}){
   const key=process.env.RESEND_API_KEY;
   if(!key)throw new Error('Security email is not configured.');
   const reset=purpose==='reset';
   const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({
     from:securityEmailFrom,to:[identifier],
     subject:reset?'Reset your Cheddar Vox password':'Verify your Cheddar Vox email',
     text:`Your Cheddar Vox ${reset?'password reset':'email verification'} code is ${token}.\n\nThis code expires in 10 minutes. Enter it only on https://cheddarvox.com.\n\nIf you did not request this, ignore this email. Your password will not change unless a valid code is entered with a new password.`,
    }),
   });
   if(!response.ok)throw new Error('Security email could not be sent.');
  },
 };
 return {...Email(config),...config};
}
