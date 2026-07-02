import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { spec } from '../spec';

export let upsertSubscription = SlateTool.create(spec, {
  name: 'Create or Update Subscription',
  key: 'upsert_subscription',
  description: `Creates a new subscription or updates an existing one for a contact in SegMetrics. If the subscription ID already exists, it will be updated.
Adding a subscription does **not** automatically create an associated order — that must be done separately using the Create or Update Order tool.
All monetary amounts are specified in **cents**.`,
  instructions: [
    'Provide either contactId or email to identify the contact.',
    'If contactId is used, the contact must already exist. Use email if the contact may not exist yet.',
    'billingCycle specifies the unit (year, month, week, day) and frequency specifies the count. E.g., billingCycle="month" + frequency=3 = every 3 months.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('Unique identifier for the subscription.'),
      contactId: z
        .string()
        .optional()
        .describe('The contact ID. Contact must already exist if using this field.'),
      email: z.string().optional().describe('Email address of the contact.'),
      amount: z.number().describe('Subscription amount in cents.'),
      productId: z.string().describe('Product ID the subscription applies to.'),
      productName: z
        .string()
        .optional()
        .describe('Name of the product. If the product does not exist, it will be created.'),
      quantity: z.number().optional().describe('Quantity of the subscription.'),
      startDate: z.string().describe('Date the subscription started (YYYY-MM-DD HH:MM:SS).'),
      lastBillDate: z
        .string()
        .optional()
        .describe('Date the subscription was last billed (YYYY-MM-DD HH:MM:SS).'),
      billingCycle: z.enum(['year', 'month', 'week', 'day']).describe('Billing cycle unit.'),
      frequency: z.number().describe('Number of billing cycle intervals between billings.'),
      trialStart: z
        .string()
        .optional()
        .describe('Trial period start date (YYYY-MM-DD HH:MM:SS).'),
      trialEnd: z.string().optional().describe('Trial period end date (YYYY-MM-DD HH:MM:SS).'),
      cancellationDate: z
        .string()
        .optional()
        .describe('Date the subscription was cancelled (YYYY-MM-DD HH:MM:SS).'),
      endDate: z
        .string()
        .optional()
        .describe('Date the subscription ends (YYYY-MM-DD HH:MM:SS).')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      integrationId: ctx.config.integrationId!
    });

    let body: Record<string, unknown> = {
      id: ctx.input.subscriptionId,
      amount: ctx.input.amount,
      product_id: ctx.input.productId,
      start_date: ctx.input.startDate,
      billing_cycle: ctx.input.billingCycle,
      frequency: ctx.input.frequency
    };

    if (ctx.input.contactId) body.contact_id = ctx.input.contactId;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.productName) body.product_name = ctx.input.productName;
    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.lastBillDate) body.last_bill_date = ctx.input.lastBillDate;
    if (ctx.input.trialStart) body.trial_start = ctx.input.trialStart;
    if (ctx.input.trialEnd) body.trial_end = ctx.input.trialEnd;
    if (ctx.input.cancellationDate) body.cancellation_date = ctx.input.cancellationDate;
    if (ctx.input.endDate) body.end_date = ctx.input.endDate;

    let response = await client.upsertSubscription(body);

    return {
      output: {
        success: true,
        response
      },
      message: `Subscription **${ctx.input.subscriptionId}** has been created or updated for contact **${ctx.input.email || ctx.input.contactId}**.`
    };
  })
  .build();
