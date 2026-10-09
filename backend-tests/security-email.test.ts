import {afterEach,describe,expect,it,vi} from 'vitest';
import {securityEmailProvider} from '../convex/securityEmail';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('account security emails',()=>{
 it('sends reset and verification codes from the approved address with a ten-minute expiry',async()=>{
  vi.stubEnv('RESEND_API_KEY','test-only-key');
  const send=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'test-message'}),{status:200}));vi.stubGlobal('fetch',send);
  for(const purpose of ['reset','verify'] as const){
   const provider=securityEmailProvider(purpose);
   expect(provider.maxAge).toBe(600);
   await provider.sendVerificationRequest({identifier:'recipient@example.com',token:'12345678',url:'https://cheddarvox.com/signin',expires:new Date(),provider},{} as never);
   const [url,options]=send.mock.calls.at(-1)!;
   expect(url).toBe('https://api.resend.com/emails');
   const body=JSON.parse(options.body);
   expect(body.from).toBe('Cheddar Vox <riya.shah@cheddarvox.com>');
   expect(body.to).toEqual(['recipient@example.com']);
   expect(body.text).toContain('12345678');expect(body.text).toContain('10 minutes');
   expect(body.subject).toMatch(purpose==='reset'?/Reset/:/Verify/);
  }
 });
 it('never treats a rejected email as delivered or exposes the provider response',async()=>{
  vi.stubEnv('RESEND_API_KEY','test-only-key');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private-provider-detail',{status:403})));
  const provider=securityEmailProvider('reset');
  await expect(provider.sendVerificationRequest({identifier:'recipient@example.com',token:'12345678',url:'',expires:new Date(),provider},{} as never)).rejects.toThrow('Security email could not be sent.');
 });
 it('does not send mail without a server-side key',async()=>{
  vi.stubEnv('RESEND_API_KEY','');const send=vi.fn();vi.stubGlobal('fetch',send);
  const provider=securityEmailProvider('reset');
  await expect(provider.sendVerificationRequest({identifier:'recipient@example.com',token:'12345678',url:'',expires:new Date(),provider},{} as never)).rejects.toThrow('Security email is not configured.');
  expect(send).not.toHaveBeenCalled();
 });
 it('uses different reset and verification providers and random eight-digit codes',async()=>{
  const reset=securityEmailProvider('reset'),verify=securityEmailProvider('verify');expect(reset.id).not.toBe(verify.id);
  const codes=new Set<string>();for(let n=0;n<32;n++){const code=await reset.generateVerificationToken!();expect(code).toMatch(/^\d{8}$/);codes.add(code);}
  expect(codes.size).toBe(32);
 });
});
