import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';

const modules=import.meta.glob('../convex/**/*.{ts,js}');
const token='1'.repeat(64);

// In-memory fixtures only: no accounts, emails or live projects are touched.
async function fixture(){
 const t=convexTest(schema,modules);
 const ids=await t.run(async ctx=>{
  const owner=await ctx.db.insert('users',{email:'owner@test.invalid',emailVerificationTime:1});
  const editor=await ctx.db.insert('users',{email:'editor@test.invalid'});
  const stranger=await ctx.db.insert('users',{email:'someone-else@test.invalid',emailVerificationTime:1});
  const sameEmail=await ctx.db.insert('users',{email:'editor@test.invalid'});
  const card=await ctx.db.insert('marketingCards',{ownerId:owner,title:'Invitation check',status:'needs_feedback',finalised:false,cleaning:false,updatedAt:Date.now()});
  return {owner,editor,stranger,sameEmail,card};
 });
 const owner=t.withIdentity({subject:`${ids.owner}|test`}),editor=t.withIdentity({subject:`${ids.editor}|test`}),stranger=t.withIdentity({subject:`${ids.stranger}|test`}),sameEmail=t.withIdentity({subject:`${ids.sameEmail}|test`});
 await owner.mutation(api.marketing.invite,{cardId:ids.card,email:'editor@test.invalid',token});
 const grant=await t.run(ctx=>ctx.db.query('marketingAccess').withIndex('by_token',q=>q.eq('token',token)).unique());
 return {t,ids,owner,editor,stranger,sameEmail,grant:grant!};
}

test('a signed-in invited email can accept its secret link without email verification, while card-address acceptance stays protected',async()=>{
 const f=await fixture();
 await expect(f.editor.mutation(api.marketing.acceptInvite,{cardId:f.ids.card})).rejects.toThrow('Verify');
 await expect(f.editor.query(api.marketing.detail,{cardId:f.ids.card})).rejects.toThrow('access');
 expect(await f.editor.mutation(api.marketing.acceptTokenInvite,{token})).toBe(f.ids.card);
 expect(await f.editor.query(api.marketing.detail,{cardId:f.ids.card})).toMatchObject({owner:false});
 expect(await f.t.run(ctx=>ctx.db.get(f.grant._id))).toMatchObject({status:'editor',userId:f.ids.editor});
 expect(await f.editor.mutation(api.marketing.acceptTokenInvite,{token})).toBe(f.ids.card);
 await expect(f.sameEmail.mutation(api.marketing.acceptTokenInvite,{token})).rejects.toThrow('unavailable');
 await expect(f.sameEmail.query(api.marketing.detail,{cardId:f.ids.card})).rejects.toThrow('access');
});

test.each(['signed out','wrong email','wrong token','malformed token','expired','missing expiry','revoked'] as const)('a secret editor invitation rejects %s without granting access',async reason=>{
 const f=await fixture();
 if(reason==='expired')await f.t.run(ctx=>ctx.db.patch(f.grant._id,{expiresAt:Date.now()-1}));
 if(reason==='missing expiry')await f.t.run(ctx=>ctx.db.patch(f.grant._id,{expiresAt:undefined}));
 if(reason==='revoked')await f.owner.mutation(api.marketing.decideAccess,{accessId:f.grant._id,decision:'removed'});
 const client=reason==='signed out'?f.t:reason==='wrong email'?f.stranger:f.editor;
 const candidate=reason==='wrong token'?'2'.repeat(64):reason==='malformed token'?'guess':token;
 await expect(client.mutation(api.marketing.acceptTokenInvite,{token:candidate})).rejects.toThrow();
 expect((await f.t.run(ctx=>ctx.db.get(f.grant._id)))?.userId).toBeUndefined();
 await expect(f.editor.query(api.marketing.detail,{cardId:f.ids.card})).rejects.toThrow('access');
});
