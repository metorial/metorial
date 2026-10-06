import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

let lineItemSchema = z.object({
  name: z.string().describe('Line item description'),
  qty: z.number().describe('Quantity'),
  unitCost: z.string().describe('Unit cost amount (e.g. "100.00")'),
  taxName1: z.string().optional().describe('First tax name (must match a configured tax)'),
  taxAmount1: z.string().optional().describe('First tax percentage'),
  taxName2: z.string().optional().describe('Second tax name (must match a configured tax)'),
  taxAmount2: z.string().optional().describe('Second tax percentage')
});

const outputSchema = z
  .object({
    invoiceId: z.number().describe('Invoice ID'),
    invoiceNumber: z.string().nullable().optional().describe('Invoice number'),
    customerId: z.number().nullable().optional().describe('Client ID'),
    status: z.number().nullable().optional().describe('Invoice status code'),
    amount: z.any().optional().describe('Total amount'),
    outstandingAmount: z.any().optional().describe('Outstanding amount'),
    currencyCode: z.string().nullable().optional(),
    createDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageInvoices = SlateTool.create(spec, {
  name: 'Manage Invoices',
  key: 'manage_invoices',
  description: `Create, update, or delete invoices in FreshBooks. New invoices are created in **Draft** status. Use the "send" action to email invoices to clients, or "markAsSent" to mark them as sent without sending an email. Supports line items with taxes, discounts, terms, and notes.`,
  instructions: [
    'Invoices must be marked as sent or sent by email before they appear in accounting reports.',
    'The invoice_number is auto-generated if not provided.',
    'Currency code on line items should match the invoice currency.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z
        .enum(['create', 'update', 'delete', 'send', 'markAsSent'])
        .describe('Action to perform'),
      invoiceId: z
        .number()
        .optional()
        .describe('Invoice ID (required for update/delete/send/markAsSent)'),
      customerId: z.number().optional().describe('Client ID to invoice (required for create)'),
      createDate: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      dueOffsetDays: z.number().optional().describe('Number of days until payment is due'),
      currencyCode: z
        .string()
        .optional()
        .describe('Three-letter currency code (e.g. USD, CAD)'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Custom invoice number (auto-generated if omitted)'),
      poNumber: z.string().optional().describe('Purchase order number'),
      discountValue: z.string().optional().describe('Discount percentage (0-100)'),
      terms: z.string().optional().describe('Payment terms text'),
      notes: z.string().optional().describe('Additional notes'),
      lines: z.array(lineItemSchema).optional().describe('Line items for the invoice'),
      emailRecipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses for sending (required for "send" action)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_invoices', ctx, outputSchema))
  .build();
