import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOpportunityTool = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Retrieve a single opportunity by ID with full details including contact info, applications, feedback, notes, offers, resumes, and files. Use the expand parameter to include related objects.`,
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
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let params: Record<string, any> = {};
    if (ctx.input.expand) params.expand = ctx.input.expand;

    let result = await client.getOpportunity(ctx.input.opportunityId, params);

    return {
      output: {
        opportunity: result.data
      },
      message: `Retrieved opportunity **${ctx.input.opportunityId}**.`
    };
  })
  .build();
