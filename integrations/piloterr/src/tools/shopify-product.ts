import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let shopifyProduct = SlateTool.create(spec, {
  name: 'Shopify Product',
  key: 'shopify_product',
  description: `Extract product data from any Shopify store. Returns product title, vendor, type, description, tags, images, variants with pricing and inventory, and product options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productUrl: z.string().describe('Full Shopify product URL')
    })
  )
  .output(
    z.object({
      productId: z.string().optional(),
      title: z.string().optional(),
      handle: z.string().optional(),
      vendor: z.string().optional(),
      productType: z.string().optional(),
      bodyHtml: z.string().optional(),
      tags: z.array(z.string()).optional(),
      image: z.string().optional(),
      images: z.array(z.string()).optional(),
      options: z.array(z.any()).optional(),
      variants: z
        .array(
          z.object({
            sku: z.string().optional(),
            price: z.string().optional(),
            compareAtPrice: z.string().nullable().optional(),
            inventoryQuantity: z.number().optional(),
            barcode: z.string().nullable().optional()
          })
        )
        .optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      publishedAt: z.string().optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getShopifyProduct({ url: ctx.input.productUrl });

    let variants = (result.variants ?? []).map((v: any) => ({
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compare_at_price,
      inventoryQuantity: v.inventory_quantity,
      barcode: v.barcode
    }));

    return {
      output: {
        productId: result.id?.toString(),
        title: result.title,
        handle: result.handle,
        vendor: result.vendor,
        productType: result.product_type,
        bodyHtml: result.body_html,
        tags: result.tags,
        image: result.image,
        images: result.images,
        options: result.options,
        variants,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        publishedAt: result.published_at,
        raw: result
      },
      message: `Retrieved Shopify product: **${result.title ?? 'Unknown'}** by **${result.vendor ?? 'Unknown vendor'}** with **${variants.length} variants**.`
    };
  })
  .build();
