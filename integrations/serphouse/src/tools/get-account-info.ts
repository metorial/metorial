import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve SERPHouse account information including plan details and available credits. Returns all plans and retains separate live and scheduled credit details when the account response provides them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Response status'),
      name: z.string().optional().describe('Account holder name'),
      email: z.string().optional().describe('Account email'),
      plan: z
        .object({
          planName: z.string().optional().describe('Active plan name'),
          planType: z.string().optional().describe('Plan type'),
          price: z.string().optional().describe('Plan price')
        })
        .optional()
        .describe('Active subscription plan details'),
      plans: z
        .array(
          z.object({
            planName: z.string().optional(),
            planType: z.string().optional(),
            price: z.string().optional(),
            currency: z.string().optional(),
            creditAvailable: z.number().optional(),
            creditTotal: z.number().optional()
          })
        )
        .optional()
        .describe('All returned subscription plans with their individual credit balances'),
      credits: z
        .object({
          available: z.number().optional().describe('Available live API credits'),
          total: z.number().optional().describe('Total live API credits'),
          scheduledAvailable: z
            .number()
            .optional()
            .describe('Available scheduled API credits'),
          scheduledTotal: z.number().optional().describe('Total scheduled API credits')
        })
        .optional()
        .describe('Credit usage information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getAccountInfo();
    let results = response?.results;
    let plans = Array.isArray(results?.plan)
      ? results.plan
      : results?.plan
        ? [results.plan]
        : [];
    let firstPlan = plans[0];

    return {
      output: {
        status: response?.status ?? 'unknown',
        name: results?.name,
        email: results?.email,
        plan: firstPlan
          ? {
              planName: firstPlan.name,
              planType: firstPlan.plan_type ?? firstPlan.type,
              price: firstPlan.price === undefined ? undefined : String(firstPlan.price)
            }
          : undefined,
        plans: plans.map(plan => ({
          planName: plan.name,
          planType: plan.plan_type ?? plan.type,
          price: plan.price === undefined ? undefined : String(plan.price),
          currency: plan.currency,
          creditAvailable: plan.credit_available,
          creditTotal: plan.credit_total
        })),
        credits: results?.credit
          ? {
              available: results.credit.available,
              total: results.credit.total,
              scheduledAvailable: results.credit.scheduled_available,
              scheduledTotal: results.credit.scheduled_total
            }
          : undefined
      },
      message: `Account: **${results?.name ?? 'N/A'}** (${results?.email ?? 'N/A'}). Retrieved **${plans.length}** subscription plan(s).`
    };
  })
  .build();
