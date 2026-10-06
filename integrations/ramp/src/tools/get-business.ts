import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { recordSchema } from '../lib/validation';
import { spec } from '../spec';

export let getBusiness = SlateTool.create(spec, {
  name: 'Get Business Info',
  key: 'get_business',
  description: `Retrieve information about the connected Ramp business account, including business name, status, and optionally the account balance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeBalance: z
        .boolean()
        .optional()
        .describe('Also fetch the business account balance')
    })
  )
  .output(
    z.object({
      business: recordSchema.describe('Business information'),
      balance: recordSchema.optional().describe('Business balance (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let business = await client.getBusiness();
    let balance: Record<string, unknown> | undefined;

    if (ctx.input.includeBalance) {
      balance = await client.getBusinessBalance();
    }

    return {
      output: { business, balance },
      message: `Retrieved business info for **${business.business_name_legal || business.business_name_on_card || 'business'}**${balance ? ' (including balance)' : ''}.`
    };
  })
  .build();
