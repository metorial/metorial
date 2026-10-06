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
import { idInput, nonempty, pageInput, pageOutput, reject } from '../lib/validation';

export const listInvoices = tool({
  name: 'List Invoices',
  key: 'list_invoices',
  description: 'List a cursor page of invoices. Date accepts a single day or start,end range.',
  readOnly: true,
  input: {
    ...pageInput,
    query: z.string().optional(),
    date: z.string().optional(),
    state: z.enum(['outstanding', 'late', 'uncollectible', 'paid']).optional(),
    contactId: idInput.optional()
  },
  output: { invoices: z.array(documentOutputSchema), ...pageOutput },
  run: async (input, client) => ({
    invoices: (
      await client.list('invoices', input, {
        q: input.query,
        date: input.date,
        state: input.state,
        contact: input.contactId
      })
    ).map(mapDocumentOutput),
    ...client.pagination
  })
});
export const getInvoice = tool({
  name: 'Get Invoice',
  key: 'get_invoice',
  description: 'Retrieve one invoice and its provider-calculated amounts.',
  readOnly: true,
  input: { invoiceId: idInput },
  output: documentOutputSchema.shape,
  run: async (input, client) =>
    mapDocumentOutput(await client.get('invoices', input.invoiceId))
});
export const createInvoice = tool({
  name: 'Create Invoice',
  key: 'create_invoice',
  description:
    'Create a invoice record with a contact and priced lines. This does not transfer money.',
  input: { ...documentInput },
  output: documentOutputSchema.shape,
  run: async (input, client) => {
    const data = mapDocumentInput(input, 'invoices');
    return mapDocumentOutput(await client.create('invoices', data));
  }
});
export const updateInvoice = tool({
  name: 'Update Invoice',
  key: 'update_invoice',
  description:
    'Update supplied supported fields. The current invoice API permits administrative fields only; financial fields require a separate correction workflow.',
  input: { invoiceId: idInput, ...documentInput, items: documentInput.items.optional() },
  output: documentOutputSchema.shape,
  run: async (input, client) => {
    reject(
      input,
      ['contactId', 'currency', 'issueDate', 'dueDate', 'subject', 'poNumber', 'items'],
      'The current invoice update API accepts notes, tag, paymentDetails and customMetadata only. Use a separate correction workflow for financial fields.'
    );
    const data = fields(input, { notes: 'notes', paymentDetails: 'payment_details' });
    if (input.tag !== undefined) data.tag_list = tags(input.tag);
    if (input.customMetadata !== undefined)
      data.custom_metadata = metadata(input.customMetadata);
    nonempty(data);
    return mapDocumentOutput(await client.update('invoices', input.invoiceId, data));
  }
});
export const deliverInvoice = tool({
  name: 'Deliver Invoice',
  key: 'deliver_invoice',
  description:
    'Ask Quaderno to email the invoice to its contact. This may finalize the record. A successful request confirms initiation, not receipt.',
  input: { invoiceId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.deliver('invoices', input.invoiceId);
    return { success: true };
  }
});
