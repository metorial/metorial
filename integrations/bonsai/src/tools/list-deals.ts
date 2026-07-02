import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `Retrieve all deals from the Bonsai sales pipeline. Returns deal details including title, client, pipeline stage, value, and owner.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      deals: z
        .array(
          z.object({
            dealId: z.string().describe('Deal ID'),
            title: z.string().describe('Deal title'),
            clientEmail: z.string().optional().describe('Client email'),
            clientId: z.string().optional().describe('Client ID'),
            pipelineStage: z.string().optional().describe('Pipeline stage'),
            value: z.number().optional().describe('Deal value'),
            ownerEmail: z.string().optional().describe('Owner email')
          })
        )
        .describe('List of deals'),
      totalCount: z.number().describe('Total number of deals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let deals = await client.listDeals();

    return {
      output: {
        deals: deals.map(d => ({
          dealId: d.id,
          title: d.title,
          clientEmail: d.clientEmail,
          clientId: d.clientId,
          pipelineStage: d.pipelineStage,
          value: d.value,
          ownerEmail: d.ownerEmail
        })),
        totalCount: deals.length
      },
      message: `Found **${deals.length}** deals.`
    };
  })
  .build();
