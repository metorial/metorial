import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import {
  documentOutputSchema,
  lineItemInputSchema,
  mapDocumentOutput,
  mapLineItemInput
} from '../lib/schemas';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Retrieve a list of business expenses (purchases) from Quaderno.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter expenses'),
      date: z.string().optional().describe('Filter by date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      expenses: z.array(documentOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listExpenses({
      q: ctx.input.query,
      date: ctx.input.date,
      page: ctx.input.page
    });

    let expenses = (Array.isArray(result) ? result : []).map(mapDocumentOutput);

    return {
      output: { expenses },
      message: `Found **${expenses.length}** expense(s)`
    };
  })
  .build();

export let getExpense = SlateTool.create(spec, {
  name: 'Get Expense',
  key: 'get_expense',
  description: `Retrieve a single expense by ID from Quaderno.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      expenseId: z.string().describe('ID of the expense to retrieve')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let doc = await client.getExpense(ctx.input.expenseId);

    return {
      output: mapDocumentOutput(doc),
      message: `Retrieved expense **#${doc.number || doc.id}** — Total: ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Create a new business expense (purchase) in Quaderno. Expenses can be associated with contacts and include payment records.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('ID of the vendor contact'),
      currency: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      subject: z.string().optional().describe('Subject line'),
      notes: z.string().optional().describe('Notes'),
      poNumber: z.string().optional().describe('Purchase order number'),
      tag: z.string().optional().describe('Tag for categorization'),
      items: z.array(lineItemInputSchema).min(1).describe('Line items for the expense')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      items_attributes: ctx.input.items.map(mapLineItemInput)
    };

    if (ctx.input.contactId) data.contact_id = ctx.input.contactId;
    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.issueDate) data.issue_date = ctx.input.issueDate;
    if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;
    if (ctx.input.tag) data.tag = ctx.input.tag;

    let doc = await client.createExpense(data);

    return {
      output: mapDocumentOutput(doc),
      message: `Created expense **#${doc.number || doc.id}** for ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update an existing expense in Quaderno. Only the provided fields will be updated.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      expenseId: z.string().describe('ID of the expense to update'),
      contactId: z.string().optional().describe('New contact ID'),
      currency: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      subject: z.string().optional().describe('Subject line'),
      notes: z.string().optional().describe('Notes'),
      poNumber: z.string().optional().describe('Purchase order number'),
      tag: z.string().optional().describe('Tag for categorization')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {};
    if (ctx.input.contactId !== undefined) data.contact_id = ctx.input.contactId;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.issueDate !== undefined) data.issue_date = ctx.input.issueDate;
    if (ctx.input.dueDate !== undefined) data.due_date = ctx.input.dueDate;
    if (ctx.input.subject !== undefined) data.subject = ctx.input.subject;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.poNumber !== undefined) data.po_number = ctx.input.poNumber;
    if (ctx.input.tag !== undefined) data.tag = ctx.input.tag;

    let doc = await client.updateExpense(ctx.input.expenseId, data);

    return {
      output: mapDocumentOutput(doc),
      message: `Updated expense **#${doc.number || doc.id}**`
    };
  })
  .build();

export let deleteExpense = SlateTool.create(spec, {
  name: 'Delete Expense',
  key: 'delete_expense',
  description: `Delete an expense from Quaderno.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      expenseId: z.string().describe('ID of the expense to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the expense was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteExpense(ctx.input.expenseId);

    return {
      output: { success: true },
      message: `Deleted expense **${ctx.input.expenseId}**`
    };
  })
  .build();
