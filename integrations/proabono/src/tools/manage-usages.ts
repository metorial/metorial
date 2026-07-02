import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let usageSchema = z.object({
  referenceFeature: z.string().optional().describe('Feature reference'),
  referenceCustomer: z.string().optional().describe('Customer reference'),
  subscriptionId: z.number().optional().describe('Subscription ID'),
  quantityIncluded: z.number().optional().describe('Quota allocated in subscription'),
  quantityCurrent: z.number().optional().describe('Amount consumed/used'),
  isIncluded: z.boolean().optional().describe('Whether feature is included'),
  isEnabled: z.boolean().optional().describe('Whether feature is enabled (OnOff)'),
  datePeriodStart: z.string().optional().describe('Billing period start date'),
  datePeriodEnd: z.string().optional().describe('Billing period end date')
});

let batchItemSchema = z.object({
  referenceFeature: z.string().describe('Feature reference'),
  referenceCustomer: z.string().optional().describe('Customer reference'),
  subscriptionId: z.number().optional().describe('Subscription ID'),
  increment: z.number().optional().describe('Increment value (Consumption features)'),
  quantityCurrent: z
    .number()
    .optional()
    .describe('Set absolute quantity (Limitation features)'),
  isEnabled: z.boolean().optional().describe('Enable/disable (OnOff features)'),
  dateStamp: z.string().optional().describe('Timestamp for the usage event (ISO 8601)')
});

export let manageUsages = SlateTool.create(spec, {
  name: 'Manage Usages',
  key: 'manage_usages',
  description: `Track and update feature usage for customers. Supports three feature types:
- **OnOff**: Toggle features on/off with isEnabled.
- **Limitation**: Set absolute quantity with quantityCurrent.
- **Consumption**: Increment usage with increment (resets at renewal).

Can retrieve all usages for a customer, update a single feature, or batch update up to 50 features at once.`,
  instructions: [
    'Use "get" to check a single feature usage for a customer.',
    'Use "list" to retrieve all feature usages for a customer or all customers using a feature.',
    'Use "update" for single feature updates; use "batch_update" for bulk operations.',
    'Set ensureBillable=true to verify the customer has a valid payment method before updating.'
  ],
  constraints: ['Batch updates are limited to 50 items per request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'list', 'update', 'batch_update']).describe('Action to perform'),
      referenceFeature: z.string().optional().describe('Feature reference'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      subscriptionId: z.number().optional().describe('ProAbono subscription ID'),
      increment: z.number().optional().describe('Increment value for Consumption features'),
      quantityCurrent: z
        .number()
        .optional()
        .describe('Set absolute quantity for Limitation features'),
      isEnabled: z.boolean().optional().describe('Enable/disable for OnOff features'),
      dateStamp: z.string().optional().describe('Timestamp for the usage event (ISO 8601)'),
      ensureBillable: z.boolean().optional().describe('Verify payment method before updating'),
      batchItems: z
        .array(batchItemSchema)
        .optional()
        .describe('Array of usage updates for batch_update (max 50)'),
      page: z.number().optional().describe('Page number for list action'),
      sizePage: z.number().optional().describe('Items per page for list action')
    })
  )
  .output(
    z.object({
      usage: usageSchema.optional().describe('Single usage result'),
      usages: z.array(usageSchema).optional().describe('List of usages'),
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

    if (action === 'get') {
      if (!ctx.input.referenceFeature) throw new Error('referenceFeature is required for get');
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for get');
      let result = await client.getUsage(
        ctx.input.referenceFeature,
        ctx.input.referenceCustomer
      );
      let usage = mapUsage(result);
      return {
        output: { usage },
        message: `Feature **${usage.referenceFeature}** for customer **${usage.referenceCustomer}**: quantity ${usage.quantityCurrent ?? 0}/${usage.quantityIncluded ?? '∞'}, enabled: ${usage.isEnabled ?? 'n/a'}`
      };
    }

    if (action === 'list') {
      let result = await client.listUsages({
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceFeature: ctx.input.referenceFeature,
        Page: ctx.input.page,
        SizePage: ctx.input.sizePage
      });
      let items = result?.Items || [];
      let usages = items.map(mapUsage);
      return {
        output: {
          usages,
          totalItems: result?.TotalItems,
          page: result?.Page
        },
        message: `Found **${usages.length}** usage records (total: ${result?.TotalItems || 0})`
      };
    }

    if (action === 'update') {
      if (!ctx.input.referenceFeature)
        throw new Error('referenceFeature is required for update');
      let result = await client.updateUsage({
        ReferenceFeature: ctx.input.referenceFeature,
        ReferenceCustomer: ctx.input.referenceCustomer,
        IdSubscription: ctx.input.subscriptionId,
        Increment: ctx.input.increment,
        QuantityCurrent: ctx.input.quantityCurrent,
        IsEnabled: ctx.input.isEnabled,
        DateStamp: ctx.input.dateStamp,
        EnsureBillable: ctx.input.ensureBillable
      });
      let usage = mapUsage(result);
      return {
        output: { usage },
        message: `Updated usage for feature **${usage.referenceFeature}**: quantity ${usage.quantityCurrent ?? 0}, enabled: ${usage.isEnabled ?? 'n/a'}`
      };
    }

    if (action === 'batch_update') {
      if (!ctx.input.batchItems || ctx.input.batchItems.length === 0) {
        throw new Error('batchItems is required for batch_update');
      }
      if (ctx.input.batchItems.length > 50) {
        throw new Error('Batch updates are limited to 50 items per request');
      }
      let items = ctx.input.batchItems.map(item => ({
        ReferenceFeature: item.referenceFeature,
        ReferenceCustomer: item.referenceCustomer,
        IdSubscription: item.subscriptionId,
        Increment: item.increment,
        QuantityCurrent: item.quantityCurrent,
        IsEnabled: item.isEnabled,
        DateStamp: item.dateStamp
      }));
      let result = await client.batchUpdateUsages(items);
      let usages = Array.isArray(result)
        ? result.map(mapUsage)
        : (result?.Items || []).map(mapUsage);
      return {
        output: { usages },
        message: `Batch updated **${usages.length}** feature usages`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapUsage = (raw: any) => ({
  referenceFeature: raw?.ReferenceFeature,
  referenceCustomer: raw?.ReferenceCustomer,
  subscriptionId: raw?.IdSubscription,
  quantityIncluded: raw?.QuantityIncluded,
  quantityCurrent: raw?.QuantityCurrent,
  isIncluded: raw?.IsIncluded,
  isEnabled: raw?.IsEnabled,
  datePeriodStart: raw?.DatePeriodStart,
  datePeriodEnd: raw?.DatePeriodEnd
});
