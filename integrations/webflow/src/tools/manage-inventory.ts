import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let manageInventory = SlateTool.create(spec, {
  name: 'Manage Inventory',
  key: 'manage_inventory',
  description: `Get or update inventory levels for an ecommerce product SKU. Use this to check stock levels or update inventory counts.`,
  instructions: [
    'To **get** current inventory, provide collectionId and itemId only.',
    'To **update** inventory, also provide inventoryType and/or quantity.'
  ]
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection ID of the products collection'),
      itemId: z.string().describe('Item ID of the product/SKU'),
      inventoryType: z
        .enum(['infinite', 'finite'])
        .optional()
        .describe('Inventory tracking type'),
      quantity: z
        .number()
        .optional()
        .describe('New inventory quantity (only for finite inventory)')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Item ID'),
      inventoryType: z.string().optional().describe('Inventory tracking type'),
      quantity: z.number().optional().describe('Current inventory quantity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { collectionId, itemId, inventoryType, quantity } = ctx.input;

    if (inventoryType || quantity !== undefined) {
      let updated = await client.updateInventory(collectionId, itemId, {
        inventoryType,
        quantity
      });
      return {
        output: {
          itemId,
          inventoryType: updated.inventoryType,
          quantity: updated.quantity
        },
        message: `Updated inventory for item **${itemId}**${quantity !== undefined ? ` to **${quantity}**` : ''}.`
      };
    }

    let inv = await client.getInventory(collectionId, itemId);
    return {
      output: {
        itemId,
        inventoryType: inv.inventoryType,
        quantity: inv.quantity
      },
      message: `Inventory for item **${itemId}**: type=${inv.inventoryType}, quantity=${inv.quantity}.`
    };
  })
  .build();
