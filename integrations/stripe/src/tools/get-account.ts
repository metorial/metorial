import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { spec } from '../spec';

export const getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Identify the Stripe account used by this connection, including any configured connected-account target, and inspect payment and payout readiness.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      country: z.string().optional(),
      defaultCurrency: z.string().optional(),
      chargesEnabled: z.boolean(),
      payoutsEnabled: z.boolean(),
      detailsSubmitted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });
    const account = await client.getAccount();
    return {
      output: {
        accountId: account.id,
        name:
          account.settings?.dashboard?.display_name ?? account.business_profile?.name ?? null,
        email: account.email ?? null,
        country: account.country,
        defaultCurrency: account.default_currency,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      },
      message: `Stripe account **${account.id}**`
    };
  })
  .build();
