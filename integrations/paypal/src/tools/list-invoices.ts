import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `List PayPal invoices with optional pagination. Returns invoice summaries including status, amounts, and recipient information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (1-based)'),
      pageSize: z.number().optional().describe('Number of invoices per page (max 100)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total number of invoices'),
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('PayPal invoice ID'),
            status: z.string().describe('Invoice status'),
            invoiceNumber: z.string().optional().describe('Invoice number'),
            recipientEmail: z.string().optional().describe('Recipient email'),
            totalAmount: z.string().optional().describe('Total invoice amount'),
            currencyCode: z.string().optional().describe('Currency code'),
            invoiceDate: z.string().optional().describe('Invoice date')
          })
        )
        .describe('List of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let result = await client.listInvoices({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      totalRequired: true
    });

    let items = (result.items || []) as any[];
    let invoices = items.map((inv: any) => ({
      invoiceId: inv.id,
      status: inv.status,
      invoiceNumber: inv.detail?.invoice_number,
      recipientEmail: inv.primary_recipients?.[0]?.billing_info?.email_address,
      totalAmount: inv.amount?.value,
      currencyCode: inv.amount?.currency_code,
      invoiceDate: inv.detail?.invoice_date
    }));

    return {
      output: {
        totalCount: result.total_items || result.total_count,
        invoices
      },
      message: `Found ${invoices.length} invoice(s).`
    };
  })
  .build();
