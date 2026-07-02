import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve Mocean account balance and optionally pricing information. Returns the current credit balance and per-destination SMS pricing with carrier-level details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includePricing: z
        .boolean()
        .optional()
        .describe('Also retrieve per-destination pricing information')
    })
  )
  .output(
    z.object({
      balance: z.string().optional().describe('Current account credit balance'),
      balanceStatus: z.number().optional().describe('Balance query status (0 = success)'),
      destinations: z
        .array(
          z.object({
            country: z.string().optional().describe('Destination country'),
            operator: z.string().optional().describe('Network operator'),
            mcc: z.string().optional().describe('Mobile Country Code'),
            mnc: z.string().optional().describe('Mobile Network Code'),
            price: z.string().optional().describe('Per-message price'),
            currency: z.string().optional().describe('Price currency')
          })
        )
        .optional()
        .describe('Pricing per destination (only if includePricing is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let balanceResult = await client.getBalance();

    let output: any = {
      balance: String(balanceResult.value),
      balanceStatus: balanceResult.status
    };

    if (ctx.input.includePricing) {
      let pricingResult = await client.getPricing();
      output.destinations = pricingResult.destinations || [];
    }

    return {
      output,
      message: `Account balance: **${output.balance}** credits.${ctx.input.includePricing ? ` Retrieved pricing for ${output.destinations?.length || 0} destinations.` : ''}`
    };
  })
  .build();
