import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `List items (products and services) in Zoho Invoice with optional filtering by name, description, rate, tax, or free-text search. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter items by name'),
      description: z.string().optional().describe('Filter items by description'),
      rate: z.number().optional().describe('Filter items by rate'),
      taxId: z.string().optional().describe('Filter items by tax ID'),
      searchText: z.string().optional().describe('Free-text search across item fields'),
      sortColumn: z
        .string()
        .optional()
        .describe('Column to sort results by (e.g. "name", "rate", "created_time")'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            itemId: z.string().describe('Unique ID of the item'),
            name: z.string().optional().describe('Name of the item'),
            status: z.string().optional().describe('Current status of the item'),
            description: z.string().optional().describe('Item description'),
            rate: z.number().optional().describe('Selling price / rate'),
            sku: z.string().optional().describe('Stock Keeping Unit identifier'),
            productType: z.string().optional().describe('Product type (goods or service)'),
            isTaxable: z.boolean().optional().describe('Whether the item is taxable'),
            taxId: z.string().optional().describe('Associated tax ID'),
            taxName: z.string().optional().describe('Name of the associated tax'),
            createdTime: z.string().optional().describe('Timestamp when the item was created')
          })
        )
        .describe('Array of items'),
      page: z.number().optional().describe('Current page number'),
      perPage: z.number().optional().describe('Number of results per page'),
      hasMorePages: z
        .boolean()
        .optional()
        .describe('Whether more pages of results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let params: Record<string, any> = {};

    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.description) params.description = ctx.input.description;
    if (ctx.input.rate !== undefined) params.rate = ctx.input.rate;
    if (ctx.input.taxId) params.tax_id = ctx.input.taxId;
    if (ctx.input.searchText) params.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.per_page = ctx.input.perPage;

    let result = await client.listItems(params);

    let items = (result.items || []).map((i: any) => ({
      itemId: i.item_id,
      name: i.name,
      status: i.status,
      description: i.description,
      rate: i.rate,
      sku: i.sku,
      productType: i.product_type,
      isTaxable: i.is_taxable,
      taxId: i.tax_id,
      taxName: i.tax_name,
      createdTime: i.created_time
    }));

    let pageContext = result.pageContext;
    let page = pageContext?.page;
    let perPage = pageContext?.per_page;
    let hasMorePages = pageContext?.has_more_page ?? false;

    return {
      output: { items, page, perPage, hasMorePages },
      message: `Found **${items.length}** item(s).${hasMorePages ? ' More pages available.' : ''}`
    };
  })
  .build();
