import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPurchaseOrder = SlateTool.create(spec, {
  name: 'Create Purchase Order',
  key: 'create_purchase_order',
  description: `Creates a new purchase order in MaintainX. Purchase orders specify types, quantities, and prices for items to buy, typically parts from a vendor. Items can reference existing parts inventory or be custom line items.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
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
            quantity: z.number().optional().describe('Quantity to order'),
            unitCost: z.number().optional().describe('Unit cost')
          })
        )
        .optional()
        .describe('Line items in the purchase order')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().describe('ID of the created purchase order'),
      title: z.string().optional().describe('Title of the purchase order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

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
