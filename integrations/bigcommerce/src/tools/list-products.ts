import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list products from the BigCommerce catalog. Supports filtering by name, SKU, brand, category, price range, availability, and more. Returns paginated results with product details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z
        .number()
        .optional()
        .describe('Number of products per page (max: 250, default: 50)'),
      name: z.string().optional().describe('Filter by product name (partial match)'),
      sku: z.string().optional().describe('Filter by product SKU'),
      brandId: z.number().optional().describe('Filter by brand ID'),
      categoryId: z.number().optional().describe('Filter products in a specific category'),
      keyword: z.string().optional().describe('Search keyword to filter products'),
      isVisible: z.boolean().optional().describe('Filter by visibility status'),
      availability: z
        .enum(['available', 'disabled', 'preorder'])
        .optional()
        .describe('Filter by availability status'),
      sortBy: z
        .enum([
          'id',
          'name',
          'sku',
          'price',
          'date_modified',
          'date_last_imported',
          'inventory_level',
          'is_visible',
          'total_sold'
        ])
        .optional()
        .describe('Sort results by field'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      include: z
        .array(
          z.enum([
            'variants',
            'images',
            'custom_fields',
            'bulk_pricing_rules',
            'primary_image',
            'modifiers',
            'options',
            'videos'
          ])
        )
        .optional()
        .describe('Sub-resources to include in the response')
    })
  )
  .output(
    z.object({
      products: z.array(z.any()).describe('Array of product objects'),
      totalProducts: z
        .number()
        .optional()
        .describe('Total number of products matching the filter'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let params: Record<string, any> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.sku) params.sku = ctx.input.sku;
    if (ctx.input.brandId) params.brand_id = ctx.input.brandId;
    if (ctx.input.categoryId) params['categories:in'] = ctx.input.categoryId;
    if (ctx.input.keyword) params.keyword = ctx.input.keyword;
    if (ctx.input.isVisible !== undefined) params.is_visible = ctx.input.isVisible;
    if (ctx.input.availability) params.availability = ctx.input.availability;
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;
    if (ctx.input.sortDirection) params.direction = ctx.input.sortDirection;
    if (ctx.input.include?.length) params.include = ctx.input.include.join(',');

    let result = await client.listProducts(params);

    let pagination = result.meta?.pagination;
    return {
      output: {
        products: result.data,
        totalProducts: pagination?.total,
        currentPage: pagination?.current_page,
        totalPages: pagination?.total_pages
      },
      message: `Found ${result.data.length} products${pagination?.total ? ` (${pagination.total} total)` : ''}.`
    };
  })
  .build();
