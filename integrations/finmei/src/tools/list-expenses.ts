import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalNumber,
  optionalString,
  optionalTimestamp,
  pagination,
  readList,
  requireId
} from '../lib/client';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Retrieve a paginated list of expense records from Finmei. Use this to review logged business expenses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (1-based)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of expenses per page (the provider may use a fixed page size)')
    })
  )
  .output(
    z.object({
      expenses: z
        .array(
          z.object({
            expenseId: z.string().describe('Expense ID'),
            date: z.string().optional().describe('Expense date'),
            amount: z.number().optional().describe('Expense amount'),
            currency: z.string().optional().describe('Currency code'),
            sellerName: z.string().optional().describe('Seller/vendor name'),
            description: z.string().optional().describe('Expense description'),
            category: z.string().optional().describe('Expense category'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of expenses'),
      rawResponse: z.any().optional().describe('Complete provider response'),
      total: z.number().optional().describe('Total number of expenses'),
      page: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listExpenses({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let expenses = readList(result, 'expenses').map(e => ({
      expenseId: requireId(e.id, 'expense ID'),
      ...pickDefined({
        date: optionalString(e.date, 'expense date'),
        amount: optionalNumber(e.total ?? e.amount ?? e.price, 'expense amount'),
        currency: optionalString(e.currency, 'expense currency'),
        sellerName: optionalString(e.seller ?? e.seller_name, 'expense seller'),
        description: optionalString(e.description, 'expense description'),
        category: optionalString(e.category, 'expense category'),
        createdAt: optionalTimestamp(e.created_at, 'expense creation time')
      })
    }));

    let metadata = pagination(result);
    return {
      output: {
        expenses,
        ...metadata,
        rawResponse: result
      },
      message: `Found **${expenses.length}** expense(s)${metadata.total !== undefined ? ` out of ${metadata.total} total` : ''}.`
    };
  })
  .build();
