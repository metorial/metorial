import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

export let getCheckout = SlateTool.create(spec, {
  name: 'Get Checkout',
  key: 'get_checkout',
  description:
    'Retrieve an existing Whop checkout configuration and its purchase URL, plan, redirect URL, and metadata without creating another checkout.',
  tags: { readOnly: true }
})
  .input(z.object({ checkoutId: z.string().describe('Checkout configuration ID') }))
  .output(
    z.object({
      checkoutId: z.string(),
      companyId: z.string().describe('Owning company/account ID'),
      mode: z.string(),
      purchaseUrl: z.string(),
      currency: z.string().nullable(),
      planId: z.string().nullable(),
      redirectUrl: z.string().nullable(),
      affiliateCode: z.string().nullable(),
      metadata: z.record(z.string(), z.unknown()).nullable()
    })
  )
  .handleInvocation(async ctx => {
    let checkout = await new WhopClient(ctx.auth.token).getCheckoutConfiguration(
      ctx.input.checkoutId
    );
    return {
      output: {
        checkoutId: checkout.id,
        companyId: checkout.account_id ?? checkout.company_id,
        mode: checkout.mode,
        purchaseUrl: checkout.purchase_url,
        currency: checkout.currency,
        planId: checkout.plan?.id ?? null,
        redirectUrl: checkout.redirect_url,
        affiliateCode: checkout.affiliate_code,
        metadata: checkout.metadata
      },
      message: `Retrieved checkout ${checkout.id}: ${checkout.purchase_url}.`
    };
  })
  .build();
