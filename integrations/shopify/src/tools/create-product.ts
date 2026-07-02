import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in the Shopify store. Can include variants, images (by URL), tags, and all product metadata in a single call.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      title: z.string().describe('Product title'),
      bodyHtml: z.string().optional().describe('Product description in HTML'),
      vendor: z.string().optional().describe('Product vendor name'),
      productType: z.string().optional().describe('Product type/category'),
      tags: z.string().optional().describe('Comma-separated tags'),
      status: z
        .enum(['active', 'draft', 'archived'])
        .optional()
        .describe('Product status (defaults to active)'),
      variants: z
        .array(
          z.object({
            title: z.string().optional().describe('Variant title'),
            price: z.string().optional().describe('Variant price'),
            compareAtPrice: z
              .string()
              .optional()
              .describe('Compare-at price for sale display'),
            sku: z.string().optional().describe('SKU'),
            barcode: z.string().optional().describe('Barcode'),
            weight: z.number().optional().describe('Weight value'),
            weightUnit: z.string().optional().describe('Weight unit: g, kg, lb, oz'),
            inventoryQuantity: z.number().optional().describe('Initial inventory quantity'),
            requiresShipping: z
              .boolean()
              .optional()
              .describe('Whether variant requires shipping'),
            taxable: z.boolean().optional().describe('Whether variant is taxable'),
            option1: z.string().optional().describe('Option 1 value (e.g., size)'),
            option2: z.string().optional().describe('Option 2 value (e.g., color)'),
            option3: z.string().optional().describe('Option 3 value')
          })
        )
        .optional()
        .describe('Product variants'),
      images: z
        .array(
          z.object({
            src: z.string().describe('Image URL'),
            alt: z.string().optional().describe('Image alt text'),
            position: z.number().optional().describe('Image position')
          })
        )
        .optional()
        .describe('Product images by URL'),
      options: z
        .array(
          z.object({
            name: z.string().describe('Option name (e.g., "Size", "Color")')
          })
        )
        .optional()
        .describe('Product option definitions')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      title: z.string(),
      handle: z.string(),
      status: z.string(),
      variantCount: z.number(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let productData: Record<string, any> = {
      title: ctx.input.title
    };
    if (ctx.input.bodyHtml !== undefined) productData.body_html = ctx.input.bodyHtml;
    if (ctx.input.vendor !== undefined) productData.vendor = ctx.input.vendor;
    if (ctx.input.productType !== undefined) productData.product_type = ctx.input.productType;
    if (ctx.input.tags !== undefined) productData.tags = ctx.input.tags;
    if (ctx.input.status !== undefined) productData.status = ctx.input.status;
    if (ctx.input.options !== undefined) productData.options = ctx.input.options;

    if (ctx.input.variants) {
      productData.variants = ctx.input.variants.map(v => {
        let variant: Record<string, any> = {};
        if (v.title !== undefined) variant.title = v.title;
        if (v.price !== undefined) variant.price = v.price;
        if (v.compareAtPrice !== undefined) variant.compare_at_price = v.compareAtPrice;
        if (v.sku !== undefined) variant.sku = v.sku;
        if (v.barcode !== undefined) variant.barcode = v.barcode;
        if (v.weight !== undefined) variant.weight = v.weight;
        if (v.weightUnit !== undefined) variant.weight_unit = v.weightUnit;
        if (v.inventoryQuantity !== undefined)
          variant.inventory_quantity = v.inventoryQuantity;
        if (v.requiresShipping !== undefined) variant.requires_shipping = v.requiresShipping;
        if (v.taxable !== undefined) variant.taxable = v.taxable;
        if (v.option1 !== undefined) variant.option1 = v.option1;
        if (v.option2 !== undefined) variant.option2 = v.option2;
        if (v.option3 !== undefined) variant.option3 = v.option3;
        return variant;
      });
    }

    if (ctx.input.images) {
      productData.images = ctx.input.images.map(img => {
        let image: Record<string, any> = { src: img.src };
        if (img.alt) image.alt = img.alt;
        if (img.position) image.position = img.position;
        return image;
      });
    }

    let product = await client.createProduct(productData);

    return {
      output: {
        productId: String(product.id),
        title: product.title,
        handle: product.handle,
        status: product.status,
        variantCount: (product.variants || []).length,
        createdAt: product.created_at
      },
      message: `Created product **${product.title}** with ${(product.variants || []).length} variant(s).`
    };
  })
  .build();
