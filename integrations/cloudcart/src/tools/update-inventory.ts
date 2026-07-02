import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateInventory = SlateTool.create(spec, {
  name: 'Update Inventory',
  key: 'update_inventory',
  description: `Update inventory quantities and pricing for a product variant. Use this to sync stock levels between CloudCart and external systems, adjust prices, or update SKU/barcode information.`,
  instructions: [
    'Inventory is managed at the variant level in CloudCart. Provide a variant ID to update.',
    'Use the List Products tool with includeVariants to find variant IDs.'
  ]
})
  .input(
    z.object({
      variantId: z.string().describe('ID of the variant to update inventory for'),
      quantity: z.number().optional().describe('New stock quantity'),
      price: z.any().optional().describe('Updated price for this variant'),
      sku: z.string().optional().describe('Updated SKU code'),
      barcode: z.string().optional().describe('Updated barcode')
    })
  )
  .output(
    z.object({
      variantId: z.string(),
      quantity: z.any().optional(),
      price: z.any().optional(),
      sku: z.string().optional(),
      barcode: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let attributes: Record<string, any> = {};
    if (ctx.input.quantity !== undefined) attributes.quantity = ctx.input.quantity;
    if (ctx.input.price !== undefined) attributes.price = ctx.input.price;
    if (ctx.input.sku !== undefined) attributes.sku = ctx.input.sku;
    if (ctx.input.barcode !== undefined) attributes.barcode = ctx.input.barcode;

    let res = await client.updateVariant(ctx.input.variantId, attributes);
    let v = res.data;

    return {
      output: {
        variantId: v.id,
        quantity: v.attributes.quantity,
        price: v.attributes.price,
        sku: v.attributes.sku,
        barcode: v.attributes.barcode
      },
      message: `Updated variant **${v.id}** — quantity: **${v.attributes.quantity}**, price: **${v.attributes.price}**.`
    };
  })
  .build();
