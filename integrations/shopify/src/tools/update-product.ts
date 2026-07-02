import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product's details including title, description, vendor, type, tags, status, and images. To manage variants use the dedicated variant tools.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      productId: z.string().describe('Shopify product ID to update'),
      title: z.string().optional().describe('New product title'),
      bodyHtml: z.string().optional().describe('New product description in HTML'),
      vendor: z.string().optional().describe('New vendor name'),
      productType: z.string().optional().describe('New product type'),
      tags: z
        .string()
        .optional()
        .describe('New comma-separated tags (replaces all existing tags)'),
      status: z
        .enum(['active', 'draft', 'archived'])
        .optional()
        .describe('New product status'),
      images: z
        .array(
          z.object({
            src: z.string().describe('Image URL'),
            alt: z.string().optional().describe('Image alt text'),
            position: z.number().optional().describe('Image position')
          })
        )
        .optional()
        .describe('Replace all images with these (by URL)')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      title: z.string(),
      handle: z.string(),
      status: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let productData: Record<string, any> = {};
    if (ctx.input.title !== undefined) productData.title = ctx.input.title;
    if (ctx.input.bodyHtml !== undefined) productData.body_html = ctx.input.bodyHtml;
    if (ctx.input.vendor !== undefined) productData.vendor = ctx.input.vendor;
    if (ctx.input.productType !== undefined) productData.product_type = ctx.input.productType;
    if (ctx.input.tags !== undefined) productData.tags = ctx.input.tags;
    if (ctx.input.status !== undefined) productData.status = ctx.input.status;

    if (ctx.input.images) {
      productData.images = ctx.input.images.map(img => {
        let image: Record<string, any> = { src: img.src };
        if (img.alt) image.alt = img.alt;
        if (img.position) image.position = img.position;
        return image;
      });
    }

    let product = await client.updateProduct(ctx.input.productId, productData);

    return {
      output: {
        productId: String(product.id),
        title: product.title,
        handle: product.handle,
        status: product.status,
        updatedAt: product.updated_at
      },
      message: `Updated product **${product.title}**.`
    };
  })
  .build();
