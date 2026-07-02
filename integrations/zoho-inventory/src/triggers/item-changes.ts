import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let itemChanges = SlateTrigger.create(spec, {
  name: 'Item Changes',
  key: 'item_changes',
  description:
    'Triggers when items are created or updated in Zoho Inventory. Polls for recently modified items.'
})
  .input(
    z.object({
      itemId: z.string().describe('Item ID'),
      name: z.string().describe('Item name'),
      sku: z.string().optional().describe('SKU'),
      rate: z.number().optional().describe('Sales rate'),
      purchaseRate: z.number().optional().describe('Purchase rate'),
      status: z.string().optional().describe('Item status'),
      stockOnHand: z.number().optional().describe('Stock on hand'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Item ID'),
      name: z.string().describe('Item name'),
      sku: z.string().optional().describe('SKU'),
      rate: z.number().optional().describe('Sales rate'),
      purchaseRate: z.number().optional().describe('Purchase rate'),
      status: z.string().optional().describe('Item status'),
      stockOnHand: z.number().optional().describe('Stock on hand'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let result = await client.listItems({
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 25
      });

      let items = result.items || [];
      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let newItems: any[] = [];

      for (let item of items) {
        if (
          lastPolledAt &&
          item.last_modified_time &&
          item.last_modified_time <= lastPolledAt
        ) {
          break;
        }
        newItems.push(item);
      }

      let updatedLastPolled =
        items.length > 0 && items[0].last_modified_time
          ? items[0].last_modified_time
          : lastPolledAt;

      return {
        inputs: newItems.map((item: any) => ({
          itemId: String(item.item_id),
          name: item.name,
          sku: item.sku ?? undefined,
          rate: item.rate ?? undefined,
          purchaseRate: item.purchase_rate ?? undefined,
          status: item.status ?? undefined,
          stockOnHand: item.stock_on_hand ?? undefined,
          lastModifiedTime: item.last_modified_time ?? undefined
        })),
        updatedState: {
          lastPolledAt: updatedLastPolled
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'item.updated',
        id: `item-${ctx.input.itemId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          name: ctx.input.name,
          sku: ctx.input.sku,
          rate: ctx.input.rate,
          purchaseRate: ctx.input.purchaseRate,
          status: ctx.input.status,
          stockOnHand: ctx.input.stockOnHand,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
