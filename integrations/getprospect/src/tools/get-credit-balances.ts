import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let balanceSchema = z.object({
  available: z.number().describe('Available credits'),
  allowance: z.number().describe('Subscription allowance credits'),
  additional: z.number().describe('Additional credits'),
  permanent: z.number().describe('Permanent credits')
});

export let getCreditBalances = SlateTool.create(spec, {
  name: 'Get Credit Balances',
  key: 'get_credit_balances',
  description:
    'Check available GetProspect email search, email verification, and phone search credits before running paid lookups. This check spends no credits.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      emailSearch: balanceSchema.describe('Email search and reveal balance'),
      emailVerification: balanceSchema.describe('Email verification balance'),
      phoneSearch: balanceSchema.describe('Phone search balance'),
      resetAt: z.string().optional().describe('Next subscription credit reset time')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCreditBalances();
    return {
      output: {
        emailSearch: result.email_search,
        emailVerification: result.email_verification,
        phoneSearch: result.phone_search,
        resetAt: result.reset_at ?? undefined
      },
      message: `Available credits: **${result.email_search.available}** email searches, **${result.email_verification.available}** email verifications, and **${result.phone_search.available}** phone searches.`
    };
  })
  .build();
