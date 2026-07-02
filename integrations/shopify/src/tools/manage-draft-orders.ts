import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let draftOrderSummarySchema = z.object({
  draftOrderId: z.string(),
  name: z.string(),
  status: z.string(),
  totalPrice: z.string(),
  subtotalPrice: z.string(),
  totalTax: z.string(),
  currency: z.string(),
  invoiceUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  customerEmail: z.string().nullable(),
  lineItemCount: z.number()
});

export let manageDraftOrders = SlateTool.create(spec, {
  name: 'Manage Draft Orders',
  key: 'manage_draft_orders',
  description: `Create, list, update, complete, or delete draft orders. Draft orders are useful for wholesale, custom pricing, B2B scenarios, and manual order creation.
Supports:
- **list**: List draft orders with optional status filter
- **get**: Get a single draft order by ID
- **create**: Create a new draft order with line items
- **update**: Update an existing draft order
- **complete**: Convert a draft order into a real order
- **send_invoice**: Email the invoice to the customer
- **delete**: Delete a draft order`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'complete', 'send_invoice', 'delete'])
        .describe('Operation to perform'),
      draftOrderId: z
        .string()
        .optional()
        .describe('Draft order ID (required for get/update/complete/send_invoice/delete)'),
      status: z
        .enum(['open', 'invoice_sent', 'completed'])
        .optional()
        .describe('Filter by status (for list)'),
      lineItems: z
        .array(
          z.object({
            variantId: z.string().optional().describe('Product variant ID'),
            title: z
              .string()
              .optional()
              .describe('Custom line item title (when not using a variant)'),
            price: z.string().optional().describe('Custom line item price'),
            quantity: z.number().describe('Quantity'),
            taxable: z.boolean().optional().describe('Whether the item is taxable')
          })
        )
        .optional()
        .describe('Line items (for create/update)'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerId: z.string().optional().describe('Existing customer ID to associate'),
      note: z.string().optional().describe('Internal note'),
      tags: z.string().optional().describe('Comma-separated tags'),
      shippingAddress: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          address1: z.string().optional(),
          address2: z.string().optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          country: z.string().optional(),
          zip: z.string().optional(),
          phone: z.string().optional()
        })
        .optional()
        .describe('Shipping address'),
      paymentPending: z
        .boolean()
        .optional()
        .describe('Mark payment as pending when completing (defaults to false)'),
      invoiceTo: z.string().optional().describe('Email to send invoice to (for send_invoice)'),
      invoiceSubject: z.string().optional().describe('Custom subject for the invoice email'),
      invoiceMessage: z.string().optional().describe('Custom message in the invoice email'),
      limit: z.number().min(1).max(250).optional().describe('Number of results (for list)')
    })
  )
  .output(
    z.object({
      draftOrders: z.array(draftOrderSummarySchema).optional(),
      draftOrder: draftOrderSummarySchema.optional(),
      deleted: z.boolean().optional(),
      invoiceSent: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let mapDraftOrder = (d: any) => ({
      draftOrderId: String(d.id),
      name: d.name,
      status: d.status,
      totalPrice: d.total_price,
      subtotalPrice: d.subtotal_price,
      totalTax: d.total_tax,
      currency: d.currency,
      invoiceUrl: d.invoice_url,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      completedAt: d.completed_at,
      customerEmail: d.email || (d.customer ? d.customer.email : null),
      lineItemCount: (d.line_items || []).length
    });

    if (ctx.input.action === 'list') {
      let draftOrders = await client.listDraftOrders({
        limit: ctx.input.limit,
        status: ctx.input.status
      });
      return {
        output: { draftOrders: draftOrders.map(mapDraftOrder) },
        message: `Found **${draftOrders.length}** draft order(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.draftOrderId) throw shopifyServiceError('draftOrderId is required');
      let d = await client.getDraftOrder(ctx.input.draftOrderId);
      return {
        output: { draftOrder: mapDraftOrder(d) },
        message: `Retrieved draft order **${d.name}** (${d.status}).`
      };
    }

    if (ctx.input.action === 'create') {
      let data: Record<string, any> = {};
      if (ctx.input.lineItems) {
        data.line_items = ctx.input.lineItems.map(li => {
          let item: Record<string, any> = { quantity: li.quantity };
          if (li.variantId) item.variant_id = li.variantId;
          if (li.title) item.title = li.title;
          if (li.price) item.price = li.price;
          if (li.taxable !== undefined) item.taxable = li.taxable;
          return item;
        });
      }
      if (ctx.input.customerEmail) data.email = ctx.input.customerEmail;
      if (ctx.input.customerId) data.customer = { id: ctx.input.customerId };
      if (ctx.input.note) data.note = ctx.input.note;
      if (ctx.input.tags) data.tags = ctx.input.tags;
      if (ctx.input.shippingAddress) {
        data.shipping_address = {
          first_name: ctx.input.shippingAddress.firstName,
          last_name: ctx.input.shippingAddress.lastName,
          address1: ctx.input.shippingAddress.address1,
          address2: ctx.input.shippingAddress.address2,
          city: ctx.input.shippingAddress.city,
          province: ctx.input.shippingAddress.province,
          country: ctx.input.shippingAddress.country,
          zip: ctx.input.shippingAddress.zip,
          phone: ctx.input.shippingAddress.phone
        };
      }

      let d = await client.createDraftOrder(data);
      return {
        output: { draftOrder: mapDraftOrder(d) },
        message: `Created draft order **${d.name}** — total: ${d.total_price} ${d.currency}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.draftOrderId) throw shopifyServiceError('draftOrderId is required');
      let data: Record<string, any> = {};
      if (ctx.input.lineItems) {
        data.line_items = ctx.input.lineItems.map(li => {
          let item: Record<string, any> = { quantity: li.quantity };
          if (li.variantId) item.variant_id = li.variantId;
          if (li.title) item.title = li.title;
          if (li.price) item.price = li.price;
          if (li.taxable !== undefined) item.taxable = li.taxable;
          return item;
        });
      }
      if (ctx.input.customerEmail) data.email = ctx.input.customerEmail;
      if (ctx.input.note !== undefined) data.note = ctx.input.note;
      if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;

      let d = await client.updateDraftOrder(ctx.input.draftOrderId, data);
      return {
        output: { draftOrder: mapDraftOrder(d) },
        message: `Updated draft order **${d.name}**.`
      };
    }

    if (ctx.input.action === 'complete') {
      if (!ctx.input.draftOrderId) throw shopifyServiceError('draftOrderId is required');
      let d = await client.completeDraftOrder(
        ctx.input.draftOrderId,
        ctx.input.paymentPending
      );
      return {
        output: { draftOrder: mapDraftOrder(d) },
        message: `Completed draft order **${d.name}** — converted to order.`
      };
    }

    if (ctx.input.action === 'send_invoice') {
      if (!ctx.input.draftOrderId) throw shopifyServiceError('draftOrderId is required');
      let invoiceData: Record<string, any> = {};
      if (ctx.input.invoiceTo) invoiceData.to = ctx.input.invoiceTo;
      if (ctx.input.invoiceSubject) invoiceData.subject = ctx.input.invoiceSubject;
      if (ctx.input.invoiceMessage) invoiceData.custom_message = ctx.input.invoiceMessage;

      await client.sendDraftOrderInvoice(ctx.input.draftOrderId, invoiceData);
      return {
        output: { invoiceSent: true },
        message: `Invoice sent for draft order **${ctx.input.draftOrderId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.draftOrderId) throw shopifyServiceError('draftOrderId is required');
      await client.deleteDraftOrder(ctx.input.draftOrderId);
      return {
        output: { deleted: true },
        message: `Deleted draft order **${ctx.input.draftOrderId}**.`
      };
    }

    throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
