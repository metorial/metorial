import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  field: z
    .string()
    .describe('Field name to filter by (e.g. name, sku, status, type_id, price, created_at)'),
  value: z.string().describe('Value to compare against'),
  conditionType: z
    .string()
    .optional()
    .describe(
      'Comparison operator: eq, neq, gt, gteq, lt, lteq, like, in, nin, notnull, null (default: eq)'
    )
});

export let searchProducts = SlateTool.create(spec, {
  name: 'Search Products',
  key: 'search_products',
  description: `Search and filter products in the Magento catalog using flexible criteria. Supports filtering by any product attribute, sorting, and pagination. Use this to find products by name, SKU, price range, status, type, or custom attributes.`,
  instructions: [
    'Use **filters** to narrow results. Each filter has a field, value, and optional conditionType.',
    'Common condition types: `eq` (equals), `like` (contains, use `%value%`), `gt`/`lt` (greater/less than), `in` (comma-separated values).',
    'Filters in different filter groups are combined with AND logic.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z
        .array(filterSchema)
        .optional()
        .describe('Search filters (combined with AND logic)'),
      sortField: z
        .string()
        .optional()
        .describe('Field to sort by (e.g. name, price, created_at)'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)'),
      currentPage: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.number().optional().describe('Product entity ID'),
            sku: z.string().describe('Product SKU'),
            name: z.string().optional().describe('Product name'),
            price: z.number().optional().describe('Product price'),
            status: z.number().optional().describe('Product status'),
            visibility: z.number().optional().describe('Product visibility'),
            typeId: z.string().optional().describe('Product type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of matching products'),
      totalCount: z.number().describe('Total number of matching products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    let result = await client.searchProducts({
      filters: ctx.input.filters,
      sortField: ctx.input.sortField,
      sortDirection: ctx.input.sortDirection,
      pageSize: ctx.input.pageSize || 20,
      currentPage: ctx.input.currentPage
    });

    return {
      output: {
        products: result.items.map(p => ({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          price: p.price,
          status: p.status,
          visibility: p.visibility,
          typeId: p.type_id,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })),
        totalCount: result.total_count
      },
      message: `Found **${result.total_count}** products (showing ${result.items.length}).`
    };
  })
  .build();
