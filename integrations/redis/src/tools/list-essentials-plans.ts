import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
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
  description: `List available Redis Cloud Essentials plans. Use plan IDs when creating Essentials subscriptions. Plans define the cloud provider, region, pricing, and resource limits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      plans: z.array(planSchema).describe('Available Essentials plans')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listEssentialsPlans();
    let rawPlans = data?.plans || data || [];
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
