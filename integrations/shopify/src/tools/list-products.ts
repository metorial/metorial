import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.string().describe('Shopify product ID'),
  title: z.string().describe('Product title'),
  bodyHtml: z.string().nullable().describe('Product description in HTML'),
  vendor: z.string().describe('Product vendor'),
  productType: z.string().describe('Product type/category'),
  handle: z.string().describe('URL-friendly product handle'),
  status: z.string().describe('Product status: active, archived, or draft'),
  tags: z.string().describe('Comma-separated list of tags'),
  createdAt: z.string().describe('When the product was created'),
  updatedAt: z.string().describe('When the product was last updated'),
  variants: z
    .array(
      z.object({
        variantId: z.string().describe('Variant ID'),
        title: z.string().describe('Variant title'),
        price: z.string().describe('Variant price'),
        sku: z.string().nullable().describe('SKU'),
        inventoryQuantity: z.number().describe('Available inventory quantity'),
        inventoryItemId: z.string().describe('Inventory item ID for stock management')
      })
    )
    .describe('Product variants'),
  images: z
    .array(
      z.object({
        imageId: z.string().describe('Image ID'),
        src: z.string().describe('Image URL'),
        alt: z.string().nullable().describe('Image alt text')
      })
    )
    .describe('Product images')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list products from the Shopify store. Filter by title, vendor, product type, collection, status, or date range. Returns products with their variants and images.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of products to return (max 250)'),
      title: z.string().optional().describe('Filter by exact product title'),
      vendor: z.string().optional().describe('Filter by vendor name'),
      productType: z.string().optional().describe('Filter by product type'),
      collectionId: z.string().optional().describe('Filter by collection ID'),
      status: z
        .enum(['active', 'archived', 'draft'])
        .optional()
        .describe('Filter by product status'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Show products created after this date (ISO 8601)'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Show products created before this date (ISO 8601)'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Show products updated after this date (ISO 8601)'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Show products updated before this date (ISO 8601)'),
      sinceId: z.string().optional().describe('Show products after this ID for pagination'),
      handle: z.string().optional().describe('Filter by product handle')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let products = await client.listProducts({
      limit: ctx.input.limit,
      title: ctx.input.title,
      vendor: ctx.input.vendor,
      productType: ctx.input.productType,
      collectionId: ctx.input.collectionId,
      status: ctx.input.status,
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      sinceId: ctx.input.sinceId,
      handle: ctx.input.handle
    });

    let mapped = products.map((p: any) => ({
      productId: String(p.id),
      title: p.title,
      bodyHtml: p.body_html,
      vendor: p.vendor,
      productType: p.product_type,
      handle: p.handle,
      status: p.status,
      tags: p.tags,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      variants: (p.variants || []).map((v: any) => ({
        variantId: String(v.id),
        title: v.title,
        price: v.price,
        sku: v.sku,
        inventoryQuantity: v.inventory_quantity,
        inventoryItemId: String(v.inventory_item_id)
      })),
      images: (p.images || []).map((img: any) => ({
        imageId: String(img.id),
        src: img.src,
        alt: img.alt
      }))
    }));

    return {
      output: { products: mapped },
      message: `Found **${mapped.length}** product(s).`
    };
  })
  .build();
