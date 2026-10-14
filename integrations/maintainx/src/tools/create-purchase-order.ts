import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createPurchaseOrder = SlateTool.create(spec, {
  name: 'Create Purchase Order',
  key: 'create_purchase_order',
  description: `Creates a new purchase order in MaintainX. Purchase orders specify types, quantities, and prices for items to buy, typically parts from a vendor. Items can reference existing parts inventory or be custom line items. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      title: z.string().optional().describe('Title of the purchase order'),
      description: z.string().optional().describe('Description or notes'),
      vendorId: z.number().optional().describe('Vendor ID to order from'),
      items: z
        .array(
          z.object({
            partId: z
              .number()
              .optional()
              .describe('Part ID from inventory (if ordering an existing part)'),
            name: z.string().optional().describe('Item name (for custom line items)'),
            quantity: z
              .number()
              .optional()
              .describe('Quantity to order; required for every item'),
            unitCost: z.number().optional().describe('Unit cost in cents; 120 means 1.20')
          })
        )
        .optional()
        .describe('Line items in the purchase order; required by MaintainX')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().describe('ID of the created purchase order'),
      title: z.string().optional().describe('Title of the purchase order')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.createPurchaseOrder({
      title: ctx.input.title,
      description: ctx.input.description,
      vendorId: ctx.input.vendorId,
      items: ctx.input.items
    });

    let poId = result.id ?? result.purchaseOrder?.id;

    return {
      output: {
        purchaseOrderId: poId,
        title: ctx.input.title
      },
      message: `Created purchase order${ctx.input.title ? ` **"${ctx.input.title}"**` : ''} (ID: ${poId})${ctx.input.items?.length ? ` with ${ctx.input.items.length} item(s)` : ''}.`
    };
  })
  .build();
