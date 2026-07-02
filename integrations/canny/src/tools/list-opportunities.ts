import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listOpportunitiesTool = SlateTool.create(spec, {
  name: 'List Opportunities',
  key: 'list_opportunities',
  description: `List sales opportunities synced from Salesforce or HubSpot that are linked to Canny posts. Shows opportunity value, closed/won status, and linked post IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of opportunities to return (max 100)'),
      skip: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      opportunities: z
        .array(
          z.object({
            opportunityId: z.string().describe('Opportunity ID'),
            name: z.string().describe('Opportunity name'),
            value: z.number().nullable().describe('Opportunity value/amount'),
            closed: z.boolean().describe('Whether the opportunity is closed'),
            won: z.boolean().describe('Whether the opportunity was won'),
            postIds: z.array(z.string()).describe('Linked post IDs'),
            salesforceOpportunityId: z
              .string()
              .nullable()
              .describe('Salesforce opportunity ID')
          })
        )
        .describe('List of opportunities'),
      hasMore: z.boolean().describe('Whether more opportunities are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listOpportunities({
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let opportunities = (result.opportunities || []).map((o: any) => ({
      opportunityId: o.id,
      name: o.name,
      value: o.value ?? null,
      closed: o.closed,
      won: o.won,
      postIds: o.postIDs || [],
      salesforceOpportunityId: o.salesforceOpportunityID || null
    }));

    return {
      output: { opportunities, hasMore: result.hasMore },
      message: `Found **${opportunities.length}** opportunity(ies)${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
