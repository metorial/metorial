import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

export let getEarnings = SlateTool.create(spec, {
  name: 'Get Earnings',
  key: 'get_earnings',
  description: `Retrieve the annual Gumroad earnings breakdown matching Tax Center totals. This endpoint requires view_tax_data scope and is only available to US-based sellers with Tax Center enabled.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().int().min(2000).describe('4-digit tax year to retrieve, such as 2025')
    })
  )
  .output(
    z.object({
      year: z.number().int().describe('Tax year'),
      currency: z.string().describe('Currency, usually usd'),
      grossCents: z.number().int().describe('Gross earnings in cents'),
      feesCents: z.number().int().describe('Gumroad fees in cents'),
      taxesCents: z.number().int().describe('Taxes in cents'),
      affiliateCreditCents: z.number().int().describe('Affiliate credit in cents'),
      netCents: z.number().int().describe('Net earnings in cents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let result = await client.getEarnings(ctx.input.year);

    return {
      output: {
        year: result.year,
        currency: result.currency,
        grossCents: result.gross_cents,
        feesCents: result.fees_cents,
        taxesCents: result.taxes_cents,
        affiliateCreditCents: result.affiliate_credit_cents,
        netCents: result.net_cents
      },
      message: `Retrieved ${result.year} Gumroad earnings.`
    };
  })
  .build();
