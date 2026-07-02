import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paymentPlanSchema = z.object({
  planId: z.number().describe('Payment plan ID'),
  name: z.string().describe('Plan name'),
  amount: z.number().describe('Billing amount per cycle'),
  interval: z
    .string()
    .describe('Billing interval (daily, weekly, monthly, quarterly, yearly)'),
  duration: z.number().optional().describe('Number of billing cycles'),
  status: z.string().describe('Plan status (active, cancelled)'),
  currency: z.string().optional().describe('Plan currency'),
  planToken: z.string().optional().describe('Plan token for referencing in charges'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let managePaymentPlans = SlateTool.create(spec, {
  name: 'Manage Payment Plans',
  key: 'manage_payment_plans',
  description: `Create, list, retrieve, update, or cancel payment plans for recurring billing. Payment plans define subscription parameters (amount, interval, duration). When you charge a customer with a plan, they are automatically subscribed for future billing cycles.`,
  instructions: [
    'To create a plan, provide name, amount, and interval.',
    'To list all plans, omit the planId.',
    'To get a specific plan, provide only the planId.',
    'To update a plan, provide planId with updateName or updateStatus.',
    'To cancel a plan, set updateStatus to "cancelled".'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'get', 'update']).describe('Action to perform'),
      planId: z.number().optional().describe('Plan ID (required for get/update)'),
      name: z.string().optional().describe('Plan name (for create)'),
      amount: z.number().optional().describe('Billing amount per cycle (for create)'),
      interval: z
        .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
        .optional()
        .describe('Billing interval (for create)'),
      duration: z
        .number()
        .optional()
        .describe('Number of billing cycles (for create, default: 48)'),
      updateName: z.string().optional().describe('New plan name (for update)'),
      updateStatus: z
        .enum(['active', 'cancelled'])
        .optional()
        .describe('New plan status (for update)')
    })
  )
  .output(
    z.object({
      plans: z.array(paymentPlanSchema).describe('Payment plan(s) returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.amount || !ctx.input.interval) {
        throw new Error('name, amount, and interval are required to create a payment plan');
      }
      let result = await client.createPaymentPlan({
        amount: ctx.input.amount,
        name: ctx.input.name,
        interval: ctx.input.interval,
        duration: ctx.input.duration
      });
      let p = result.data;
      return {
        output: {
          plans: [
            {
              planId: p.id,
              name: p.name,
              amount: p.amount,
              interval: p.interval,
              duration: p.duration,
              status: p.status,
              currency: p.currency,
              planToken: p.plan_token,
              createdAt: p.created_at
            }
          ]
        },
        message: `Payment plan **${p.name}** created — ${p.currency || ''} ${p.amount} billed **${p.interval}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.planId) throw new Error('planId is required to get a payment plan');
      let result = await client.getPaymentPlan(ctx.input.planId);
      let p = result.data;
      return {
        output: {
          plans: [
            {
              planId: p.id,
              name: p.name,
              amount: p.amount,
              interval: p.interval,
              duration: p.duration,
              status: p.status,
              currency: p.currency,
              planToken: p.plan_token,
              createdAt: p.created_at
            }
          ]
        },
        message: `Plan **${p.name}** — ${p.amount} ${p.interval}, status: **${p.status}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.planId) throw new Error('planId is required to update a payment plan');
      let result = await client.updatePaymentPlan(ctx.input.planId, {
        name: ctx.input.updateName,
        status: ctx.input.updateStatus
      });
      let p = result.data;
      return {
        output: {
          plans: [
            {
              planId: p.id,
              name: p.name,
              amount: p.amount,
              interval: p.interval,
              duration: p.duration,
              status: p.status,
              currency: p.currency,
              planToken: p.plan_token,
              createdAt: p.created_at
            }
          ]
        },
        message: `Payment plan **${p.name}** updated successfully.`
      };
    }

    // list
    let result = await client.listPaymentPlans();
    let plans = (result.data || []).map((p: any) => ({
      planId: p.id,
      name: p.name,
      amount: p.amount,
      interval: p.interval,
      duration: p.duration,
      status: p.status,
      currency: p.currency,
      planToken: p.plan_token,
      createdAt: p.created_at
    }));

    return {
      output: { plans },
      message: `Found **${plans.length}** payment plans.`
    };
  })
  .build();
