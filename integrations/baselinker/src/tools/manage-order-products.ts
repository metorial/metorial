import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let manageOrderProducts = SlateTool.create(spec, {
  name: 'Manage Order Products',
  key: 'manage_order_products',
  description: `Add, update, or remove products on an existing BaseLinker order. Use \`action\` to specify the operation: **add** a new product to the order, **update** an existing order product's fields, or **remove** a product from the order.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Order ID to modify'),
      action: z.enum(['add', 'update', 'remove']).describe('Operation to perform'),

      // For add
      name: z.string().optional().describe('Product name (required for "add")'),
      storage: z
        .string()
        .optional()
        .describe('Product source type: "db", "shop", or "warehouse"'),
      storageId: z.string().optional().describe('Storage identifier'),
      productId: z.string().optional().describe('Product ID in the source storage'),
      variantId: z.string().optional().describe('Product variant ID'),
      sku: z.string().optional().describe('Product SKU'),
      ean: z.string().optional().describe('Product EAN'),
      location: z.string().optional().describe('Product location'),
      warehouseId: z
        .number()
        .optional()
        .describe('Source warehouse ID (BaseLinker inventory only)'),
      attributes: z.string().optional().describe('Product attributes, e.g. "Colour: blue"'),
      priceBrutto: z
        .number()
        .optional()
        .describe('Single item gross price (required for "add")'),
      taxRate: z.number().optional().describe('VAT tax rate (required for "add")'),
      quantity: z.number().optional().describe('Quantity (required for "add")'),
      weight: z.number().optional().describe('Single item weight in kg'),

      // For update and remove
      orderProductId: z
        .number()
        .optional()
        .describe('Order product ID (required for "update" and "remove")')
    })
  )
  .output(
    z.object({
      orderProductId: z
        .number()
        .optional()
        .describe('ID of the added or affected order product'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      let result = await client.addOrderProduct({
        orderId: ctx.input.orderId,
        storage: ctx.input.storage,
        storageId: ctx.input.storageId,
        productId: ctx.input.productId,
        variantId: ctx.input.variantId,
        name: ctx.input.name!,
        sku: ctx.input.sku,
        ean: ctx.input.ean,
        location: ctx.input.location,
        warehouseId: ctx.input.warehouseId,
        attributes: ctx.input.attributes,
        priceBrutto: ctx.input.priceBrutto!,
        taxRate: ctx.input.taxRate!,
        quantity: ctx.input.quantity!,
        weight: ctx.input.weight
      });

      return {
        output: { orderProductId: result.order_product_id, success: true },
        message: `Added product **"${ctx.input.name}"** (qty: ${ctx.input.quantity}) to order **#${ctx.input.orderId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      await client.setOrderProductFields({
        orderId: ctx.input.orderId,
        orderProductId: ctx.input.orderProductId!,
        storage: ctx.input.storage,
        storageId: ctx.input.storageId,
        productId: ctx.input.productId,
        variantId: ctx.input.variantId,
        name: ctx.input.name,
        sku: ctx.input.sku,
        ean: ctx.input.ean,
        location: ctx.input.location,
        warehouseId: ctx.input.warehouseId,
        attributes: ctx.input.attributes,
        priceBrutto: ctx.input.priceBrutto,
        taxRate: ctx.input.taxRate,
        quantity: ctx.input.quantity,
        weight: ctx.input.weight
      });

      return {
        output: { orderProductId: ctx.input.orderProductId, success: true },
        message: `Updated order product **#${ctx.input.orderProductId}** on order **#${ctx.input.orderId}**.`
      };
    }

    // remove
    await client.deleteOrderProduct(ctx.input.orderId, ctx.input.orderProductId!);

    return {
      output: { orderProductId: ctx.input.orderProductId, success: true },
      message: `Removed order product **#${ctx.input.orderProductId}** from order **#${ctx.input.orderId}**.`
    };
  })
  .build();
