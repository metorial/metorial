import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let manageInventoryProducts = SlateTool.create(spec, {
  name: 'Manage Inventory Product',
  key: 'manage_inventory_product',
  description: `Create, update, or delete a product in a BaseLinker inventory (product catalog). When creating or updating, you can set SKU, EAN, prices, stock levels, text fields (names/descriptions), images, dimensions, and category. Pass a \`productId\` to update an existing product — omit it to create a new one. Use \`action\` = "delete" to remove a product.`,
  instructions: [
    'To create a new product, set action to "create_or_update" and omit productId.',
    'To update an existing product, set action to "create_or_update" and provide productId.',
    'Prices use price group IDs as keys. Stock uses warehouse IDs (format "bl_<id>") as keys.',
    'Text fields use format like "name", "description", "name|en" for multilingual content.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create_or_update', 'delete']).describe('Operation to perform'),
      inventoryId: z.number().describe('Catalog (inventory) ID'),
      productId: z
        .string()
        .optional()
        .describe('Product ID for update/delete. Omit when creating.'),
      parentId: z.string().optional().describe('Parent product ID (for variants)'),
      isBundle: z.boolean().optional().describe('Whether this product is a bundle'),
      sku: z.string().optional().describe('Product SKU'),
      ean: z.string().optional().describe('Product EAN'),
      asin: z.string().optional().describe('Product ASIN'),
      tags: z.array(z.string()).optional().describe('Product tags'),
      taxRate: z.number().optional().describe('VAT tax rate (0-100)'),
      weight: z.number().optional().describe('Weight in kg'),
      height: z.number().optional().describe('Height in cm'),
      width: z.number().optional().describe('Width in cm'),
      length: z.number().optional().describe('Length in cm'),
      star: z.number().optional().describe('Product star rating (0-5)'),
      manufacturerId: z.number().optional().describe('Manufacturer ID'),
      categoryId: z.number().optional().describe('Category ID'),
      prices: z.record(z.string(), z.number()).optional().describe('Prices by price group ID'),
      stock: z
        .record(z.string(), z.number())
        .optional()
        .describe('Stock quantities by warehouse ID (format "bl_<id>")'),
      locations: z
        .record(z.string(), z.string())
        .optional()
        .describe('Warehouse locations by warehouse ID'),
      textFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Text fields: "name", "description", "name|en", etc.'),
      images: z
        .record(z.string(), z.string())
        .optional()
        .describe('Image URLs by position (1-16)'),
      bundleProducts: z
        .record(z.string(), z.number())
        .optional()
        .describe('Bundle product IDs and quantities')
    })
  )
  .output(
    z.object({
      productId: z.string().optional().describe('ID of the created/updated product'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deleteInventoryProduct(Number(ctx.input.productId));
      return {
        output: { productId: ctx.input.productId, success: true },
        message: `Deleted product **#${ctx.input.productId}** from inventory.`
      };
    }

    let result = await client.addInventoryProduct({
      inventoryId: ctx.input.inventoryId,
      productId: ctx.input.productId,
      parentId: ctx.input.parentId,
      isBundle: ctx.input.isBundle,
      sku: ctx.input.sku,
      ean: ctx.input.ean,
      asin: ctx.input.asin,
      tags: ctx.input.tags,
      taxRate: ctx.input.taxRate,
      weight: ctx.input.weight,
      height: ctx.input.height,
      width: ctx.input.width,
      length: ctx.input.length,
      star: ctx.input.star,
      manufacturerId: ctx.input.manufacturerId,
      categoryId: ctx.input.categoryId,
      prices: ctx.input.prices,
      stock: ctx.input.stock,
      locations: ctx.input.locations,
      textFields: ctx.input.textFields,
      images: ctx.input.images,
      bundleProducts: ctx.input.bundleProducts
    });

    let verb = ctx.input.productId ? 'Updated' : 'Created';
    return {
      output: { productId: String(result.product_id), success: true },
      message: `${verb} product **#${result.product_id}** in inventory **#${ctx.input.inventoryId}**.`
    };
  })
  .build();
