import { z } from 'zod';
import {
  documentInput,
  documentOutputSchema,
  fields,
  mapDocumentInput,
  mapDocumentOutput,
  metadata,
  tags
} from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  date,
  idInput,
  invalid,
  nonempty,
  numericId,
  pageInput,
  pageOutput,
  reject
} from '../lib/validation';

export const listExpenses = tool({
  name: 'List Expenses',
  key: 'list_expenses',
  description: 'List a cursor page of expenses. Date accepts a single day or start,end range.',
  readOnly: true,
  input: {
    ...pageInput,
    query: z.string().optional(),
    date: z.string().optional(),
    state: z.enum(['outstanding', 'late', 'paid']).optional(),
    contactId: idInput.optional()
  },
  output: { expenses: z.array(documentOutputSchema), ...pageOutput },
  run: async (input, client) => ({
    expenses: (
      await client.list('expenses', input, {
        q: input.query,
        date: input.date,
        state: input.state,
        contact: input.contactId
      })
    ).map(mapDocumentOutput),
    ...client.pagination
  })
});
export const getExpense = tool({
  name: 'Get Expense',
  key: 'get_expense',
  description: 'Retrieve one expense and its provider-calculated amounts.',
  readOnly: true,
  input: { expenseId: idInput },
  output: documentOutputSchema.shape,
  run: async (input, client) =>
    mapDocumentOutput(await client.get('expenses', input.expenseId))
});
export const createExpense = tool({
  name: 'Create Expense',
  key: 'create_expense',
  description:
    'Create a expense record with a contact and priced lines. This does not transfer money.',
  input: { ...documentInput },
  output: documentOutputSchema.shape,
  run: async (input, client) => {
    const data = mapDocumentInput(input, 'expenses');
    return mapDocumentOutput(await client.create('expenses', data));
  }
});
export const updateExpense = tool({
  name: 'Update Expense',
  key: 'update_expense',
  description: 'Update supplied supported fields. ',
  input: { expenseId: idInput, ...documentInput, items: documentInput.items.optional() },
  output: documentOutputSchema.shape,
  run: async (input, client) => {
    reject(input, ['dueDate'], 'The current expense API does not accept dueDate.');
    const data = fields(input, {
      contactId: 'contact',
      currency: 'currency',
      issueDate: 'issue_date',
      subject: 'subject',
      notes: 'notes',
      poNumber: 'po_number',
      paymentDetails: 'payment_details'
    });
    if (input.contactId !== undefined) data.contact = { id: numericId(input.contactId) };
    if (input.issueDate !== undefined) data.issue_date = date(input.issueDate);
    if (input.tag !== undefined) data.tag_list = tags(input.tag);
    if (input.customMetadata !== undefined)
      data.custom_metadata = metadata(input.customMetadata);
    if (input.items !== undefined) {
      throw invalid(
        'Expense line replacement is not exposed by this compatibility tool. Create a separate expense or use the documented provider workflow.'
      );
    }
    nonempty(data);
    return mapDocumentOutput(await client.update('expenses', input.expenseId, data));
  }
});
export const deleteExpense = tool({
  name: 'Delete Expense',
  key: 'delete_expense',
  description: 'Permanently delete an expense from the selected account.',
  destructive: true,
  input: { expenseId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.get('expenses', input.expenseId);
    await client.remove('expenses', input.expenseId, false);
    return { success: true };
  }
});
