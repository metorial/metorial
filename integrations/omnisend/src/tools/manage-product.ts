import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

let variantSchema = z.object({
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
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in the Omnisend catalog. Products enable the Product Picker in Omnisend's Email Builder and power product recommendation automations. Include at least one variant with pricing.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      productId: z.string().describe('Unique product identifier (max 100 chars)'),
      title: z.string().describe('Product title (max 255 chars)'),
      url: z.string().describe('Product page URL'),
      currency: z.string().describe('Currency code (e.g., "USD")'),
      status: z
        .enum(['inStock', 'outOfStock', 'notAvailable'])
        .describe('Product availability status'),
      description: z
        .string()
        .optional()
        .describe('Short product description (max 1000 chars)'),
      defaultImageUrl: z.string().optional().describe('Primary product image URL'),
      images: z
        .array(z.string())
        .optional()
        .describe('Additional product image URLs (max 300)'),
      vendor: z.string().optional().describe('Manufacturer or brand name'),
      type: z.string().optional().describe('Product type/category'),
      tags: z.array(z.string()).optional().describe('Product tags (max 100)'),
      categoryIds: z.array(z.string()).optional().describe('Associated category IDs'),
      variants: z.array(variantSchema).optional().describe('Product variants with pricing'),
      createdAt: z.string().optional().describe('Product creation date (ISO 8601)')
    })
  )
  .output(productOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let body: Record<string, any> = {
      id: ctx.input.productId,
      title: ctx.input.title,
      url: ctx.input.url,
      currency: ctx.input.currency,
      status: ctx.input.status
    };

    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.defaultImageUrl) body.defaultImageUrl = ctx.input.defaultImageUrl;
    if (ctx.input.images) body.images = ctx.input.images;
    if (ctx.input.vendor) body.vendor = ctx.input.vendor;
    if (ctx.input.type) body.type = ctx.input.type;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.categoryIds) body.categoryIDs = ctx.input.categoryIds;
    if (ctx.input.createdAt) body.createdAt = ctx.input.createdAt;
    if (ctx.input.variants) {
      body.variants = ctx.input.variants.map(v => ({
        id: v.variantId,
        title: v.title,
        price: v.price,
        url: v.url,
        sku: v.sku,
        status: v.status,
        description: v.description,
        defaultImageUrl: v.defaultImageUrl,
        images: v.images,
        strikeThroughPrice: v.strikeThroughPrice
      }));
    }

    let result = await client.createProduct(body);

    return {
      output: {
        productId: result.id || ctx.input.productId,
        title: ctx.input.title,
        url: ctx.input.url,
        currency: ctx.input.currency,
        status: ctx.input.status,
        description: ctx.input.description,
        defaultImageUrl: ctx.input.defaultImageUrl,
        vendor: ctx.input.vendor,
        type: ctx.input.type,
        tags: ctx.input.tags,
        createdAt: ctx.input.createdAt
      },
      message: `Created product **${ctx.input.title}** (ID: ${ctx.input.productId}).`
    };
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
      variants: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID'),
            title: z.string().optional().describe('Variant title'),
            price: z.number().optional().describe('Price'),
            sku: z.string().optional().describe('SKU'),
            status: z.string().optional().describe('Variant status'),
            url: z.string().optional().describe('Variant URL')
          })
        )
        .optional()
        .describe('Product variants'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);
    let result = await client.getProduct(ctx.input.productId);

    let variants = (result.variants || []).map((v: any) => ({
      variantId: v.id,
      title: v.title,
      price: v.price,
      sku: v.sku,
      status: v.status,
      url: v.url
    }));

    return {
      output: {
        productId: result.id,
        title: result.title,
        url: result.url,
        currency: result.currency,
        status: result.status,
        description: result.description,
        defaultImageUrl: result.defaultImageUrl,
        vendor: result.vendor,
        type: result.type,
        tags: result.tags,
        variants,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Retrieved product **${result.title}** (ID: ${result.id}).`
    };
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
    let client = new OmnisendClient(ctx.auth.token);

    let result = await client.listProducts({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    let products = (result.products || []).map((p: any) => ({
      productId: p.id,
      title: p.title,
      url: p.url,
      currency: p.currency,
      status: p.status,
      description: p.description,
      defaultImageUrl: p.defaultImageUrl,
      vendor: p.vendor,
      type: p.type,
      tags: p.tags,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    let hasMore = !!result.paging?.next;
    let nextOffset = hasMore ? (ctx.input.offset || 0) + (ctx.input.limit || 100) : undefined;

    return {
      output: {
        products,
        hasMore,
        nextOffset
      },
      message: `Retrieved **${products.length}** products${hasMore ? ' (more available)' : ''}.`
    };
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
    let client = new OmnisendClient(ctx.auth.token);
    await client.deleteProduct(ctx.input.productId);

    return {
      output: { success: true },
      message: `Deleted product (ID: ${ctx.input.productId}).`
    };
  })
  .build();
