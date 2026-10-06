import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let variantSchema = z.object({
  variantId: z.string().describe('Unique variant identifier'),
  title: z.string().describe('Variant title'),
  price: z.number().describe('Variant price'),
  url: z.string().describe('Variant page URL'),
  sku: z.string().optional().describe('Stock keeping unit'),
  status: z
    .enum(['inStock', 'outOfStock', 'notAvailable'])
    .optional()
    .describe('Variant availability status'),
  description: z.string().optional().describe('Variant description'),
  defaultImageUrl: z.string().optional().describe('Primary variant image URL'),
  images: z.array(z.string()).optional().describe('Additional variant image URLs'),
  strikeThroughPrice: z.number().optional().describe('Original price before discount')
});

let productOutputSchema = z.object({
  productId: z.string().describe('Omnisend product ID'),
  title: z.string().optional().describe('Product title'),
  url: z.string().optional().describe('Product page URL'),
  currency: z.string().optional().describe('Currency code'),
  status: z.string().optional().describe('Product availability status'),
  description: z.string().optional().describe('Product description'),
  defaultImageUrl: z.string().optional().describe('Primary product image URL'),
  vendor: z.string().optional().describe('Product vendor/brand'),
  type: z.string().optional().describe('Product type/category'),
  tags: z.array(z.string()).optional().describe('Product tags'),
  images: z.array(z.string()).optional().describe('Additional product image URLs'),
  categoryIds: z.array(z.string()).optional().describe('Associated category IDs'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let productInputSchema = z.object({
  productId: z.string().describe('Unique product identifier (max 100 chars)'),
  title: z.string().describe('Product title (max 255 chars)'),
  url: z.string().describe('Product page URL'),
  currency: z.string().describe('Currency code (e.g., "USD")'),
  status: z
    .enum(['inStock', 'outOfStock', 'notAvailable'])
    .describe('Product availability status'),
  description: z.string().optional().describe('Short product description (max 1000 chars)'),
  defaultImageUrl: z.string().optional().describe('Primary product image URL'),
  images: z.array(z.string()).optional().describe('Additional product image URLs (max 300)'),
  vendor: z.string().optional().describe('Manufacturer or brand name'),
  type: z.string().optional().describe('Product type/category'),
  tags: z.array(z.string()).optional().describe('Product tags (max 100)'),
  categoryIds: z.array(z.string()).optional().describe('Associated category IDs'),
  variants: z.array(variantSchema).optional().describe('Product variants with pricing'),
  createdAt: z.string().optional().describe('Product creation date (ISO 8601)')
});

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in the Omnisend catalog. Products enable the Product Picker in Omnisend's Email Builder and power product recommendation automations. Include at least one variant with pricing.`,
  tags: { destructive: false, readOnly: false }
})
  .input(productInputSchema)
  .output(productOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let { productId, variants, categoryIds, ...fields } = ctx.input;
    let output = await client.createProduct({
      ...fields,
      id: productId,
      categoryIDs: categoryIds,
      variants: variants?.map(({ variantId, ...variant }) => ({ ...variant, id: variantId }))
    });
    return { output, message: 'Product created.' };
  })
  .build();

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve a product from the Omnisend catalog by its product ID. Returns full product details including variants, images, and metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      productId: z.string().describe('Omnisend product ID')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('Product ID'),
      title: z.string().optional().describe('Product title'),
      url: z.string().optional().describe('Product page URL'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Availability status'),
      description: z.string().optional().describe('Product description'),
      defaultImageUrl: z.string().optional().describe('Primary image URL'),
      vendor: z.string().optional().describe('Vendor name'),
      type: z.string().optional().describe('Product type'),
      tags: z.array(z.string()).optional().describe('Product tags'),
      images: z.array(z.string()).optional().describe('Additional product image URLs'),
      categoryIds: z.array(z.string()).optional().describe('Associated category IDs'),
      variants: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID'),
            title: z.string().optional().describe('Variant title'),
            price: z.number().optional().describe('Price'),
            sku: z.string().optional().describe('SKU'),
            status: z.string().optional().describe('Variant status'),
            url: z.string().optional().describe('Variant URL'),
            description: z.string().optional().describe('Variant description'),
            defaultImageUrl: z.string().optional().describe('Primary variant image URL'),
            images: z.array(z.string()).optional().describe('Additional variant image URLs'),
            strikeThroughPrice: z
              .number()
              .optional()
              .describe('Original price before discount')
          })
        )
        .optional()
        .describe('Product variants'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.getProduct(ctx.input.productId);
    return { output, message: 'Retrieved product.' };
  })
  .build();

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List products from the Omnisend catalog with pagination. Returns product summaries sorted by the specified criteria.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of products to return (max 250, default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      sort: z.enum(['date', 'updatedAt', 'createdAt']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      products: z.array(productOutputSchema).describe('List of products'),
      hasMore: z.boolean().describe('Whether more products are available'),
      nextOffset: z.number().optional().describe('Offset for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.listProducts(ctx.input);
    return { output, message: 'Retrieved product page.' };
  })
  .build();

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Delete a product from the Omnisend catalog by its product ID. This permanently removes the product and its variants.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      productId: z.string().describe('Product ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    await client.deleteProduct(ctx.input.productId);
    return { output: { success: true }, message: 'Product deletion completed.' };
  })
  .build();
