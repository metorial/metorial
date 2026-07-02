import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { redisServiceError } from '../lib/errors';
import { spec } from '../spec';

let planSchema = z.object({
  planId: z.number().describe('Plan ID'),
  name: z.string().optional().describe('Plan name'),
  provider: z.string().optional().describe('Cloud provider'),
  region: z.string().optional().describe('Region'),
  price: z.number().optional().describe('Plan price'),
  priceCurrency: z.string().optional().describe('Price currency'),
  pricePeriod: z.string().optional().describe('Billing period'),
  maximumDatabases: z.number().optional().describe('Maximum number of databases'),
  maximumMemoryGb: z.number().optional().describe('Maximum memory in GB'),
  highAvailability: z.boolean().optional().describe('Whether high availability is included')
});

export let listEssentialsPlans = SlateTool.create(spec, {
  name: 'List Essentials Plans',
  key: 'list_essentials_plans',
  description: `List available Redis Cloud Essentials plans, retrieve a single plan by ID, or list plans compatible with an existing Essentials subscription. Use plan IDs when creating or updating Essentials subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      planId: z.number().optional().describe('Specific Essentials plan ID to retrieve'),
      subscriptionId: z
        .number()
        .optional()
        .describe('Existing Essentials subscription ID to list compatible plans for')
    })
  )
  .output(
    z.object({
      plans: z.array(planSchema).describe('Available Essentials plans')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    if (ctx.input.planId !== undefined && ctx.input.subscriptionId !== undefined) {
      throw redisServiceError('Provide either planId or subscriptionId, not both.');
    }

    let data =
      ctx.input.planId !== undefined
        ? await client.getEssentialsPlan(ctx.input.planId)
        : ctx.input.subscriptionId !== undefined
          ? await client.listCompatibleEssentialsPlans(ctx.input.subscriptionId)
          : await client.listEssentialsPlans();
    let rawPlans = data?.plans || data || [];
    if (ctx.input.planId !== undefined && !Array.isArray(rawPlans)) {
      rawPlans = [rawPlans];
    }
    if (!Array.isArray(rawPlans)) rawPlans = [];

    let plans = rawPlans.map((p: any) => ({
      planId: p.id,
      name: p.name,
      provider: p.provider,
      region: p.region,
      price: p.price,
      priceCurrency: p.priceCurrency,
      pricePeriod: p.pricePeriod,
      maximumDatabases: p.maximumDatabases,
      maximumMemoryGb: p.maximumMemoryGb,
      highAvailability: p.highAvailability
    }));

    return {
      output: { plans },
      message: `Found **${plans.length}** Essentials plan(s).`
    };
  })
  .build();
