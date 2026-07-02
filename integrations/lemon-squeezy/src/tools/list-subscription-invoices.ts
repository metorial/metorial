import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptionInvoicesTool = SlateTool.create(spec, {
  name: 'List Subscription Invoices',
  key: 'list_subscription_invoices',
  description:
    'Retrieve subscription invoices from Lemon Squeezy. Filter by store, subscription, status, or refund state to inspect recurring billing history.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter invoices by store ID'),
      subscriptionId: z.string().optional().describe('Filter invoices by subscription ID'),
      status: z
        .enum(['pending', 'paid', 'void', 'refunded', 'partial_refund'])
        .optional()
        .describe('Filter invoices by status'),
      refunded: z.boolean().optional().describe('Filter by whether invoices are refunded'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      subscriptionInvoices: z.array(
        z.object({
          invoiceId: z.string(),
          storeId: z.number(),
          subscriptionId: z.number(),
          customerId: z.number(),
          userName: z.string(),
          userEmail: z.string(),
          billingReason: z.string(),
          currency: z.string(),
          status: z.string(),
          statusFormatted: z.string(),
          refunded: z.boolean(),
          refundedAt: z.string().nullable(),
          subtotal: z.number(),
          discountTotal: z.number(),
          tax: z.number(),
          total: z.number(),
          subtotalFormatted: z.string(),
          discountTotalFormatted: z.string(),
          taxFormatted: z.string(),
          totalFormatted: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listSubscriptionInvoices({
      storeId: ctx.input.storeId,
      subscriptionId: ctx.input.subscriptionId,
      status: ctx.input.status,
      refunded: ctx.input.refunded,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let subscriptionInvoices = (response.data || []).map((invoice: any) => ({
      invoiceId: invoice.id,
      storeId: invoice.attributes.store_id,
      subscriptionId: invoice.attributes.subscription_id,
      customerId: invoice.attributes.customer_id,
      userName: invoice.attributes.user_name,
      userEmail: invoice.attributes.user_email,
      billingReason: invoice.attributes.billing_reason,
      currency: invoice.attributes.currency,
      status: invoice.attributes.status,
      statusFormatted: invoice.attributes.status_formatted,
      refunded: invoice.attributes.refunded,
      refundedAt: invoice.attributes.refunded_at,
      subtotal: invoice.attributes.subtotal,
      discountTotal: invoice.attributes.discount_total,
      tax: invoice.attributes.tax,
      total: invoice.attributes.total,
      subtotalFormatted: invoice.attributes.subtotal_formatted,
      discountTotalFormatted: invoice.attributes.discount_total_formatted,
      taxFormatted: invoice.attributes.tax_formatted,
      totalFormatted: invoice.attributes.total_formatted,
      createdAt: invoice.attributes.created_at,
      updatedAt: invoice.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { subscriptionInvoices, hasMore },
      message: `Found **${subscriptionInvoices.length}** subscription invoice(s).`
    };
  })
  .build();
