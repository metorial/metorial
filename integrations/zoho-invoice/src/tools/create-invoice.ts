import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice for a customer in Zoho Invoice. Include line items with quantities and rates, apply taxes and discounts, and set payment terms and due dates.`,
  instructions: [
    'At minimum, provide a customerId and at least one line item with a name and rate.',
    'Line items can reference existing items by itemId or be ad-hoc with just name, quantity, and rate.',
    'Dates should be in YYYY-MM-DD format.',
    'The discountType field accepts "entity_level" (applied to the whole invoice subtotal) or "item_level" (applied per line item).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to invoice'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Custom invoice number (auto-generated if omitted)'),
      date: z
        .string()
        .optional()
        .describe('Invoice date in YYYY-MM-DD format (defaults to today)'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      paymentTerms: z.number().optional().describe('Payment terms in days (e.g., 15, 30, 60)'),
      discount: z.number().optional().describe('Discount value to apply to the invoice'),
      discountType: z
        .enum(['entity_level', 'item_level'])
        .optional()
        .describe(
          'How the discount is applied: entity_level (whole invoice) or item_level (per line item)'
        ),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().optional().describe('ID of an existing item'),
            name: z.string().optional().describe('Name of the line item (max 100 chars)'),
            description: z
              .string()
              .optional()
              .describe('Description of the line item (max 2000 chars)'),
            rate: z.number().optional().describe('Rate of the line item'),
            quantity: z.number().optional().describe('Quantity of the line item'),
            unit: z.string().optional().describe('Unit of the line item (e.g., kgs, hrs)'),
            taxId: z.string().optional().describe('Tax ID to apply'),
            discount: z.string().optional().describe('Discount on the line item')
          })
        )
        .min(1)
        .describe('Line items for the invoice'),
      notes: z.string().optional().describe('Customer-facing notes displayed on the invoice'),
      terms: z.string().optional().describe('Terms and conditions displayed on the invoice'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code for the invoice (e.g., USD, EUR, GBP)'),
      exchangeRate: z.number().optional().describe('Exchange rate for the currency'),
      templateId: z.string().optional().describe('ID of the invoice template to use'),
      contactPersons: z
        .array(z.string())
        .optional()
        .describe('Array of contact person IDs to associate with the invoice'),
      customFields: z
        .array(
          z.object({
            customfieldId: z.string().optional().describe('ID of the custom field'),
            label: z.string().optional().describe('Label of the custom field'),
            value: z.string().optional().describe('Value for the custom field')
          })
        )
        .optional()
        .describe('Custom fields for the invoice')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the created invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      status: z.string().optional().describe('Status of the invoice'),
      customerId: z.string().optional().describe('ID of the customer'),
      customerName: z.string().optional().describe('Name of the customer'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      total: z.number().optional().describe('Total amount'),
      balance: z.number().optional().describe('Outstanding balance'),
      currencyCode: z.string().optional().describe('Currency code'),
      createdTime: z.string().optional().describe('Timestamp when the invoice was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let input = ctx.input;

    let lineItems = input.lineItems.map(li => ({
      item_id: li.itemId,
      name: li.name,
      description: li.description,
      rate: li.rate,
      quantity: li.quantity,
      unit: li.unit,
      tax_id: li.taxId,
      discount: li.discount
    }));

    let payload: Record<string, any> = {
      customer_id: input.customerId,
      line_items: lineItems
    };

    if (input.invoiceNumber) payload.invoice_number = input.invoiceNumber;
    if (input.date) payload.date = input.date;
    if (input.dueDate) payload.due_date = input.dueDate;
    if (input.paymentTerms !== undefined) payload.payment_terms = input.paymentTerms;
    if (input.discount !== undefined) payload.discount = input.discount;
    if (input.discountType) payload.discount_type = input.discountType;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;
    if (input.currencyCode) payload.currency_code = input.currencyCode;
    if (input.exchangeRate !== undefined) payload.exchange_rate = input.exchangeRate;
    if (input.templateId) payload.template_id = input.templateId;
    if (input.contactPersons) payload.contact_persons = input.contactPersons;
    if (input.customFields) {
      payload.custom_fields = input.customFields.map(cf => ({
        customfield_id: cf.customfieldId,
        label: cf.label,
        value: cf.value
      }));
    }

    let inv = await client.createInvoice(payload);

    return {
      output: {
        invoiceId: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        status: inv.status,
        customerId: inv.customer_id,
        customerName: inv.customer_name,
        date: inv.date,
        dueDate: inv.due_date,
        total: inv.total,
        balance: inv.balance,
        currencyCode: inv.currency_code,
        createdTime: inv.created_time
      },
      message: `Created invoice **${inv.invoice_number}** for **${inv.customer_name}** with total ${inv.currency_code} ${inv.total}.`
    };
  })
  .build();
