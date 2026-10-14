import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dealSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description:
    'Get a deal by ID to inspect its contact, amount, pipeline stage, status, dates, and custom fields.',
  tags: { readOnly: true }
})
  .input(
    z.object({ dealId: z.string().describe('Deal ID; use list_deals to discover deals') })
  )
  .output(dealSchema)
  .handleInvocation(async ctx => {
    let deal = await new Client(ctx.auth).getDeal(ctx.input.dealId);
    return {
      output: deal,
      message: `Retrieved deal **${deal.name}** (${deal.dealId}).`
    };
  })
  .build();
