import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

export let searchProducts = SlateTool.create(spec, {
  name: 'Search Products',
  key: 'search_products',
  description: `Search the Best Buy product catalog with flexible filtering. Supports attribute-based filtering (manufacturer, price, category, availability, reviews), keyword search, and sorting.
Use the **query** field for attribute filters using Best Buy query syntax (e.g. \`manufacturer=apple&salePrice<500\`). Use **keyword** for free-text search.`,
  instructions: [
    'Use query for structured attribute filters, e.g. "manufacturer=samsung&salePrice<=999".',
    'Use keyword for free-text product search, e.g. "laptop".',
    'Combine query and keyword for precise results.',
    'Use the sort field like "salePrice.asc" or "customerReviewAverage.dsc".',
    'Use the show field to limit returned fields, e.g. "sku,name,salePrice,manufacturer".'
  ],
  constraints: [
    'Maximum 100 results per page.',
    'Attribute names in queries are case-sensitive; values are not.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Attribute filter query using Best Buy syntax, e.g. "manufacturer=apple&salePrice<1000" or "categoryPath.id=abcat0502000"'
        ),
      keyword: z.string().optional().describe('Free-text keyword search term'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort order as "attribute.asc" or "attribute.dsc", e.g. "salePrice.asc" or "customerReviewAverage.dsc"'
        ),
      show: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return, e.g. "sku,name,salePrice,manufacturer,customerReviewAverage"'
        ),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching products'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      products: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of product objects with requested fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });

    let result = await client.searchProducts({
      query: ctx.input.query,
      keyword: ctx.input.keyword,
      sort: ctx.input.sort,
      show: ctx.input.show,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        total: result.total,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        products: result.products
      },
      message: `Found **${result.total}** products (page ${result.currentPage} of ${result.totalPages}, showing ${result.products.length} results).`
    };
  })
  .build();
