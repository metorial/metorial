import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageInvoices = SlateTool.create(spec, {
  name: 'Manage Invoices',
  key: 'manage_invoices',
  description: `Create, retrieve, update, finalize, send, pay, or void invoices. Supports adding line items, applying discounts, and managing the full invoice lifecycle from draft to paid or voided.`,
  instructions: [
    'Invoices start as draft. Finalize them to lock the amount and generate a payment page, then send or pay.',
    'Use addLineItem action to add items before finalizing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'update',
          'finalize',
          'send',
          'pay',
          'void',
          'add_line_item',
          'list'
        ])
        .describe('Operation to perform'),
      invoiceId: z
        .string()
        .optional()
        .describe('Invoice ID (required for get/update/finalize/send/pay/void)'),
      customerId: z.string().optional().describe('Customer ID (required for create)'),
      subscriptionId: z
        .string()
        .optional()
        .describe('Subscription ID to create an invoice for'),
      description: z.string().optional().describe('Invoice description'),
      collectionMethod: z
        .enum(['charge_automatically', 'send_invoice'])
        .optional()
        .describe('How to collect payment'),
      daysUntilDue: z
        .number()
        .optional()
        .describe(
          'Number of days until the invoice is due (for send_invoice collection method)'
        ),
      autoAdvance: z
        .boolean()
        .optional()
        .describe('Whether Stripe should auto-finalize the invoice'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      // For line items
      lineItemPriceId: z.string().optional().describe('Price ID for the line item'),
      lineItemQuantity: z.number().optional().describe('Quantity for the line item'),
      lineItemAmount: z
        .number()
        .optional()
        .describe('Amount in smallest currency unit (for one-off line items)'),
      lineItemCurrency: z.string().optional().describe('Currency for one-off line items'),
      lineItemDescription: z.string().optional().describe('Description for the line item'),
      // For pay action
      paymentMethodId: z.string().optional().describe('Payment method to use for paying'),
      // For list
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination'),
      statusFilter: z
        .enum(['draft', 'open', 'paid', 'uncollectible', 'void'])
        .optional()
        .describe('Filter by status (for list)')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional().describe('Invoice ID'),
      customerId: z.string().optional().nullable().describe('Customer ID'),
      status: z
        .string()
        .optional()
        .nullable()
        .describe('Invoice status (draft, open, paid, uncollectible, void)'),
      total: z.number().optional().describe('Total amount in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      amountDue: z.number().optional().describe('Amount due'),
      amountPaid: z.number().optional().describe('Amount paid'),
      hostedInvoiceUrl: z
        .string()
        .optional()
        .nullable()
        .describe('URL for the hosted invoice payment page'),
      invoicePdf: z.string().optional().nullable().describe('URL for the invoice PDF'),
      created: z.number().optional().describe('Creation timestamp'),
      invoices: z
        .array(
          z.object({
            invoiceId: z.string(),
            customerId: z.string().nullable(),
            status: z.string().nullable(),
            total: z.number(),
            currency: z.string(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of invoices'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    let mapInvoice = (inv: any) => ({
      invoiceId: inv.id,
      customerId: inv.customer,
      status: inv.status,
      total: inv.total,
      currency: inv.currency,
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
      created: inv.created
    });

    if (action === 'create') {
      if (!ctx.input.customerId)
        throw stripeServiceError('customerId is required for create action');
      let params: Record<string, any> = { customer: ctx.input.customerId };
      if (ctx.input.subscriptionId) params.subscription = ctx.input.subscriptionId;
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.collectionMethod) params.collection_method = ctx.input.collectionMethod;
      if (ctx.input.daysUntilDue !== undefined) params.days_until_due = ctx.input.daysUntilDue;
      if (ctx.input.autoAdvance !== undefined) params.auto_advance = ctx.input.autoAdvance;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let inv = await client.createInvoice(params);
      return {
        output: mapInvoice(inv),
        message: `Created draft invoice **${inv.id}** for customer ${inv.customer}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.invoiceId)
        throw stripeServiceError('invoiceId is required for get action');
      let inv = await client.getInvoice(ctx.input.invoiceId);
      return {
        output: mapInvoice(inv),
        message: `Invoice **${inv.id}**: ${inv.status} — ${inv.total} ${inv.currency?.toUpperCase()}`
      };
    }

    if (action === 'update') {
      if (!ctx.input.invoiceId)
        throw stripeServiceError('invoiceId is required for update action');
      let params: Record<string, any> = {};
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.collectionMethod) params.collection_method = ctx.input.collectionMethod;
      if (ctx.input.daysUntilDue !== undefined) params.days_until_due = ctx.input.daysUntilDue;
      if (ctx.input.autoAdvance !== undefined) params.auto_advance = ctx.input.autoAdvance;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let inv = await client.updateInvoice(ctx.input.invoiceId, params);
      return {
        output: mapInvoice(inv),
        message: `Updated invoice **${inv.id}**`
      };
    }

    if (action === 'finalize') {
      if (!ctx.input.invoiceId)
        throw stripeServiceError('invoiceId is required for finalize action');
      let inv = await client.finalizeInvoice(ctx.input.invoiceId);
      return {
        output: mapInvoice(inv),
        message: `Finalized invoice **${inv.id}** — amount due: ${inv.amount_due} ${inv.currency?.toUpperCase()}`
      };
    }

    if (action === 'send') {
      if (!ctx.input.invoiceId)
        throw stripeServiceError('invoiceId is required for send action');
      let inv = await client.sendInvoice(ctx.input.invoiceId);
      return {
        output: mapInvoice(inv),
        message: `Sent invoice **${inv.id}** to customer`
      };
    }

    if (action === 'pay') {
      if (!ctx.input.invoiceId)
        throw stripeServiceError('invoiceId is required for pay action');
      let params: Record<string, any> = {};
      if (ctx.input.paymentMethodId) params.payment_method = ctx.input.paymentMethodId;
      let inv = await client.payInvoice(ctx.input.invoiceId, params);
      return {
        output: mapInvoice(inv),
        message: `Paid invoice **${inv.id}** — amount paid: ${inv.amount_paid} ${inv.currency?.toUpperCase()}`
      };
    }

    if (action === 'void') {
      if (!ctx.input.invoiceId)
        throw stripeServiceError('invoiceId is required for void action');
      let inv = await client.voidInvoice(ctx.input.invoiceId);
      return {
        output: mapInvoice(inv),
        message: `Voided invoice **${inv.id}**`
      };
    }

    if (action === 'add_line_item') {
      if (!ctx.input.invoiceId)
        throw stripeServiceError('invoiceId is required for add_line_item action');

      let params: Record<string, any> = { invoice: ctx.input.invoiceId };
      if (ctx.input.lineItemPriceId) {
        params.price = ctx.input.lineItemPriceId;
        if (ctx.input.lineItemQuantity) params.quantity = ctx.input.lineItemQuantity;
      } else if (ctx.input.lineItemAmount !== undefined) {
        params.amount = ctx.input.lineItemAmount;
        params.currency = ctx.input.lineItemCurrency || 'usd';
        if (ctx.input.lineItemDescription) params.description = ctx.input.lineItemDescription;
      } else {
        // Fetch invoice to get customer for invoice item
        let inv = await client.getInvoice(ctx.input.invoiceId);
        params.customer = inv.customer;
      }

      // Fetch invoice to get customer for the invoice item
      if (!params.customer) {
        let inv = await client.getInvoice(ctx.input.invoiceId);
        params.customer = inv.customer;
      }

      await client.createInvoiceItem(params);
      let inv = await client.getInvoice(ctx.input.invoiceId);
      return {
        output: mapInvoice(inv),
        message: `Added line item to invoice **${inv.id}** — new total: ${inv.total} ${inv.currency?.toUpperCase()}`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.customerId) params.customer = ctx.input.customerId;
    if (ctx.input.statusFilter) params.status = ctx.input.statusFilter;

    let result = await client.listInvoices(params);
    return {
      output: {
        invoices: result.data.map((inv: any) => ({
          invoiceId: inv.id,
          customerId: inv.customer,
          status: inv.status,
          total: inv.total,
          currency: inv.currency,
          created: inv.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** invoice(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
