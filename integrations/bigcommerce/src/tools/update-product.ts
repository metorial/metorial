import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product's properties. Only the fields provided will be updated; other fields remain unchanged. Can update name, price, description, availability, inventory, categories, and more.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z.number().describe('The ID of the product to update'),
      name: z.string().optional().describe('New product name'),
      price: z.number().optional().describe('New product price'),
      weight: z.number().optional().describe('New product weight'),
      sku: z.string().optional().describe('New product SKU'),
      description: z.string().optional().describe('New HTML product description'),
      categories: z.array(z.number()).optional().describe('Updated array of category IDs'),
      brandId: z.number().optional().describe('New brand ID'),
      isVisible: z.boolean().optional().describe('Whether the product is visible'),
      availability: z
        .enum(['available', 'disabled', 'preorder'])
        .optional()
        .describe('Product availability status'),
      inventoryLevel: z.number().optional().describe('New inventory level'),
      inventoryTracking: z
        .enum(['none', 'product', 'variant'])
        .optional()
        .describe('Inventory tracking method'),
      costPrice: z.number().optional().describe('New cost price'),
      retailPrice: z.number().optional().describe('New retail/MSRP price'),
      salePrice: z.number().optional().describe('New sale price'),
      sortOrder: z.number().optional().describe('New sort order')
    })
  )
  .output(
    z.object({
      product: z.any().describe('The updated product object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.price !== undefined) data.price = ctx.input.price;
    if (ctx.input.weight !== undefined) data.weight = ctx.input.weight;
    if (ctx.input.sku) data.sku = ctx.input.sku;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.categories) data.categories = ctx.input.categories;
    if (ctx.input.brandId) data.brand_id = ctx.input.brandId;
    if (ctx.input.isVisible !== undefined) data.is_visible = ctx.input.isVisible;
    if (ctx.input.availability) data.availability = ctx.input.availability;
    if (ctx.input.inventoryLevel !== undefined)
      data.inventory_level = ctx.input.inventoryLevel;
    if (ctx.input.inventoryTracking) data.inventory_tracking = ctx.input.inventoryTracking;
    if (ctx.input.costPrice !== undefined) data.cost_price = ctx.input.costPrice;
    if (ctx.input.retailPrice !== undefined) data.retail_price = ctx.input.retailPrice;
    if (ctx.input.salePrice !== undefined) data.sale_price = ctx.input.salePrice;
    if (ctx.input.sortOrder !== undefined) data.sort_order = ctx.input.sortOrder;

    let result = await client.updateProduct(ctx.input.productId, data);

    return {
      output: {
        product: result.data
      },
      message: `Updated product **${result.data.name}** (ID: ${result.data.id}).`
    };
  })
  .build();
