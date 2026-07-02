import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

export let createPlan = SlateTool.create(spec, {
  name: 'Create Plan',
  key: 'create_plan',
  description: `Create a subscription plan that defines recurring billing parameters. Plans specify the amount, currency, and billing interval for automatic charges.
Amounts are in the **smallest currency unit** (e.g., kobo for NGN).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Plan name'),
      amount: z.number().describe('Amount in smallest currency unit'),
      interval: z
        .enum(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually'])
        .describe('Billing interval'),
      description: z.string().optional().describe('Plan description'),
      currency: z.string().optional().describe('Currency code (default NGN)'),
      invoiceLimit: z
        .number()
        .optional()
        .describe('Number of times to charge. Leave empty for infinite'),
      sendInvoices: z.boolean().optional().describe('Whether to send invoices to customer'),
      sendSms: z.boolean().optional().describe('Whether to send SMS notifications')
    })
  )
  .output(
    z.object({
      planCode: z.string().describe('Plan code'),
      planId: z.number().describe('Plan ID'),
      name: z.string().describe('Plan name'),
      amount: z.number().describe('Plan amount'),
      interval: z.string().describe('Billing interval'),
      currency: z.string().describe('Currency')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createPlan({
      name: ctx.input.name,
      amount: ctx.input.amount,
      interval: ctx.input.interval,
      description: ctx.input.description,
      currency: ctx.input.currency,
      invoiceLimit: ctx.input.invoiceLimit,
      sendInvoices: ctx.input.sendInvoices,
      sendSms: ctx.input.sendSms
    });

    let plan = result.data;

    return {
      output: {
        planCode: plan.plan_code,
        planId: plan.id,
        name: plan.name,
        amount: plan.amount,
        interval: plan.interval,
        currency: plan.currency
      },
      message: `Plan **${plan.name}** created (${plan.plan_code}). ${plan.amount} ${plan.currency} billed ${plan.interval}.`
    };
  })
  .build();

export let listPlans = SlateTool.create(spec, {
  name: 'List Plans',
  key: 'list_plans',
  description: `Retrieve a paginated list of subscription plans on your integration. Filter by status, interval, or amount.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      status: z.string().optional().describe('Filter by plan status'),
      interval: z.string().optional().describe('Filter by billing interval'),
      amount: z.number().optional().describe('Filter by amount')
    })
  )
  .output(
    z.object({
      plans: z.array(
        z.object({
          planCode: z.string().describe('Plan code'),
          planId: z.number().describe('Plan ID'),
          name: z.string().describe('Plan name'),
          amount: z.number().describe('Amount'),
          interval: z.string().describe('Billing interval'),
          currency: z.string().describe('Currency'),
          subscriptionCount: z.number().describe('Number of subscriptions')
        })
      ),
      totalCount: z.number().describe('Total plans'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listPlans({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      status: ctx.input.status,
      interval: ctx.input.interval,
      amount: ctx.input.amount
    });

    let plans = (result.data ?? []).map((p: any) => ({
      planCode: p.plan_code,
      planId: p.id,
      name: p.name,
      amount: p.amount,
      interval: p.interval,
      currency: p.currency,
      subscriptionCount: p.subscriptions?.length ?? 0
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        plans,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? plans.length}** plans.`
    };
  })
  .build();

export let updatePlan = SlateTool.create(spec, {
  name: 'Update Plan',
  key: 'update_plan',
  description: `Update an existing subscription plan. Modify the name, amount, interval, description, and notification settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      planIdOrCode: z.string().describe('Plan ID or plan code to update'),
      name: z.string().optional().describe('Updated plan name'),
      amount: z.number().optional().describe('Updated amount in smallest currency unit'),
      interval: z
        .enum(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually'])
        .optional()
        .describe('Updated billing interval'),
      description: z.string().optional().describe('Updated description'),
      currency: z.string().optional().describe('Updated currency'),
      invoiceLimit: z.number().optional().describe('Updated invoice limit'),
      sendInvoices: z.boolean().optional().describe('Whether to send invoices'),
      sendSms: z.boolean().optional().describe('Whether to send SMS')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    await client.updatePlan(ctx.input.planIdOrCode, {
      name: ctx.input.name,
      amount: ctx.input.amount,
      interval: ctx.input.interval,
      description: ctx.input.description,
      currency: ctx.input.currency,
      invoiceLimit: ctx.input.invoiceLimit,
      sendInvoices: ctx.input.sendInvoices,
      sendSms: ctx.input.sendSms
    });

    return {
      output: {
        success: true
      },
      message: `Plan **${ctx.input.planIdOrCode}** updated successfully.`
    };
  })
  .build();
