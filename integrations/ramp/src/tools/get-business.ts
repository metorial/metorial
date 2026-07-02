import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      business: z.any().describe('Business information'),
      balance: z.any().optional().describe('Business balance (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let business = await client.getBusiness();
    let balance: any;

    if (ctx.input.includeBalance) {
      balance = await client.getBusinessBalance();
    }

    return {
      output: { business, balance },
      message: `Retrieved business info for **${business.business_name_legal || business.business_name_on_card || 'business'}**${balance ? ' (including balance)' : ''}.`
    };
  })
  .build();
