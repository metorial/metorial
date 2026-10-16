import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { importScopeFields, resolveImportConfig } from '../lib/context';
import { spec } from '../spec';

export let upsertOrder = SlateTool.create(spec, {
  name: 'Create or Update Order',
  key: 'upsert_order',
  description: `Creates a new order (invoice) or updates an existing one for a contact in SegMetrics. If the order ID already exists, it will be updated.
Each order includes line items with product details. If a product referenced in a line item doesn't exist, it is automatically created.
All monetary amounts are specified in **cents** (e.g., 4999 = $49.99).`,
  instructions: [
    'Provide either contactId or email to identify the contact.',
    'If contactId is used, the contact must already exist. Use email if the contact may not exist yet.'
  ],
  constraints: ['All monetary amounts must be in cents.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ...importScopeFields,
      orderId: z.string().describe('Unique identifier for the order/invoice.'),
      contactId: z
        .string()
        .optional()
        .describe('The contact ID. Contact must already exist if using this field.'),
      email: z.string().optional().describe('Email address of the contact.'),
      amount: z.number().describe('Total amount of the order in cents.'),
      paid: z.number().describe('Amount paid in cents.'),
      dateCreated: z.string().describe('Date the order was created (YYYY-MM-DD HH:MM:SS).'),
      isRefunded: z
        .number()
        .optional()
        .describe('Whether the order has been refunded (0 or 1).'),
      discount: z.number().optional().describe('Order discount in cents.'),
      tax: z.number().optional().describe('Order tax in cents.'),
      shipping: z.number().optional().describe('Order shipping cost in cents.'),
      items: z
        .array(
          z.object({
            id: z
              .string()
              .optional()
              .describe('Stable line item ID; defaults to the order ID and item number.'),
            name: z.string().describe('Name of the product/item.'),
            productId: z
              .string()
              .optional()
              .describe(
                "Required by SegMetrics: product identifier. Auto-created if it doesn't exist."
              ),
            subscriptionId: z
              .string()
              .optional()
              .describe('Subscription ID linked to this purchase.'),
            amount: z.number().describe('Amount for this line item in cents.'),
            totalPaid: z
              .number()
              .optional()
              .describe('Total paid for this line item in cents.')
          })
        )
        .describe('Line items included in the order.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient(resolveImportConfig(ctx));

    let body: Record<string, unknown> = {
      id: ctx.input.orderId,
      amount: ctx.input.amount,
      paid: ctx.input.paid,
      date_created: ctx.input.dateCreated,
      items: ctx.input.items.map(item => ({
        id: item.id,
        name: item.name,
        product_id: item.productId,
        amount: item.amount,
        total_paid: item.totalPaid,
        subscription_id: item.subscriptionId
      }))
    };

    if (ctx.input.contactId) body.contact_id = ctx.input.contactId;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.isRefunded !== undefined) body.is_refunded = ctx.input.isRefunded;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;
    if (ctx.input.tax !== undefined) body.tax = ctx.input.tax;
    if (ctx.input.shipping !== undefined) body.shipping = ctx.input.shipping;

    let response = await client.upsertInvoice(body);

    return {
      output: {
        success: true,
        response
      },
      message: `Order **${ctx.input.orderId}** has been created or updated for contact **${ctx.input.email || ctx.input.contactId}**.`
    };
  })
  .build();
