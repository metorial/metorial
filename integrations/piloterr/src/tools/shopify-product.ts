import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput, responseArray } from '../lib/response';
import { spec } from '../spec';

let shopifyProductOutputSchema = z.object({
  productId: z.string().optional(),
  title: z.string().optional(),
  handle: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  bodyHtml: z.string().optional(),
  tags: z.array(z.string()).optional(),
  tagsText: z.string().optional(),
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
});

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
  .output(shopifyProductOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getShopifyProduct({ url: ctx.input.productUrl });

    let variants =
      result.variants == null
        ? undefined
        : responseArray(result.variants, 'Shopify variants').map((v: any) => ({
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compare_at_price,
            inventoryQuantity: v.inventory_quantity,
            barcode: v.barcode
          }));

    return {
      output: normalizeOutput(shopifyProductOutputSchema, {
        productId: result.id?.toString(),
        title: result.title,
        handle: result.handle,
        vendor: result.vendor,
        productType: result.product_type,
        bodyHtml: result.body_html,
        tags: result.tags,
        tagsText: typeof result.tags === 'string' ? result.tags : undefined,
        image: typeof result.image === 'string' ? result.image : result.image?.src,
        images: Array.isArray(result.images)
          ? result.images
              .map((image: any) => (typeof image === 'string' ? image : image?.src))
              .filter((url: unknown) => typeof url === 'string')
          : undefined,
        options: result.options,
        variants,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        publishedAt: result.published_at,
        raw: result
      }),
      message: `Retrieved Shopify product: **${result.title ?? 'Unknown'}** by **${result.vendor ?? 'Unknown vendor'}**.`
    };
  })
  .build();
