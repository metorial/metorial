import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalNumber,
  optionalString,
  readEntity,
  requireId
} from '../lib/client';
import { spec } from '../spec';

export let getExpense = SlateTool.create(spec, {
  key: 'get_expense',
  name: 'Get Expense',
  description:
    'Retrieve an expense by ID, including its amount, currency, seller, date, and original data. Use list_expenses to find expense IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ expenseId: z.string().describe('Expense ID from list_expenses') }))
  .output(
    z.object({
      expenseId: z.string(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      sellerName: z.string().optional(),
      date: z.string().optional(),
      expense: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let expense = readEntity(
      await new FinmeiClient(ctx.auth.token).getExpense(ctx.input.expenseId),
      'expense'
    );
    let expenseId = requireId(expense.id, 'expense ID');
    return {
      output: {
        expenseId,
        expense,
        ...pickDefined({
          amount: optionalNumber(expense.total, 'expense total'),
          currency: optionalString(expense.currency, 'expense currency'),
          sellerName: optionalString(expense.seller, 'expense seller'),
          date: optionalString(expense.date, 'expense date')
        })
      },
      message: `Retrieved expense \`${expenseId}\`.`
    };
  })
  .build();
