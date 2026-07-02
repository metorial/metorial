import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let newExpense = SlateTrigger.create(spec, {
  name: 'New Expense',
  key: 'new_expense',
  description:
    'Triggers when a new expense is recorded in Finmei. Polls the expenses list and detects newly added expenses.'
})
  .input(
    z.object({
      expenseId: z.string().describe('Expense ID'),
      date: z.string().optional().describe('Expense date'),
      amount: z.number().optional().describe('Expense amount'),
      currency: z.string().optional().describe('Currency code'),
      sellerName: z.string().optional().describe('Seller/vendor name'),
      description: z.string().optional().describe('Expense description'),
      category: z.string().optional().describe('Expense category')
    })
  )
  .output(
    z.object({
      expenseId: z.string().describe('Expense ID'),
      date: z.string().optional().describe('Expense date'),
      amount: z.number().optional().describe('Expense amount'),
      currency: z.string().optional().describe('Currency code'),
      sellerName: z.string().optional().describe('Seller or vendor name'),
      description: z.string().optional().describe('Expense description'),
      category: z.string().optional().describe('Expense category')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FinmeiClient(ctx.auth.token);

      let state = ctx.state as { knownExpenseIds?: string[] } | null;
      let knownExpenseIds = new Set(state?.knownExpenseIds ?? []);

      let result = await client.listExpenses({ page: 1, per_page: 100 });
      let rawExpenses = result?.data ?? result?.expenses ?? result ?? [];
      let expensesArray = Array.isArray(rawExpenses) ? rawExpenses : [];

      let inputs: Array<{
        expenseId: string;
        date?: string;
        amount?: number;
        currency?: string;
        sellerName?: string;
        description?: string;
        category?: string;
      }> = [];

      let allIds: string[] = [];

      for (let e of expensesArray) {
        let id = String(e.id);
        allIds.push(id);

        if (knownExpenseIds.size > 0 && !knownExpenseIds.has(id)) {
          inputs.push({
            expenseId: id,
            date: e.date,
            amount: e.amount ?? e.price,
            currency: e.currency,
            sellerName: e.seller_name ?? e.seller,
            description: e.description,
            category: e.category
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownExpenseIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'expense.created',
        id: `expense-${ctx.input.expenseId}`,
        output: {
          expenseId: ctx.input.expenseId,
          date: ctx.input.date,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          sellerName: ctx.input.sellerName,
          description: ctx.input.description,
          category: ctx.input.category
        }
      };
    }
  })
  .build();
