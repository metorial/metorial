import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let costPerDataPointSchema = z
  .object({
    type: z.string().optional().describe('Data point type'),
    cost: z.number().optional().describe('Cost per data point')
  })
  .passthrough();

let planSchema = z
  .object({
    name: z.string().optional().describe('Plan name'),
    productType: z.string().optional().describe('Product type'),
    status: z.string().optional().describe('Plan status (e.g., Active, Inactive)'),
    nextBillingPeriod: z.string().optional().describe('Next billing period start date'),
    availableCredits: z.number().optional().describe('Remaining credits available'),
    usedCredits: z.number().optional().describe('Credits used so far'),
    costPerDataPoint: z
      .array(costPerDataPointSchema)
      .optional()
      .describe('Cost breakdown per data point type')
  })
  .passthrough();

export let getAccountCredits = SlateTool.create(spec, {
  name: 'Get Account Credits',
  key: 'get_account_credits',
  description: `Retrieve your LeadIQ account plan details and API credit usage.
Shows plan name, status, available and used credits, next billing period, and per-data-point cost breakdowns.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      plans: z.array(planSchema).describe('Account plans with credit details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();
    let plans = account.plans ?? [];

    let summaryParts = plans.map((p: any) => {
      let parts = [`**${p.name}** (${p.status})`];
      if (p.availableCredits !== undefined) {
        parts.push(`${p.availableCredits} credits available`);
      }
      if (p.usedCredits !== undefined) {
        parts.push(`${p.usedCredits} used`);
      }
      return parts.join(' — ');
    });

    return {
      output: { plans },
      message:
        summaryParts.length > 0
          ? `Account plans:\n${summaryParts.map((s: string) => `- ${s}`).join('\n')}`
          : 'No plans found on this account.'
    };
  })
  .build();
