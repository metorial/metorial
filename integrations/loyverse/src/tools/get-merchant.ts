import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMerchant = SlateTool.create(spec, {
  name: 'Get Merchant',
  key: 'get_merchant',
  description: `Retrieve account-level merchant information including business name, email, and configuration.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      merchantId: z.string().describe('Merchant account ID'),
      businessName: z.string().nullable().optional().describe('Business name'),
      email: z.string().nullable().optional().describe('Account email'),
      country: z.string().nullable().optional().describe('Country'),
      currency: z.string().nullable().optional().describe('Primary currency code'),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let m = await client.getMerchant();

    return {
      output: {
        merchantId: m.id,
        businessName: m.business_name,
        email: m.email,
        country: m.country,
        currency: m.currency,
        createdAt: m.created_at
      },
      message: `Retrieved merchant **${m.business_name ?? m.id}**.`
    };
  })
  .build();
