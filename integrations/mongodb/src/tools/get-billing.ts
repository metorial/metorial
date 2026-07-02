import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

let invoiceSummarySchema = z.object({
  invoiceId: z.string().describe('Unique identifier of the invoice'),
  orgId: z.string().optional().describe('Organization ID'),
  amountBilledCents: z.number().optional().describe('Total billed amount in cents'),
  amountPaidCents: z.number().optional().describe('Amount paid in cents'),
  subtotalCents: z.number().optional().describe('Subtotal in cents'),
  statusName: z
    .string()
    .optional()
    .describe('Invoice status (PENDING, CLOSED, FORGIVEN, FAILED, PAID, FREE, PREPAID)'),
  startDate: z.string().optional().describe('ISO 8601 billing period start'),
  endDate: z.string().optional().describe('ISO 8601 billing period end'),
  created: z.string().optional().describe('ISO 8601 invoice creation timestamp')
});

export let getBillingTool = SlateTool.create(spec, {
  name: 'Get Billing',
  key: 'get_billing',
  description: `Retrieve invoices and pending charges for a MongoDB Atlas organization. View past invoices, current pending charges, and individual invoice details including line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_invoices', 'get_invoice', 'get_pending'])
        .describe('Billing action to perform'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID. Falls back to configured organizationId.'),
      invoiceId: z.string().optional().describe('Invoice ID (for get_invoice)'),
      itemsPerPage: z.number().optional().describe('Number of results per page'),
      pageNum: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSummarySchema).optional().describe('List of invoices'),
      invoice: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full invoice details including line items'),
      totalCount: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list_invoices') {
      let result = await client.listOrganizationInvoices(orgId, {
        itemsPerPage: ctx.input.itemsPerPage,
        pageNum: ctx.input.pageNum
      });
      let invoices = (result.results || []).map((inv: any) => ({
        invoiceId: inv.id,
        orgId: inv.orgId,
        amountBilledCents: inv.amountBilledCents,
        amountPaidCents: inv.amountPaidCents,
        subtotalCents: inv.subtotalCents,
        statusName: inv.statusName,
        startDate: inv.startDate,
        endDate: inv.endDate,
        created: inv.created
      }));
      return {
        output: { invoices, totalCount: result.totalCount ?? invoices.length },
        message: `Found **${invoices.length}** invoice(s).`
      };
    }

    if (ctx.input.action === 'get_invoice') {
      if (!ctx.input.invoiceId) throw new Error('invoiceId is required');
      let invoice = await client.getOrganizationInvoice(orgId, ctx.input.invoiceId);
      return {
        output: { invoice },
        message: `Retrieved invoice **${invoice.id}** (${invoice.statusName}).`
      };
    }

    if (ctx.input.action === 'get_pending') {
      let invoice = await client.getPendingInvoice(orgId);
      return {
        output: { invoice },
        message: `Retrieved pending invoice. Current charges: ${((invoice.amountBilledCents || 0) / 100).toFixed(2)} USD.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
