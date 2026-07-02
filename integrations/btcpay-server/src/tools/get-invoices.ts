import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

let invoiceSchema = z.object({
  invoiceId: z.string().describe('Invoice ID'),
  status: z.string().describe('Invoice status'),
  amount: z.number().optional().describe('Invoice amount'),
  currency: z.string().optional().describe('Invoice currency'),
  checkoutLink: z.string().optional().describe('Checkout page URL'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  expirationTime: z.string().optional().describe('Expiration timestamp'),
  orderId: z.string().optional().nullable().describe('Associated order ID'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Invoice metadata')
});

export let getInvoices = SlateTool.create(spec, {
  name: 'Get Invoices',
  key: 'get_invoices',
  description: `Retrieve a single invoice by ID or list invoices for a store with optional filtering by status, order ID, date range, and text search. Returns invoice details including status, amount, currency, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().describe('Store ID'),
      invoiceId: z
        .string()
        .optional()
        .describe('Specific invoice ID to retrieve. If omitted, lists invoices.'),
      status: z
        .array(z.enum(['New', 'Processing', 'Expired', 'Invalid', 'Settled']))
        .optional()
        .describe('Filter by invoice status'),
      orderId: z.array(z.string()).optional().describe('Filter by order ID(s)'),
      textSearch: z.string().optional().describe('Search text across invoice fields'),
      startDate: z.string().optional().describe('Filter invoices created after this ISO date'),
      endDate: z.string().optional().describe('Filter invoices created before this ISO date'),
      take: z.number().optional().describe('Number of invoices to return'),
      skip: z.number().optional().describe('Number of invoices to skip for pagination')
    })
  )
  .output(
    z.object({
      invoice: invoiceSchema
        .optional()
        .describe('Single invoice (when invoiceId is provided)'),
      invoices: z.array(invoiceSchema).optional().describe('List of invoices'),
      paymentMethods: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Payment methods for a single invoice')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.invoiceId) {
      let invoice = await client.getInvoice(ctx.input.storeId, ctx.input.invoiceId);
      let paymentMethods = await client.getInvoicePaymentMethods(
        ctx.input.storeId,
        ctx.input.invoiceId
      );
      let meta = invoice.metadata as Record<string, unknown> | undefined;
      return {
        output: {
          invoice: {
            invoiceId: invoice.id as string,
            status: invoice.status as string,
            amount: invoice.amount as number | undefined,
            currency: invoice.currency as string | undefined,
            checkoutLink: invoice.checkoutLink as string | undefined,
            createdTime:
              invoice.createdTime !== undefined ? String(invoice.createdTime) : undefined,
            expirationTime:
              invoice.expirationTime !== undefined
                ? String(invoice.expirationTime)
                : undefined,
            orderId: (meta?.orderId as string | undefined) ?? null,
            metadata: meta
          },
          paymentMethods
        },
        message: `Invoice **${invoice.id}** — status: **${invoice.status}**, amount: ${invoice.amount ?? 'top-up'} ${invoice.currency ?? ''}.`
      };
    }

    let invoices = await client.getInvoices(ctx.input.storeId, {
      status: ctx.input.status,
      orderId: ctx.input.orderId,
      textSearch: ctx.input.textSearch,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      take: ctx.input.take,
      skip: ctx.input.skip
    });

    let mapped = invoices.map(inv => {
      let meta = inv.metadata as Record<string, unknown> | undefined;
      return {
        invoiceId: inv.id as string,
        status: inv.status as string,
        amount: inv.amount as number | undefined,
        currency: inv.currency as string | undefined,
        checkoutLink: inv.checkoutLink as string | undefined,
        createdTime: inv.createdTime !== undefined ? String(inv.createdTime) : undefined,
        expirationTime:
          inv.expirationTime !== undefined ? String(inv.expirationTime) : undefined,
        orderId: (meta?.orderId as string | undefined) ?? null,
        metadata: meta
      };
    });

    return {
      output: { invoices: mapped },
      message: `Found **${mapped.length}** invoice(s).`
    };
  })
  .build();
