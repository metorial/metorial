import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newExpense = SlateTrigger.create(spec, {
  name: 'New Expense',
  key: 'new_expense',
  description:
    'Triggers when a new expense is created in Zoho Invoice. Polls for recently created expenses.'
})
  .input(
    z.object({
      expenseId: z.string(),
      date: z.string().optional(),
      accountName: z.string().optional(),
      description: z.string().optional(),
      currencyCode: z.string().optional(),
      total: z.number().optional(),
      status: z.string().optional(),
      customerName: z.string().optional(),
      customerId: z.string().optional(),
      createdTime: z.string()
    })
  )
  .output(
    z.object({
      expenseId: z.string(),
      date: z.string().optional(),
      accountName: z.string().optional(),
      description: z.string().optional(),
      currencyCode: z.string().optional(),
      total: z.number().optional(),
      status: z.string().optional(),
      customerName: z.string().optional(),
      customerId: z.string().optional(),
      createdTime: z.string()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId,
        region: ctx.auth.region
      });

      let state = ctx.state as { lastCreatedTime?: string } | null;
      let lastCreatedTime = state?.lastCreatedTime;

      let result = await client.listExpenses({
        sort_column: 'created_time',
        sort_order: 'D',
        per_page: 25
      });

      let expenses = result.expenses ?? [];
      let inputs: any[] = [];
      let newestCreatedTime = lastCreatedTime;

      for (let exp of expenses) {
        let createdTime = exp.created_time;
        if (!createdTime) continue;
        if (lastCreatedTime && createdTime <= lastCreatedTime) continue;

        inputs.push({
          expenseId: exp.expense_id,
          date: exp.date,
          accountName: exp.account_name,
          description: exp.description,
          currencyCode: exp.currency_code,
          total: exp.total,
          status: exp.status,
          customerName: exp.customer_name,
          customerId: exp.customer_id,
          createdTime
        });

        if (!newestCreatedTime || createdTime > newestCreatedTime) {
          newestCreatedTime = createdTime;
        }
      }

      return {
        inputs,
        updatedState: {
          lastCreatedTime: newestCreatedTime || lastCreatedTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'expense.created',
        id: ctx.input.expenseId,
        output: {
          expenseId: ctx.input.expenseId,
          date: ctx.input.date,
          accountName: ctx.input.accountName,
          description: ctx.input.description,
          currencyCode: ctx.input.currencyCode,
          total: ctx.input.total,
          status: ctx.input.status,
          customerName: ctx.input.customerName,
          customerId: ctx.input.customerId,
          createdTime: ctx.input.createdTime
        }
      };
    }
  })
  .build();
