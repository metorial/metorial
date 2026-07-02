import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let customerChanges = SlateTrigger.create(spec, {
  name: 'Customer Changes',
  key: 'customer_changes',
  description:
    'Triggered when customers are created, updated, merged, or have segment changes. Uses the incremental history API with sinceId-based polling to track all customer modifications.'
})
  .input(
    z.object({
      changeId: z.number().describe('History record ID'),
      changeType: z.string().describe('Type of change (created, updated, combined, etc.)'),
      customerId: z.number().optional().describe('Internal customer ID'),
      customerExternalId: z.string().optional().describe('External customer ID'),
      field: z.string().optional().describe('Changed field name'),
      oldValue: z.any().optional().describe('Previous value'),
      newValue: z.any().optional().describe('New value'),
      source: z.string().optional().describe('Change source (api, user, rule, etc.)'),
      createdAt: z.string().optional().describe('When the change occurred'),
      customer: z
        .record(z.string(), z.any())
        .optional()
        .describe('Customer snapshot at time of change')
    })
  )
  .output(
    z.object({
      customerId: z.number().optional().describe('Internal customer ID'),
      customerExternalId: z.string().optional().describe('External customer ID'),
      customerName: z.string().optional().describe('Customer full name'),
      field: z.string().optional().describe('Changed field name'),
      oldValue: z.any().optional().describe('Previous value'),
      newValue: z.any().optional().describe('New value'),
      source: z.string().optional().describe('Change source'),
      createdAt: z.string().optional().describe('When the change occurred'),
      isNewCustomer: z.boolean().describe('Whether this is a newly created customer')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain,
        site: ctx.config.site
      });

      let filter: Record<string, any> = {};
      let lastSinceId = ctx.state?.lastSinceId as number | undefined;

      if (lastSinceId) {
        filter.sinceId = lastSinceId;
      }

      let result = await client.getCustomersHistory(filter, undefined, 100);

      let newLastSinceId = lastSinceId;
      if (result.history.length > 0) {
        let lastEntry = result.history[result.history.length - 1]!;
        if (lastEntry.id && (!newLastSinceId || lastEntry.id > newLastSinceId)) {
          newLastSinceId = lastEntry.id;
        }
      }

      let allHistory = [...result.history];
      if (result.pagination && result.pagination.totalPageCount > 1) {
        for (let page = 2; page <= result.pagination.totalPageCount; page++) {
          let pageResult = await client.getCustomersHistory(filter, page, 100);
          allHistory.push(...pageResult.history);
          if (pageResult.history.length > 0) {
            let last = pageResult.history[pageResult.history.length - 1]!;
            if (last.id && (!newLastSinceId || last.id > newLastSinceId)) {
              newLastSinceId = last.id;
            }
          }
        }
      }

      let inputs = allHistory.map(entry => {
        let changeType = 'updated';
        if (entry.created) changeType = 'created';
        else if (entry.deleted) changeType = 'deleted';
        else if (entry.source === 'combine') changeType = 'combined';

        return {
          changeId: entry.id!,
          changeType,
          customerId: entry.customer?.id,
          customerExternalId: entry.customer?.externalId,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          source: entry.source,
          createdAt: entry.createdAt,
          customer: entry.customer as Record<string, any> | undefined
        };
      });

      return {
        inputs,
        updatedState: {
          lastSinceId: newLastSinceId
        }
      };
    },

    handleEvent: async ctx => {
      let eventType =
        ctx.input.changeType === 'created'
          ? 'customer.created'
          : ctx.input.changeType === 'deleted'
            ? 'customer.deleted'
            : ctx.input.changeType === 'combined'
              ? 'customer.combined'
              : 'customer.updated';

      let customerName: string | undefined;
      if (ctx.input.customer) {
        let parts = [
          ctx.input.customer.firstName as string,
          ctx.input.customer.lastName as string
        ].filter(Boolean);
        if (parts.length > 0) customerName = parts.join(' ');
      }

      return {
        type: eventType,
        id: String(ctx.input.changeId),
        output: {
          customerId: ctx.input.customerId,
          customerExternalId: ctx.input.customerExternalId,
          customerName,
          field: ctx.input.field,
          oldValue: ctx.input.oldValue,
          newValue: ctx.input.newValue,
          source: ctx.input.source,
          createdAt: ctx.input.createdAt,
          isNewCustomer: ctx.input.changeType === 'created'
        }
      };
    }
  })
  .build();
