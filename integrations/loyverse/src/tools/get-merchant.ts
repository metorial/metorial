import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMerchant = SlateTool.create(spec, {
  name: 'Get Merchant',
  key: 'get_merchant',
  description: `Retrieve account-level merchant information for the connected Loyverse account, including business name, email, country, and currency.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      merchantId: z.string().describe('Merchant account ID'),
      businessName: z.string().nullable().optional().describe('Business name'),
      email: z.string().nullable().optional().describe('Account email'),
      country: z.string().nullable().optional().describe('Two-letter country code'),
      currency: z.string().nullable().optional().describe('Currency code (ISO 4217)'),
      currencyDecimalPlaces: z
        .number()
        .nullable()
        .optional()
        .describe('Number of decimal places used for money amounts'),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let m = await client.getMerchant();
    let currency =
      m.currency && typeof m.currency === 'object' ? m.currency : { code: m.currency };

    return {
      output: {
        merchantId: m.id,
        businessName: m.business_name,
        email: m.email,
        country: m.country,
        currency: currency.code,
        currencyDecimalPlaces: currency.decimal_places,
        createdAt: m.created_at
      },
      message: `Retrieved merchant **${m.business_name ?? m.id}**.`
    };
  })
  .build();
