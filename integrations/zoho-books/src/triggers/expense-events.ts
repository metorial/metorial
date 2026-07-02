import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let expenseEventsTrigger = SlateTrigger.create(spec, {
  name: 'Expense Events',
  key: 'expense_events',
  description: 'Polls for new or updated expenses. Detects expense creation and modifications.'
})
  .input(
    z.object({
      expenseId: z.string(),
      eventType: z.string(),
      date: z.string().optional(),
      accountName: z.string().optional(),
      description: z.string().optional(),
      total: z.number().optional(),
      currencyCode: z.string().optional(),
      status: z.string().optional(),
      vendorName: z.string().optional(),
      customerName: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .output(
    z.object({
      expenseId: z.string(),
      date: z.string().optional(),
      accountName: z.string().optional(),
      description: z.string().optional(),
      total: z.number().optional(),
      currencyCode: z.string().optional(),
      status: z.string().optional(),
      vendorName: z.string().optional(),
      customerName: z.string().optional(),
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
      let knownExpenses = (ctx.state?.knownExpenses || {}) as Record<string, boolean>;

      let query: Record<string, any> = {
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 200
      };

      if (lastPollTime) {
        query.last_modified_time = lastPollTime;
      }

      let resp = await client.listExpenses(query);
      let expenses = resp.expenses || [];
      let inputs: any[] = [];
      let newKnownExpenses = { ...knownExpenses };

      for (let e of expenses) {
        let isKnown = knownExpenses[e.expense_id];
        let eventType = isKnown ? 'updated' : 'created';

        inputs.push({
          expenseId: e.expense_id,
          eventType,
          date: e.date,
          accountName: e.account_name,
          description: e.description,
          total: e.total,
          currencyCode: e.currency_code,
          status: e.status,
          vendorName: e.vendor_name,
          customerName: e.customer_name,
          lastModifiedTime: e.last_modified_time
        });

        newKnownExpenses[e.expense_id] = true;
      }

      let newPollTime = expenses.length > 0 ? expenses[0].last_modified_time : lastPollTime;

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownExpenses: newKnownExpenses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `expense.${ctx.input.eventType}`,
        id: `${ctx.input.expenseId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          expenseId: ctx.input.expenseId,
          date: ctx.input.date,
          accountName: ctx.input.accountName,
          description: ctx.input.description,
          total: ctx.input.total,
          currencyCode: ctx.input.currencyCode,
          status: ctx.input.status,
          vendorName: ctx.input.vendorName,
          customerName: ctx.input.customerName,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
