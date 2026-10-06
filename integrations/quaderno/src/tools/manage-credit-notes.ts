import { z } from 'zod';
import {
  documentInput,
  documentOutputSchema,
  fields,
  mapDocumentOutput,
  mapLineItemInput
} from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  date,
  decimal,
  decimalInput,
  idInput,
  invalid,
  numericId,
  pageInput,
  pageOutput,
  type Row,
  reject
} from '../lib/validation';
export const listCreditNotes = tool({
  name: 'List Credit Notes',
  key: 'list_credit_notes',
  description: 'List one cursor page of credit notes. Date accepts a day or start,end range.',
  readOnly: true,
  input: {
    ...pageInput,
    query: z.string().optional(),
    date: z.string().optional(),
    state: z.enum(['outstanding', 'late', 'paid']).optional()
  },
  output: { creditNotes: z.array(documentOutputSchema), ...pageOutput },
  run: async (input, client) => ({
    creditNotes: (
      await client.list('credits', input, {
        q: input.query,
        date: input.date,
        state: input.state
      })
    ).map(mapDocumentOutput),
    ...client.pagination
  })
});
export const getCreditNote = tool({
  name: 'Get Credit Note',
  key: 'get_credit_note',
  description: 'Retrieve one credit note and its provider-calculated amounts.',
  readOnly: true,
  input: { creditNoteId: idInput },
  output: documentOutputSchema.shape,
  run: async (input, client) =>
    mapDocumentOutput(await client.get('credits', input.creditNoteId))
});
export const createCreditNote = tool({
  name: 'Create Credit Note',
  key: 'create_credit_note',
  description:
    'Create a credit note against invoiceId using the current API. creditedAmount is supported for a single-line invoice and defaults to the invoice total. This records a credit, not a cash transfer. For older callers without invoiceId, contactId and items use the historical unversioned document route; support depends on the account API version.',
  input: {
    ...documentInput,
    items: documentInput.items.optional(),
    invoiceId: idInput.optional(),
    creditedAmount: decimalInput.optional(),
    paymentMethod: z
      .enum([
        'credit_card',
        'cash',
        'wire_transfer',
        'direct_debit',
        'check',
        'iou',
        'paypal',
        'other'
      ])
      .optional()
  },
  output: documentOutputSchema.shape,
  run: async (input, client) => {
    if (input.invoiceId) {
      reject(
        input,
        [
          'contactId',
          'items',
          'currency',
          'issueDate',
          'dueDate',
          'subject',
          'notes',
          'poNumber',
          'tag',
          'paymentDetails',
          'customMetadata'
        ],
        'For current invoice-linked credits, supply invoiceId, creditedAmount and paymentMethod only.'
      );
      const invoice = await client.get('invoices', input.invoiceId);
      if (
        input.creditedAmount !== undefined &&
        (!Array.isArray(invoice.items) || invoice.items.length !== 1)
      )
        throw invalid('creditedAmount is supported only for an invoice with one line item.');
      return mapDocumentOutput(
        await client.create('credits', {
          invoice_id: numericId(input.invoiceId),
          credited_amount:
            input.creditedAmount === undefined ? undefined : decimal(input.creditedAmount),
          payment_method: input.paymentMethod
        })
      );
    }
    reject(
      input,
      ['creditedAmount', 'paymentMethod'],
      'creditedAmount and paymentMethod require invoiceId for the current credit API.'
    );
    if (!input.contactId || !input.items)
      throw invalid(
        'Provide invoiceId for the current credit API, or contactId and items for the historical compatibility route.'
      );
    const legacy: Row = fields(input, {
      contactId: 'contact_id',
      currency: 'currency',
      issueDate: 'issue_date',
      dueDate: 'due_date',
      subject: 'subject',
      notes: 'notes',
      poNumber: 'po_number',
      tag: 'tag',
      paymentDetails: 'payment_details',
      customMetadata: 'custom_metadata'
    });
    legacy.items_attributes = input.items.map(item => {
      if (!item.productCode) mapLineItemInput(item);
      return fields(item, {
        description: 'description',
        quantity: 'quantity',
        unitPrice: 'unit_price',
        totalAmount: 'total_amount',
        discount: 'discount',
        taxCode: 'tax_code',
        productCode: 'product_code',
        tax1Rate: 'tax_1_rate',
        tax1Name: 'tax_1_name',
        tax1Country: 'tax_1_country',
        tax2Rate: 'tax_2_rate',
        tax2Name: 'tax_2_name'
      });
    });
    if (input.issueDate !== undefined) date(input.issueDate);
    if (input.dueDate !== undefined) date(input.dueDate);
    return mapDocumentOutput(await client.create('credits.json', legacy, true));
  }
});
export const deliverCreditNote = tool({
  name: 'Deliver Credit Note',
  key: 'deliver_credit_note',
  description:
    'Ask Quaderno to email the credit note to its contact. Success confirms initiation, not receipt.',
  input: { creditNoteId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.deliver('credits', input.creditNoteId);
    return { success: true };
  }
});
