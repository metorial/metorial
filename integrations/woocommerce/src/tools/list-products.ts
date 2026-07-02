import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.number().describe('Unique product identifier'),
  name: z.string().describe('Product name'),
  slug: z.string().describe('Product slug'),
  type: z.string().describe('Product type (simple, grouped, external, variable)'),
  status: z.string().describe('Product status (draft, pending, publish, private)'),
  sku: z.string().describe('Stock keeping unit'),
  price: z.string().describe('Current product price'),
  regularPrice: z.string().describe('Regular price'),
  salePrice: z.string().describe('Sale price'),
  onSale: z.boolean().describe('Whether the product is on sale'),
  stockStatus: z.string().describe('Stock status (instock, outofstock, onbackorder)'),
  stockQuantity: z.number().nullable().describe('Stock quantity'),
  categories: z
    .array(
      z.object({
        categoryId: z.number(),
        name: z.string(),
        slug: z.string()
      })
    )
    .describe('Product categories'),
  tags: z
    .array(
      z.object({
        tagId: z.number(),
        name: z.string(),
        slug: z.string()
      })
    )
    .describe('Product tags'),
  permalink: z.string().describe('Product URL'),
  dateCreated: z.string().describe('Date created (ISO 8601)'),
  dateModified: z.string().describe('Date last modified (ISO 8601)')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list products from the WooCommerce store. Filter by status, type, category, tag, SKU, and more. Supports pagination for browsing large catalogs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number (default: 1)'),
      perPage: z
        .number()
        .optional()
        .default(10)
        .describe('Results per page, max 100 (default: 10)'),
      search: z.string().optional().describe('Search term to filter products by name'),
      status: z
        .enum(['draft', 'pending', 'publish', 'private', 'any'])
        .optional()
        .describe('Filter by product status'),
      type: z
        .enum(['simple', 'grouped', 'external', 'variable'])
        .optional()
        .describe('Filter by product type'),
      sku: z.string().optional().describe('Filter by exact SKU'),
      category: z.string().optional().describe('Filter by category ID'),
      tag: z.string().optional().describe('Filter by tag ID'),
      onSale: z.boolean().optional().describe('Filter to only on-sale products'),
      minPrice: z.string().optional().describe('Minimum price filter'),
      maxPrice: z.string().optional().describe('Maximum price filter'),
      stockStatus: z
        .enum(['instock', 'outofstock', 'onbackorder'])
        .optional()
        .describe('Filter by stock status'),
      orderby: z
        .enum(['date', 'id', 'title', 'slug', 'price', 'popularity', 'rating'])
        .optional()
        .describe('Sort by field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema),
      page: z.number(),
      perPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {
      page: ctx.input.page,
      per_page: ctx.input.perPage
    };

    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.sku) params.sku = ctx.input.sku;
    if (ctx.input.category) params.category = ctx.input.category;
    if (ctx.input.tag) params.tag = ctx.input.tag;
    if (ctx.input.onSale !== undefined) params.on_sale = ctx.input.onSale;
    if (ctx.input.minPrice) params.min_price = ctx.input.minPrice;
    if (ctx.input.maxPrice) params.max_price = ctx.input.maxPrice;
    if (ctx.input.stockStatus) params.stock_status = ctx.input.stockStatus;
    if (ctx.input.orderby) params.orderby = ctx.input.orderby;
    if (ctx.input.order) params.order = ctx.input.order;

    let products = await client.listProducts(params);

    let mapped = products.map((p: any) => ({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      status: p.status,
      sku: p.sku || '',
      price: p.price || '',
      regularPrice: p.regular_price || '',
      salePrice: p.sale_price || '',
      onSale: p.on_sale,
      stockStatus: p.stock_status,
      stockQuantity: p.stock_quantity,
      categories: (p.categories || []).map((c: any) => ({
        categoryId: c.id,
        name: c.name,
        slug: c.slug
      })),
      tags: (p.tags || []).map((t: any) => ({
        tagId: t.id,
        name: t.name,
        slug: t.slug
      })),
      permalink: p.permalink || '',
      dateCreated: p.date_created || '',
      dateModified: p.date_modified || ''
    }));

    return {
      output: {
        products: mapped,
        page: ctx.input.page || 1,
        perPage: ctx.input.perPage || 10
      },
      message: `Found **${mapped.length}** products (page ${ctx.input.page || 1}).`
    };
  })
  .build();
