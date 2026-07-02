import { z } from 'zod';

export let lineItemInputSchema = z.object({
  description: z.string().optional().describe('Line item description'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.string().optional().describe('Unit price as string'),
  discount: z.string().optional().describe('Discount percentage'),
  taxCode: z.string().optional().describe('Tax code (e.g., "eservice", "saas", "standard")'),
  productCode: z.string().optional().describe('Product code to auto-fill line item details'),
  tax1Rate: z.number().optional().describe('Tax 1 rate'),
  tax1Name: z.string().optional().describe('Tax 1 name'),
  tax1Country: z.string().optional().describe('Tax 1 country'),
  tax2Rate: z.number().optional().describe('Tax 2 rate'),
  tax2Name: z.string().optional().describe('Tax 2 name')
});

export let lineItemOutputSchema = z.object({
  lineItemId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.string().optional(),
  unitPrice: z.string().optional(),
  discount: z.string().optional(),
  totalAmount: z.string().optional(),
  tax1Rate: z.number().optional(),
  tax1Name: z.string().optional(),
  tax2Rate: z.number().optional(),
  tax2Name: z.string().optional()
});

export let documentOutputSchema = z.object({
  documentId: z.string().optional().describe('Document ID'),
  number: z.string().optional().describe('Document number'),
  issueDate: z.string().optional().describe('Issue date'),
  dueDate: z.string().optional().describe('Due date'),
  currency: z.string().optional().describe('Currency code'),
  subject: z.string().optional().describe('Subject line'),
  notes: z.string().optional().describe('Notes'),
  poNumber: z.string().optional().describe('Purchase order number'),
  state: z.string().optional().describe('Document state'),
  tag: z.string().optional().describe('Tag'),
  contactId: z.string().optional().describe('Contact ID'),
  contactName: z.string().optional().describe('Contact name'),
  subtotal: z.string().optional().describe('Subtotal amount'),
  taxes: z.string().optional().describe('Total tax amount'),
  total: z.string().optional().describe('Total amount'),
  items: z.array(lineItemOutputSchema).optional().describe('Line items'),
  url: z.string().optional().describe('URL of the document'),
  permalink: z.string().optional().describe('Public permalink for sharing')
});

export let mapLineItemInput = (
  item: z.infer<typeof lineItemInputSchema>
): Record<string, any> => {
  let mapped: Record<string, any> = {};
  if (item.description) mapped.description = item.description;
  if (item.quantity !== undefined) mapped.quantity = item.quantity;
  if (item.unitPrice) mapped.unit_price = item.unitPrice;
  if (item.discount) mapped.discount = item.discount;
  if (item.taxCode) mapped.tax_code = item.taxCode;
  if (item.productCode) mapped.product_code = item.productCode;
  if (item.tax1Rate !== undefined) mapped.tax_1_rate = item.tax1Rate;
  if (item.tax1Name) mapped.tax_1_name = item.tax1Name;
  if (item.tax1Country) mapped.tax_1_country = item.tax1Country;
  if (item.tax2Rate !== undefined) mapped.tax_2_rate = item.tax2Rate;
  if (item.tax2Name) mapped.tax_2_name = item.tax2Name;
  return mapped;
};

export let mapDocumentOutput = (doc: any): z.infer<typeof documentOutputSchema> => {
  return {
    documentId: doc.id?.toString(),
    number: doc.number?.toString(),
    issueDate: doc.issue_date,
    dueDate: doc.due_date,
    currency: doc.currency,
    subject: doc.subject,
    notes: doc.notes,
    poNumber: doc.po_number,
    state: doc.state,
    tag: doc.tag,
    contactId: doc.contact?.id?.toString() || doc.contact_id?.toString(),
    contactName: doc.contact?.full_name,
    subtotal: doc.subtotal,
    taxes: doc.taxes,
    total: doc.total,
    items: doc.items?.map((item: any) => ({
      lineItemId: item.id?.toString(),
      description: item.description,
      quantity: item.quantity?.toString(),
      unitPrice: item.unit_price,
      discount: item.discount,
      totalAmount: item.total_amount,
      tax1Rate: item.tax_1_rate,
      tax1Name: item.tax_1_name,
      tax2Rate: item.tax_2_rate,
      tax2Name: item.tax_2_name
    })),
    url: doc.url,
    permalink: doc.permalink
  };
};
