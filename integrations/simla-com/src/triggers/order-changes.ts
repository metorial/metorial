import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderChanges = SlateTrigger.create(spec, {
  name: 'Order Changes',
  key: 'order_changes',
  description:
    'Triggered when orders are created, updated, or have status changes. Uses the incremental history API with sinceId-based polling to track all order modifications.'
})
  .input(
    z.object({
      changeId: z.number().describe('History record ID'),
      changeType: z
        .string()
        .describe('Type of change (created, updated, status_changed, combined, etc.)'),
      orderId: z.number().optional().describe('Internal order ID'),
      orderExternalId: z.string().optional().describe('External order ID'),
      field: z.string().optional().describe('Changed field name'),
      oldValue: z.any().optional().describe('Previous value'),
      newValue: z.any().optional().describe('New value'),
      source: z.string().optional().describe('Change source (api, user, rule, etc.)'),
      createdAt: z.string().optional().describe('When the change occurred'),
      order: z
        .record(z.string(), z.any())
        .optional()
        .describe('Order snapshot at time of change')
    })
  )
  .output(
    z.object({
      orderId: z.number().optional().describe('Internal order ID'),
      orderExternalId: z.string().optional().describe('External order ID'),
      orderNumber: z.string().optional().describe('Order number'),
      field: z.string().optional().describe('Changed field name'),
      oldValue: z.any().optional().describe('Previous value'),
      newValue: z.any().optional().describe('New value'),
      source: z.string().optional().describe('Change source'),
      status: z.string().optional().describe('Current order status'),
      createdAt: z.string().optional().describe('When the change occurred'),
      isNewOrder: z.boolean().describe('Whether this is a newly created order')
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

      let result = await client.getOrdersHistory(filter, undefined, 100);

      let newLastSinceId = lastSinceId;
      if (result.history.length > 0) {
        let lastEntry = result.history[result.history.length - 1]!;
        if (lastEntry.id && (!newLastSinceId || lastEntry.id > newLastSinceId)) {
          newLastSinceId = lastEntry.id;
        }
      }

      // If there are multiple pages, fetch remaining
      let allHistory = [...result.history];
      if (result.pagination && result.pagination.totalPageCount > 1) {
        for (let page = 2; page <= result.pagination.totalPageCount; page++) {
          let pageResult = await client.getOrdersHistory(filter, page, 100);
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
        else if (entry.field === 'status') changeType = 'status_changed';
        else if (entry.source === 'combine') changeType = 'combined';

        return {
          changeId: entry.id!,
          changeType,
          orderId: entry.order?.id,
          orderExternalId: entry.order?.externalId,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          source: entry.source,
          createdAt: entry.createdAt,
          order: entry.order
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
          ? 'order.created'
          : ctx.input.changeType === 'deleted'
            ? 'order.deleted'
            : ctx.input.changeType === 'status_changed'
              ? 'order.status_changed'
              : ctx.input.changeType === 'combined'
                ? 'order.combined'
                : 'order.updated';

      return {
        type: eventType,
        id: String(ctx.input.changeId),
        output: {
          orderId: ctx.input.orderId,
          orderExternalId: ctx.input.orderExternalId,
          orderNumber: ctx.input.order?.number as string | undefined,
          field: ctx.input.field,
          oldValue: ctx.input.oldValue,
          newValue: ctx.input.newValue,
          source: ctx.input.source,
          status: ctx.input.order?.status as string | undefined,
          createdAt: ctx.input.createdAt,
          isNewOrder: ctx.input.changeType === 'created'
        }
      };
    }
  })
  .build();
