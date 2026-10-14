import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Create a new expense record in Elorus. Expenses can be linked to projects and marked as billable for later inclusion in client invoices.`
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      title: z.string().describe('Title or description of the expense.'),
      amount: z.string().describe('Expense amount (as string, e.g. "150.00").'),
      date: z.string().optional().describe('Expense date (YYYY-MM-DD). Defaults to today.'),
      currencyCode: z.string().optional().describe('Currency code (e.g. "EUR").'),
      projectId: z.string().optional().describe('Project ID to link this expense to.'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether this expense is billable to a client.'),
      customId: z.string().optional().describe('Custom external identifier (API-only).')
    })
  )
  .output(
    z.object({
      expense: z.any().describe('The newly created expense object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    let body: any = {
      calculator_mode: 'total',
      items: [
        {
          description: ctx.input.title,
          amount: ctx.input.amount,
          project: ctx.input.projectId,
          billable: ctx.input.billable
        }
      ]
    };
    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.currencyCode) body.currency_code = ctx.input.currencyCode;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let expense = await client.createExpense(body);

    return {
      output: { expense },
      message: `Created expense: **${expense.title || ctx.input.title}** — ${expense.total} ${expense.currency_code || ''}`
    };
  })
  .build();
