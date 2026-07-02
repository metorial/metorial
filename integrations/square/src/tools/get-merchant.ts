import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getMerchant = SlateTool.create(spec, {
  name: 'Get Merchant',
  key: 'get_merchant',
  description:
    'Retrieve the authenticated Square merchant profile, or a specific merchant profile by merchant ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      merchantId: z.string().optional().describe('Merchant ID to retrieve. Defaults to "me".')
    })
  )
  .output(
    z.object({
      merchantId: z.string().optional(),
      businessName: z.string().optional(),
      country: z.string().optional(),
      languageCode: z.string().optional(),
      currency: z.string().optional(),
      status: z.string().optional(),
      mainLocationId: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let merchant = await client.getMerchant(ctx.input.merchantId || 'me');

    return {
      output: {
        merchantId: merchant.id,
        businessName: merchant.business_name,
        country: merchant.country,
        languageCode: merchant.language_code,
        currency: merchant.currency,
        status: merchant.status,
        mainLocationId: merchant.main_location_id,
        createdAt: merchant.created_at
      },
      message: `Merchant **${merchant.id}** — ${merchant.business_name || 'Square merchant'}`
    };
  })
  .build();
