import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let subscriptionFeatureSchema = z
  .object({
    referenceFeature: z.string().optional(),
    titleLocalized: z.string().optional(),
    isEnabled: z.boolean().optional(),
    isIncluded: z.boolean().optional(),
    quantityIncluded: z.number().optional(),
    quantityCurrent: z.number().optional()
  })
  .describe('Feature included in subscription');

let subscriptionSchema = z.object({
  subscriptionId: z.number().optional().describe('ProAbono internal subscription ID'),
  referenceSubscription: z.string().optional().describe('Subscription reference'),
  referenceCustomer: z.string().optional().describe('Customer reference'),
  referenceOffer: z.string().optional().describe('Offer reference'),
  status: z
    .string()
    .optional()
    .describe('Functional status (Draft, Active, Suspended, Ended, Deleted)'),
  stateSubscription: z.string().optional().describe('Technical state'),
  dateStart: z.string().optional().describe('Subscription start date'),
  dateRenewal: z.string().optional().describe('Next renewal date'),
  dateTermination: z.string().optional().describe('Termination date if set'),
  currency: z.string().optional().describe('Billing currency'),
  amountRecurrence: z.number().optional().describe('Recurring amount in cents'),
  durationRecurrence: z.number().optional().describe('Recurrence duration'),
  unitRecurrence: z.string().optional().describe('Recurrence unit (Day, Month, Year)'),
  features: z.array(subscriptionFeatureSchema).optional().describe('Subscription features'),
  metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
  links: z.array(z.any()).optional().describe('Navigation links')
});

export let manageSubscriptions = SlateTool.create(spec, {
  name: 'Manage Subscriptions',
  key: 'manage_subscriptions',
  description: `Create, retrieve, start, suspend, upgrade, terminate, or list subscriptions in ProAbono.
Subscriptions tie a customer to an offer and define the billing lifecycle.
Supports overriding trial periods, pricing, features, and scheduling future or backdated starts.`,
  instructions: [
    'Use "create" with a referenceCustomer and referenceOffer to create a new subscription.',
    'Use "terminate" with atRenewal=true to terminate at end of current period, or false for immediate termination.',
    'Use "upgrade" to move a customer to a higher-tier offer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'list',
          'start',
          'suspend',
          'upgrade',
          'terminate',
          'update_term_date'
        ])
        .describe('Action to perform'),
      referenceCustomer: z.string().optional().describe('Customer identifier'),
      referenceOffer: z
        .string()
        .optional()
        .describe('Offer reference (required for create and upgrade)'),
      referenceSubscription: z.string().optional().describe('Subscription reference'),
      subscriptionId: z.number().optional().describe('ProAbono subscription ID'),
      referenceSegment: z.string().optional().describe('Segment reference'),
      dateStart: z.string().optional().describe('Subscription start date (ISO 8601)'),
      dateTerm: z
        .string()
        .optional()
        .describe('New term date for update_term_date action (ISO 8601)'),
      atRenewal: z
        .boolean()
        .optional()
        .describe('For terminate: true to end at renewal, false for immediate'),
      status: z.string().optional().describe('Filter by status for list action'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
      overrides: z
        .record(z.string(), z.any())
        .optional()
        .describe('Override parameters for subscription creation (trial, pricing, features)'),
      page: z.number().optional().describe('Page number for list action'),
      sizePage: z.number().optional().describe('Items per page for list action')
    })
  )
  .output(
    z.object({
      subscription: subscriptionSchema.optional().describe('Subscription details'),
      subscriptions: z.array(subscriptionSchema).optional().describe('List of subscriptions'),
      totalItems: z.number().optional().describe('Total items for list'),
      page: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for create');
      if (!ctx.input.referenceOffer) throw new Error('referenceOffer is required for create');
      let data: Record<string, any> = {
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceOffer: ctx.input.referenceOffer,
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        DateStart: ctx.input.dateStart,
        Metadata: ctx.input.metadata,
        ...(ctx.input.overrides || {})
      };
      let result = await client.createSubscription(data);
      let subscription = mapSubscription(result);
      return {
        output: { subscription },
        message: `Created subscription **${subscription.referenceSubscription || subscription.subscriptionId}** for customer **${ctx.input.referenceCustomer}**`
      };
    }

    if (action === 'get') {
      let result = await client.getSubscription({
        ReferenceSubscription: ctx.input.referenceSubscription,
        ReferenceCustomer: ctx.input.referenceCustomer,
        IdSubscription: ctx.input.subscriptionId
      });
      let subscription = mapSubscription(result);
      return {
        output: { subscription },
        message: `Retrieved subscription **${subscription.referenceSubscription || subscription.subscriptionId}** (status: ${subscription.status})`
      };
    }

    if (action === 'list') {
      let result = await client.listSubscriptions({
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        Status: ctx.input.status,
        Page: ctx.input.page,
        SizePage: ctx.input.sizePage
      });
      let items = result?.Items || [];
      let subscriptions = items.map(mapSubscription);
      return {
        output: {
          subscriptions,
          totalItems: result?.TotalItems,
          page: result?.Page
        },
        message: `Found **${subscriptions.length}** subscriptions (total: ${result?.TotalItems || 0})`
      };
    }

    if (action === 'start') {
      let result = await client.startSubscription({
        ReferenceSubscription: ctx.input.referenceSubscription,
        IdSubscription: ctx.input.subscriptionId,
        ReferenceCustomer: ctx.input.referenceCustomer
      });
      let subscription = mapSubscription(result);
      return {
        output: { subscription },
        message: `Started subscription **${subscription.referenceSubscription || subscription.subscriptionId}**`
      };
    }

    if (action === 'suspend') {
      let result = await client.suspendSubscription({
        ReferenceSubscription: ctx.input.referenceSubscription,
        IdSubscription: ctx.input.subscriptionId,
        ReferenceCustomer: ctx.input.referenceCustomer
      });
      let subscription = mapSubscription(result);
      return {
        output: { subscription },
        message: `Suspended subscription **${subscription.referenceSubscription || subscription.subscriptionId}**`
      };
    }

    if (action === 'upgrade') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for upgrade');
      if (!ctx.input.referenceOffer) throw new Error('referenceOffer is required for upgrade');
      let data: Record<string, any> = {
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceOffer: ctx.input.referenceOffer,
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        ...(ctx.input.overrides || {})
      };
      let result = await client.upgradeSubscription(data);
      let subscription = mapSubscription(result);
      return {
        output: { subscription },
        message: `Upgraded customer **${ctx.input.referenceCustomer}** to offer **${ctx.input.referenceOffer}**`
      };
    }

    if (action === 'terminate') {
      let result = await client.terminateSubscription({
        ReferenceSubscription: ctx.input.referenceSubscription,
        IdSubscription: ctx.input.subscriptionId,
        ReferenceCustomer: ctx.input.referenceCustomer,
        AtRenewal: ctx.input.atRenewal
      });
      let subscription = mapSubscription(result);
      return {
        output: { subscription },
        message: `Terminated subscription **${subscription.referenceSubscription || subscription.subscriptionId}**${ctx.input.atRenewal ? ' (effective at renewal)' : ' (immediate)'}`
      };
    }

    if (action === 'update_term_date') {
      let result = await client.updateSubscriptionTermDate({
        ReferenceSubscription: ctx.input.referenceSubscription,
        IdSubscription: ctx.input.subscriptionId,
        DateTerm: ctx.input.dateTerm
      });
      let subscription = mapSubscription(result);
      return {
        output: { subscription },
        message: `Updated term date for subscription **${subscription.referenceSubscription || subscription.subscriptionId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapSubscription = (raw: any) => ({
  subscriptionId: raw?.Id,
  referenceSubscription: raw?.ReferenceSubscription,
  referenceCustomer: raw?.ReferenceCustomer,
  referenceOffer: raw?.ReferenceOffer,
  status: raw?.Status,
  stateSubscription: raw?.StateSubscription,
  dateStart: raw?.DateStart,
  dateRenewal: raw?.DateRenewal,
  dateTermination: raw?.DateTermination,
  currency: raw?.Currency,
  amountRecurrence: raw?.AmountRecurrence,
  durationRecurrence: raw?.DurationRecurrence,
  unitRecurrence: raw?.UnitRecurrence,
  features: raw?.Features?.map((f: any) => ({
    referenceFeature: f?.ReferenceFeature,
    titleLocalized: f?.TitleLocalized,
    isEnabled: f?.IsEnabled,
    isIncluded: f?.IsIncluded,
    quantityIncluded: f?.QuantityIncluded,
    quantityCurrent: f?.QuantityCurrent
  })),
  metadata: raw?.Metadata,
  links: raw?.Links
});
