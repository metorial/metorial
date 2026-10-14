import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

interface Account {
  customerId?: string | null;
  customerEmail?: string | null;
  billingAccountId?: string | null;
  pricingPlan?: string | null;
  creditsAvailable?: boolean | null;
  autoRenewEnabled?: boolean | null;
}

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Retrieve the customer identity, pricing plan, and credit availability for the connected Enigma API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      customerId: z.string().nullish().describe('Customer identifier'),
      customerEmail: z.string().nullish().describe('Customer email address'),
      billingAccountId: z.string().nullish().describe('Billing account identifier'),
      pricingPlan: z.string().nullish().describe('Current pricing plan'),
      creditsAvailable: z
        .boolean()
        .nullish()
        .describe('Whether the account has credits available'),
      autoRenewEnabled: z
        .boolean()
        .nullish()
        .describe('Whether automatic plan renewal is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.graphqlData<{ account?: Account | null }>(`
      query GetAccount {
        account {
          customerId
          customerEmail
          billingAccountId
          pricingPlan
          creditsAvailable
          autoRenewEnabled
        }
      }
    `);
    if (!result.account) {
      throw createApiServiceError('Enigma returned no account information for this API key.');
    }
    return {
      output: result.account,
      message: `Retrieved the connected Enigma account${result.account.customerEmail ? ` for **${result.account.customerEmail}**` : ''}.`
    };
  })
  .build();
