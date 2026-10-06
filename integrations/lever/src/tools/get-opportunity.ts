import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id } from '../lib/contracts';
import { spec } from '../spec';

export let getOpportunityTool = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Retrieve one opportunity by ID. Expand documented contact, stage, application and user relationships; use get_opportunity_activity for notes, interviews, offers, resumes and files.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      opportunityId: z.string().describe('The ID of the opportunity to retrieve'),
      expand: z
        .array(z.enum(['applications', 'stage', 'owner', 'followers', 'sourcedBy', 'contact']))
        .optional()
        .describe('Related objects to include')
    })
  )
  .output(
    z.object({
      opportunity: z.any().describe('The opportunity object with all details')
    })
  )
  .handleInvocation(async ctx => {
    const opportunityId = id(ctx.input.opportunityId, 'Opportunity ID');
    const result = await new Client(ctx.auth).getOpportunity(
      opportunityId,
      ctx.input.expand === undefined ? {} : { expand: ctx.input.expand.join(',') }
    );
    return {
      output: { opportunity: result.data },
      message: `Retrieved opportunity ${opportunityId}.`
    };
  })
  .build();
