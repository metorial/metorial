import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let costPerDataPointSchema = z
  .object({
    type: z.string().optional().describe('Data point type'),
    cost: z.number().optional().describe('Provider integer cost per data point'),
    sku: z.string().optional().describe('Provider subproduct for this cost'),
    costInDecimals: z
      .union([z.string(), z.number()])
      .optional()
      .describe('Provider decimal cost, preserving its returned representation')
  })
  .passthrough();

let planSchema = z
  .object({
    name: z.string().optional().describe('Plan name'),
    productType: z
      .string()
      .optional()
      .describe('Product type, mapped from the provider product field'),
    product: z.string().optional().describe('Provider product name'),
    status: z.string().optional().describe('Plan status (e.g., Active, Inactive)'),
    nextBillingPeriod: z.string().optional().describe('Next billing period start date'),
    availableCredits: z.number().optional().describe('Remaining credits available'),
    usedCredits: z.number().optional().describe('Credits used so far'),
    costPerDataPoint: z
      .array(costPerDataPointSchema)
      .optional()
      .describe('Per-data-point costs; separate SKU entries are retained')
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
      plans: z
        .array(planSchema)
        .describe(
          'Current account plans with credit details when the matching credit plan is present'
        ),
      dataHubPlan: planSchema.optional().describe('DataHub credit plan when present'),
      universalPlan: planSchema.optional().describe('Universal credit plan when present')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();
    let creditPlans = [account.dataHubPlan, account.universalPlan].filter(Boolean);
    let formatPlan = (plan: any, balance: any = plan) => ({
      ...plan,
      productType: plan.product,
      availableCredits: balance?.available,
      usedCredits: balance?.used,
      costPerDataPoint: balance?.costs?.flatMap((sku: any) =>
        sku.costs.map((cost: any) => ({
          type: cost.dataPoint,
          cost: cost.cost,
          costInDecimals: cost.costInDecimals,
          sku: sku.sku
        }))
      )
    });
    let plans = account.plans.map((plan: any) =>
      formatPlan(
        plan,
        creditPlans.find(
          balance =>
            balance.product === plan.product &&
            balance.name === plan.name &&
            balance.status === plan.status
        )
      )
    );
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
      output: {
        plans,
        dataHubPlan: account.dataHubPlan ? formatPlan(account.dataHubPlan) : undefined,
        universalPlan: account.universalPlan ? formatPlan(account.universalPlan) : undefined
      },
      message:
        summaryParts.length > 0
          ? `Account plans:\n${summaryParts.map((s: string) => `- ${s}`).join('\n')}`
          : 'No plans found on this account.'
    };
  })
  .build();
