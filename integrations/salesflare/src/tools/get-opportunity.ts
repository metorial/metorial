import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOpportunity = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Retrieve detailed information about a specific sales opportunity by its ID. Returns full data including stage, pipeline, value, currency, close date, tags, probability, lost reason, lead source, custom fields, and stage history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to retrieve')
    })
  )
  .output(
    z.object({
      opportunity: z.record(z.string(), z.any()).describe('Full opportunity details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let opportunity = await client.getOpportunity(ctx.input.opportunityId);

    return {
      output: { opportunity },
      message: `Retrieved opportunity **${opportunity.name || opportunity.id}**.`
    };
  })
  .build();
