import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in the BigCommerce catalog. Supports setting name, type, price, weight, description, SKU, categories, brand, images, variants, and more.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('The product name'),
      type: z.enum(['physical', 'digital']).describe('The product type'),
      price: z.number().describe('The product price'),
      weight: z.number().describe('The product weight'),
      sku: z.string().optional().describe('The product SKU'),
      description: z.string().optional().describe('HTML product description'),
      categories: z.array(z.number()).optional().describe('Array of category IDs to assign'),
      brandId: z.number().optional().describe('Brand ID to assign'),
      isVisible: z
        .boolean()
        .optional()
        .describe('Whether the product is visible on the storefront'),
      availability: z
        .enum(['available', 'disabled', 'preorder'])
        .optional()
        .describe('Product availability status'),
      inventoryLevel: z.number().optional().describe('Current inventory level'),
      inventoryTracking: z
        .enum(['none', 'product', 'variant'])
        .optional()
        .describe('Inventory tracking method'),
      costPrice: z.number().optional().describe('The cost price of the product'),
      retailPrice: z.number().optional().describe('The retail/MSRP price'),
      salePrice: z.number().optional().describe('The sale price'),
      taxClassId: z.number().optional().describe('Tax class ID'),
      images: z
        .array(
          z.object({
            imageUrl: z.string().describe('URL of the image'),
            isThumbnail: z
              .boolean()
              .optional()
              .describe('Whether this is the thumbnail image'),
            description: z.string().optional().describe('Image alt text')
          })
        )
        .optional()
        .describe('Product images to add'),
      customFields: z
        .array(
          z.object({
            name: z.string().describe('Custom field name'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom fields for the product'),
      variants: z.array(z.any()).optional().describe('Product variants')
    })
  )
  .output(
    z.object({
      product: z.any().describe('The created product object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let data: Record<string, any> = {
      name: ctx.input.name,
      type: ctx.input.type,
      price: ctx.input.price,
      weight: ctx.input.weight
    };

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
    if (ctx.input.taxClassId) data.tax_class_id = ctx.input.taxClassId;
    if (ctx.input.images) {
      data.images = ctx.input.images.map(img => ({
        image_url: img.imageUrl,
        is_thumbnail: img.isThumbnail,
        description: img.description
      }));
    }
    if (ctx.input.customFields) {
      data.custom_fields = ctx.input.customFields;
    }
    if (ctx.input.variants) data.variants = ctx.input.variants;

    let result = await client.createProduct(data);

    return {
      output: {
        product: result.data
      },
      message: `Created product **${result.data.name}** (ID: ${result.data.id}).`
    };
  })
  .build();
