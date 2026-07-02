import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve a single invoice by its ID, including header fields, invoice lines, supplier info, and payment details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('Coupa invoice ID')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('Coupa internal invoice ID'),
      invoiceNumber: z.string().nullable().optional().describe('Invoice number'),
      status: z.string().nullable().optional().describe('Invoice status'),
      invoiceDate: z.string().nullable().optional().describe('Invoice date'),
      dueDate: z.string().nullable().optional().describe('Payment due date'),
      supplier: z.any().nullable().optional().describe('Supplier object'),
      currency: z.any().nullable().optional().describe('Currency object'),
      totalAmount: z.any().nullable().optional().describe('Total invoice amount'),
      invoiceLines: z.array(z.any()).nullable().optional().describe('Invoice line items'),
      paymentTerm: z.any().nullable().optional().describe('Payment terms'),
      documentType: z
        .string()
        .nullable()
        .optional()
        .describe('Document type (Invoice, Credit Note, etc.)'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
      rawData: z.any().optional().describe('Complete raw invoice data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let inv = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: {
        invoiceId: inv.id,
        invoiceNumber: inv['invoice-number'] ?? inv.invoice_number ?? null,
        status: inv.status ?? null,
        invoiceDate: inv['invoice-date'] ?? inv.invoice_date ?? null,
        dueDate: inv['due-date'] ?? inv.due_date ?? null,
        supplier: inv.supplier ?? null,
        currency: inv.currency ?? null,
        totalAmount: inv.total ?? inv.total ?? null,
        invoiceLines: inv['invoice-lines'] ?? inv.invoice_lines ?? null,
        paymentTerm: inv['payment-term'] ?? inv.payment_term ?? null,
        documentType: inv['document-type'] ?? inv.document_type ?? null,
        createdAt: inv['created-at'] ?? inv.created_at ?? null,
        updatedAt: inv['updated-at'] ?? inv.updated_at ?? null,
        rawData: inv
      },
      message: `Retrieved invoice **#${inv['invoice-number'] ?? inv.invoice_number ?? inv.id}** (status: ${inv.status}).`
    };
  })
  .build();
