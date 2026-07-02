import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Agiled. Specify the client, issue date, due date, currency, and line items for billing.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.string().describe('ID of the client to invoice'),
      issueDate: z.string().describe('Invoice issue date (YYYY-MM-DD)'),
      dueDate: z.string().describe('Invoice due date (YYYY-MM-DD)'),
      currencyId: z.string().optional().describe('Currency ID to use for the invoice'),
      projectId: z.string().optional().describe('Associated project ID'),
      notes: z.string().optional().describe('Notes to include on the invoice'),
      status: z.string().optional().describe('Invoice status (e.g. "draft", "sent", "paid")'),
      subTotal: z.number().optional().describe('Subtotal amount'),
      total: z.number().optional().describe('Total amount'),
      discount: z.number().optional().describe('Discount percentage or amount'),
      discountType: z
        .enum(['percent', 'fixed'])
        .optional()
        .describe('Whether discount is a percentage or fixed amount')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the created invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createInvoice({
      client_id: ctx.input.clientId,
      issue_date: ctx.input.issueDate,
      due_date: ctx.input.dueDate,
      currency_id: ctx.input.currencyId,
      project_id: ctx.input.projectId,
      note: ctx.input.notes,
      status: ctx.input.status,
      sub_total: ctx.input.subTotal,
      total: ctx.input.total,
      discount: ctx.input.discount,
      discount_type: ctx.input.discountType
    });

    let invoice = result.data;

    return {
      output: {
        invoiceId: String(invoice.id ?? ''),
        invoiceNumber: invoice.invoice_number as string | undefined
      },
      message: `Created invoice${invoice.invoice_number ? ` #${invoice.invoice_number}` : ''} for client **${ctx.input.clientId}**.`
    };
  })
  .build();
