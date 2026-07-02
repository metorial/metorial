import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let billEventsTrigger = SlateTrigger.create(spec, {
  name: 'Bill Events',
  key: 'bill_events',
  description:
    'Polls for new or updated bills from vendors. Detects bill creation, status changes, and payment updates.'
})
  .input(
    z.object({
      billId: z.string(),
      eventType: z.string(),
      billNumber: z.string().optional(),
      vendorName: z.string().optional(),
      vendorId: z.string().optional(),
      status: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      currencyCode: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .output(
    z.object({
      billId: z.string(),
      billNumber: z.string().optional(),
      vendorName: z.string().optional(),
      vendorId: z.string().optional(),
      status: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      currencyCode: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownBills = (ctx.state?.knownBills || {}) as Record<string, string>;

      let query: Record<string, any> = {
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 200
      };

      if (lastPollTime) {
        query.last_modified_time = lastPollTime;
      }

      let resp = await client.listBills(query);
      let bills = resp.bills || [];
      let inputs: any[] = [];
      let newKnownBills = { ...knownBills };

      for (let b of bills) {
        let lastKnownStatus = knownBills[b.bill_id];
        let eventType = lastKnownStatus ? 'updated' : 'created';

        if (lastKnownStatus !== b.status || !lastKnownStatus) {
          inputs.push({
            billId: b.bill_id,
            eventType,
            billNumber: b.bill_number,
            vendorName: b.vendor_name,
            vendorId: b.vendor_id,
            status: b.status,
            date: b.date,
            dueDate: b.due_date,
            total: b.total,
            balance: b.balance,
            currencyCode: b.currency_code,
            lastModifiedTime: b.last_modified_time
          });
        }

        newKnownBills[b.bill_id] = b.status;
      }

      let newPollTime = bills.length > 0 ? bills[0].last_modified_time : lastPollTime;

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownBills: newKnownBills
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `bill.${ctx.input.eventType}`,
        id: `${ctx.input.billId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          billId: ctx.input.billId,
          billNumber: ctx.input.billNumber,
          vendorName: ctx.input.vendorName,
          vendorId: ctx.input.vendorId,
          status: ctx.input.status,
          date: ctx.input.date,
          dueDate: ctx.input.dueDate,
          total: ctx.input.total,
          balance: ctx.input.balance,
          currencyCode: ctx.input.currencyCode,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
