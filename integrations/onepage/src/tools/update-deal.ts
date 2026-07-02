import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customFieldValueSchema, dealSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing deal. Use this to change deal status (pending/won/lost), update the amount, move to a different stage, or modify other deal properties. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to update'),
      name: z.string().optional().describe('Deal name'),
      amount: z.number().optional().describe('Deal monetary amount'),
      months: z.number().optional().describe('Number of months'),
      status: z.enum(['pending', 'won', 'lost']).optional().describe('Deal status'),
      stage: z.number().optional().describe('Deal pipeline stage (numeric)'),
      expectedCloseDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      closeDate: z.string().optional().describe('Actual close date (YYYY-MM-DD)'),
      text: z.string().optional().describe('Deal description or notes'),
      ownerId: z.string().optional().describe('ID of the user to own this deal'),
      contactId: z.string().optional().describe('ID of the associated contact'),
      customFields: z.array(customFieldValueSchema).optional().describe('Custom field values')
    })
  )
  .output(dealSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let { dealId, ...updateData } = ctx.input;
    let deal = await client.updateDeal(dealId, updateData);

    return {
      output: deal,
      message: `Updated deal **${deal.name}** (${deal.dealId}).`
    };
  })
  .build();
