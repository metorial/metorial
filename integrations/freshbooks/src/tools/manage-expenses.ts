import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let manageExpenses = SlateTool.create(spec, {
  name: 'Manage Expenses',
  key: 'manage_expenses',
  description: `Create, update, or delete expenses in FreshBooks. Track business expenses with amounts, categories, vendors, taxes, and optional project associations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      expenseId: z.number().optional().describe('Expense ID (required for update/delete)'),
      amount: z.string().optional().describe('Expense amount (e.g. "50.00")'),
      currencyCode: z.string().optional().describe('Three-letter currency code'),
      date: z.string().optional().describe('Expense date (YYYY-MM-DD)'),
      categoryId: z.number().optional().describe('Expense category ID'),
      vendorName: z.string().optional().describe('Vendor/merchant name'),
      clientId: z.number().optional().describe('Client ID to associate expense with'),
      projectId: z.number().optional().describe('Project ID to associate expense with'),
      notes: z.string().optional().describe('Expense notes'),
      taxName1: z.string().optional().describe('First tax name'),
      taxPercent1: z.string().optional().describe('First tax percentage'),
      taxName2: z.string().optional().describe('Second tax name'),
      taxPercent2: z.string().optional().describe('Second tax percentage')
    })
  )
  .output(
    z.object({
      expenseId: z.number(),
      amount: z.any().optional(),
      currencyCode: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
      categoryId: z.number().nullable().optional(),
      vendorName: z.string().nullable().optional(),
      clientId: z.number().nullable().optional(),
      projectId: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
      status: z
        .number()
        .nullable()
        .optional()
        .describe('Expense status (0=internal, 1=outstanding, 2=invoiced, 4=recouped)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.amount !== undefined)
        payload.amount = { amount: ctx.input.amount, code: ctx.input.currencyCode || 'USD' };
      if (ctx.input.currencyCode !== undefined) payload.currency_code = ctx.input.currencyCode;
      if (ctx.input.date !== undefined) payload.date = ctx.input.date;
      if (ctx.input.categoryId !== undefined) payload.categoryid = ctx.input.categoryId;
      if (ctx.input.vendorName !== undefined) payload.vendor = ctx.input.vendorName;
      if (ctx.input.clientId !== undefined) payload.clientid = ctx.input.clientId;
      if (ctx.input.projectId !== undefined) payload.projectid = ctx.input.projectId;
      if (ctx.input.notes !== undefined) payload.notes = ctx.input.notes;
      if (ctx.input.taxName1 !== undefined) payload.taxName1 = ctx.input.taxName1;
      if (ctx.input.taxPercent1 !== undefined) payload.taxPercent1 = ctx.input.taxPercent1;
      if (ctx.input.taxName2 !== undefined) payload.taxName2 = ctx.input.taxName2;
      if (ctx.input.taxPercent2 !== undefined) payload.taxPercent2 = ctx.input.taxPercent2;
      return payload;
    };

    let mapResult = (raw: any) => ({
      expenseId: raw.id || raw.expenseid,
      amount: raw.amount,
      currencyCode: raw.currency_code,
      date: raw.date,
      categoryId: raw.categoryid,
      vendorName: raw.vendor,
      clientId: raw.clientid,
      projectId: raw.projectid,
      notes: raw.notes,
      status: raw.status
    });

    if (ctx.input.action === 'create') {
      let result = await client.createExpense(buildPayload());
      return {
        output: mapResult(result),
        message: `Created expense (ID: ${result.id || result.expenseid}) for **${ctx.input.amount || 'N/A'}**${ctx.input.vendorName ? ` from ${ctx.input.vendorName}` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.expenseId) throw new Error('expenseId is required for update');
      let result = await client.updateExpense(ctx.input.expenseId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated expense (ID: ${ctx.input.expenseId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.expenseId) throw new Error('expenseId is required for delete');
      let result = await client.deleteExpense(ctx.input.expenseId);
      return {
        output: mapResult(result),
        message: `Archived expense (ID: ${ctx.input.expenseId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
