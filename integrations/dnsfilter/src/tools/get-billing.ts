import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBilling = SlateTool.create(spec, {
  name: 'Get Billing & Invoices',
  key: 'get_billing',
  description: `Retrieve billing information, invoices, and estimated upcoming charges. Supports viewing historical invoices, the current estimated invoice, and billing/payment details for an organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['billing', 'invoices', 'current_invoice', 'invoice'])
        .describe(
          '"billing" for payment info, "invoices" for history, "current_invoice" for next month estimate, "invoice" for a specific invoice'
        ),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required for billing and invoices)'),
      invoiceId: z.string().optional().describe('Invoice ID (required for type "invoice")')
    })
  )
  .output(
    z.object({
      billing: z.record(z.string(), z.any()).optional().describe('Billing/payment details'),
      invoices: z.array(z.record(z.string(), z.any())).optional().describe('List of invoices'),
      invoice: z.record(z.string(), z.any()).optional().describe('Single invoice details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { type } = ctx.input;

    if (type === 'billing') {
      if (!ctx.input.organizationId) throw new Error('organizationId is required for billing');
      let billing = await client.getBilling(ctx.input.organizationId);
      return {
        output: { billing },
        message: `Retrieved billing information for organization **${ctx.input.organizationId}**.`
      };
    }

    if (type === 'invoices') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for invoices');
      let invoices = await client.listInvoices(ctx.input.organizationId);
      return {
        output: { invoices },
        message: `Found **${invoices.length}** invoice(s).`
      };
    }

    if (type === 'current_invoice') {
      let invoice = await client.getCurrentInvoice();
      return {
        output: { invoice },
        message: `Retrieved estimated current invoice.`
      };
    }

    if (!ctx.input.invoiceId) throw new Error('invoiceId is required for type "invoice"');
    let invoice = await client.getInvoice(ctx.input.invoiceId);
    return {
      output: { invoice },
      message: `Retrieved invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
