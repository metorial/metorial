import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  optionalNumericId,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const createPlanOutput = z.object({
  planCode: z.string().describe('Plan code'),
  planId: z.number().optional().describe('Plan ID'),
  exactPlanId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  name: z.string().describe('Plan name'),
  amount: z.number().describe('Plan amount'),
  interval: z.string().describe('Billing interval'),
  currency: z.string().describe('Currency')
});

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
  .output(createPlanOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createPlan(ctx.input);
    const plan = record(result.data);
    const output = {
      planCode: plan.plan_code,
      planId: optionalNumericId(plan.id),
      exactPlanId: exactId(plan.id),
      name: plan.name,
      amount: plan.amount,
      interval: plan.interval,
      currency: plan.currency
    };
    return {
      output: validateOutput(createPlanOutput, output),
      message: 'Recurring billing plan created; creating a subscription can schedule charges.'
    };
  })
  .build();
const listPlansOutput = z.object({
  plans: z.array(
    z.object({
      planCode: z.string().describe('Plan code'),
      planId: z.number().optional().describe('Plan ID'),
      exactPlanId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      name: z.string().describe('Plan name'),
      amount: z.number().describe('Amount'),
      interval: z.string().describe('Billing interval'),
      currency: z.string().describe('Currency'),
      subscriptionCount: z.number().optional().describe('Number of subscriptions')
    })
  ),
  totalCount: z.number().optional().describe('Total plans'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

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
  .output(listPlansOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listPlans(ctx.input);
    const output = {
      plans: records(result.data).map(item => ({
        planCode: item.plan_code,
        planId: optionalNumericId(item.id),
        exactPlanId: exactId(item.id),
        name: item.name,
        amount: item.amount,
        interval: item.interval,
        currency: item.currency,
        subscriptionCount: Array.isArray(item.subscriptions)
          ? item.subscriptions.length
          : undefined
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listPlansOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
const updatePlanOutput = z.object({
  success: z.boolean().describe('Whether the update succeeded')
});

export let updatePlan = SlateTool.create(spec, {
  name: 'Update Plan',
  key: 'update_plan',
  description: `Update recurring billing parameters. Paystack applies changes to existing subscriptions by default; explicitly set updateExistingSubscriptions=false to affect only future subscriptions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      planIdOrCode: z.string().describe('Plan ID or plan code to update'),
      updateExistingSubscriptions: z
        .boolean()
        .optional()
        .describe(
          'Defaults to true: changes affect existing subscriptions. Set false to apply only to future subscriptions.'
        ),
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
  .output(updatePlanOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    await client.updatePlan(ctx.input.planIdOrCode, ctx.input);
    const output = { success: true };
    return {
      output: validateOutput(updatePlanOutput, output),
      message:
        'Plan update confirmed. Existing subscriptions are affected unless updateExistingSubscriptions is false.'
    };
  })
  .build();
