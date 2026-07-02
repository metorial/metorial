import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let salesOrderChanges = SlateTrigger.create(spec, {
  name: 'Sales Order Changes',
  key: 'sales_order_changes',
  description: 'Triggers when sales orders are created or updated in ForceManager.'
})
  .input(
    z.object({
      salesOrderId: z.number().describe('Sales order ID'),
      record: z.any().describe('Full sales order record'),
      detectedAt: z.string().describe('Timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      salesOrderId: z.number().describe('Sales order ID'),
      reference: z.string().nullable().describe('Order reference'),
      total: z.number().nullable().describe('Order total'),
      statusId: z.any().nullable().describe('Order status'),
      accountId: z.any().nullable().describe('Associated account'),
      salesRepId: z.any().nullable().describe('Sales rep'),
      salesForecastDate: z.string().nullable().describe('Expected closing date'),
      closedDate: z.string().nullable().describe('Actual closing date'),
      dateCreated: z.string().nullable().describe('Record creation date'),
      dateUpdated: z.string().nullable().describe('Record last update date'),
      record: z.any().describe('Full sales order record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth);
      let lastPollTime = ctx.state?.lastPollTime || new Date().toISOString().replace('Z', '');

      let allRecords: any[] = [];
      let page: number | undefined = 0;
      let maxPages = 10;

      while (page !== undefined && page !== null && maxPages > 0) {
        let result = await client.listModifiedSince('salesorder', lastPollTime, page);
        allRecords.push(...result.records);
        page = result.nextPage !== null ? result.nextPage : undefined;
        maxPages--;
      }

      let now = new Date().toISOString().replace('Z', '');

      return {
        inputs: allRecords.map(record => ({
          salesOrderId: record.id,
          record,
          detectedAt: now
        })),
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let record = ctx.input.record;
      let isNew = record.dateCreated === record.dateUpdated;

      return {
        type: isNew ? 'sales_order.created' : 'sales_order.updated',
        id: `salesorder-${ctx.input.salesOrderId}-${ctx.input.detectedAt}`,
        output: {
          salesOrderId: ctx.input.salesOrderId,
          reference: record.reference || null,
          total: record.total ?? null,
          statusId: record.statusId || null,
          accountId: record.accountId || null,
          salesRepId: record.salesRepId || null,
          salesForecastDate: record.salesForecastDate || null,
          closedDate: record.closedDate || null,
          dateCreated: record.dateCreated || null,
          dateUpdated: record.dateUpdated || null,
          record
        }
      };
    }
  })
  .build();
