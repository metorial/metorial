import { SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let managePricingPlans = SlateTool.create(spec, {
  name: 'Manage Pricing Plans',
  key: 'manage_pricing_plans',
  description: `Query and retrieve pricing plans on a Wix site.
Use **action** to specify the operation: \`list\` or \`get\`.
Pricing plans represent subscription-based offerings with recurring or one-time pricing.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Operation to perform'),
      planId: z.string().optional().describe('Pricing plan ID (required for get)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for list action'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for list action'),
      limit: z.number().optional().describe('Max items to return (default 50)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      plan: z.any().optional().describe('Single pricing plan data'),
      plans: z.array(z.any()).optional().describe('List of pricing plans'),
      totalResults: z.number().optional().describe('Total number of plans')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.queryPricingPlans({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          paging: { limit: ctx.input.limit, offset: ctx.input.offset }
        });
        let plans = result.plans || [];
        return {
          output: { plans, totalResults: result.pagingMetadata?.total },
          message: `Found **${plans.length}** pricing plans`
        };
      }
      case 'get': {
        if (!ctx.input.planId) throw new Error('planId is required for get action');
        let result = await client.getPricingPlan(ctx.input.planId);
        return {
          output: { plan: result.plan },
          message: `Retrieved pricing plan **${result.plan?.name || ctx.input.planId}**`
        };
      }
    }
  })
  .build();
