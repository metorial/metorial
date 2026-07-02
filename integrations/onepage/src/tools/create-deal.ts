import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customFieldValueSchema, dealSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal associated with a contact. Deals represent potential financial transactions and track your sales pipeline.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact this deal belongs to'),
      name: z.string().describe('Deal name'),
      amount: z.number().optional().describe('Deal monetary amount'),
      months: z.number().optional().describe('Number of months for the deal'),
      status: z.enum(['pending', 'won', 'lost']).optional().describe('Deal status'),
      stage: z.number().optional().describe('Deal pipeline stage (numeric)'),
      expectedCloseDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      closeDate: z.string().optional().describe('Actual close date (YYYY-MM-DD)'),
      text: z.string().optional().describe('Deal description or notes'),
      ownerId: z.string().optional().describe('ID of the user to own this deal'),
      customFields: z.array(customFieldValueSchema).optional().describe('Custom field values')
    })
  )
  .output(dealSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let deal = await client.createDeal(ctx.input);

    return {
      output: deal,
      message: `Created deal **${deal.name}** (${deal.dealId}) with status ${deal.status ?? 'pending'}.`
    };
  })
  .build();
