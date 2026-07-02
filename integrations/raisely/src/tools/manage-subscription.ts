import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let manageSubscription = SlateTool.create(spec, {
  name: 'Manage Subscription',
  key: 'manage_subscription',
  description: `Create or update a recurring giving subscription. Create new recurring donation schedules or modify existing ones (change amount, frequency, pause, resume, or cancel).`,
  instructions: [
    'To create, provide campaignUuid along with amount and frequency.',
    'To update, provide subscriptionUuid and the fields to change.',
    'Amount should be in the smallest currency unit (e.g. cents).'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update'])
        .describe('Whether to create a new subscription or update an existing one'),
      campaignUuid: z.string().optional().describe('Campaign UUID (required for create)'),
      subscriptionUuid: z
        .string()
        .optional()
        .describe('Subscription UUID (required for update)'),
      profileUuid: z
        .string()
        .optional()
        .describe('Profile UUID to attribute the subscription to'),
      amount: z
        .number()
        .optional()
        .describe('Recurring amount in smallest currency unit (e.g. cents)'),
      currency: z.string().optional().describe('Currency code (e.g. "AUD", "USD")'),
      frequency: z
        .enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'])
        .optional()
        .describe('Billing frequency'),
      status: z
        .enum(['OK', 'PAUSED', 'CANCELLED'])
        .optional()
        .describe('Subscription status (for update)'),
      email: z.string().optional().describe('Subscriber email address'),
      firstName: z.string().optional().describe('Subscriber first name'),
      lastName: z.string().optional().describe('Subscriber last name'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      subscription: z
        .record(z.string(), z.any())
        .describe('The created/updated subscription object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.campaignUuid) {
        throw new Error('campaignUuid is required for creating a subscription');
      }
      let data: Record<string, any> = {};
      if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
      if (ctx.input.currency) data.currency = ctx.input.currency;
      if (ctx.input.frequency) data.frequency = ctx.input.frequency;
      if (ctx.input.profileUuid) data.profileUuid = ctx.input.profileUuid;
      if (ctx.input.email) data.email = ctx.input.email;
      if (ctx.input.firstName) data.firstName = ctx.input.firstName;
      if (ctx.input.lastName) data.lastName = ctx.input.lastName;
      if (ctx.input.customFields) data.public = ctx.input.customFields;

      let result = await client.createSubscription(ctx.input.campaignUuid, data);
      let subscription = result.data || result;
      return {
        output: { subscription },
        message: `Created recurring subscription of **${ctx.input.amount}** (smallest unit) ${ctx.input.frequency || 'MONTHLY'}.`
      };
    }

    if (!ctx.input.subscriptionUuid) {
      throw new Error('subscriptionUuid is required for updating a subscription');
    }
    let data: Record<string, any> = {};
    if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.frequency) data.frequency = ctx.input.frequency;
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.customFields) data.public = ctx.input.customFields;

    let result = await client.updateSubscription(ctx.input.subscriptionUuid, data);
    let subscription = result.data || result;
    return {
      output: { subscription },
      message: `Updated subscription **${ctx.input.subscriptionUuid}**.`
    };
  })
  .build();
